import axios from 'axios';
import https from 'node:https';
import connectDB from '../db/mongodb';
import SatellitePositions, { ISatelliteSample } from '../db/models/SatellitePositions';

// Force IPv4. SSC publishes an AAAA record for sscweb.gsfc.nasa.gov but the
// IPv6 endpoint is unreliable from many networks (verified: AAAA times out from
// our environment, A succeeds in ~1s). Node 17+ prefers IPv6 first by default,
// so without this agent every request burns the full 30s timeout before
// falling back. curl avoids the same trap via its own Happy Eyeballs logic.
const sscHttpsAgent = new https.Agent({ family: 4, keepAlive: true });

const SSC_BASE = 'https://sscweb.gsfc.nasa.gov/WS/sscr/2';
const SYNC_TTL_MS = 30 * 60 * 1000;
const WINDOW_DURATION_MS = 60 * 60 * 1000;
const WINDOW_LOOKBACK_MS = 5 * 60 * 1000;
const STALE_TAIL_MS = 5 * 60 * 1000;
const RETRY_DELAYS_MS = [1000, 2000, 4000];

export interface SatelliteConfig {
  id: string;
  name: string;
  // Server-side downsample: keep every Nth sample. 1 = keep all (ISS, ~90min orbit).
  // 10 = keep every 10th (MMS/Cluster, multi-hour orbits — 60s native is denser
  // than needed and bloats the cached doc).
  sampleStride: number;
}

export const SATELLITE_CONFIGS: SatelliteConfig[] = [
  { id: 'iss', name: 'ISS', sampleStride: 1 },
  { id: 'mms1', name: 'MMS 1', sampleStride: 10 },
  { id: 'mms2', name: 'MMS 2', sampleStride: 10 },
  { id: 'cluster3', name: 'Cluster-3 (Samba)', sampleStride: 10 },
];

const CONFIG_BY_ID = new Map(SATELLITE_CONFIGS.map((c) => [c.id, c]));

// SSC returns JSON wrapped in Jackson @JsonTypeInfo class tags — every typed
// object is `["fully.qualified.ClassName", { ... }]` and every list is
// `["java.util.ArrayList", [ items ]]`. Walk the tree and unwrap.
const TYPE_TAG_PREFIXES = ['gov.nasa.gsfc.', 'javax.xml.', 'java.util.'];

function isTypeWrapper(v: unknown): v is [string, unknown] {
  return (
    Array.isArray(v) &&
    v.length === 2 &&
    typeof v[0] === 'string' &&
    TYPE_TAG_PREFIXES.some((p) => (v[0] as string).startsWith(p))
  );
}

function stripTypeTags(node: unknown): unknown {
  if (isTypeWrapper(node)) return stripTypeTags(node[1]);
  if (Array.isArray(node)) return node.map(stripTypeTags);
  if (node && typeof node === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      out[k] = stripTypeTags(v);
    }
    return out;
  }
  return node;
}

function toCompactIso(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

// Validate per-satellite payload shape. Throws with a useful message if SSC's
// JSON binding has drifted from what we expect — easier to debug than silently
// storing empty samples.
function validateSatData(id: string, sat: any): void {
  const coords = sat?.Coordinates?.[0];
  if (!coords) {
    throw new Error(`Satellite "${id}" has no Coordinates[0] block — SSC schema may have changed`);
  }
  for (const field of ['X', 'Y', 'Z'] as const) {
    if (!Array.isArray(coords[field])) {
      throw new Error(`Satellite "${id}" missing coords.${field} array — SSC schema may have changed`);
    }
  }
  if (!Array.isArray(sat.Time)) {
    throw new Error(`Satellite "${id}" missing Time array — SSC schema may have changed`);
  }
}

// Zip the parallel coordinate arrays into per-sample objects, then keep every
// Nth sample per the satellite's stride. Assumes validateSatData has passed.
function zipAndDownsample(id: string, satData: any, stride: number): ISatelliteSample[] {
  const coords = satData.Coordinates[0];
  const times: string[] = satData.Time;
  const { X, Y, Z, Latitude = [], Longitude = [], RadialLength = [] } = coords;

  const lens = [times.length, X.length, Y.length, Z.length];
  const minLen = Math.min(...lens);
  const maxLen = Math.max(...lens);
  if (maxLen !== minLen) {
    console.warn(
      `⚠️ [SSC_PARSE] "${id}" mismatched array lengths T=${times.length} X=${X.length} Y=${Y.length} Z=${Z.length} — truncating to ${minLen}`,
    );
  }

  const out: ISatelliteSample[] = [];
  for (let i = 0; i < minLen; i += stride) {
    out.push({
      t: new Date(times[i]),
      x: X[i],
      y: Y[i],
      z: Z[i],
      lat: Latitude[i],
      lon: Longitude[i],
      radial: RadialLength[i],
    });
  }
  return out;
}

async function fetchSscLocations(ids: string[], start: Date, end: Date) {
  const url = `${SSC_BASE}/locations/${ids.join(',')}/${toCompactIso(start)},${toCompactIso(end)}/geo/`;
  const response = await axios.get(url, {
    headers: { Accept: 'application/json' },
    params: { resolutionFactor: 1 },
    timeout: 30000,
    httpsAgent: sscHttpsAgent,
  });

  const unwrapped = stripTypeTags(response.data) as any;

  // Envelope shape — these failures mean SSC's response doesn't look like a
  // DataResult at all (HTML error page, schema change, etc.). Fail loudly.
  if (!unwrapped || typeof unwrapped !== 'object') {
    throw new Error('SSC response unwrapped to a non-object — schema may have changed');
  }
  if (!unwrapped.Result) {
    throw new Error('SSC response missing Result envelope — schema may have changed');
  }
  const status = unwrapped.Result.StatusCode;
  if (status !== 'SUCCESS') {
    throw new Error(`SSC returned non-success status: ${status} / ${unwrapped.Result.StatusSubCode}`);
  }
  if (!Array.isArray(unwrapped.Result.Data)) {
    throw new Error('SSC Result.Data is not an array — schema may have changed');
  }

  const byId = new Map<string, any>();
  for (const entry of unwrapped.Result.Data) {
    if (entry?.Id) byId.set(entry.Id, entry);
  }
  return byId;
}

async function fetchSscLocationsWithRetry(ids: string[], start: Date, end: Date) {
  let lastErr: any;
  for (let attempt = 1; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await fetchSscLocations(ids, start, end);
    } catch (err: any) {
      lastErr = err;
      const code = err?.code;
      const status = err?.response?.status;
      // 4xx is a client error — don't retry, it'll just fail the same way.
      if (status && status >= 400 && status < 500) break;
      if (attempt < RETRY_DELAYS_MS.length) {
        const delay = RETRY_DELAYS_MS[attempt - 1];
        console.warn(
          `⚠️ [SSC_SYNC] Attempt ${attempt}/${RETRY_DELAYS_MS.length} failed (${code || err?.message || 'unknown'}). Retrying in ${delay}ms.`,
        );
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  // Warn (not error) — the throw below is caught upstream and surfaced via the
  // SatellitePositions.lastError field + the UI banner. Using console.error
  // here would trigger Next dev's browser error overlay for a handled failure.
  console.warn(
    `💥 [SSC_SYNC] Failed to fetch after ${RETRY_DELAYS_MS.length} retries — ${lastErr?.code || lastErr?.message || 'unknown'}`,
  );
  throw lastErr;
}

// Returns the list of configured satellites that need a refresh (cache miss,
// past TTL, or window tail too close to `now`).
async function findStaleSatellites(now: Date): Promise<SatelliteConfig[]> {
  const docs = await SatellitePositions.find({
    id: { $in: SATELLITE_CONFIGS.map((c) => c.id) },
  })
    .select('id lastFetched windowEnd')
    .lean();
  const docById = new Map(docs.map((d: any) => [d.id, d]));

  return SATELLITE_CONFIGS.filter((cfg) => {
    const doc = docById.get(cfg.id);
    if (!doc) return true;
    const ageOk = now.getTime() - new Date(doc.lastFetched).getTime() <= SYNC_TTL_MS;
    const tailOk = new Date(doc.windowEnd).getTime() - now.getTime() > STALE_TAIL_MS;
    return !(ageOk && tailOk);
  });
}

export const ensureFreshSatellites = async () => {
  await connectDB();
  const now = new Date();
  const stale = await findStaleSatellites(now);
  if (stale.length === 0) return;

  console.log(`🛰️  [SSC_SYNC] Refreshing ${stale.length} satellite(s): ${stale.map((s) => s.id).join(', ')}`);

  const start = new Date(now.getTime() - WINDOW_LOOKBACK_MS);
  const end = new Date(now.getTime() + WINDOW_DURATION_MS - WINDOW_LOOKBACK_MS);

  let byId: Map<string, any> | null = null;
  let fetchError: string | null = null;
  try {
    byId = await fetchSscLocationsWithRetry(
      stale.map((s) => s.id),
      start,
      end,
    );
  } catch (error: any) {
    // Prefer the error code (ETIMEDOUT, ECONNREFUSED, ENOTFOUND, etc.) over the
    // message — the code is what the UI surfaces in its terminal banner.
    // fetchSscLocationsWithRetry already warned with the same code; no need to
    // log it twice. We just advance lastFetched to back off the upstream.
    fetchError = error?.code || error?.message || 'fetch failed';
  }

  for (const cfg of stale) {
    const satData = byId?.get(cfg.id);
    if (!satData) {
      // Per-satellite miss inside an otherwise-successful response, OR the
      // whole fetch failed. Either way, advance lastFetched so we don't
      // hammer the upstream; keep existing samples if any.
      await SatellitePositions.updateOne(
        { id: cfg.id },
        {
          $set: {
            lastFetched: now,
            lastError: fetchError ?? 'satellite missing from response',
          },
          $setOnInsert: {
            name: cfg.name,
            coordinateSystem: 'GEO',
            windowStart: start,
            windowEnd: end,
            samples: [],
          },
        },
        { upsert: true },
      );
      continue;
    }

    let samples: ISatelliteSample[];
    try {
      validateSatData(cfg.id, satData);
      samples = zipAndDownsample(cfg.id, satData, cfg.sampleStride);
    } catch (parseErr: any) {
      // One satellite has unexpected shape — don't poison the rest of the batch.
      // Warn rather than error — surfaced to the UI via lastError + banner. See
      // matching note in fetchSscLocationsWithRetry on Next dev's overlay.
      console.warn(`💥 [SSC_PARSE] ${cfg.id}: ${parseErr?.message || 'unknown parse failure'}`);
      await SatellitePositions.updateOne(
        { id: cfg.id },
        {
          $set: {
            lastFetched: now,
            lastError: `PARSE_ERROR: ${parseErr?.message || 'unknown'}`,
          },
          $setOnInsert: {
            name: cfg.name,
            coordinateSystem: 'GEO',
            windowStart: start,
            windowEnd: end,
            samples: [],
          },
        },
        { upsert: true },
      );
      continue;
    }

    await SatellitePositions.updateOne(
      { id: cfg.id },
      {
        $set: {
          name: cfg.name,
          coordinateSystem: 'GEO',
          windowStart: start,
          windowEnd: end,
          samples,
          lastFetched: now,
          lastError: null,
        },
      },
      { upsert: true },
    );
  }

  if (!fetchError) {
    console.log(`✅ [SSC_SYNC] Cached windows for ${stale.length} satellite(s)`);
  }
};

export const getSatellitePositions = async (ids?: string[]) => {
  await connectDB();
  const filter = ids?.length ? { id: { $in: ids } } : { id: { $in: SATELLITE_CONFIGS.map((c) => c.id) } };
  const docs = await SatellitePositions.find(filter).select('-_id -__v').lean();

  const now = Date.now();
  return docs.map((doc: any) => ({
    ...doc,
    stale: doc.lastError != null || (doc.windowEnd && new Date(doc.windowEnd).getTime() < now),
    displayName: CONFIG_BY_ID.get(doc.id)?.name ?? doc.name,
  }));
};

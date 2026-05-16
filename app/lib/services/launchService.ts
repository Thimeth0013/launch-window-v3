// lib/services/launchService.ts
import axios from 'axios';
import connectDB from '../db/mongodb';
import Launch from '../db/models/Launch';
import LaunchDetailed from '../db/models/LaunchDetailed';
import LaunchSync from '../db/models/LaunchSync';
import StreamSync from '../db/models/StreamSync';

const LAUNCH_LIBRARY_API = 'https://ll.thespacedevs.com/2.3.0';

// Hourly throttle on the global manifest sync.
const GLOBAL_SYNC_TTL_MS = 60 * 60 * 1000;
// LaunchDetailed normal refresh window — re-fetch on next visit if older than this.
const DETAILED_REFRESH_TTL_MS = 60 * 60 * 1000;
// Inside the T-2h → T+10min critical window, refresh much more aggressively
// since dates/status can change minute-to-minute.
const CRITICAL_REFRESH_TTL_MS = 5 * 60 * 1000;
// How many launches to keep in the list manifest.
const MANIFEST_LIMIT = 30;

// --- Idle-time prefetch tuning -------------------------------------------
// Reserve this many API calls per hour for user-triggered detail fetches.
// The prefetch only spends `remaining - PREFETCH_RESERVE_CALLS` of the
// hourly budget so a spike of real visitors doesn't run into the limit.
const PREFETCH_RESERVE_CALLS = 5;
// Hard upper bound on how many launches one prefetch run will warm, even if
// the budget is huge — keeps the warm-up bounded and predictable.
const PREFETCH_MAX_PER_RUN = 10;
// Small delay between prefetch fetches to be polite to the API.
const PREFETCH_INTER_CALL_MS = 500;

interface ApiLaunchList {
  id: string;
  slug: string;
  name: string;
  net?: string;
  last_updated?: string;
  window_start?: string;
  window_end?: string;
  status?: { name?: string; abbrev?: string };
  image?: any;
  infographic?: string;
  [k: string]: any;
}

const fetchWithRetry = async (url: string, config: any, maxRetries = 3) => {
  let lastError: any;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await axios.get(url, config);
    } catch (error: any) {
      lastError = error;
      // 4xx errors won't get better with retries — bail immediately.
      if (error.response?.status >= 400 && error.response?.status < 500) {
        throw error;
      }
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
  }
  throw lastError;
};

// Detect significant change between cached list doc and new list-mode payload.
// Triggers stream-cache cleanup and detailed-cache invalidation.
const detectSignificantChanges = (oldLaunch: any, apiLaunch: ApiLaunchList): boolean => {
  if (!oldLaunch?.date || !apiLaunch?.net) return false;
  const oldDate = new Date(oldLaunch.date);
  const newDate = new Date(apiLaunch.net);
  const delayHours = (newDate.getTime() - oldDate.getTime()) / (1000 * 60 * 60);
  const isSignificantDelay = delayHours > 24;
  const oldStatus = oldLaunch.status?.name || '';
  const newStatus = apiLaunch.status?.name || '';
  const statusLost =
    oldStatus.includes('Go') && (newStatus.includes('TBD') || newStatus.includes('TBC'));
  return isSignificantDelay || statusLost;
};

/**
 * Pull the upcoming-launches manifest in NORMAL mode and upsert into Launch.
 *
 * Normal mode is ~5× smaller than detailed (no launcher_stage/spacecraft_stage
 * payloads, no timeline/updates/mission_patches, no agency history). But unlike
 * list mode it still ships `launch_service_provider`, `pad`, `mission`, and
 * `rocket.configuration` — the fields the list cards actually display. We save
 * the heavy detailed payload for the per-launch lazy fetch (fetchLaunchDetailed).
 */
export const fetchUpcomingLaunches = async () => {
  try {
    await connectDB();
    console.log('📡 [SYNC_LIST] Fetching launches in NORMAL mode...');

    const response = await fetchWithRetry(
      `${LAUNCH_LIBRARY_API}/launches/upcoming/`,
      { params: { limit: MANIFEST_LIMIT, mode: 'normal' }, timeout: 30000 }
    );

    const apiLaunches: ApiLaunchList[] = response.data.results || [];
    console.log(`📡 [SYNC_LIST] Processing ${apiLaunches.length} launches`);

    for (const apiLaunch of apiLaunches) {
      try {
        const existing = await Launch.findOne({ id: apiLaunch.id });

        if (existing && detectSignificantChanges(existing, apiLaunch)) {
          console.log(
            `🗑️  [CLEANUP] "${apiLaunch.name}" delayed/changed — wiping streams + detailed cache.`
          );
          await StreamSync.deleteOne({ launchId: apiLaunch.id });
          // Invalidate the detailed cache so the user gets a fresh fetch
          // next time they open this launch.
          await LaunchDetailed.deleteOne({ id: apiLaunch.id });
        }

        await Launch.findOneAndUpdate(
          { id: apiLaunch.id },
          {
            // Normal mode brings provider/pad/mission/rocket-config along with
            // the list essentials, which the launches list cards display. We
            // spread the whole payload and just normalise the date fields.
            // We do NOT $unset legacy detailed fields on existing docs —
            // they're harmless and the source of truth for detail data
            // lives in LaunchDetailed anyway.
            ...apiLaunch,
            date: apiLaunch.net ? new Date(apiLaunch.net) : null,
            net: apiLaunch.net ? new Date(apiLaunch.net) : null,
            last_updated: apiLaunch.last_updated ? new Date(apiLaunch.last_updated) : null,
            window_end: apiLaunch.window_end ? new Date(apiLaunch.window_end) : null,
            window_start: apiLaunch.window_start ? new Date(apiLaunch.window_start) : null,
            // Legacy denormalised field used by some UI components
            provider: apiLaunch.launch_service_provider?.name || 'Unknown',
          },
          { upsert: true, new: true }
        );
      } catch (error: any) {
        console.error(`❌ [SYNC_LIST] Failed to save ${apiLaunch.id}: ${error.message}`);
      }
    }

    console.log(`✅ [SYNC_LIST] Done — ${apiLaunches.length} launches updated`);
    return apiLaunches;
  } catch (error: any) {
    console.error('❌ [SYNC_LIST] Error:', error.message);
    throw error;
  }
};

// Runs the hourly global sync if it's stale. Safe to call from any route or page —
// failures are swallowed so callers can still serve whatever is in Mongo.
// Detailed-payload prefetching is no longer triggered here; it runs from the
// dedicated cron endpoint at /api/cron/prefetch instead.
export const ensureFreshLaunches = async () => {
  await connectDB();
  const now = new Date();
  const globalSync = await LaunchSync.findOne({ syncId: 'GLOBAL_LAUNCH_SYNC' });

  if (
    globalSync &&
    now.getTime() - new Date(globalSync.lastUpdated).getTime() <= GLOBAL_SYNC_TTL_MS
  ) {
    return;
  }

  console.log('⏱️  [LAZY_SYNC] Manifest stale. Refreshing list-mode...');
  try {
    await fetchUpcomingLaunches();
    await LaunchSync.findOneAndUpdate(
      { syncId: 'GLOBAL_LAUNCH_SYNC' },
      { lastUpdated: now },
      { upsert: true, new: true }
    );
    console.log(`✅ [SYNC_COMPLETE] List manifest updated at ${now.toISOString()}`);
  } catch (syncError) {
    console.warn('⚠️  [SYNC_ERROR] Failed to sync, serving cached data:', syncError);
  }
};

// --- Throttle status & idle-time prefetch --------------------------------

interface ThrottleStatus {
  limit: number;
  remaining: number;
  nextUseSecs?: number;
}

// Calling /api-throttle/ does NOT count against the budget itself (TSD
// excludes monitoring queries). The endpoint returns:
//   {
//     your_request_limit: 15,
//     limit_frequency_secs: 3600,
//     current_use: 12,
//     next_use_secs: 0,
//     ident: "..."
//   }
async function fetchThrottleStatus(): Promise<ThrottleStatus | null> {
  try {
    const res = await axios.get(`${LAUNCH_LIBRARY_API}/api-throttle/`, {
      timeout: 10000,
    });
    const data: any = res.data;
    const limit = data?.your_request_limit;
    const currentUse = data?.current_use;
    const nextUseSecs = data?.next_use_secs;
    if (typeof limit !== 'number' || typeof currentUse !== 'number') {
      console.warn('⚠️  [THROTTLE] Unexpected response shape:', data);
      return null;
    }
    return {
      limit,
      remaining: Math.max(0, limit - currentUse),
      nextUseSecs: typeof nextUseSecs === 'number' ? nextUseSecs : undefined,
    };
  } catch (err: any) {
    console.warn(`⚠️  [THROTTLE] Failed to read throttle: ${err?.message || 'unknown'}`);
    return null;
  }
}

/**
 * Spend any unused hourly API budget warming detailed payloads for the
 * upcoming launches closest to T-0 (most likely to be opened next). Without
 * this the unused calls expire silently at the hour boundary; with this they
 * pre-build the cache so a real-traffic spike doesn't have to.
 *
 * Skips launches whose `LaunchDetailed` cache is still inside the normal TTL.
 * Reserves `PREFETCH_RESERVE_CALLS` for user-triggered detail fetches during
 * the rest of the hour.
 */
export const prefetchDetailedLaunches = async () => {
  await connectDB();

  const throttle = await fetchThrottleStatus();
  if (!throttle) {
    console.log('🎯 [PREFETCH] Throttle status unavailable — skipping prefetch');
    return;
  }

  const budget = Math.max(0, throttle.remaining - PREFETCH_RESERVE_CALLS);
  const resetIn =
    throttle.nextUseSecs !== undefined ? ` (resets in ${throttle.nextUseSecs}s)` : '';

  if (budget === 0) {
    console.log(
      `🎯 [PREFETCH] Budget ${throttle.remaining}/${throttle.limit} − reserve ${PREFETCH_RESERVE_CALLS} = 0${resetIn}. Skipping.`
    );
    return;
  }

  const slots = Math.min(budget, PREFETCH_MAX_PER_RUN);
  console.log(
    `🎯 [PREFETCH] ${throttle.remaining}/${throttle.limit} remaining${resetIn}, reserving ${PREFETCH_RESERVE_CALLS}, prefetching up to ${slots} launches`
  );

  // Closest-to-T0 upcoming launches first. Over-fetch the list so we can skip
  // launches that already have fresh cache without running out of candidates.
  const candidates = await Launch.find({ date: { $gte: new Date() } })
    .sort({ date: 1 })
    .limit(PREFETCH_MAX_PER_RUN * 3)
    .select('id name')
    .lean();

  let fetched = 0;
  let skipped = 0;

  for (const candidate of candidates) {
    if (fetched >= slots) break;

    const cached: any = await LaunchDetailed.findOne({ id: candidate.id })
      .select('lastFetchedAt')
      .lean();
    if (cached?.lastFetchedAt) {
      const ageMs = Date.now() - new Date(cached.lastFetchedAt).getTime();
      if (ageMs < DETAILED_REFRESH_TTL_MS) {
        skipped++;
        continue;
      }
    }

    try {
      await fetchLaunchDetailed(candidate.id);
      fetched++;
      await new Promise((r) => setTimeout(r, PREFETCH_INTER_CALL_MS));
    } catch (err: any) {
      console.warn(
        `⚠️  [PREFETCH] Failed for ${candidate.id} (${candidate.name}): ${err?.message || 'unknown'}`
      );
    }
  }

  console.log(
    `✅ [PREFETCH] Done — fetched ${fetched}, skipped ${skipped} (cache still fresh)`
  );
};


/**
 * Fetch a single launch in DETAILED mode and upsert into LaunchDetailed.
 * Called lazily when a user opens a launch detail page. Also pushes any
 * date/status updates back into the Launch list doc so the manifest stays
 * accurate when scrubs happen.
 */
export const fetchLaunchDetailed = async (id: string) => {
  await connectDB();
  console.log(`📡 [SYNC_DETAILED] Fetching detailed data for ${id}...`);

  const response = await fetchWithRetry(
    `${LAUNCH_LIBRARY_API}/launches/upcoming/${id}/`,
    { params: { mode: 'detailed' }, timeout: 30000 }
  );

  const data = response.data;
  if (!data || !data.id) return null;

  const detailedDoc = await LaunchDetailed.findOneAndUpdate(
    { id: data.id },
    {
      ...data,
      id: data.id,
      slug: data.slug,
      date: data.net ? new Date(data.net) : null,
      lastFetchedAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  // Reflect the most recent scrub/status update back into the list doc so the
  // manifest stays in sync without waiting on the hourly list refresh.
  await Launch.findOneAndUpdate(
    { id: data.id },
    {
      name: data.name,
      slug: data.slug,
      status: data.status,
      net_precision: data.net_precision,
      image: data.image,
      date: data.net ? new Date(data.net) : null,
      net: data.net ? new Date(data.net) : null,
      window_start: data.window_start ? new Date(data.window_start) : null,
      window_end: data.window_end ? new Date(data.window_end) : null,
      last_updated: data.last_updated ? new Date(data.last_updated) : null,
    },
    { new: true }
  );

  console.log(`✅ [SYNC_DETAILED] Cached detailed data for "${data.name}"`);
  return detailedDoc;
};

/**
 * Read a launch's detailed payload by slug, fetching from the upstream API
 * if the cache is missing or stale. Inside the T-2h → T+10min critical
 * window we refresh at a tighter TTL so date/status flips show up promptly.
 *
 * Falls back to the existing list doc (which may still carry legacy detailed
 * fields from the old architecture) if the fetch fails entirely — keeps the
 * slug page renderable instead of 404-ing on a transient upstream error.
 */
export const getOrFetchLaunchDetailedBySlug = async (slug: string) => {
  await connectDB();

  const listLaunch: any = await Launch.findOne({ slug }).lean();
  if (!listLaunch) return null;

  let detailed: any = await LaunchDetailed.findOne({ id: listLaunch.id }).lean();

  const now = Date.now();
  const launchTime = listLaunch.date ? new Date(listLaunch.date).getTime() : null;
  const hoursUntilLaunch = launchTime != null ? (launchTime - now) / (1000 * 60 * 60) : null;
  const inCriticalWindow =
    hoursUntilLaunch !== null && hoursUntilLaunch >= -0.167 && hoursUntilLaunch <= 2;

  const ttl = inCriticalWindow ? CRITICAL_REFRESH_TTL_MS : DETAILED_REFRESH_TTL_MS;
  const ageMs = detailed?.lastFetchedAt
    ? now - new Date(detailed.lastFetchedAt).getTime()
    : Infinity;
  const isStale = !detailed || ageMs > ttl;

  if (isStale) {
    try {
      const fresh = await fetchLaunchDetailed(listLaunch.id);
      if (fresh) detailed = fresh;
    } catch (err: any) {
      console.warn(
        `⚠️  [DETAILED_FETCH] Failed for ${listLaunch.id}: ${err?.message || 'unknown'}. Serving cache.`
      );
    }
  } else {
    const ageMin = Math.round(ageMs / 60000);
    console.log(
      `📦 [DETAILED_CACHE] HIT for "${listLaunch.name}" (age ${ageMin}min, critical=${inCriticalWindow})`
    );
  }

  // Graceful fallback: if we have no detailed doc at all (first visit + fetch
  // failed), return the list doc so the page still renders something.
  return detailed || listLaunch;
};

export const getUpcomingLaunches = async (limit = 30) => {
  await connectDB();
  const now = new Date();
  const launches = await Launch.find({ date: { $gte: now } })
    .sort({ date: 1 })
    .limit(limit)
    .lean();
  console.log(`📊 [QUERY] Returning ${launches.length} upcoming launches`);
  return launches;
};

export const getLaunchById = async (slug: string) => {
  await connectDB();
  return Launch.findOne({ slug }).lean();
};

// Approximate launch trajectory, modelled from data we already store.
//
// There is no free live-telemetry feed, so this is a *model*, not tracking:
//  - target orbit inclination/altitude is inferred from the mission (ISS,
//    Tiangong, SSO, polar…) or, failing that, assumed due east from the pad;
//  - the launch azimuth follows from inclination and pad latitude;
//  - ascent runs along a great circle from the pad to orbit insertion with a
//    simple altitude/downrange profile, then one circular orbit, with the
//    Earth rotating underneath the whole time;
//  - each returning booster flies from stage separation to its landing site
//    (site coordinates if known, else downrange distance, else the pad for a
//    return-to-launch-site / tower catch).
// Everything the model assumed is returned in `model`, so the UI can say so.
//
// Pure functions only — no DB, no network. Times are seconds from T-0.

/* eslint-disable @typescript-eslint/no-explicit-any */

import { classifyLanding, splashedDownInstead } from './landing';

export type TrajPoint = { t: number; lat: number; lon: number; altKm: number };

export type Trajectory = {
  slug: string;
  name: string;
  /** T-0 (ISO). */
  t0: string;
  pad: { lat: number; lon: number; name: string };
  /** Pad → orbit insertion (or apogee for suborbital flights). */
  ascent: TrajPoint[];
  /** One circular orbit after insertion — the drawn line. Empty for suborbital flights. */
  orbit: TrajPoint[];
  /**
   * The orbit continued past the first revolution, up to a little after "now"
   * (max ~24 h). Not drawn — it only places the "position now" marker.
   */
  cruise: TrajPoint[];
  boosters: Array<{ who: string; points: TrajPoint[]; landing: { lat: number; lon: number; label: string } }>;
  model: {
    inclinationDeg: number;
    azimuthDeg: number;
    altitudeKm: number;
    /** Plain-English basis for the inclination, e.g. "ISS orbit". */
    basis: string;
    suborbital: boolean;
  };
};

const R = 6371; // km
const MU = 398600.4418; // km³/s²
const OMEGA_EARTH = 7.2921159e-5; // rad/s
const DEG = Math.PI / 180;

const ASCENT_S = 540; // ~9 min to orbit insertion
const ASCENT_DOWNRANGE_KM = 1800;
const STAGE_SEP_S = 160;

type Vec = [number, number, number];

const unit = (latDeg: number, lonDeg: number): Vec => {
  const la = latDeg * DEG;
  const lo = lonDeg * DEG;
  return [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)];
};

const toLatLon = ([x, y, z]: Vec) => ({
  lat: Math.asin(Math.max(-1, Math.min(1, z))) / DEG,
  lon: Math.atan2(y, x) / DEG,
});

/** Rotate an inertial vector into the Earth-fixed frame `t` seconds after T-0. */
const earthFixed = ([x, y, z]: Vec, t: number): Vec => {
  const a = OMEGA_EARTH * t;
  return [x * Math.cos(a) + y * Math.sin(a), -x * Math.sin(a) + y * Math.cos(a), z];
};

/** Great circle through `p` heading `d` (both unit vectors), at angle θ. */
const greatCircle = (p: Vec, d: Vec, theta: number): Vec => [
  p[0] * Math.cos(theta) + d[0] * Math.sin(theta),
  p[1] * Math.cos(theta) + d[1] * Math.sin(theta),
  p[2] * Math.cos(theta) + d[2] * Math.sin(theta),
];

/** Point `km` along a great circle from (lat, lon) on bearing `azRad` (Earth-fixed, no rotation). */
const destination = (lat: number, lon: number, azRad: number, km: number) => {
  const { p, d } = basis(lat, lon, azRad);
  return toLatLon(greatCircle(p, d, km / R));
};

const basis = (lat: number, lon: number, azRad: number) => {
  const la = lat * DEG;
  const lo = lon * DEG;
  const p = unit(lat, lon);
  const east: Vec = [-Math.sin(lo), Math.cos(lo), 0];
  const north: Vec = [-Math.sin(la) * Math.cos(lo), -Math.sin(la) * Math.sin(lo), Math.cos(la)];
  const d: Vec = [
    north[0] * Math.cos(azRad) + east[0] * Math.sin(azRad),
    north[1] * Math.cos(azRad) + east[1] * Math.sin(azRad),
    north[2] * Math.cos(azRad) + east[2] * Math.sin(azRad),
  ];
  return { p, d };
};

/** Spherical interpolation between two lat/lon points. */
const slerp = (a: { lat: number; lon: number }, b: { lat: number; lon: number }, u: number) => {
  const va = unit(a.lat, a.lon);
  const vb = unit(b.lat, b.lon);
  const dot = Math.max(-1, Math.min(1, va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2]));
  const omega = Math.acos(dot);
  if (omega < 1e-9) return { lat: a.lat, lon: a.lon };
  const sa = Math.sin((1 - u) * omega) / Math.sin(omega);
  const sb = Math.sin(u * omega) / Math.sin(omega);
  return toLatLon([va[0] * sa + vb[0] * sb, va[1] * sa + vb[1] * sb, va[2] * sa + vb[2] * sb]);
};

/** Target orbit from mission data; falls back to "due east from the pad". */
function targetOrbit(launch: any, padLat: number) {
  const text = [
    launch.rocket?.spacecraft_stage?.[0]?.destination,
    launch.mission?.name,
    launch.mission?.description,
    launch.name,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  const abbrev = (launch.mission?.orbit?.abbrev ?? '').toUpperCase();
  const orbitName = (launch.mission?.orbit?.name ?? '').toLowerCase();
  const dueEast = Math.max(Math.abs(padLat), 0.5);

  if (/international space station|\biss\b/.test(text)) return { inc: 51.64, alt: 410, basis: 'ISS orbit', suborbital: false };
  if (/tiangong/.test(text)) return { inc: 41.47, alt: 390, basis: 'Tiangong orbit', suborbital: false };
  if (abbrev === 'SSO' || orbitName.includes('sun-synchronous')) return { inc: 97.6, alt: 550, basis: 'sun-synchronous orbit', suborbital: false };
  if (abbrev === 'PO' || orbitName.includes('polar')) return { inc: 90, alt: 500, basis: 'polar orbit', suborbital: false };
  if (abbrev === 'SO' || abbrev === 'SUB' || orbitName.includes('suborbital') || orbitName.includes('sub-orbital'))
    return { inc: dueEast, alt: 120, basis: 'suborbital, due east from the pad', suborbital: true };
  return { inc: dueEast, alt: 250, basis: 'due east from the pad (inclination not published)', suborbital: false };
}

export function buildTrajectory(launch: any, nowMs: number = Date.now()): Trajectory | null {
  const pad = launch?.pad;
  const t0 = launch?.net ?? launch?.date ?? launch?.window_start;
  if (!pad || typeof pad.latitude !== 'number' || typeof pad.longitude !== 'number' || !t0) return null;

  const padLat = pad.latitude;
  const padLon = pad.longitude;
  const target = targetOrbit(launch, padLat);

  // Launch azimuth (from north, clockwise) for the target inclination.
  const ratio = Math.max(-1, Math.min(1, Math.cos(target.inc * DEG) / Math.cos(padLat * DEG)));
  let az = Math.asin(ratio);
  if (target.inc >= 89.5 && target.inc <= 90.5) az = Math.PI; // polar: head south
  else if (target.inc > 90) az = Math.PI - az; // retrograde (SSO): south-southwest

  const { p, d } = basis(padLat, padLon, az);
  const sample = (theta: number, t: number, altKm: number): TrajPoint => ({
    t,
    ...toLatLon(earthFixed(greatCircle(p, d, theta), t)),
    altKm,
  });

  // Ascent: altitude rises fast then flattens; downrange starts slow then builds.
  const ascentS = target.suborbital ? 300 : ASCENT_S;
  const ascentKm = target.suborbital ? 400 : ASCENT_DOWNRANGE_KM;
  const ascent: TrajPoint[] = [];
  for (let t = 0; t <= ascentS; t += 10) {
    const u = t / ascentS;
    ascent.push(sample(((ascentKm * u * u) / R), t, target.alt * (1 - (1 - u) * (1 - u))));
  }

  // One circular orbit after insertion (drawn), then the same orbit continued
  // until shortly after "now" so the position marker keeps moving.
  const orbit: TrajPoint[] = [];
  const cruise: TrajPoint[] = [];
  if (!target.suborbital) {
    const a = R + target.alt;
    const period = 2 * Math.PI * Math.sqrt((a * a * a) / MU);
    const n = (2 * Math.PI) / period;
    const thetaIns = ascentKm / R;
    for (let dt = 0; dt <= period; dt += 30) {
      orbit.push(sample(thetaIns + n * dt, ascentS + dt, target.alt));
    }
    const elapsed = (nowMs - new Date(t0).getTime()) / 1000;
    const until = Math.min(Math.max(elapsed + 2 * 3600, 0), 24 * 3600); // cover a 2 h viewing session, max 24 h
    for (let dt = period + 60; ascentS + dt <= until; dt += 60) {
      cruise.push(sample(thetaIns + n * dt, ascentS + dt, target.alt));
    }
  }

  // Returning boosters: separation point → landing site.
  const sepT = STAGE_SEP_S;
  const sepU = sepT / ascentS;
  const sep = sample((ascentKm * sepU * sepU) / R, sepT, target.alt * (1 - (1 - sepU) * (1 - sepU)));
  const boosters: Trajectory['boosters'] = [];
  for (const stage of launch.rocket?.launcher_stage ?? []) {
    const landing = stage.landing;
    if (!landing?.attempt) continue;
    const kind = classifyLanding(landing);
    const loc = landing.landing_location;
    const hasCoords = typeof loc?.latitude === 'number' && typeof loc?.longitude === 'number';

    let site: { lat: number; lon: number } | null = null;
    let label = loc?.abbrev && loc.abbrev !== 'N/A' ? loc.abbrev : loc?.name ?? 'Landing';
    if (splashedDownInstead(landing)) {
      // Outcome overrides the plan; exact spot unknown — just offshore, downrange.
      site = destination(padLat, padLon, az, 30);
      label = 'Splashdown (approx.)';
    } else if (hasCoords) {
      site = { lat: loc.latitude, lon: loc.longitude };
    } else if (kind === 'catch' || kind === 'rtls') {
      site = { lat: padLat, lon: padLon };
    } else if (landing.downrange_distance) {
      site = destination(padLat, padLon, az, landing.downrange_distance);
    }
    if (!site) continue;

    const flight = kind === 'catch' || kind === 'rtls' ? 260 : 380;
    const points: TrajPoint[] = [];
    for (let i = 0; i <= 40; i++) {
      const u = i / 40;
      const ll = slerp(sep, site, u);
      points.push({ t: sepT + flight * u, lat: ll.lat, lon: ll.lon, altKm: (sep.altKm + 40 * Math.sin(Math.PI * u)) * Math.pow(1 - u, 0.8) });
    }
    boosters.push({ who: stage.launcher?.serial_number ?? 'Booster', points, landing: { ...site, label } });
  }

  return {
    slug: launch.slug,
    name: launch.name,
    t0: new Date(t0).toISOString(),
    pad: { lat: padLat, lon: padLon, name: pad.name ?? 'Launch pad' },
    ascent,
    orbit,
    cruise,
    boosters,
    model: {
      inclinationDeg: Math.round(target.inc * 100) / 100,
      azimuthDeg: Math.round(((az / DEG) + 360) % 360),
      altitudeKm: target.alt,
      basis: target.basis,
      suborbital: target.suborbital,
    },
  };
}

/** Is the launch live right now (webcast on, or in flight)? Drives the globe button. */
export function isLaunchLive(launch: any): boolean {
  const status = `${launch?.status?.abbrev ?? ''} ${launch?.status?.name ?? ''}`.toLowerCase();
  return Boolean(launch?.webcast_live) || /in flight|inflight/.test(status);
}

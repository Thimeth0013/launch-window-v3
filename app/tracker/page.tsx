import type { Metadata } from 'next';
import AppHeader from '../../components/sections/AppHeader';
import SatelliteScene, { SatellitePosition } from '../../components/sections/SatelliteScene';
import { ensureFreshSatellites, getSatellitePositions } from '../lib/services/n2yoService';
import { getOrFetchLaunchDetailedBySlug } from '../lib/services/launchService';
import { buildTrajectory, type Trajectory } from '../lib/launch/trajectory';

export const metadata: Metadata = {
  title: 'Launch Window',
  description: 'Live XYZ positions of selected satellites tracked by N2YO.com',
};

export const dynamic = 'force-dynamic';

export default async function TrackerPage({ searchParams }: { searchParams: Promise<{ launch?: string }> }) {
  // `?launch=<slug>` overlays that launch's modelled trajectory on the globe
  // (linked from the launch page while a launch is live). Slug in the URL; the
  // service resolves it to the Space Devs id as usual.
  const { launch: launchSlug } = await searchParams;
  let trajectory: Trajectory | null = null;
  if (launchSlug) {
    try {
      const launch = await getOrFetchLaunchDetailedBySlug(launchSlug);
      trajectory = launch ? buildTrajectory(JSON.parse(JSON.stringify(launch))) : null;
    } catch (error: any) {
      console.warn(`⚠️ [TRACKER_PAGE] trajectory for "${launchSlug}" failed: ${error?.message ?? 'unknown'}`);
    }
  }

  try {
    await ensureFreshSatellites();
  } catch (error: any) {
    console.warn(`⚠️ [TRACKER_PAGE] ensureFreshSatellites failed: ${error?.message ?? 'unknown'}`);
  }

  const positions = (await getSatellitePositions()).map((p: any) => ({
    id: p.id,
    name: p.name,
    displayName: p.displayName,
    coordinateSystem: p.coordinateSystem,
    windowStart: new Date(p.windowStart).toISOString(),
    windowEnd: new Date(p.windowEnd).toISOString(),
    samples: (p.samples ?? []).map((s: any) => ({
      t: new Date(s.t).toISOString(),
      x: s.x,
      y: s.y,
      z: s.z,
      lat: s.lat,
      lon: s.lon,
      radial: s.radial,
    })),
    stale: !!p.stale,
    lastError: p.lastError ?? null,
  })) as SatellitePosition[];

  return (
    <div className="relative w-full h-dvh bg-[#020810] overflow-hidden">
      {/* Site-wide header — fixed, sits on top of the canvas */}
      <AppHeader />

      {/* Three.js scene fills the full viewport; the header floats above it */}
      <SatelliteScene initialPositions={positions} trajectory={trajectory} />
    </div>
  );
}

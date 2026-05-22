import type { Metadata } from 'next';
import AppHeader from '../../components/sections/AppHeader';
import SatelliteScene, { SatellitePosition } from '../../components/sections/SatelliteScene';
import { ensureFreshSatellites, getSatellitePositions } from '../lib/services/sscService';

export const metadata: Metadata = {
  title: 'Launch Window',
  description: 'Live XYZ positions of selected satellites tracked by NASA SSC.',
};

export const dynamic = 'force-dynamic';

export default async function TrackerPage() {
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
    <div className="relative w-full h-screen bg-[#020810] overflow-hidden">
      {/* Site-wide header — fixed, sits on top of the canvas */}
      <AppHeader />

      {/* Three.js scene fills the full viewport; the header floats above it */}
      <SatelliteScene initialPositions={positions} />
    </div>
  );
}

import { NextRequest, NextResponse } from 'next/server';
import { ensureFreshSatellites, getSatellitePositions, SATELLITE_CONFIGS } from '../../../lib/services/n2yoService';

// Revalidate every 3 minutes to align with N2YO's 5-minute window limitation
export const revalidate = 180;

const VALID_IDS = new Set(SATELLITE_CONFIGS.map((c) => c.id));

export async function GET(request: NextRequest) {
  try {
    const idsParam = request.nextUrl.searchParams.get('ids');
    const requested = idsParam
      ? idsParam.split(',').map((s) => s.trim()).filter((s) => VALID_IDS.has(s))
      : undefined;

    await ensureFreshSatellites();
    const positions = await getSatellitePositions(requested);

    return NextResponse.json(
      { positions, fetchedAt: new Date().toISOString() },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=180, stale-while-revalidate=120',
          'X-Satellite-Count': positions.length.toString(),
        },
      },
    );
  } catch (error: any) {
    console.error('❌ [SATELLITES_ROUTE_ERROR]:', error.message);
    try {
      const fallback = await getSatellitePositions();
      return NextResponse.json(
        { positions: fallback, fetchedAt: new Date().toISOString() },
        { status: 200, headers: { 'X-Cache-Fallback': 'true' } },
      );
    } catch (dbError: any) {
      return NextResponse.json(
        { message: 'Failed to fetch satellite positions', error: dbError.message },
        { status: 500 },
      );
    }
  }
}
// app/api/launches/[slug]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../lib/db/mongodb';
import { getOrFetchLaunchDetailedBySlug } from '../../../lib/services/launchService';

export const revalidate = 1800;

// GET /api/launches/[slug]
// Reads the detailed payload via the lazy accessor — getOrFetchLaunchDetailedBySlug
// handles cache lookup, on-demand detailed fetching, and freshness (tighter
// TTL inside the T-2h critical window).
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB();
    const { slug } = await params;
    console.log(`🔍 [DETAIL_REQUEST] slug=${slug}`);

    const launch: any = await getOrFetchLaunchDetailedBySlug(slug);
    if (!launch) {
      return NextResponse.json(
        { message: 'Launch not found', requestedSlug: slug },
        { status: 404 }
      );
    }

    // Tighter CDN cache while we're inside the T-2h → T+10min critical window;
    // 30-min cache otherwise.
    const now = new Date();
    const launchDate = launch.date ? new Date(launch.date) : null;
    const hoursUntilLaunch = launchDate
      ? (launchDate.getTime() - now.getTime()) / (1000 * 60 * 60)
      : null;
    const inCritical =
      hoursUntilLaunch !== null && hoursUntilLaunch >= -0.167 && hoursUntilLaunch <= 2;

    return NextResponse.json(launch, {
      headers: {
        'Cache-Control': inCritical
          ? 'public, s-maxage=300, stale-while-revalidate=600'
          : 'public, s-maxage=1800, stale-while-revalidate=3600',
      },
    });
  } catch (error: any) {
    console.error('❌ [DETAIL_ERROR]', error);
    return NextResponse.json(
      { message: 'Error fetching launch details', error: error.message },
      { status: 500 }
    );
  }
}

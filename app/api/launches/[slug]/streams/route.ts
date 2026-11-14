// app/api/launches/[slug]/streams/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../../lib/db/mongodb';
import Launch from '../../../../lib/db/models/Launch';
import LaunchDetailed from '../../../../lib/db/models/LaunchDetailed';
import { getOrSyncStreams } from '../../../../lib/services/youtubeService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB();
    const { slug } = await params;
    const force = request.nextUrl.searchParams.get('force') === 'true';
    
    // Find the launch by slug
    const launch = await Launch.findOne({ slug }).lean();
    if (!launch) {
      return NextResponse.json({ message: 'Launch not found' }, { status: 404 });
    }
    
    // The detailed doc's webcast_live is refreshed far more often than the
    // hourly list doc's — use it so a live mission keeps the short stream TTL.
    // Keyed by the Space Devs launch id, like every LaunchDetailed lookup.
    const detailed = await LaunchDetailed.findOne({ id: (launch as any).id }).select('webcast_live').lean<{ webcast_live?: boolean }>();

    // getOrSyncStreams handles caching using MongoDB StreamSync
    const streams = await getOrSyncStreams(
      { ...launch, webcast_live: Boolean((launch as any).webcast_live || detailed?.webcast_live) },
      force
    );
    
    return NextResponse.json(streams, {
      headers: {
        'Cache-Control': 'no-store, max-age=0'
      }
    });
  } catch (error: any) {
    console.error('Failed to get streams:', error);
    return NextResponse.json({ message: 'Server Error', error: error.message }, { status: 500 });
  }
}

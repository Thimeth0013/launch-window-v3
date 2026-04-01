// app/api/launches/[slug]/streams/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../../lib/db/mongodb';
import Launch from '../../../../lib/db/models/Launch';
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
    
    // getOrSyncStreams handles caching using MongoDB StreamSync
    const streams = await getOrSyncStreams(launch, force);
    
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

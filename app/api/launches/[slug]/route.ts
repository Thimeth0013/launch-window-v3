// app/api/launches/[slug]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../lib/db/mongodb';
import Launch from '../../../lib/db/models/Launch';

export const revalidate = 1800; // Revalidate every 30 minutes

// GET /api/launches/[slug]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB();
    
    // Await the params promise
    const { slug } = await params;
    console.log(`🔍 [DETAIL_REQUEST] Received request for launch slug: ${slug}`);
    
    const launch = await Launch.findOne({ slug }).select('-_id').lean();
    
    if (!launch) {
      console.log(`❌ [NOT_FOUND] Launch with slug ${slug} not found in database`);
      return NextResponse.json(
        { message: 'Launch not found', requestedSlug: slug },
        { status: 404 }
      );
    }
    
    // Check for scrubs if launch is within critical window (T-2h to T+10min)
    const now = new Date();
    const launchDate = new Date(launch.date);
    const hoursUntilLaunch = (launchDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursUntilLaunch >= -0.167 && hoursUntilLaunch <= 2) {
      console.log(`⏰ [CRITICAL] Launch at T-${hoursUntilLaunch.toFixed(2)}h - checking for updates...`);
      // Import dynamically to avoid circular dependencies
      const { checkForScrub } = await import('../../../lib/services/scrubDetectionScheduler');
      const updatedLaunch = await checkForScrub(launch);
      
      return NextResponse.json(updatedLaunch, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' // 5 min cache during critical window
        }
      });
    }
    
    console.log(`✅ [SUCCESS] Returning launch: ${launch.name}`);
    
    return NextResponse.json(launch, {
      headers: {
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' // 30 min cache normally
      }
    });
  } catch (error: any) {
    console.error(`❌ [DETAIL_ERROR] Error fetching launch:`, error);
    return NextResponse.json(
      { message: 'Error fetching launch details', error: error.message },
      { status: 500 }
    );
  }
}
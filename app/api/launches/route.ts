// app/api/launches/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../lib/db/mongodb';
import Launch from '../../lib/db/models/Launch';
import LaunchSync from '../../lib/db/models/LaunchSync';
import { fetchUpcomingLaunches } from '../../lib/services/launchService';

// Revalidate cache every hour
export const revalidate = 3600;

let isSyncing = false;

// GET /api/launches
export async function GET(request: NextRequest) {
  const ONE_HOUR = 60 * 60 * 1000;
  const now = new Date();

  try {
    await connectDB();

    // 1. Check Global Sync status
    let globalSync = await LaunchSync.findOne({ syncId: 'GLOBAL_LAUNCH_SYNC' });

    // 2. If it's the first time OR 1 hour has passed, sync with external API
    if (!globalSync || (now.getTime() - new Date(globalSync.lastUpdated).getTime()) > ONE_HOUR) {
      console.log("⏱️ [LAZY_SYNC] Hour elapsed. Refreshing launch database...");
      
      try {
        // Update the manifest
        await fetchUpcomingLaunches();

        // Update the timestamp
        globalSync = await LaunchSync.findOneAndUpdate(
          { syncId: 'GLOBAL_LAUNCH_SYNC' },
          { lastUpdated: now },
          { upsert: true, new: true }
        );
        
        console.log(`✅ [SYNC_COMPLETE] Database updated at ${now.toISOString()}`);
      } catch (syncError) {
        console.error('⚠️ [SYNC_ERROR] Failed to sync, serving cached data:', syncError);
        // Continue to serve cached data even if sync fails
      }
    } else {
      const cacheAge = Math.floor((now.getTime() - new Date(globalSync.lastUpdated).getTime()) / 1000 / 60);
      console.log(`📦 [CACHE_HIT] Serving cached data (${cacheAge} minutes old)`);
    }

    // 3. Fetch data from local MongoDB
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '30', 10);
    const provider = searchParams.get('provider'); // Optional filter by provider
    const includeCompleted = searchParams.get('includeCompleted') === 'true'; // New param
    
    // Define time ranges
    const GRACE_PERIOD = 6 * 60 * 60 * 1000; // 6 hours
    const LOOKBACK_PERIOD = 30 * 24 * 60 * 60 * 1000; // 30 days for completed launches
    
    // Build query based on includeCompleted flag
    const query: any = {};
    
    if (includeCompleted) {
      // Show launches from the last 30 days (including completed ones)
      const lookbackThreshold = new Date(now.getTime() - LOOKBACK_PERIOD);
      query.date = { $gte: lookbackThreshold };
    } else {
      // Show only upcoming launches (with 6-hour grace period)
      const displayThreshold = new Date(now.getTime() - GRACE_PERIOD);
      query.date = { $gte: displayThreshold };
    }
    
    if (provider) {
      query.provider = provider;
    }
    
    const launches = await Launch.find(query)
      .sort({ date: includeCompleted ? -1 : 1 }) // Descending for completed, ascending for upcoming
      .limit(Math.min(limit, 100)) // Cap at 100 for safety
      .select('-_id') // Exclude MongoDB _id field
      .lean(); // Use lean() for better performance
    
    console.log(`✅ [LAUNCHES] Returning ${launches.length} launches (includeCompleted: ${includeCompleted})`);

    // Return simple array for easier consumption
    return NextResponse.json(launches, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        'X-Launch-Count': launches.length.toString(),
        'X-Cache-Age': globalSync 
          ? Math.floor((now.getTime() - new Date(globalSync.lastUpdated).getTime()) / 1000 / 60).toString() 
          : '0'
      }
    });
  } catch (error: any) {
    console.error("❌ [LAUNCH_ROUTE_ERROR]:", error.message);
    
    // Try to serve cached data even on error
    try {
      await connectDB();
      const launches = await Launch.find({
        date: { $gte: now }
      })
        .sort({ date: 1 })
        .limit(20)
        .select('-_id') // Exclude MongoDB _id field
        .lean();
      
      console.log(`⚠️ [FALLBACK] Serving ${launches.length} cached launches after error`);
      
      return NextResponse.json(launches, {
        status: 200, // Still return 200 since we have data
        headers: {
          'X-Cache-Fallback': 'true'
        }
      });
    } catch (dbError: any) {
      console.error("❌ [FALLBACK_ERROR]:", dbError.message);
      return NextResponse.json(
        { 
          message: 'Failed to fetch launches', 
          error: dbError.message
        },
        { status: 500 }
      );
    }
  }
}
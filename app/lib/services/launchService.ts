// lib/services/launchService.ts
import axios from 'axios';
import Launch from '../db/models/Launch';
import StreamSync from '../db/models/StreamSync';

const LAUNCH_LIBRARY_API = 'https://ll.thespacedevs.com/2.3.0';

interface ApiLaunch {
  id: string;
  name: string;
  net: string;
  status: {
    name: string;
  };
  [key: string]: any;
}

// Detect significant mission changes
const detectSignificantChanges = (oldLaunch: any, apiLaunch: ApiLaunch): boolean => {
  const oldDate = new Date(oldLaunch.date);
  const newDate = new Date(apiLaunch.net);
  
  const delayHours = (newDate.getTime() - oldDate.getTime()) / (1000 * 60 * 60);
  const isSignificantDelay = delayHours > 24;
  
  const oldStatus = oldLaunch.status?.name || oldLaunch.status;
  const newStatus = apiLaunch.status?.name || 'Unknown';
  const statusLost = (oldStatus.includes('Go') && (newStatus.includes('TBD') || newStatus.includes('TBC')));

  return isSignificantDelay || statusLost;
};

// Retry helper
const fetchWithRetry = async (url: string, config: any, maxRetries = 3) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.get(url, config);
      return response;
    } catch (error: any) {
      lastError = error;
      if (error.response?.status >= 400 && error.response?.status < 500) {
        throw error;
      }
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }
  }
  throw lastError;
};

export const fetchUpcomingLaunches = async () => {
  try {
    console.log('📡 [SYNC] Fetching launches from API v2.3.0 (detailed mode)...');
    
    const response = await fetchWithRetry(
      `${LAUNCH_LIBRARY_API}/launches/upcoming/`,
      { 
        params: { 
          limit: 30, 
          mode: 'detailed'
        }, 
        timeout: 30000 
      }
    );

    const apiLaunches: ApiLaunch[] = response.data.results;
    if (!apiLaunches) {
      console.log('⚠️ [SYNC] No launches returned from API');
      return [];
    }

    console.log(`📡 [SYNC] Processing ${apiLaunches.length} launches from API...`);

    for (const apiLaunch of apiLaunches) {
      try {
        const existingLaunch = await Launch.findOne({ id: apiLaunch.id });

        if (existingLaunch) {
          const needsStreamCleanup = detectSignificantChanges(existingLaunch, apiLaunch);
          
          if (needsStreamCleanup) {
            console.log(`🗑️ [CLEANUP] Launch "${apiLaunch.name}" delayed/changed. Wiping stale streams.`);
            await StreamSync.deleteOne({ launchId: apiLaunch.id });
          }
        }

        // Store FULL detailed data
        await Launch.findOneAndUpdate(
          { id: apiLaunch.id },
          {
            ...apiLaunch,
            date: new Date(apiLaunch.net),
            net: apiLaunch.net ? new Date(apiLaunch.net) : null,
            last_updated: apiLaunch.last_updated ? new Date(apiLaunch.last_updated) : null,
            window_end: apiLaunch.window_end ? new Date(apiLaunch.window_end) : null,
            window_start: apiLaunch.window_start ? new Date(apiLaunch.window_start) : null,
            provider: apiLaunch.launch_service_provider?.name || 'Unknown'
          },
          { upsert: true, new: true }
        );
        
        console.log(`✅ [SAVED] ${apiLaunch.name}`);
      } catch (error: any) {
        console.error(`❌ [ERROR] Failed to save launch ${apiLaunch.id}: ${error.message}`);
      }
    }

    console.log(`✅ [SYNC] Completed processing ${apiLaunches.length} launches`);
    return apiLaunches;
  } catch (error: any) {
    console.error('❌ [SYNC_ERROR]:', error.message);
    throw error;
  }
};

export const getUpcomingLaunches = async (limit = 30) => {
  const now = new Date();
  const launches = await Launch.find({
    date: { $gte: now }
  })
    .sort({ date: 1 })
    .limit(limit)
    .lean();
  
  console.log(`📊 [QUERY] Returning ${launches.length} upcoming launches from database`);
  return launches;
};

export const getLaunchById = async (slug: string) => {
  console.log(`🔍 [QUERY] Searching for launch with ID: ${slug}`);
  
  const launch = await Launch.findOne({ slug }).lean();
  
  if (!launch) {
    console.log(`❌ [NOT_FOUND] No launch found with ID: ${slug}`);
  } else {
    console.log(`✅ [FOUND] Launch "${launch.name}" retrieved successfully`);
  }
  
  return launch;
};
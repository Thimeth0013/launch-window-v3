// lib/services/lightCheckService.ts
import axios from 'axios';
import Launch from '../db/models/Launch';

const LAUNCH_LIBRARY_API = 'https://ll.thespacedevs.com/2.3.0';

// Rate limit tracker (in-memory for serverless)
let apiCallCount = 0;
let lastResetTime = Date.now();

// Reset counter every hour
function checkRateLimitReset() {
  const now = Date.now();
  if (now - lastResetTime > 3600000) { // 1 hour
    apiCallCount = 0;
    lastResetTime = now;
  }
}

function canMakeApiCall(): boolean {
  checkRateLimitReset();
  return apiCallCount < 14; // Save 1 call as buffer
}

function incrementApiCall() {
  checkRateLimitReset();
  apiCallCount++;
  console.log(`📊 [RATE_LIMIT] API calls used: ${apiCallCount}/15 this hour`);
}

export enum LaunchPhase {
  STANDBY = 'STANDBY',      // > 24h
  APPROACH = 'APPROACH',    // 1h - 24h
  TERMINAL = 'TERMINAL'     // < 1h
}

export function getLaunchPhase(launchDate: Date): LaunchPhase {
  const now = new Date();
  const hoursUntil = (launchDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  if (hoursUntil < 1) return LaunchPhase.TERMINAL;
  if (hoursUntil < 24) return LaunchPhase.APPROACH;
  return LaunchPhase.STANDBY;
}

export function shouldSync(launch: any): boolean {
  const phase = getLaunchPhase(new Date(launch.date));
  const lastUpdated = new Date(launch.last_updated || launch.updatedAt);
  const minutesSinceUpdate = (Date.now() - lastUpdated.getTime()) / (1000 * 60);
  
  switch (phase) {
    case LaunchPhase.STANDBY:
      // Sync once every 24 hours
      return minutesSinceUpdate > 1440;
    
    case LaunchPhase.APPROACH:
      // Sync once per hour
      return minutesSinceUpdate > 60;
    
    case LaunchPhase.TERMINAL:
      // Sync every 4.5 minutes
      return minutesSinceUpdate > 4.5;
    
    default:
      return false;
  }
}

// Light check: Use list mode to check for updates (API uses id)
async function performLightCheck(launchId: string): Promise<{ hasChanges: boolean; lastUpdated: string | null }> {
  if (!canMakeApiCall()) {
    console.log('⚠️ [RATE_LIMIT] Skipping light check - limit reached');
    return { hasChanges: false, lastUpdated: null };
  }

  try {
    incrementApiCall();
    const response = await axios.get(
      `${LAUNCH_LIBRARY_API}/launches/${launchId}/`,
      { 
        params: { mode: 'list' },
        timeout: 10000 
      }
    );

    return {
      hasChanges: true, // We'll compare timestamps in the caller
      lastUpdated: response.data.last_updated
    };
  } catch (error: any) {
    console.error(`❌ [LIGHT_CHECK_ERROR] ${error.message}`);
    return { hasChanges: false, lastUpdated: null };
  }
}

// Heavy fetch: Get full detailed data (API uses id)
async function performDetailedFetch(launchId: string): Promise<any | null> {
  if (!canMakeApiCall()) {
    console.log('⚠️ [RATE_LIMIT] Skipping detailed fetch - limit reached');
    return null;
  }

  try {
    incrementApiCall();
    const response = await axios.get(
      `${LAUNCH_LIBRARY_API}/launches/${launchId}/`,
      { 
        params: { mode: 'detailed' },
        timeout: 30000 
      }
    );

    return response.data;
  } catch (error: any) {
    console.error(`❌ [DETAILED_FETCH_ERROR] ${error.message}`);
    return null;
  }
}

// Main sync function with light-check optimization
export async function syncLaunch(launch: any): Promise<any> {
  console.log(`🔍 [SYNC_CHECK] Checking ${launch.name}`);

  // Step 1: Perform light check (API uses id)
  const lightCheck = await performLightCheck(launch.id);

  if (!lightCheck.lastUpdated) {
    console.log(`⚠️ [SYNC_SKIP] Could not perform light check for ${launch.name}`);
    return launch;
  }

  // Step 2: Compare timestamps
  const dbLastUpdated = new Date(launch.last_updated || launch.updatedAt);
  const apiLastUpdated = new Date(lightCheck.lastUpdated);

  if (apiLastUpdated <= dbLastUpdated) {
    console.log(`✅ [NO_CHANGES] ${launch.name} is up to date`);
    return launch;
  }

  // Step 3: Timestamp changed - fetch detailed data (API uses id)
  console.log(`🔄 [CHANGES_DETECTED] ${launch.name} needs update`);
  const detailedData = await performDetailedFetch(launch.id);

  if (!detailedData) {
    console.log(`⚠️ [FETCH_FAILED] Could not get detailed data for ${launch.name}`);
    return launch;
  }

  // Step 4: Update database using slug
  try {
    const updatedLaunch = await Launch.findOneAndUpdate(
      { slug: launch.slug },
      {
        ...detailedData,
        date: new Date(detailedData.net),
        net: detailedData.net ? new Date(detailedData.net) : null,
        last_updated: apiLastUpdated,
        window_end: detailedData.window_end ? new Date(detailedData.window_end) : null,
        window_start: detailedData.window_start ? new Date(detailedData.window_start) : null,
        provider: detailedData.launch_service_provider?.name || 'Unknown'
      },
      { new: true }
    );

    console.log(`✅ [UPDATED] ${launch.name}`);
    return updatedLaunch;
  } catch (error: any) {
    console.error(`❌ [DB_UPDATE_ERROR] ${error.message}`);
    return launch;
  }
}

// Get the 2 closest launches in Terminal Count phase
export async function getActiveLaunches(): Promise<any[]> {
  const now = new Date();
  const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const launches = await Launch.find({
    date: { 
      $gte: now,
      $lte: oneDayFromNow 
    }
  })
    .sort({ date: 1 })
    .limit(10)
    .lean();

  // Filter for Terminal Count phase and take top 2
  const terminalLaunches = launches
    .filter(launch => getLaunchPhase(new Date(launch.date)) === LaunchPhase.TERMINAL)
    .slice(0, 2);

  return terminalLaunches.length > 0 ? terminalLaunches : launches.slice(0, 2);
}

// Smart sync: Prioritize closest launches
export async function performSmartSync(): Promise<void> {
  console.log('🚀 [SMART_SYNC] Starting intelligent sync...');

  const activeLaunches = await getActiveLaunches();
  
  if (activeLaunches.length === 0) {
    console.log('ℹ️ [SMART_SYNC] No active launches to sync');
    return;
  }

  console.log(`📊 [SMART_SYNC] Found ${activeLaunches.length} active launches`);

  // Sync each active launch
  for (const launch of activeLaunches) {
    if (shouldSync(launch)) {
      await syncLaunch(launch);
      
      // Add delay between syncs to avoid rate limiting
      if (activeLaunches.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } else {
      console.log(`⏭️ [SKIP] ${launch.name} synced recently`);
    }
  }

  console.log('✅ [SMART_SYNC] Sync complete');
}
import axios from 'axios';
import StreamSync from '../db/models/StreamSync';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// Known space streaming channels with their search behavior
const CHANNEL_CONFIGS: Record<string, { name: string; strictness: string; isISRO?: boolean }> = {
  'UC6uKrU_WqJ1R2HMTY3LIx5Q': { name: 'Everyday Astronaut', strictness: 'moderate' },
  'UCSUu1lih2RifWkKtDOJdsBA': { name: 'NASASpaceflight', strictness: 'moderate' },
  'UCGCndz0n0NHmLHfd64FRjIA': { name: 'The Launch Pad', strictness: 'moderate' },
  'UCoLdERT4-TJ82PJOHSrsZLQ': { name: 'Spaceflight Now', strictness: 'moderate' },
  'UCVTomc35agH1SM6kCKzwW_g': { name: 'VideoFromSpace', strictness: 'moderate' },
  'UC2_vpnza621Sa0cf_xhqJ8Q': { name: 'Raw Space', strictness: 'moderate' },
  'UC9T3XwCjQdzpSp7IzGkbtJA': { name: 'International Rocket Launches', strictness: 'strict' },
  'UCLA_DiR1FfKNvjuUpBHmylQ': { name: 'NASA', strictness: 'moderate' },
  'UCw5hEVOTfz_AfzsNFWyNlNg': { name: 'ISRO Official', strictness: 'moderate', isISRO: true },
  'UCPkKkvT2DNoQt9LwjAE5LGQ': { name: 'Launch Heaven', strictness: 'moderate' },
  'UCsWq7LZaizhIi-c-Yo_bcpw': { name: 'Rocket Labs', strictness: 'moderate'}
};

const API_QUOTA_TRACKER = {
  callsThisRun: 0,
  maxCallsPerRun: 50, 
};

// --- HELPER FUNCTIONS ---

function isHighProfile(rocketName: string) {
  const name = rocketName.toLowerCase();
  return (
    name.includes('starship') || name.includes('new glenn') ||
    name.includes('sls') || name.includes('space launch system') ||
    name.includes('falcon heavy') || name.includes('ariane 6') || name.includes('vulcan')
  );
}

function isIndianMission(launchName: string) {
  const name = launchName.toLowerCase();
  return name.includes('pslv') || name.includes('gslv') || name.includes('lvm3') || name.includes('sslv');
}

function parseIndianMission(launchName: string) {
  const parts = launchName.split('|');
  const rocketPart = parts[0].trim();
  let payloadPart = parts[1]?.trim();
  
  if (payloadPart) {
    payloadPart = payloadPart
      .replace(/\s+and\s+others?/gi, '')
      .replace(/\s+etc\.?/gi, '')
      .trim();
  }
  
  let baseRocket = '';
  if (rocketPart.toLowerCase().includes('pslv')) baseRocket = 'PSLV';
  else if (rocketPart.toLowerCase().includes('gslv')) baseRocket = 'GSLV';
  else if (rocketPart.toLowerCase().includes('lvm3')) baseRocket = 'LVM3';
  else if (rocketPart.toLowerCase().includes('sslv')) baseRocket = 'SSLV';
  
  return {
    baseRocket,
    variant: rocketPart,
    payload: payloadPart,
    isIndian: true
  };
}

function getRocketName(launchName: string) {
  const lower = launchName.toLowerCase();
  
  if (isIndianMission(launchName)) {
    const indianInfo = parseIndianMission(launchName);
    return indianInfo.baseRocket;
  }
  
  if (lower.includes('new glenn')) return 'New Glenn';
  if (lower.includes('starship')) return 'Starship';
  if (lower.includes('falcon heavy')) return 'Falcon Heavy';
  if (lower.includes('falcon 9')) return 'Falcon 9';
  if (lower.includes('atlas v')) return 'Atlas V';
  if (lower.includes('electron')) return 'Electron';
  if (lower.includes('vulcan')) return 'Vulcan';
  
  if (lower.includes('long march')) {
    const match = launchName.match(/Long March [\w/-]+/i);
    return match ? match[0] : 'Long March';
  }
  return launchName.split('|')[0].trim();
}

function extractMissionInfo(launchName: string) {
  const lower = launchName.toLowerCase();
  
  if (isIndianMission(launchName)) {
    const indianInfo = parseIndianMission(launchName);
    return {
      type: 'indian',
      ...indianInfo,
      isFrequent: false
    };
  }
  
  if (lower.includes('starlink')) {
    const match = launchName.match(/Starlink Group ([\d-]+)/i);
    return { type: 'starlink', group: match ? match[1] : null, isFrequent: true };
  }
  if (lower.includes('starship')) {
    const match = launchName.match(/Flight (\d+)/i);
    return { type: 'starship', flightNumber: match ? match[1] : null, isFrequent: false };
  }
  const parts = launchName.split('|');
  if (parts.length > 1) {
    return { type: 'payload', payload: parts[1].trim(), isFrequent: false };
  }
  return { type: 'unknown', isFrequent: false };
}

function buildSearchQuery(launchName: string, channelId: string) {
  const channelConfig = CHANNEL_CONFIGS[channelId];
  const missionInfo = extractMissionInfo(launchName);
  
  if (channelConfig.isISRO && missionInfo.type === 'indian') {
    return missionInfo.payload || (missionInfo as any).baseRocket;
  }
  
  const rocketName = getRocketName(launchName);
  
  if (isHighProfile(rocketName)) {
    // For high-profile rockets with a payload (e.g. 'SLS Block 1 | Artemis II'),
    // streams are almost always titled after the mission/payload, not the rocket.
    // Search using payload name so we find 'Artemis II Countdown' etc.
    if (missionInfo.type === 'payload' && (missionInfo as any).payload) {
      return (missionInfo as any).payload;
    }
    return rocketName;
  }
  if (missionInfo.type === 'starlink' && (missionInfo as any).group) return `${rocketName} Starlink`;
  if (missionInfo.type === 'payload' && (missionInfo as any).payload) return `${rocketName} ${(missionInfo as any).payload}`;
  
  return rocketName;
}

function isStreamMatch(item: any, launchName: string, missionInfo: any, isHighProfileRocket: boolean, channelId: string) {
  const title = item.snippet.title.toLowerCase();
  const description = (item.snippet.description || '').toLowerCase();
  const combined = `${title} ${description}`;
  const channelConfig = CHANNEL_CONFIGS[channelId];
  
  if (channelConfig.isISRO && missionInfo.type === 'indian') {
    const baseRocketMatch = combined.includes(missionInfo.baseRocket.toLowerCase());
    const payloadMatch = missionInfo.payload && combined.includes(missionInfo.payload.toLowerCase());
    return (baseRocketMatch && payloadMatch) || payloadMatch;
  }
  
  const rocketName = getRocketName(launchName).toLowerCase();
  
  if (isHighProfileRocket) {
    // For high-profile missions, match on rocket name OR mission/payload name.
    // e.g. 'SLS Block 1 | Artemis II' → match 'sls' OR 'artemis ii' OR 'artemis2' OR 'artemis 2'
    if (combined.includes(rocketName)) return true;
    if (missionInfo.type === 'payload' && missionInfo.payload) {
      // Normalize payload for fuzzy matching (handles 'Artemis II' vs '#Artemis2' vs 'Artemis 2')
      const payload = missionInfo.payload.toLowerCase();
      // Extract just the primary name keyword (first word, or first two words)
      const keywords = payload.split(/\s+/);
      const primaryWord = keywords[0]; // e.g. 'artemis'
      // Check strict payload match first
      if (combined.includes(payload)) return true;
      // Check flexible match: primary keyword present + (number or roman numeral of the mission)
      if (primaryWord && combined.includes(primaryWord)) {
        // If there's a second word (like 'ii' or '2'), try to match it flexibly
        if (keywords.length > 1) {
          const suffix = keywords[keywords.length - 1];
          // Convert roman numeral to digit and vice versa for matching
          const asDigit = suffix === 'ii' ? '2' : suffix === 'iii' ? '3' : suffix === 'iv' ? '4' : suffix;
          const asRoman = suffix === '2' ? 'ii' : suffix === '3' ? 'iii' : suffix === '4' ? 'iv' : suffix;
          return combined.includes(asDigit) || combined.includes(asRoman);
        }
        return true; // Single-word payload (e.g. 'Starship'), primary word match is enough
      }
    }
    // Fallback: match any significant word from the rocket name (e.g. 'sls', 'starship')
    return combined.includes(rocketName.split(' ')[0]);
  }

  if (missionInfo.type === 'starlink' && missionInfo.group) {
    if (!combined.includes('starlink')) return false;
    const group = missionInfo.group.toLowerCase();
    return combined.includes(group) || combined.includes(group.replace('-', ' '));
  }

  if (missionInfo.type === 'payload' && missionInfo.payload) {
    const payload = missionInfo.payload.toLowerCase();
    if (!payload.includes('unknown')) return combined.includes(payload);
  }

  return combined.includes(rocketName.split(' ')[0]);
}

function deduplicateStreams(streams: any[]) {
  const seen = new Set();
  return streams.filter(s => {
    if (seen.has(s.streamId)) return false;
    seen.add(s.streamId);
    return true;
  });
}

function calculateMatchScore(streamTitle: string, launchName: string, missionInfo: any) {
  const streamLower = streamTitle.toLowerCase();
  let score = 0;
  const rocket = getRocketName(launchName).toLowerCase();
  
  if (missionInfo.type === 'indian') {
    if (streamLower.includes(missionInfo.baseRocket.toLowerCase())) score += 3;
    if (missionInfo.payload && streamLower.includes(missionInfo.payload.toLowerCase())) score += 5;
    return Math.min(score / 10, 1);
  }
  
  if (streamLower.includes(rocket)) score += 3;
  if (missionInfo.type === 'starlink' && missionInfo.group && streamLower.includes(missionInfo.group.toLowerCase())) score += 5;
  if (missionInfo.type === 'payload' && missionInfo.payload && streamLower.includes(missionInfo.payload.toLowerCase())) score += 4;
  
  return Math.min(score / 10, 1);
}

// --- CORE EXPORTS ---

export const checkChannelUpcomingStreams = async (channelId: string, launchName: string) => {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.warn(`⚠️  [YT] YOUTUBE_API_KEY not set — stream search skipped`);
    return [];
  }

  const channelName = CHANNEL_CONFIGS[channelId]?.name || channelId;
  const searchQuery = buildSearchQuery(launchName, channelId);
  const missionInfo = extractMissionInfo(launchName);
  const isHighProfileRocket = isHighProfile(getRocketName(launchName));

  console.log(`  🔎 [YT] Channel: ${channelName} | Query: "${searchQuery}"`);

  const allItems: any[] = [];

  // --- 1. Fetch UPCOMING streams (all scheduled future broadcasts) ---
  try {
    const res = await axios.get(`${YOUTUBE_API_BASE}/search`, {
      params: { key: apiKey, part: 'snippet', channelId, type: 'video', eventType: 'upcoming', maxResults: 10, q: searchQuery },
      timeout: 10000,
    });
    API_QUOTA_TRACKER.callsThisRun++;
    // Only include items explicitly marked as 'upcoming' by YouTube to exclude completed VODs
    const items = (res.data.items || []).filter(
      (item: any) => item.snippet.liveBroadcastContent === 'upcoming'
    );
    console.log(`     📺 [YT] ${channelName} [upcoming] → ${items.length} scheduled result(s) | Quota this run: ${API_QUOTA_TRACKER.callsThisRun * 100} units`);
    allItems.push(...items);
  } catch (error: any) {
    const status = error.response?.status;
    console.error(`  ❌ [YT] ${channelName} [upcoming] → ${status === 403 ? '403 Forbidden — quota exceeded or bad API key' : error.message}`);
  }

  await new Promise(r => setTimeout(r, 150));

  // --- 2. Fetch LIVE streams (currently broadcasting) ---
  // Important: filter to only items where liveBroadcastContent === 'live'
  // to avoid YouTube returning old completed VODs via this endpoint
  try {
    const res = await axios.get(`${YOUTUBE_API_BASE}/search`, {
      params: { key: apiKey, part: 'snippet', channelId, type: 'video', eventType: 'live', maxResults: 10, q: searchQuery },
      timeout: 10000,
    });
    API_QUOTA_TRACKER.callsThisRun++;
    const items = (res.data.items || []).filter(
      (item: any) => item.snippet.liveBroadcastContent === 'live'
    );
    console.log(`     📺 [YT] ${channelName} [live] → ${items.length} active live result(s) | Quota this run: ${API_QUOTA_TRACKER.callsThisRun * 100} units`);
    allItems.push(...items);
  } catch (error: any) {
    const status = error.response?.status;
    console.error(`  ❌ [YT] ${channelName} [live] → ${status === 403 ? '403 Forbidden — quota exceeded or bad API key' : error.message}`);
  }

  // Deduplicate by videoId across both searches
  const seen = new Set<string>();
  const uniqueItems = allItems.filter(item => {
    if (seen.has(item.id.videoId)) return false;
    seen.add(item.id.videoId);
    return true;
  });

  const matched = uniqueItems.filter((item: any) =>
    isStreamMatch(item, launchName, missionInfo, isHighProfileRocket, channelId)
  );

  if (matched.length > 0) {
    console.log(`  ✅ [YT] ${channelName} → ${matched.length} MATCHED: ${matched.map((m: any) => `"${m.snippet.title}"`).join(', ')}`);
  } else if (uniqueItems.length > 0) {
    console.log(`  ⚠️  [YT] ${channelName} → ${uniqueItems.length} found but NONE matched query "${searchQuery}"`);
  }

  // Cap at 2 streams per channel to avoid flooding the results
  return matched.slice(0, 2).map((item: any) => ({
    streamId: item.id.videoId,
    url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    title: item.snippet.title,
    channelName: item.snippet.channelTitle,
    thumbnailUrl: item.snippet.thumbnails?.high?.url,
    scheduledStartTime: item.snippet.publishedAt,
    platform: 'youtube',
    isLive: item.snippet.liveBroadcastContent === 'live',
  }));
};


export const matchStreamsToSingleLaunch = async (launch: any) => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📡 [YT_SYNC] Fetching streams: "${launch.name}"`);
  console.log(`⏰ [YT_SYNC] Time: ${new Date().toISOString()}`);
  console.log(`📊 [YT_SYNC] Quota cost: ~${Object.keys(CHANNEL_CONFIGS).length * 2 * 100} units (${Object.keys(CHANNEL_CONFIGS).length} channels × 2 searches × 100 units each)`);
  console.log(`${'='.repeat(60)}`);

  API_QUOTA_TRACKER.callsThisRun = 0;
  const allStreams: any[] = [];

  for (const [channelId, config] of Object.entries(CHANNEL_CONFIGS)) {
    if (API_QUOTA_TRACKER.callsThisRun >= API_QUOTA_TRACKER.maxCallsPerRun) {
      console.warn(`⛔ [YT_SYNC] Quota guard hit (${API_QUOTA_TRACKER.maxCallsPerRun} calls). Stopping early.`);
      break;
    }
    
    const found = await checkChannelUpcomingStreams(channelId, launch.name);
    allStreams.push(...found);

    await new Promise(r => setTimeout(r, 300));
  }

  const uniqueStreams = deduplicateStreams(allStreams);
  const missionInfo = extractMissionInfo(launch.name);

  console.log(`\n📋 [YT_SYNC] Done. Total matched streams: ${uniqueStreams.length}`);
  console.log(`${'='.repeat(60)}\n`);

  return uniqueStreams.map(stream => ({
    ...stream,
    launchId: launch.id,
    matchScore: calculateMatchScore(stream.title, launch.name, missionInfo),
    lastUpdated: new Date()
  }));
};

export const getOrSyncStreams = async (launch: any, force = false) => {
  // Adaptive TTL: 30 min for launches within 24 hours, 12 hours otherwise
  const now = new Date();
  const launchDate = new Date(launch.date || launch.net);
  const hoursUntilLaunch = (launchDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  const isImminent = hoursUntilLaunch >= -1 && hoursUntilLaunch <= 24;
  const CACHE_TTL = isImminent
    ? 30 * 60 * 1000      // 30 minutes for launches within 24h
    : 12 * 60 * 60 * 1000; // 12 hours otherwise

  if (!launch.id && !launch.slug) {
    console.error("⚠️  [YT] Cannot sync streams: launch missing ID/slug");
    return [];
  }

  const targetId = launch.id || launch.slug;

  try {
    let syncRecord = await StreamSync.findOne({ launchId: targetId });

    if (!force && syncRecord?.lastUpdated) {
      const age = now.getTime() - new Date(syncRecord.lastUpdated).getTime();
      const ageMin = Math.round(age / 60000);
      const ttlMin = Math.round(CACHE_TTL / 60000);

      if (age < CACHE_TTL) {
        console.log(`📦 [YT_CACHE] HIT — "${launch.name}" | Age: ${ageMin}min | TTL: ${ttlMin}min | Streams: ${syncRecord.streams?.length || 0}`);
        return syncRecord.streams;
      }

      console.log(`⏱️  [YT_CACHE] STALE — "${launch.name}" | Age: ${ageMin}min > TTL: ${ttlMin}min. Refreshing...`);
    } else if (force) {
      console.log(`🔄 [YT_CACHE] FORCE REFRESH — "${launch.name}"`);
    } else {
      console.log(`🆕 [YT_CACHE] MISS — No cache for "${launch.name}". Fetching...`);
    }

    const freshStreams = await matchStreamsToSingleLaunch(launch);
    const updatedStreams = freshStreams.map(s => ({ ...s, launchId: targetId }));

    syncRecord = await StreamSync.findOneAndUpdate(
      { launchId: targetId },
      { streams: updatedStreams, lastUpdated: now },
      { upsert: true, new: true }
    );

    return syncRecord?.streams || updatedStreams;
  } catch (error) {
    console.error("❌ [YT_CACHE] STREAM_SYNC_ERROR:", error);
    const fallbackSync = await StreamSync.findOne({ launchId: targetId });
    return fallbackSync?.streams || [];
  }
};


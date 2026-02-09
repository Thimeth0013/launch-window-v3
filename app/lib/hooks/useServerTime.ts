// lib/hooks/useServerTime.ts
'use client';

import { useState, useEffect } from 'react';

interface ServerTimeData {
  serverTime: string;
  timestamp: number;
  offset: number;
}

export function useServerTime() {
  const [timeData, setTimeData] = useState<ServerTimeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function syncTime() {
      try {
        const requestTime = Date.now();
        const response = await fetch('/api/time');
        const receiveTime = Date.now();
        const data = await response.json();

        // Calculate round-trip time and estimate server time
        const roundTripTime = receiveTime - requestTime;
        const estimatedServerTime = data.timestamp + (roundTripTime / 2);
        const offset = estimatedServerTime - receiveTime;

        setTimeData({
          serverTime: data.serverTime,
          timestamp: data.timestamp,
          offset
        });

        console.log(`⏰ [TIME_SYNC] Client offset: ${offset}ms`);
      } catch (error) {
        console.error('❌ [TIME_SYNC_ERROR]', error);
        // Default to 0 offset if sync fails
        setTimeData({
          serverTime: new Date().toISOString(),
          timestamp: Date.now(),
          offset: 0
        });
      } finally {
        setIsLoading(false);
      }
    }

    syncTime();

    // Re-sync every 5 minutes to account for clock drift
    const interval = setInterval(syncTime, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // Get current server-adjusted time
  const getServerTime = () => {
    if (!timeData) return new Date();
    return new Date(Date.now() + timeData.offset);
  };

  return { timeData, isLoading, getServerTime };
}
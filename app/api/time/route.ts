// app/api/time/route.ts
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // Disable caching for accurate time

export async function GET() {
  const serverTime = new Date();
  
  return NextResponse.json({
    serverTime: serverTime.toISOString(),
    timestamp: serverTime.getTime(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
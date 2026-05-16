// app/api/cron/prefetch/route.ts
//
// Cron-triggered endpoint that warms the LaunchDetailed cache for the
// launches closest to T-0, soaking up unused hourly API budget. Designed to
// be pinged on a schedule by either Vercel Cron or an external pinger such
// as UptimeRobot.
//
// Auth: every request must include `Authorization: Bearer <CRON_SECRET>`
// (matches the env var). Vercel Cron sends this header automatically.
// External pingers (UptimeRobot etc.) need to be configured to send it.
//
// Timeout: bumped to 60s so the full prefetch (~10 detailed calls with small
// pauses) comfortably fits inside one invocation, even on Vercel Hobby.

import { NextRequest, NextResponse } from 'next/server';
import { prefetchDetailedLaunches } from '@/app/lib/services/launchService';

export const maxDuration = 60;
// Force dynamic so this never gets statically cached at build time.
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error('❌ [CRON] CRON_SECRET env var is not set');
    return NextResponse.json(
      { message: 'Cron not configured' },
      { status: 500 }
    );
  }

  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${secret}`) {
    console.warn('⚠️  [CRON] Unauthorized prefetch trigger attempt');
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const start = Date.now();
  try {
    await prefetchDetailedLaunches();
    const elapsedMs = Date.now() - start;
    return NextResponse.json(
      { ok: true, elapsedMs },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err: any) {
    console.error('❌ [CRON] Prefetch failed:', err);
    return NextResponse.json(
      { ok: false, error: err?.message || 'unknown' },
      { status: 500 }
    );
  }
}

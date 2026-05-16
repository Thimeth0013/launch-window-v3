// app/api/cron/prefetch/route.ts
//
// Cron-triggered endpoint that warms the LaunchDetailed cache for the
// launches closest to T-0, soaking up unused hourly API budget. Designed to
// be pinged on a schedule by either Vercel Cron or an external pinger such
// as UptimeRobot.
//
// Auth: every request must either include `Authorization: Bearer <CRON_SECRET>`
// or pass the same value in a `?secret=...` query string. The query-string
// fallback is for monitoring services that don't support custom HTTP headers
// on their free tiers (e.g. UptimeRobot). Vercel Cron sends the header
// automatically; both forms work.
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
  const querySecret = request.nextUrl.searchParams.get('secret');
  const authorized = auth === `Bearer ${secret}` || querySecret === secret;

  if (!authorized) {
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

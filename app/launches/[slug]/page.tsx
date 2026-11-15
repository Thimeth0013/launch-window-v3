// app/launches/[slug]/page.tsx
import MissionClock from '@/components/ui/MissionClock';
import LaunchStory from '@/components/launch-story/LaunchStory';
import AppHeader from '@/components/sections/AppHeader';
import SlugScrollAnimator from '@/components/sections/SlugScrollAnimator';
import { ensureFreshLaunches, getOrFetchLaunchDetailedBySlug, getUpcomingLaunches } from '@/app/lib/services/launchService';
import { getArticlesForLaunch } from '@/app/lib/services/articleService';
import { isLaunchLive } from '@/app/lib/launch/trajectory';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

// 2. Set route revalidation (replaces the fetch revalidate option)
export const revalidate = 270;

interface LaunchDetailPageProps {
  // 3. Next.js 15 requires params to be a Promise
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  // Fetch the upcoming launches during build time
  const launches = await getUpcomingLaunches(50);
  
  // Tell Next.js to pre-build a static HTML page for every slug in the database
  return launches.map((launch) => ({
    slug: launch.slug,
  }));
}

async function getLaunch(slug: string) {
  await ensureFreshLaunches();
  const launch = await getOrFetchLaunchDetailedBySlug(slug);
  if (!launch) notFound();
  return JSON.parse(JSON.stringify(launch));
}

export default async function LaunchDetailPage({ params }: LaunchDetailPageProps) {
  // 5. Await the params before extracting the slug
  const { slug } = await params;
  const launch = await getLaunch(slug);
  // Related news is keyed by the Space Devs launch id (not the slug). A failure
  // here only costs the "In the News" chapter, never the page.
  const news = JSON.parse(JSON.stringify(await getArticlesForLaunch(launch.id).catch(() => [])));

  const launcher = launch.rocket?.launcher_stage?.[0] || null;
  const updates = launch.updates || [];

  // Telemetry Data for the Marquee
  const telemetry = [
    { label: 'Vehicle', value: launch.rocket?.configuration?.name },
    { label: 'Orbit', value: launch.mission?.orbit?.name },
    { label: 'Launch Site', value: launch.pad?.name },
    { label: 'Provider', value: launch.launch_service_provider?.name },
    { label: 'Booster', value: launcher?.launcher?.serial_number ? `#${launcher.launcher.serial_number}` : 'NEW' },
  ].filter(t => t.value);

  return (
    <div className="min-h-screen bg-black text-zinc-300 selection:bg-[#FF6B35] selection:text-black overflow-x-hidden pb-12 md:pb-24">
      {/* Hydration guard. AppHeader and SlugScrollAnimator are client
          components sitting directly in this div; if either one's JS chunk is
          still loading when React hydrates, React suspends *this div* and, on
          retry, tries to claim it again after its cursor has already moved on
          to <header> — "Hydration failed … + <div> / - <header>", roughly 1
          load in 7 in dev. With a boundary here the suspension is caught and
          retried at the boundary instead. Nothing below suspends on data, so
          the fallback never renders. */}
      <Suspense fallback={null}>

      <AppHeader />

      {/* 1. CINEMATIC HERO HEADER */}
      <div className="relative h-screen w-full overflow-hidden group/hero">

        {launch.image?.image_url && (
          <>
            <div data-hero-bg className="absolute inset-0">
              <img
                src={launch.image.image_url}
                alt={launch.name}
                className="w-full h-full md:h-auto object-cover opacity-40 md:opacity-60"
              />
            </div>

            {/* Gradient Overlays */}
            <div data-hero-overlay className="absolute inset-0 bg-linear-to-t from-black via-black/60 to-transparent" />
            <div data-hero-overlay className="absolute inset-0 bg-black/20 md:bg-black/0" />
          </>
        )}

        <div className="absolute inset-0 flex flex-col justify-center items-center text-center px-6">

          <h1 data-hero-title className="max-w-full md:max-w-5xl text-4xl md:text-6xl font-bold uppercase tracking-tight text-white mb-4 leading-tight md:leading-16 drop-shadow-lg">
            {launch.name}
          </h1>

          <div data-hero-bar className="h-1.5 w-32 bg-[#FF6B35] shadow-[0_0_20px_rgba(255,107,53,0.8)] mb-8 md:mb-12" />

          <div data-hero-clock className="w-full max-w-2xl mb-8 md:mb-16 mt-8 md:mt-12">
            <MissionClock
              launchDate={new Date(launch.date)}
              status={launch.status}
              updates={updates}
              netPrecision={launch.net_precision}
            />
            {isLaunchLive(launch) && (
              <Link
                href={`/tracker?launch=${launch.slug}`}
                className="mt-6 inline-flex items-center gap-2 border border-[#FF6B35] bg-[#FF6B35]/10 px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-[#FF6B35] backdrop-blur-sm transition-colors hover:bg-[#FF6B35] hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#18BBF7]"
              >
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75 motion-reduce:animate-none" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
                </span>
                Follow the trajectory on the globe
              </Link>
            )}
          </div>

          {/* TELEMETRY MARQUEE */}
          <div data-hero-marquee className="w-full max-w-5xl overflow-hidden py-6">
            <div className="relative flex">
              <div className="flex animate-marquee whitespace-nowrap">
                {[...telemetry, ...telemetry].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col px-8 md:px-12 border-r border-white/10 min-w-50 md:min-w-70"
                  >
                    <span className="text-[9px] md:text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">
                      {item.label}
                    </span>
                    <span className="text-xs md:text-base font-mono text-white leading-relaxed uppercase">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* THE STORY — mission → rocket → booster → crew → pad → window → flight plan → destination → recovery → history → watch → log */}
      <div className="max-w-8xl mx-auto px-6 md:px-12 py-16 md:py-24">
        <LaunchStory launch={launch} news={news} />

        <a
          href="#chapter-watch"
          className="fixed bottom-8 right-6 z-50 inline-flex items-center gap-2 bg-black/20 backdrop-blur-md px-4 py-3 text-xs font-medium uppercase tracking-wider text-white/80 hover:bg-[#FF6B35]/40 border border-white/10"
          title="Go to broadcasts"
        >
          ↓ Live Broadcasts
        </a>

      </div>

      <SlugScrollAnimator />
      </Suspense>
    </div>
  );
}

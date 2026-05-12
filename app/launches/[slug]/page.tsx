// app/launches/[slug]/page.tsx
import { ChevronLeft} from 'lucide-react';
import TimelineEngine from '@/components/ui/TimelineEngine';
import MissionClock from '@/components/ui/MissionClock';
import Link from 'next/link';
import CrewSection from '@/components/sections/CrewSection';
import VehicleDetailsCard from '@/components/sections/VehicleDetailsCard';
import LaunchLocationCard from '@/components/ui/LaunchLocationCard';
import DestinationCard from '@/components/ui/DestinationCard';
import WeatherConditions from '@/components/ui/WeatherConditions';
import MissionStatistics from '@/components/ui/MissionStatistics';
import ProgramBadge from '@/components/ui/ProgramBadge';
import StreamsSection from '@/components/sections/StreamsSection';
import { ensureFreshLaunches, getLaunchById, getUpcomingLaunches } from '@/app/lib/services/launchService';
import { notFound } from 'next/navigation';

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
  const launch = await getLaunchById(slug);
  if (!launch) notFound();
  return JSON.parse(JSON.stringify(launch));
}
export default async function LaunchDetailPage({ params }: LaunchDetailPageProps) {
  // 5. Await the params before extracting the slug
  const { slug } = await params;
  const launch = await getLaunch(slug);

  const crew = launch.rocket?.spacecraft_stage?.[0]?.launch_crew || [];
  const launcher = launch.rocket?.launcher_stage?.[0] || null;
  const updates = launch.updates || [];
  const patch = launch.mission_patches?.[0]?.image_url;
  const timeline = launch.timeline || launch.rocket?.configuration?.timeline || [];

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

      {/* 1. CINEMATIC HERO HEADER */}
      <div className="relative h-screen w-full overflow-hidden">

        {/* BACK BUTTON (TOP LEFT) */}
        <div className="fixed top-4 left-4 md:top-12 md:left-12 z-50">
          <Link
            href="/launches"
            className="group flex items-center gap-2 bg-black/20 backdrop-blur-md border border-white/10 p-3 transition-all hover:bg-white hover:text-black"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
        </div>

        {launch.image?.image_url && (
          <>
            <div className="absolute inset-0">
              <img
                src={launch.image.image_url}
                alt={launch.name}
                className="w-full h-full md:h-auto object-cover opacity-40 md:opacity-60"
              />
            </div>

            {/* Gradient Overlays */}
            <div className="absolute inset-0 bg-linear-to-t from-black via-black/60 to-transparent" />
            <div className="absolute inset-0 bg-black/20 md:bg-black/0" />
          </>
        )}

        <div className="absolute inset-0 flex flex-col justify-center items-center text-center px-6">

          <h1 className="max-w-full md:max-w-5xl text-4xl md:text-6xl font-bold uppercase tracking-tight text-white mb-4 leading-tight md:leading-16 drop-shadow-lg">
            {launch.name}
          </h1>

          <div className="h-1.5 w-32 bg-[#FF6B35] shadow-[0_0_20px_rgba(255,107,53,0.8)] mb-8 md:mb-12" />

          <div className="w-full max-w-2xl mb-8 md:mb-16 mt-8 md:mt-12">
            <MissionClock
              launchDate={new Date(launch.date)}
              status={launch.status}
              updates={updates}
            />
          </div>

          {/* TELEMETRY MARQUEE */}
          <div className="w-full max-w-5xl overflow-hidden py-6">
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

        {patch && (
          <div className="absolute top-12 right-12 w-36 h-36 hidden md:block perspective-[1000px]">
            <img
              src={patch}
              className="w-full h-full transition-transform duration-1000 ease-in-out hover:transform-[rotateY(360deg)] drop-shadow-lg"
              alt="Mission Patch"
            />
          </div>
        )}
      </div>

      <div className="max-w-8xl mx-auto px-6 md:px-12 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">

          {/* LEFT CONTENT */}
          <div className="lg:col-span-6 space-y-8 md:space-y-16">

            {/* MISSION BRIEFING */}
            <section>
              <div className="flex items-center gap-4 mb-8">
                <h3 className="text-[11px] font-black uppercase tracking-[0.5em] text-[#18BBF7]">Mission Briefing</h3>
                <div className="h-px flex-1 bg-white/10" />
              </div>
              <p className="text-md md:text-lg font-light leading-relaxed text-zinc-400 uppercase tracking-tight">
                {launch.mission?.description || "No mission description provided for this flight trajectory."}
              </p>
            </section>            
          </div>

          {/* RIGHT SIDEBAR - TECHNICAL SPECS */}
          <div className="lg:col-span-6 space-y-10">

            {/* LIVE UPDATES */}
            <div className="bg-black border border-zinc-800/60 p-6 font-mono text-[11px] h-64 overflow-y-auto">
              <div className="text-zinc-500 mb-4 border-b border-zinc-800 pb-2 flex items-center gap-2">
                <div className="w-0.5 h-2 bg-[#FF6B35] animate-ping" />
                LIVE MISSION LOG
              </div>
              {updates.map((update: any) => (
                <div key={update.id} className="mb-3 leading-relaxed">
                  <span className="text-zinc-600">
                    {new Date(update.created_on).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                  <span className="text-[#FF6B35]"> {update.created_by} : </span>{" "}
                  <span className="text-zinc-400 uppercase">{update.comment}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* TIMELINE */}
        {timeline && timeline.length > 0 && (
          <TimelineEngine
            launchDate={new Date(launch.date)}
            launchId={launch.slug}
            timeline={timeline}
            status={launch.status}
          />
        )}
      </div>

      <div className="max-w-8xl mx-auto px-6 md:px-12 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 mb-8 md:mb-12">

          {/* LEFT CONTENT */}
          <div className="lg:col-span-6 space-y-8 lg:space-y-12">
            {/* VEHICLE DETAILS CARD */}
            {launch.rocket && <VehicleDetailsCard rocket={launch.rocket} />}

            {/* CREW */}
            {crew.length > 0 && <CrewSection crew={crew} />}

            <MissionStatistics launch={launch} />

            <ProgramBadge programs={launch.program} />
          </div>

          {/* RIGHT SIDEBAR - TECHNICAL SPECS */}
          <div className="lg:col-span-6 space-y-10">
            <WeatherConditions
              probability={launch.probability}
              weather_concerns={launch.weather_concerns}
              window_start={launch.window_start}
              window_end={launch.window_end}
            />

            {/* DESTINATION CARD */}
            {launch.mission && <DestinationCard mission={launch.mission} />}

            {/* LAUNCH LOCATION CARD */}
            {launch.pad && <LaunchLocationCard pad={launch.pad} />}
          </div>
        </div>
        
        <div id="streams-section">
          <StreamsSection launchSlug={launch.slug} />
        </div>

        <a
          href="#streams-section"
          className="fixed bottom-8 right-6 z-50 inline-flex items-center gap-2 bg-black/20 backdrop-blur-md px-4 py-3 text-xs font-medium uppercase tracking-wider text-white/80 hover:bg-[#FF0000]/40 border border-white/10"
          title="Go to Streams"
        >
          ↓ Live Broadcasts
        </a>

      </div>
    </div>
  );
}

// Helper Component for the Technical Sidebar
function DataRow({ label, value, subValue, highlight = false }: any) {
  return (
    <div className="border-b border-white/5 pb-4">
      <span className="text-[9px] text-zinc-600 uppercase tracking-[0.2em] block mb-1 font-bold">{label}</span>
      <span className={`text-sm uppercase font-black tracking-tight ${highlight ? 'text-[#FF6B35]' : 'text-white'}`}>
        {value || 'DATA_NOT_FOUND'}
      </span>
      {subValue && <span className="block text-[11px] text-zinc-400 uppercase mt-1">{subValue}</span>}
    </div>
  );
}
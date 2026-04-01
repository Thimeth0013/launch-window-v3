// app/page.tsx
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Globe, Newspaper } from "lucide-react";
import MissionClock from "@/components/ui/MissionClock";
import { getUpcomingLaunches, fetchUpcomingLaunches } from "@/app/lib/services/launchService";
import { ILaunch } from "@/app/lib/db/models/Launch";

async function getLatestLaunch(): Promise<ILaunch | null> {
  try {
    let launches = await getUpcomingLaunches(1);
    
    // 🚀 NEW: If the database is empty, trigger the sync engine!
    if (!launches || launches.length === 0) {
      console.log("⚠️ No launches found in DB. Triggering Space Devs API Sync...");
      await fetchUpcomingLaunches(); 
      
      // Try querying the database one more time now that it's populated
      launches = await getUpcomingLaunches(1); 
    }

    return (launches[0] as unknown as ILaunch) || null;
  } catch (error) {
    console.error("Failed to fetch launch for prerender:", error);
    return null;
  }
}

export default async function Home() {
  const latestLaunch = await getLatestLaunch();

  // Early return handles the 'undefined' Date and Status TypeScript errors naturally
  if (!latestLaunch) {
    return (
      <div className="min-h-screen bg-black text-[#FF6B35] font-mono flex items-center justify-center uppercase tracking-widest text-sm">
        Terminal Offline // Awaiting Telemetry
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-[#FF6B35] selection:text-black">
      
      {/* 1. EPIC HERO SECTION */}
      <section className="relative h-screen w-full flex flex-col items-center justify-center overflow-hidden border-b-4 border-[#18BBF7]">
        <div className="absolute inset-0 z-0">
          <Image
            src={latestLaunch.image?.image_url || "/hero-placeholder.jpg"}
            alt={latestLaunch.name}
            fill
            className="opacity-60 object-cover"
            priority
            unoptimized
          />
          <div className="absolute inset-0 bg-linear-to-t from-black via-black/20 to-transparent" />
          <div className="absolute inset-0 bg-black/40 backdrop-grayscale-[0.5]" />
        </div>

        <div className="relative z-10 w-full max-w-5xl px-6 md:px-12 text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[#FF6B35]">
              Next Primary Objective
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter md:leading-16 mb-16">
            {latestLaunch.name}
          </h1>

          <div className="flex flex-col items-center justify-center text-center">
            {/* Types now match perfectly with the DB model */}
            <MissionClock 
              launchDate={latestLaunch.date} 
              status={latestLaunch.status} 
            />
          </div>

          <div className="mt-12 flex flex-wrap justify-center gap-6">
            <Link
              href={`/launches/${latestLaunch.slug}`}
              className="group relative px-8 py-4 bg-[#18BBF7] text-black font-black uppercase tracking-widest text-xs transition-all hover:bg-white overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-2">
                Mission Intel <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
            
            <Link
              href="/launches"
              className="px-8 py-4 border border-white/20 backdrop-blur-md font-black uppercase tracking-widest text-xs hover:bg-white hover:text-black transition-all"
            >
              View Full Manifest
            </Link>
          </div>
        </div>

        <div className="absolute top-12 left-12 w-12 h-12 border-t-2 border-l-2 border-[#18BBF7]/30" />
        <div className="absolute bottom-12 right-12 w-12 h-12 border-b-2 border-r-2 border-[#18BBF7]/30" />
      </section>

      {/* 2. ARTICLES & INTEL SECTION */}
      <section className="max-w-7xl mx-auto py-16 md:py-24 px-6 md:px-12 opacity-40">
        <div className="flex items-end justify-between mb-12 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-2 text-zinc-500 mb-2">
              <Newspaper size={14} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Orbital News feed</span>
            </div>
            <h2 className="text-4xl font-black uppercase tracking-tighter">Latest Briefings</h2>
          </div>
          <Link href="/articles" className="text-[10px] font-black uppercase tracking-widest text-[#18BBF7] hover:underline">
            Archive.View_All
          </Link>
        </div>

        <div className="flex justify-around">
          <h1 className="text-[#18BBF7] font-bold">COMMING SOON...</h1>
        </div>
      </section>

      {/* FOOTER STRIP */}
      <footer className="border-t border-white/5 py-8 md:py-12 px-6 text-center">
        <div className="flex justify-center items-center gap-6 opacity-30">
            <Globe size={16} />
            <span className="text-[10px] font-mono uppercase tracking-[0.5em]">Global Launch Window // Terminal 2.3.0</span>
        </div>
      </footer>
    </div>
  );
}
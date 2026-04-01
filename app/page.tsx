import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Globe, Newspaper } from "lucide-react";
import MissionClock from "@/components/ui/MissionClock";

// Simulating a fetch for the next upcoming launch
async function getLatestLaunch() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/launches?limit=1`, { next: { revalidate: 60 } });
  const data = await res.json();
  return data[0];
}

export default async function Home() {
  const latestLaunch = await getLatestLaunch();

  return (
    <div className="min-h-screen bg-black text-white selection:bg-[#FF6B35] selection:text-black">
      
      {/* 1. EPIC HERO SECTION */}
      <section className="relative h-screen w-full flex flex-col items-center justify-center overflow-hidden border-b-4 border-[#18BBF7]">
        {/* Background Image with Cinematic Overlay */}
        <div className="absolute inset-0 z-0">
          <Image
            src={latestLaunch?.image?.image_url || "/hero-placeholder.jpg"}
            alt="Hero Launch"
            fill
            className="opacity-60"
            priority
            unoptimized
          />
          <div className="absolute inset-0 bg-linear-to-t from-black via-black/20 to-transparent" />
          <div className="absolute inset-0 bg-black/40 backdrop-grayscale-[0.5]" />
        </div>

        {/* Content */}
        <div className="relative z-10 w-full max-w-5xl px-6 md:px-12 text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[#FF6B35]">
              Next Primary Objective
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter md:leading-16 mb-16">
            {latestLaunch?.name || "System Offline"}
          </h1>

          <div className="flex flex-col items-center justify-center text-center">
            <MissionClock 
              launchDate={new Date(latestLaunch?.date)} 
              status={latestLaunch?.status} 
            />
          </div>

          <div className="mt-12 flex flex-wrap justify-center gap-6">
            <Link
              href={`/launches/${latestLaunch?.slug}`}
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

        {/* Decorative Corner Accents */}
        <div className="absolute top-12 left-12 w-12 h-12 border-t-2 border-l-2 border-[#18BBF7]/30" />
        <div className="absolute bottom-12 right-12 w-12 h-12 border-b-2 border-r-2 border-[#18BBF7]/30" />
      </section>

      {/* 2. ARTICLES & INTEL SECTION */}
      <section className="max-w-7xl mx-auto py-16 md:py-24 px-6 md:px-12">
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

        {/* Article Grid Placeholder */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="group cursor-pointer">
              <div className="relative aspect-video mb-4 overflow-hidden bg-zinc-900 border border-white/5">
                <div className="absolute inset-0 bg-[#18BBF7]/10 opacity-0 group-hover:opacity-100 transition-opacity z-10" />
                {/* Image Placeholder */}
                <div className="w-full h-full bg-zinc-800 group-hover:scale-105 transition-transform duration-700" />
              </div>
              <span className="text-[9px] font-black text-[#FF6B35] uppercase tracking-widest mb-2 block">Category // 0{i}</span>
              <h3 className="text-lg font-bold uppercase leading-tight group-hover:text-[#18BBF7] transition-colors">
                Advancing the frontier: The next generation of heavy lift vehicles
              </h3>
              <p className="text-zinc-500 text-xs mt-3 line-clamp-2 uppercase font-mono tracking-tight">
                Telemetric data suggests a 40% increase in payload capacity for upcoming orbital maneuvers...
              </p>
            </div>
          ))}
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
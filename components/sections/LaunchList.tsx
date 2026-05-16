"use client";

import { useState, useRef, useEffect } from 'react';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import { Search, Rocket, X, ChevronUp, ChevronDown } from 'lucide-react';
import LaunchCard from '../ui/LaunchCard';

interface LaunchListProps {
  initialLaunches: any[];
}

export default function LaunchList({ initialLaunches }: LaunchListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  const now = new Date();

  const filteredLaunches = initialLaunches.filter((launch) => {
    const launchDate = new Date(launch.date);
    const isCompleted = launchDate < now;

    // Filter by completed/upcoming status
    if (showCompleted && !isCompleted) return false;
    if (!showCompleted && isCompleted) return false;

    // Filter by search query
    const searchStr = searchQuery.toLowerCase();
    return (
      launch.name.toLowerCase().includes(searchStr) ||
      launch.launch_service_provider?.name?.toLowerCase().includes(searchStr) ||
      launch.pad?.location?.name?.toLowerCase().includes(searchStr)
    );
  }).sort((a, b) => {
    // Sort completed launches in descending order (most recent first)
    // Sort upcoming launches in ascending order (soonest first)
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return showCompleted ? dateB - dateA : dateA - dateB;
  });

  const upcomingCount = initialLaunches.filter(l => new Date(l.date) >= now).length;
  const completedCount = initialLaunches.filter(l => new Date(l.date) < now).length;

  // Scroll-triggered fade-in for the launch cards. Re-runs when the
  // upcoming/completed toggle flips since the entire card set is swapped out.
  useEffect(() => {
    if (!gridRef.current) return;
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>('[data-launch-card]');
      if (cards.length === 0) return;
      gsap.set(cards, { opacity: 0, y: 40 });

      ScrollTrigger.batch('[data-launch-card]', {
        start: 'top 88%',
        onEnter: (elements) => {
          gsap.to(elements, {
            opacity: 1,
            y: 0,
            duration: 0.7,
            stagger: 0.08,
            ease: 'power2.out',
            overwrite: true,
          });
        },
      });
    }, gridRef);

    return () => ctx.revert();
  }, [showCompleted]);

  return (
    <>
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-1 pb-12 gap-6">
        <div>
          <h1 className="text-2xl md:text-4xl tracking-tighter font-black uppercase text-white">
            {showCompleted ? 'Recent Launches' : 'Upcoming Launches'}<span className="text-[#FF6B35]">.</span>
          </h1>
          <p className="text-gray-500 font-mono text-xs uppercase ml-1 tracking-[0.2em] mt-2">
            Global Orbital Manifest // {filteredLaunches.length} Missions {showCompleted ? 'Completed' : 'Tracked'}
          </p>
        </div>

        {/* Controls Container */}
        <div className="flex flex-row gap-2 md:gap-4 w-full md:w-auto">

          {/* Toggle Switch */}
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className={`
              relative flex items-center justify-center gap-1 md:gap-3 px-3 md:px-6 py-4 
              border transition-all font-mono text-[10px] md:text-xs tracking-widest uppercase shrink-0
              ${showCompleted
                ? 'border-[#FF6B35]/40 text-[#FF6B35] bg-[#FF6B35]/5'
                : 'border-[#18BBF7]/40 text-[#18BBF7] bg-[#18BBF7]/5'
              }
              hover:bg-white/5
            `}
          >
            {showCompleted ? (
              <>
                <ChevronDown className="w-3 h-3 md:w-4 md:h-4" />
                <span>T+ ({completedCount})</span>
              </>
            ) : (
              <>
                <ChevronUp className="w-3 h-3 md:w-4 md:h-4" />
                <span>T- ({upcomingCount})</span>
              </>
            )}
          </button>

          {/* Search Bar Container */}
          <div className="relative group flex-1 md:w-130">
            <div className="absolute inset-y-0 left-3 md:left-4 flex items-center pointer-events-none">
              <Search className={`w-3 h-3 md:w-4 md:h-4 transition-colors duration-300 ${searchQuery ? 'text-[#18BBF7]' : 'text-gray-600'}`} />
            </div>

            <input
              type="text"
              placeholder="SEARCH..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full py-4 pl-9 pr-9 md:pl-12 md:pr-12 text-white font-mono text-[10px] md:text-sm tracking-widest focus:outline-none border border-[#18BBF7]/40 focus:border-[#18BBF7] transition-all placeholder:text-gray-600"
            />

            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-3 md:right-4 flex items-center text-gray-500 hover:text-[#FF6B35] transition-colors"
              >
                <X className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid Display */}
      {filteredLaunches.length > 0 ? (
        <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
          {filteredLaunches.map((launch) => (
            <div key={launch.slug} data-launch-card className="h-full">
              <LaunchCard launch={launch} />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-40 border border-dashed border-gray-900 rounded-xl bg-[#050505]">
          <Rocket className="w-16 h-16 text-gray-900 mb-6" />
          <p className="text-gray-600 font-mono text-sm uppercase tracking-[0.3em]">No matching trajectories</p>
          <button
            onClick={() => setSearchQuery("")}
            className="mt-6 px-6 py-2 border border-[#18BBF7]/30 text-[#18BBF7] text-[10px] font-black hover:bg-[#18BBF7] hover:text-black transition-all uppercase tracking-widest"
          >
            Clear Data Filter
          </button>
        </div>
      )}
    </>
  );
}
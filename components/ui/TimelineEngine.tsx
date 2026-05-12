'use client';
import { useState, useEffect, useRef } from 'react';
import { useServerTime } from '../../app/lib/hooks/useServerTime';
import { ChevronLeft, ChevronRight, Activity } from 'lucide-react';

interface TimelineEvent {
  type: {
    id: number;
    abbrev: string;
    description: string;
  };
  relative_time: string;
}

interface TimelineEngineProps {
  launchDate: Date;
  launchId: string;
  timeline: TimelineEvent[];
  status: { name: string };
}

// --- LOGIC HELPERS ---
function parseRelativeTime(relativeTime: string): number | null {
  const isoDurationMatch = relativeTime.match(/^(-?)PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/);
  if (isoDurationMatch) {
    const [, sign, hours, minutes, seconds] = isoDurationMatch;
    const totalMs =
      (parseInt(hours || '0') * 3600 +
        parseInt(minutes || '0') * 60 +
        parseFloat(seconds || '0')) * 1000;
    return sign === '-' ? -totalMs : totalMs;
  }

  const legacyMatch = relativeTime.match(/T([+-])(\d{2}):(\d{2}):(\d{2})/);
  if (legacyMatch) {
    const [, sign, hours, minutes, seconds] = legacyMatch;
    const totalMs =
      (parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds)) * 1000;
    return sign === '+' ? totalMs : -totalMs;
  }

  if (relativeTime === 'P0D') return 0;
  return null;
}

function formatRelativeTime(relativeTime: string): string {
  const timeMs = parseRelativeTime(relativeTime);
  if (timeMs === null) return relativeTime;

  const isNegative = timeMs < 0;
  const absMs = Math.abs(timeMs);
  const hours = Math.floor(absMs / 3600000);
  const minutes = Math.floor((absMs % 3600000) / 60000);
  const seconds = Math.floor((absMs % 60000) / 1000);

  const prefix = isNegative ? 'T-' : 'T+';

  if (hours > 0) return `${prefix}${hours}h ${minutes}m`;
  else if (minutes > 0) return `${prefix}${minutes}m ${seconds}s`;
  else if (seconds === 0) return 'T-0 (LIFTOFF)';
  else return `${prefix}${seconds}s`;
}

function formatMET(ms: number): string {
  const isNegative = ms < 0;
  const absMs = Math.abs(ms);
  const hours = Math.floor(absMs / 3600000);
  const minutes = Math.floor((absMs % 3600000) / 60000);
  const seconds = Math.floor((absMs % 60000) / 1000);
  return `${isNegative ? '-' : '+'}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function TimelineEngine({
  launchDate: initialLaunchDate,
  launchId,
  timeline,
  status,
}: TimelineEngineProps) {
  const { getServerTime, isLoading } = useServerTime();
  const [currentMET, setCurrentMET] = useState(0);
  const [launchDate, setLaunchDate] = useState(new Date(initialLaunchDate));
  const [activeEvents, setActiveEvents] = useState<Set<number>>(new Set());
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const lastFetchTime = useRef<number>(0);

  // --- LOGIC EFFECTS ---
  useEffect(() => {
    async function fetchLaunchTime() {
      try {
        const now = Date.now();
        if (now - lastFetchTime.current < 30000) return;
        lastFetchTime.current = now;
        const response = await fetch(`/api/launches/${launchId}`);
        if (response.ok) {
          const data = await response.json();
          const newLaunchDate = new Date(data.date);
          if (newLaunchDate.getTime() !== launchDate.getTime()) {
            setLaunchDate(newLaunchDate);
          }
        }
      } catch (error) {
        console.error('❌ [TIMELINE] Error fetching launch time:', error);
      }
    }
    fetchLaunchTime();
    const interval = setInterval(fetchLaunchTime, 30000);
    return () => clearInterval(interval);
  }, [launchId, launchDate]);

  useEffect(() => {
    if (isLoading) return;

    const interval = setInterval(() => {
      const now = getServerTime();
      const met = now.getTime() - launchDate.getTime();
      setCurrentMET(met);

      const active = new Set<number>();
      let activeIndex = -1;

      timeline.forEach((event, index) => {
        const eventTime = parseRelativeTime(event.relative_time);
        if (eventTime !== null) {
          const isActive = eventTime < 0
            ? met >= eventTime - 30000 && met <= eventTime + 30000
            : met >= eventTime && met < eventTime + 30000;

          if (isActive) {
            active.add(index);
            activeIndex = index;
          }
        }
      });

      if (active.size !== activeEvents.size ||
        Array.from(active).some(idx => !activeEvents.has(idx))) {
        setActiveEvents(active);

        if (activeIndex !== -1 && scrollContainerRef.current) {
          const container = scrollContainerRef.current;
          const itemWidth = 200 + 32;
          const targetScroll = activeIndex * itemWidth - container.clientWidth / 2 + 100;

          const isInView =
            container.scrollLeft <= targetScroll &&
            targetScroll <= container.scrollLeft + container.clientWidth;

          if (!isInView) {
            container.scrollTo({
              left: targetScroll,
              behavior: 'smooth',
            });
          }
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [launchDate, timeline, getServerTime, isLoading, activeEvents]);

  const updateScrollButtons = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    setCanScrollLeft(container.scrollLeft > 0);
    setCanScrollRight(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 10
    );
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const handleScroll = () => { updateScrollButtons(); };
    container.addEventListener('scroll', handleScroll);
    updateScrollButtons();
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const scrollAmount = 300;
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  if (!timeline || timeline.length === 0) return null;

  const sortedTimeline = [...timeline].sort(
    (a, b) =>
      (parseRelativeTime(a.relative_time) || 0) - (parseRelativeTime(b.relative_time) || 0)
  );

  return (
    <div className="w-full bg-black border border-zinc-800/60 overflow-hidden mb-4 mt-12 relative select-none">

      {/* Header Section */}
      <div className="relative z-10 px-6 py-6 border-b border-zinc-800/30 bg-black/95">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">

          {/* Title Area */}
          <div className="flex items-center gap-4">
            <div className="p-2 border border-zinc-800/20 bg-zinc-900/50">
              <Activity className="w-4 h-4 text-[#18BBF7]" />
            </div>
            <div>
              <div className="flex items-center gap-4">
                <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#18BBF7]">
                  Mission Timeline
                </h3>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <span className="text-xs text-zinc-500 uppercase">Mission Elapsed Time:</span>
                <span className="text-xs text-zinc-400 tracking-widest font-semibold">
                  {formatMET(currentMET)}
                </span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4 self-end md:self-auto">
            <div className="flex items-center -space-x-px">
              <button
                onClick={() => scroll('left')}
                disabled={!canScrollLeft}
                className={`p-2 border border-zinc-800 transition-colors ${canScrollLeft
                  ? 'hover:bg-zinc-800 text-zinc-300 hover:text-white'
                  : 'text-zinc-700 cursor-not-allowed'
                  }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => scroll('right')}
                disabled={!canScrollRight}
                className={`p-2 border border-zinc-800 transition-colors ${canScrollRight
                  ? 'hover:bg-zinc-800 text-zinc-300 hover:text-white'
                  : 'text-zinc-700 cursor-not-allowed'
                  }`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Scroll Area */}
      <div className="relative bg-black/50">

        {/* Scroll Container */}
        <div
          ref={scrollContainerRef}
          className="overflow-x-auto overflow-y-hidden px-6 py-12 scroll-smooth"
          style={{ scrollbarWidth: 'none' }}
        >
          <div className="relative inline-flex min-w-full">

            {/* The Rail */}
            <div className="absolute top-1.75 left-0 right-0 h-px bg-zinc-800" />

            {/* Events */}
            <div className="flex gap-8 relative">
              {sortedTimeline.map((event, index) => {
                const eventTime = parseRelativeTime(event.relative_time);
                const isActive = activeEvents.has(index);
                const isPast = eventTime !== null && currentMET > eventTime + 30000;

                return (
                  <div
                    key={index}
                    className="flex flex-col min-w-[200px] relative"
                  >
                    {/* Top Node Indicator */}
                    <div className="relative z-10 flex items-center mb-6 pl-2">
                      <div
                        className={`
                          w-3.5 h-3.5 border transition-all duration-300 rotate-45
                          ${isActive
                            ? 'bg-[#FF6B35]  border-zinc-800'
                            : isPast
                              ? 'bg-zinc-500 border-zinc-800'
                              : 'bg-black border-zinc-600'
                          }
                        `}
                      />
                      {/* Active Line indicator downwards */}
                      {isActive && (
                        <div className="absolute left-[14px] top-3.5 w-px h-full bg-gradient-to-b from-[#FF6B35] to-transparent opacity-50" />
                      )}
                    </div>

                    {/* Event Content Card */}
                    <div className={`
                      border-l-2 pl-4 transition-all duration-300
                      ${isActive
                        ? 'border-[#FF6B35]'
                        : isPast
                          ? 'border-zinc-800'
                          : 'border-zinc-700'
                      }
                    `}>
                      {/* Timing Badge */}
                      <div className={`
                        inline-flex items-center px-2 py-1 text-[10px] font-mono mb-2 border
                        ${isActive
                          ? 'bg-[#FF6B35] text-black border-[#FF6B35] font-bold'
                          : isPast
                            ? 'bg-zinc-900 text-zinc-400 border-zinc-800'
                            : 'bg-black text-zinc-400 border-zinc-700'
                        }
                      `}>
                        {formatRelativeTime(event.relative_time)}
                      </div>

                      {/* Title */}
                      <h4 className={`
                        font-mono text-xs font-bold uppercase tracking-wider mb-1
                        ${isActive ? 'text-white' : isPast ? 'text-zinc-600' : 'text-zinc-300'}
                      `}>
                        {event.type.abbrev}
                      </h4>

                      {/* Description */}
                      <p className={`
                        text-[10px] uppercase leading-tight max-w-[180px]
                        ${isActive ? 'text-[#FF6B35]' : isPast ? 'text-zinc-600' : 'text-zinc-400'}
                      `}>
                        {event.type.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Progress/Navigator Dots at Bottom */}
      <div className="px-6 md:px-12 py-3 border-t border-zinc-800/30 bg-black flex gap-px overflow-hidden">
        {sortedTimeline.map((event, index) => {
          const isActive = activeEvents.has(index);
          const eventTime = parseRelativeTime(event.relative_time);
          const isPast = eventTime !== null && currentMET > eventTime + 30000;

          return (
            <button
              key={index}
              onClick={() => {
                const container = scrollContainerRef.current;
                if (!container) return;
                const itemWidth = 200 + 32;
                container.scrollTo({
                  left: index * itemWidth - container.clientWidth / 2 + 100,
                  behavior: 'smooth',
                });
              }}
              className={`h-1.5 flex-1 transition-all duration-300 ${isActive ? 'bg-[#FF6B35]' : isPast ? 'bg-zinc-600  hover:bg-zinc-200' : 'bg-zinc-900 hover:bg-zinc-600'
                }`}
              title={`${event.type.abbrev} - ${formatRelativeTime(event.relative_time)}`}
            />
          )
        })}
      </div>
    </div>
  );
}
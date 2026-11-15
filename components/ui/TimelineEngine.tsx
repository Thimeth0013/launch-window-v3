'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useServerTime } from '../../app/lib/hooks/useServerTime';
import { Label, formatTMinus, parseRelativeTime } from '@/components/launch-story/primitives';

// Live flight timeline for the launch story's "Flight Plan" chapter: a
// horizontally scrolling rail of events from the countdown through the flight.
//
// Mission elapsed time comes from `useServerTime` — never Date.now(). Orange
// is progress: the rail fills orange behind events that have happened, and
// the event happening now pulses orange. On load (and whenever the active
// event changes) the rail scrolls the next event into view. The launch time is
// re-fetched every 30 s so a slip moves the whole timeline.

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
  /** Launch slug — used for the /api/launches/[slug] refresh. */
  launchId: string;
  timeline: TimelineEvent[];
  status?: { name: string };
}

/** Events stay "now" for this long after their mark (and before, in the countdown). */
const ACTIVE_WINDOW_MS = 30_000;

type State = 'past' | 'now' | 'next';

function formatMET(ms: number): string {
  const abs = Math.abs(ms);
  const days = Math.floor(abs / 86400000);
  const h = Math.floor((abs % 86400000) / 3600000);
  const m = Math.floor((abs % 3600000) / 60000);
  const s = Math.floor((abs % 60000) / 1000);
  const clock = [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
  return `${ms < 0 ? 'T-' : 'T+'}${days ? `${days}d ` : ''}${clock}`;
}

export default function TimelineEngine({ launchDate: initialLaunchDate, launchId, timeline }: TimelineEngineProps) {
  const { getServerTime, isLoading } = useServerTime();
  const [met, setMet] = useState<number | null>(null);
  const [launchDate, setLaunchDate] = useState(() => new Date(initialLaunchDate));
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const lastFetch = useRef(0);
  const lastFocused = useRef<number | null>(null);

  // Follow slips: re-read the launch time every 30 s.
  useEffect(() => {
    async function refresh() {
      const now = Date.now();
      if (now - lastFetch.current < 30_000) return;
      lastFetch.current = now;
      try {
        const res = await fetch(`/api/launches/${launchId}`);
        if (!res.ok) return;
        const data = await res.json();
        const next = new Date(data.date);
        if (!Number.isNaN(next.getTime()) && next.getTime() !== launchDate.getTime()) setLaunchDate(next);
      } catch (error) {
        console.error('[TIMELINE] Error fetching launch time:', error);
      }
    }
    refresh();
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [launchId, launchDate]);

  // Tick mission elapsed time off the server clock. `getServerTime` is a new
  // function on every render, so read it through a ref — depending on it
  // directly would restart this effect (and setMet) on every render, forever.
  const serverTimeRef = useRef(getServerTime);
  useEffect(() => {
    serverTimeRef.current = getServerTime;
  });
  useEffect(() => {
    if (isLoading) return;
    const tick = () => setMet(serverTimeRef.current().getTime() - launchDate.getTime());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isLoading, launchDate]);

  const events = useMemo(
    () =>
      timeline
        .map((e) => ({ ...e, t: parseRelativeTime(e.relative_time) }))
        .filter((e): e is TimelineEvent & { t: number } => e.t !== null)
        .sort((a, b) => a.t - b.t),
    [timeline]
  );

  const stateOf = useCallback(
    (t: number): State => {
      if (met === null) return 'next';
      const active =
        t < 0 ? met >= t - ACTIVE_WINDOW_MS && met <= t + ACTIVE_WINDOW_MS : met >= t && met < t + ACTIVE_WINDOW_MS;
      if (active) return 'now';
      return met > t + ACTIVE_WINDOW_MS ? 'past' : 'next';
    },
    [met]
  );

  // The event to keep in view: the one happening now, else the next one up.
  const focusIndex = useMemo(() => {
    if (met === null) return null;
    const now = events.findIndex((e) => stateOf(e.t) === 'now');
    if (now !== -1) return now;
    const next = events.findIndex((e) => stateOf(e.t) === 'next');
    return next === -1 ? events.length - 1 : next;
  }, [events, met, stateOf]);

  const updateArrows = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    updateArrows();
    el.addEventListener('scroll', updateArrows, { passive: true });
    window.addEventListener('resize', updateArrows);
    return () => {
      el.removeEventListener('scroll', updateArrows);
      window.removeEventListener('resize', updateArrows);
    };
  }, [updateArrows]);

  const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior = 'smooth') => {
    const el = scroller.current;
    const item = el?.querySelectorAll<HTMLElement>('[data-event]')[index];
    if (!el || !item) return;
    // Keep one event of context to the left of the focused one.
    const left = Math.max(0, item.offsetLeft - Math.min(240, el.clientWidth / 4));
    el.scrollTo({ left, behavior });
  }, []);

  // Bring the current/next event into view on load and as the mission moves on.
  useEffect(() => {
    if (focusIndex === null || focusIndex === lastFocused.current) return;
    const first = lastFocused.current === null;
    lastFocused.current = focusIndex;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    scrollToIndex(focusIndex, first || reduce ? 'auto' : 'smooth');
  }, [focusIndex, scrollToIndex]);

  const page = (dir: -1 | 1) => {
    const el = scroller.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  if (events.length === 0) return null;

  return (
    <div>
      {/* Clock + controls */}
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <Label>Mission clock</Label>
          <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-white md:text-2xl">
            {met === null ? 'T-––:––:––' : formatMET(met)}
          </div>
        </div>
        <div className="flex -space-x-px">
          {([-1, 1] as const).map((dir) => {
            const enabled = dir === -1 ? canScrollLeft : canScrollRight;
            const Icon = dir === -1 ? ChevronLeft : ChevronRight;
            return (
              <button
                key={dir}
                type="button"
                onClick={() => page(dir)}
                disabled={!enabled}
                aria-label={dir === -1 ? 'Earlier events' : 'Later events'}
                className="relative border border-white/15 p-2.5 text-zinc-300 transition-colors hover:z-10 hover:border-[#FF6B35] hover:text-[#FF6B35] focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-[#18BBF7] disabled:cursor-not-allowed disabled:text-zinc-700 disabled:hover:border-white/15"
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Rail */}
      <div className="relative">
        <div
          ref={scroller}
          tabIndex={0}
          aria-label="Flight timeline, scroll horizontally"
          className="overflow-x-auto overscroll-x-contain snap-x snap-proximity pb-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#18BBF7]"
          style={{ scrollbarWidth: 'none' }}
        >
          {/* pl/pt: the rotated diamond nodes poke ~3px outside their box */}
          <ol className="flex w-max pl-1 pt-1">
            {events.map((e, i) => {
              const state = stateOf(e.t);
              return (
                <li
                  key={`${e.relative_time}-${i}`}
                  data-event
                  aria-current={state === 'now' ? 'step' : undefined}
                  className="relative w-44 shrink-0 snap-start pr-6 md:w-52"
                >
                  {/* Rail segment — orange once this event has passed */}
                  <div
                    className={`absolute left-0 top-[7px] h-px ${i === events.length - 1 ? 'w-4' : 'right-0'} ${
                      state === 'past' ? 'bg-[#FF6B35]/70' : 'bg-white/15'
                    }`}
                  />

                  {/* Node */}
                  <div className="relative h-3.5 w-3.5">
                    {state === 'now' && (
                      <span className="absolute inset-0 rotate-45 animate-ping bg-[#FF6B35] opacity-60 motion-reduce:animate-none" />
                    )}
                    <span
                      className={`absolute inset-0 rotate-45 border transition-colors duration-500 ${
                        state === 'now'
                          ? 'border-[#FF6B35] bg-[#FF6B35]'
                          : state === 'past'
                            ? 'border-[#FF6B35]/70 bg-[#FF6B35]/70'
                            : 'border-white/40 bg-black'
                      }`}
                    />
                  </div>

                  <div
                    className={`mt-5 font-mono text-[12px] tabular-nums ${
                      state === 'now' ? 'text-[#FF6B35]' : state === 'past' ? 'text-zinc-600' : 'text-zinc-400'
                    }`}
                  >
                    {formatTMinus(e.t)}
                  </div>
                  <div
                    className={`mt-1 text-[13px] font-semibold leading-snug ${
                      state === 'past' ? 'text-zinc-500' : 'text-white'
                    }`}
                  >
                    {e.type.abbrev}
                  </div>
                  {e.type.description && (
                    <p className={`mt-1 line-clamp-2 text-[11px] leading-snug ${state === 'past' ? 'text-zinc-600' : 'text-zinc-500'}`}>
                      {e.type.description}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        </div>

        {/* Edge fades hint that there's more to scroll */}
        {canScrollLeft && <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-linear-to-r from-black to-transparent" />}
        {canScrollRight && <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-linear-to-l from-black to-transparent" />}
      </div>

      {/* Progress strip — one segment per event; click to jump */}
      <div className="mt-3 flex gap-px">
        {events.map((e, i) => {
          const state = stateOf(e.t);
          return (
            <button
              key={i}
              type="button"
              onClick={() => scrollToIndex(i)}
              title={`${formatTMinus(e.t)} · ${e.type.abbrev}`}
              aria-label={`Jump to ${e.type.abbrev}, ${formatTMinus(e.t)}`}
              className="group/seg flex h-6 flex-1 items-center"
            >
              <span
                className={`block h-1.5 w-full transition-colors duration-500 ${
                  state === 'now' ? 'bg-[#FF6B35]' : state === 'past' ? 'bg-[#FF6B35]/60 group-hover/seg:bg-[#FF6B35]' : 'bg-white/10 group-hover/seg:bg-white/40'
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

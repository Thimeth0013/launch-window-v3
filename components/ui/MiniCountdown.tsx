'use client';

import { useEffect, useState, useRef } from 'react';
import { useServerTime } from '@/app/lib/hooks/useServerTime';

interface MiniCountdownProps {
  launchDate: Date | string;
  statusName?: string;
}

export default function MiniCountdown({ launchDate, statusName }: MiniCountdownProps) {
  const { getServerTime, isLoading } = useServerTime();
  const [time, setTime] = useState({ d: '--', h: '--', m: '--', s: '--', prefix: 'T-' });

  // useServerTime returns a fresh getServerTime function on every render.
  // We park it in a ref so the tick effect doesn't re-run (and infinite-loop)
  // every time setTime triggers a re-render.
  const getServerTimeRef = useRef(getServerTime);
  useEffect(() => {
    getServerTimeRef.current = getServerTime;
  });

  useEffect(() => {
    if (isLoading) return;
    const tick = () => {
      const now = getServerTimeRef.current();
      const target = new Date(launchDate);
      const diff = target.getTime() - now.getTime();
      const abs = Math.abs(diff);
      const d = Math.floor(abs / 86400000);
      const h = Math.floor((abs % 86400000) / 3600000);
      const m = Math.floor((abs % 3600000) / 60000);
      const s = Math.floor((abs % 60000) / 1000);
      setTime({
        d: String(d).padStart(2, '0'),
        h: String(h).padStart(2, '0'),
        m: String(m).padStart(2, '0'),
        s: String(s).padStart(2, '0'),
        prefix: diff > 0 ? 'T-' : 'T+',
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [launchDate, isLoading]);

  const isHold = (statusName || '').toLowerCase().includes('hold')
    || (statusName || '').toLowerCase().includes('scrub');

  return (
    <div className="flex items-end gap-3 font-mono tabular-nums">
      <span className={`text-2xl md:text-3xl font-bold leading-none ${isHold ? 'text-red-500' : 'text-white'}`}>
        {time.prefix}
      </span>
      <Unit value={time.d} label="D" isHold={isHold} />
      <Sep isHold={isHold} />
      <Unit value={time.h} label="H" isHold={isHold} />
      <Sep isHold={isHold} />
      <Unit value={time.m} label="M" isHold={isHold} />
      <Sep isHold={isHold} />
      <Unit value={time.s} label="S" isHold={isHold} />
    </div>
  );
}

function Unit({ value, label, isHold }: { value: string; label: string; isHold: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <span className={`text-2xl md:text-3xl font-bold tracking-tighter leading-none ${isHold ? 'text-red-900/60' : 'text-white'}`}>
        {value}
      </span>
      <span className="text-[8px] font-bold uppercase tracking-[0.3em] text-zinc-500 mt-1.5">
        {label}
      </span>
    </div>
  );
}

function Sep({ isHold }: { isHold: boolean }) {
  return (
    <span className={`text-2xl md:text-3xl leading-none animate-pulse ${isHold ? 'text-red-900/40' : 'text-[#18BBF7]/70'}`}>
      :
    </span>
  );
}

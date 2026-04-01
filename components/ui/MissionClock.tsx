'use client';

import { useState, useEffect } from 'react';
import { useServerTime } from '../../app/lib/hooks/useServerTime';
import { AlertTriangle, Activity } from 'lucide-react';

interface MissionClockProps {
  launchDate: Date;
  status: {
    name: string;
    abbrev: string;
  };
  updates?: Array<{
    id: number;
    comment: string;
    created_on: string;
  }>;
}

export default function MissionClock({ launchDate, status, updates }: MissionClockProps) {
  const { getServerTime, isLoading: timeSyncLoading } = useServerTime();
  const [timeLeft, setTimeLeft] = useState({ d: '00', h: '00', m: '00', s: '00', prefix: 'T-' });
  const [isHold, setIsHold] = useState(false);
  const [holdReason, setHoldReason] = useState('');

  useEffect(() => {
    const statusName = status.name.toLowerCase();
    if (statusName.includes('hold') || statusName.includes('scrub')) {
      setIsHold(true);
      if (updates && updates.length > 0) {
        const latestUpdate = [...updates].sort((a, b) => 
          new Date(b.created_on).getTime() - new Date(a.created_on).getTime()
        )[0];
        setHoldReason(latestUpdate.comment);
      } else {
        setHoldReason(`System Alert: ${status.name}`);
      }
    } else {
      setIsHold(false);
      setHoldReason('');
    }
  }, [status, updates]);

  useEffect(() => {
    if (timeSyncLoading) return;

    const interval = setInterval(() => {
      if (isHold) return;

      const now = getServerTime();
      const launch = new Date(launchDate);
      const diff = launch.getTime() - now.getTime();
      const absDiff = Math.abs(diff);
      
      const d = Math.floor(absDiff / (1000 * 60 * 60 * 24));
      const h = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((absDiff % (1000 * 60)) / 1000);

      setTimeLeft({
        d: String(d).padStart(2, '0'),
        h: String(h).padStart(2, '0'),
        m: String(m).padStart(2, '0'),
        s: String(s).padStart(2, '0'),
        prefix: diff > 0 ? 'T-' : 'T+'
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [launchDate, getServerTime, timeSyncLoading, isHold]);

  if (timeSyncLoading) {
    return (
      <div className="flex justify-evenly items-center py-8">
        <div className='flex gap-4'>
          <Activity className="w-4 h-4 text-[#18BBF7]" />
          <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#18BBF7] animate-pulse">
            Synchronizing Atomic Clock...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center justify-center w-full max-w-3xl mx-auto">
      {/* STATUS BLOCK */}
      <div className="flex flex-col items-center gap-3 mb-8">
        <h3 className="text-xs font-black uppercase tracking-[0.4em] text-[#18BBF7] drop-shadow-lg">
          Mission Clock // {' '}
          <span className={`${
            status.name.toLowerCase().includes('go') ? 'text-green-400' : 
            isHold ? 'text-red-500 animate-pulse' : 
            'text-[#18BBF7]'
          }`}>
            {status.name}
          </span>
        </h3>

        {isHold && (
          <div className="flex items-start gap-3 text-red-500/80 max-w-md pt-3 border-t border-red-500/20">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] leading-relaxed italic">
              {holdReason}
            </span>
          </div>
        )}
      </div>

      {/* TIME UNITS GRID - Centered wrapper */}
      <div className="flex items-center justify-center gap-4 md:gap-8">
        
        {/* The Prefix - Now vertically aligned with the numbers */}
        <div className="flex flex-col items-center">
            <div className={`text-2xl md:text-4xl font-black leading-none ${isHold ? 'text-red-500 animate-pulse' : 'text-white'}`}>
              {timeLeft.prefix}
            </div>
            {/* Empty label spacer to maintain alignment with other units */}
            <span className="text-[9px] mt-4 opacity-0">spacer</span>
        </div>

        <div className="flex items-start gap-4 md:gap-6">
          <TimeUnit value={timeLeft.d} label="Days" isHold={isHold} />
          <div className="text-2xl md:text-4xl font-bold text-[#18BBF7] self-start mt-2 animate-pulse">:</div>
          
          <TimeUnit value={timeLeft.h} label="Hrs" isHold={isHold} />
          <div className="text-2xl md:text-4xl font-bold text-[#18BBF7] self-start mt-2 animate-pulse">:</div>
          
          <TimeUnit value={timeLeft.m} label="Min" isHold={isHold} />
          <div className="text-2xl md:text-4xl font-bold text-[#18BBF7] self-start mt-2 animate-pulse">:</div>
          
          <TimeUnit value={timeLeft.s} label="Sec" isHold={isHold} />
        </div>
      </div>
    </div>
  );
}

function TimeUnit({ value, label, isHold }: { value: string, label: string, isHold: boolean }) {
  return (
    <div className="flex flex-col items-center min-w-15 md:min-w-20">
      <span className={`
        font-mono text-2xl md:text-5xl font-bold tracking-tighter leading-none tabular-nums
        ${isHold ? 'text-red-900/50' : 'text-white'}
      `}>
        {value}
      </span>
      <span className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-400 mt-4 text-center">
        {label}
      </span>
    </div>
  );
}
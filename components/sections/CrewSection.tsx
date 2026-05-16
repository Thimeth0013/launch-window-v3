'use client';

import { useState } from 'react';
import AstronautDossier from '../ui/AstronautDossier';

export default function CrewSection({ crew }: { crew: any[] }) {
  const [selected, setSelected] = useState<any>(null);

  return (
    <section data-scroll-section>
      <div className="flex items-center gap-4 mb-8 md:mb-10">
        <h3 className="text-[11px] font-black uppercase tracking-[0.5em] text-[#18BBF7]">
          Flight Crew Manifest
        </h3>
        <span className="font-mono text-[10px] text-zinc-600 uppercase tracking-widest tabular-nums">
          {crew.length.toString().padStart(2, '0')}
        </span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <div
        data-scroll-stagger
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-5"
      >
        {crew.map((member, idx) => (
          <button
            key={member.id ?? idx}
            type="button"
            onClick={() => setSelected(member)}
            className="group flex flex-col items-center text-center focus:outline-none"
          >
            {/* Square frame with corner accents — brutalist */}
            <div className="relative w-24 h-24 md:w-28 md:h-28 mb-3 overflow-hidden border border-white/10 group-hover:border-[#FF6B35] transition-colors duration-500">
              <img
                src={member.astronaut.image?.thumbnail_url}
                className="w-full h-full object-cover grayscale brightness-90 group-hover:grayscale-0 group-hover:brightness-100 group-hover:scale-[1.04] transition-all duration-700"
                alt={member.astronaut.name}
                loading="lazy"
              />

              <span className="absolute top-1.5 left-1.5 font-mono text-[8px] font-black text-[#FF6B35] tracking-widest tabular-nums drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                #{String(idx + 1).padStart(2, '0')}
              </span>

              {/* Hover corner ticks */}
              <span className="absolute top-0 right-0 w-2.5 h-2.5 border-t border-r border-[#FF6B35] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <span className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b border-l border-[#FF6B35] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>

            <p className="font-mono text-[8px] text-[#FF6B35] font-black uppercase tracking-[0.3em] mb-1">
              {member.role.role}
            </p>

            <h4 className="text-white text-[11px] font-bold uppercase group-hover:text-[#18BBF7] transition-colors leading-tight px-1 line-clamp-2">
              {member.astronaut.name}
            </h4>
          </button>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 md:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="absolute inset-0" onClick={() => setSelected(null)} />
          <div className="relative z-10 animate-in slide-in-from-bottom-8 duration-500 w-full max-w-3xl">
            <AstronautDossier
              astronaut={selected.astronaut}
              role={selected.role}
              isOpen={!!selected}
              onClose={() => setSelected(null)}
            />
          </div>
        </div>
      )}
    </section>
  );
}

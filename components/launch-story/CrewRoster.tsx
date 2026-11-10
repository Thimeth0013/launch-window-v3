'use client';

import { useState } from 'react';
import AstronautDossier from '@/components/ui/AstronautDossier';

/* eslint-disable @typescript-eslint/no-explicit-any */

// Crew portraits for the story's crew chapter. Selecting one opens the
// existing astronaut dossier.

export default function CrewRoster({ crew }: { crew: any[] }) {
  const [selected, setSelected] = useState<any>(null);

  return (
    <>
      <ul data-scroll-stagger className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-4">
        {crew.map((member, idx) => {
          const a = member.astronaut ?? {};
          const veteran = Boolean(a.first_flight);
          return (
            <li key={member.id ?? idx}>
              <button
                type="button"
                onClick={() => setSelected(member)}
                className="group w-full text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#18BBF7]"
              >
                <div className="aspect-square w-full overflow-hidden bg-zinc-950">
                  {a.image?.thumbnail_url && (
                    <img
                      src={a.image.thumbnail_url}
                      alt={a.name}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="mt-3 text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">
                  {member.role?.role}
                </div>
                <div className="mt-0.5 text-sm font-semibold leading-snug text-white transition-colors group-hover:text-[#18BBF7]">
                  {a.name}
                </div>
                <div className="mt-0.5 text-[11px] text-zinc-500">
                  {[a.agency?.abbrev, veteran ? 'Has flown before' : 'First flight'].filter(Boolean).join(' · ')}
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {selected && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm md:p-6">
          <div className="absolute inset-0" onClick={() => setSelected(null)} />
          <div className="relative z-10 w-full max-w-3xl">
            <AstronautDossier
              astronaut={selected.astronaut}
              role={selected.role}
              isOpen={!!selected}
              onClose={() => setSelected(null)}
            />
          </div>
        </div>
      )}
    </>
  );
}

'use client';

import { useState } from 'react';
import AstronautDossier from '../ui/AstronautDossier';

export default function CrewSection({ crew }: { crew: any[] }) {
  const [selected, setSelected] = useState<any>(null);

  return (
    <section>
      <div className="flex items-center gap-4 mb-10">
          <h3 className="text-[11px] font-black uppercase tracking-[0.5em] text-[#18BBF7]">Flight Crew Manifest</h3>
          <div className="h-px flex-1 bg-white/10" />
      </div>
      
      {/* CHANGED: grid-cols-4 and reduced the gap to 6 
        to fit perfectly in the layout.
      */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 md:gap-0">
        {crew.map((member) => (
          <div 
            key={member.id} 
            className="flex flex-col items-center group text-center cursor-pointer"
            onClick={() => setSelected(member)}
          >
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-transparent group-hover:border-[#FF6B35] transition-all duration-500 mb-4 p-1">
              <img 
                src={member.astronaut.image?.thumbnail_url} 
                className="w-full h-full object-cover rounded-full scale-110 group-hover:scale-100 transition-all duration-700" 
                alt={member.astronaut.name}
              />
            </div>
            
            {/* Role Label */}
            <p className="text-[8px] text-[#FF6B35] font-black uppercase tracking-widest mb-1">
              {member.role.role}
            </p>
            
            {/* Name */}
            <h4 className="text-white font-bold uppercase text-[10px] group-hover:text-[#18BBF7] transition-colors leading-tight">
              {member.astronaut.name}
            </h4>
          </div>
        ))}
      </div>

      {/* POPUP OVERLAY remains the same */}
      {selected && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="absolute inset-0" onClick={() => setSelected(null)} />
          <div className="relative z-10 animate-in slide-in-from-bottom-8 duration-500">
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
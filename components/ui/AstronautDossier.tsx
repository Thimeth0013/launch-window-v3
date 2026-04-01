'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import { 
  X, Instagram, Twitter, ExternalLink, ShieldCheck, 
  Orbit, Rocket, Footprints, Target
} from 'lucide-react';

interface AstronautDossierProps {
  astronaut: any; // v2.3.0 schema
  role: {
    role: string;
  };
  isOpen: boolean;
  onClose: () => void;
}

export default function AstronautDossier({ astronaut, role, isOpen, onClose }: AstronautDossierProps) {
  
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen || !astronaut) return null;

  // v2.3.0 image path is typically astronaut.image.image_url 
  const profileImg = astronaut.image?.image_url || astronaut.profile_image;

  // Formatter for ISO 8601 Durations (P0DT0H...) [cite: 2194]
  const formatDuration = (duration?: string) => {
    if (!duration || duration === "P0D" || duration === "P0DT0H0M0S") return "0D 0H 0M 0S";
    const regex = /P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?/;
    const matches = duration.match(regex);
    if (!matches) return duration;
    const d = matches[1] || 0;
    const h = matches[2] || 0;
    const m = matches[3] || 0;
    const s = matches[4] || 0;
    return `${d}D ${h}H ${m}M ${s}S`;
  };

  return (
    <div className="fixed inset-0 z-2000 flex items-center justify-center p-0 md:p-6 overflow-y-auto md:overflow-hidden">
      
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/0 animate-in fade-in duration-500" 
        onClick={onClose}
      />

      <button 
        onClick={onClose} 
        className="fixed top-8 right-8 md:top-12 md:right-12 z-50 p-3 border border-white/10 hover:bg-[#FF6B35] transition-all group"
      >
        <X size={20} className="text-[#FF6B35] group-hover:text-black transition-transform" />
      </button>

      <div className="relative bg-[#050505] border-y md:border border-white/20 w-full max-w-6xl min-h-full md:min-h-0 md:h-[85vh] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,1)] animate-in zoom-in-95 duration-500 flex flex-col md:flex-row my-auto">
        
        {/* LEFT: Cinematic Hero Section */}
        <div className="relative w-full md:w-[40%] h-screen md:h-full overflow-hidden shrink-0">
          {profileImg ? (
            <Image 
              src={profileImg} 
              alt={astronaut.name} 
              fill
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center text-zinc-700 font-black italic">IMG_UNAVAILABLE</div>
          )}
          <div className="absolute inset-0 bg-linear-to-t from-[#050505] via-transparent to-transparent"></div>
          <div className="absolute inset-0 bg-linear-to-r from-transparent via-transparent to-[#050505] hidden md:block"></div>

          <div className="absolute bottom-8 left-8 right-8">
            <div className="flex items-center gap-2 mb-3 text-[#18BBF7]">
                <ShieldCheck size={14} />
                <span className="text-[10px] font-black uppercase tracking-[0.4em]">Verified Personnel</span>
            </div>
            <h2 className="text-2xl md:text-3xl text-left font-black uppercase tracking-tighter text-white mb-4 leading-none">
              {astronaut.name}
            </h2>
            <div className="text-left border-l-2 border-[#FF6B35] pl-4">
              <p className="text-white text-[12px] font-black uppercase leading-tight mb-1">{astronaut.agency?.name || 'Independent'}</p>
              <p className="text-zinc-500 text-[10px] font-bold tracking-widest uppercase">// {role?.role || 'Mission Specialist'}</p>
            </div>
          </div>
        </div>

        {/* RIGHT: Data Terminal Section */}
        <div className="flex-1 flex flex-col relative bg-[#050505]">
          <div className="overflow-y-auto p-8 md:p-12 flex-1 custom-scrollbar">
            
            {/* Biography */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-[10px] font-black tracking-[0.5em] uppercase text-zinc-600">Personnel Bio</h3>
                <div className="h-px flex-1 bg-white/10"></div>
              </div>
              <p className="text-zinc-400 text-sm leading-loose font-light uppercase tracking-widest text-justify">
                {astronaut.bio || "No biography available in mission records."}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-6 px-2 py-6 border-y border-white/10">
              {[
                { Icon: Rocket, label: 'Flights', val: astronaut.flights_count },
                { Icon: Footprints, label: 'EVA Time', val: formatDuration(astronaut.eva_time) },
                { Icon: Orbit, label: 'In Space', val: astronaut.in_space ? "YES" : "NO", active: astronaut.in_space }
              ].map(({ Icon, label, val, active = true }, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Icon className={`w-3.5 h-3.5 ${active ? 'text-[#18BBF7]' : 'text-zinc-600'}`} />
                  <div>
                    <p className="text-[10px] leading-none text-zinc-500 uppercase tracking-tighter">{label}</p>
                    <p className={`text-sm font-mono font-bold text-left px-1 mt-1 ${active ? 'text-white' : 'text-zinc-600'}`}>
                      {val || 0}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Core Data Dossier Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-10 gap-x-12 pt-10 border-t border-white/10 text-left mb-12">
              <DataField 
                label="Duty Status" 
                value={astronaut.status?.name || 'Unavailable'} 
                statusColor={
                  astronaut.status?.name?.toLowerCase().includes('active') ? 'bg-[#18BBF7] animate-pulse shadow-[0_0_8px_#18BBF7]' : 
                  astronaut.status?.name?.toLowerCase().includes('training') ? 'bg-[#FF6B35] animate-pulse animate-pulse shadow-[0_0_8px_#FF6B35]' : 'bg-zinc-600'
                }
                pulse={astronaut.status?.name?.toLowerCase().includes('active')}
              />
              
              <DataField 
                label="Nationality / Origin" 
                value={astronaut.nationality?.map((n: any) => n.name).join(', ') || 'Unknown'} 
              />
              
              <DataField 
                label="Personnel Rank" 
                value={(astronaut.flights_count || 0) > 0 ? "Veteran Astronaut" : "Astronaut Candidate"} 
                mono 
              />

              <DataField 
                label="Date of Birth" 
                value={astronaut.date_of_birth ? new Date(astronaut.date_of_birth).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Unknown'} 
                mono 
              />

              <DataField
                label="Total Space Time"
                value={formatDuration(astronaut.time_in_space)}
                mono
              />

              <DataField
                label="Most Recent Launch" 
                value={astronaut.last_flight ? new Date(astronaut.last_flight).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A'}
                mono
              />

            </div>

            <div className="flex flex-wrap gap-8 pt-6 border-t border-white/5">
              {astronaut.wiki && <SocialLink href={astronaut.wiki} label="Wikipedia" Icon={ExternalLink} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DataField({ label, value, statusColor, pulse, mono }: any) {
  return (
    <div className="flex flex-col">
      <span className="text-zinc-600 text-[9px] uppercase tracking-[0.4em] mb-2">{label}</span>
      <div className="flex items-center gap-2">
        {statusColor && (
          <div className={`w-1.5 h-1.5 rounded-full ${statusColor} ${pulse ? 'animate-pulse shadow-[0_0_8px_currentColor]' : ''}`} />
        )}
        <p className={`text-white text-sm font-bold uppercase tracking-wide ${mono ? 'font-mono' : ''}`}>{value}</p>
      </div>
    </div>
  );
}

function SocialLink({ href, label, Icon }: any) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-zinc-500 hover:text-[#18BBF7] transition-all group">
      <Icon size={14} /><span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
    </a>
  );
}
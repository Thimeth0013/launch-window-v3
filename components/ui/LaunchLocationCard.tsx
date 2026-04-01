import { MapPin, Building2, Globe } from 'lucide-react';

interface LaunchLocationCardProps {
  pad: any;
}

export default function LaunchLocationCard({ pad }: LaunchLocationCardProps) {
  if (!pad) return null;

  const location = pad.location;
  const hasCoordinates = pad.latitude && pad.longitude;

  return (
    <section className="relative bg-zinc-900/20 border border-white/5 p-8">
      {/* Corner Accent */}
      <div className="absolute bottom-0 left-0 w-16 h-16 border-b border-l border-[#FF6B35]/30 pointer-events-none" />
      
      <div className="flex items-center gap-4 mb-8">
        <MapPin className="text-[#FF6B35]" size={20} />
        <h3 className="text-[11px] font-black uppercase tracking-[0.5em] text-[#FF6B35]">
          Launch_Site // Ground_Systems
        </h3>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <div className="grid grid-cols-1 gap-8">
        
        {/* Primary Location Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Launch Pad */}
          <div>
            <div className="text-[9px] text-zinc-600 uppercase font-black tracking-widest mb-2">
              Launch Complex
            </div>
            <div className="text-3xl font-black text-white leading-tight">
              {pad.name}
            </div>
          </div>

          {/* Site Location */}
          {location && (
            <div className="pt-4 border-t border-white/5">
              <div className="text-[9px] text-zinc-600 uppercase font-black tracking-widest mb-2 flex items-center gap-2">
                <Globe size={12} className="text-[#18BBF7]" />
                Geographic Location
              </div>
              <div className="text-xl font-bold text-white mb-1">
                {location.name}
              </div>
              {location.country?.name && (
                <div className="text-sm text-zinc-400">
                  {location.country.name}
                </div>
              )}
            </div>
          )}

          {/* Operating Agencies */}
          {pad.agencies && pad.agencies.length > 0 && (
            <div className="pt-4 border-t border-white/5">
              <div className="text-[9px] text-zinc-600 uppercase font-black tracking-widest mb-3 flex items-center gap-2">
                <Building2 size={12} className="text-[#18BBF7]" />
                Operating Agencies
              </div>
              <div className="flex flex-wrap gap-2">
                {pad.agencies.map((agency: any, idx: number) => (
                  <div 
                    key={idx}
                    className="bg-black/40 border border-white/5 px-3 py-1.5"
                  >
                    <div className="text-xs font-bold text-white">
                      {agency.name || agency.abbrev}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {(pad.description || location?.description) && (
            <div className="pt-4 border-t border-white/5">
              <div className="text-[9px] text-zinc-600 uppercase font-black tracking-widest mb-3">
                Site Information
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {pad.description || location.description}
              </p>
            </div>
          )}
        </div>

        {/* Sidebar - Coordinates & Stats */}
        <div className="space-y-6">
        

        {/* Coordinates & Action Row */}
        {hasCoordinates && (
          <div className="bg-black/40 border border-white/5 p-4">

              {/* Embedded Map */}
              <div className="mb-2 border border-white/5 overflow-hidden">
                <iframe
                  width="100%"
                  height="200"
                  frameBorder="0"
                  style={{ border: 0 }}
                  src={`https://maps.google.com/maps?q=${pad.latitude},${pad.longitude}&t=k&z=15&output=embed`} allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="w-full"
                />
              </div>
            <div className="flex flex-col sm:flex-row items-center justify-end gap-6">
              
              {/* Latitude Group */}
              <div className="flex flex-row">
                <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                  Latitude {pad.latitude.toFixed(6)}°
                </div>
              </div>

              {/* Longitude Group */}
              <div className="flex flex-row">
                <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">
                  Longitude {pad.longitude.toFixed(6)}°
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Unified Stats & Status Row */}
        <div className="bg-black/40 border border-white/5 flex flex-wrap md:flex-nowrap items-stretch divide-x divide-white/5">
          
          {/* Launch History Section */}
          {(pad.total_launch_count !== undefined || pad.orbital_launch_attempt_count !== undefined) && (
            <div className="p-5 flex gap-8 min-w-fit">
              {pad.total_launch_count !== undefined && (
                <div>
                  <div className="text-[9px] text-zinc-600 uppercase font-black tracking-widest mb-1">
                    Total
                  </div>
                  <div className="text-md font-black text-[#FF6B35] leading-none">
                    {pad.total_launch_count}
                  </div>
                </div>
              )}
              {pad.orbital_launch_attempt_count !== undefined && (
                <div>
                  <div className="text-[9px] uppercase font-black tracking-widest mb-1 text-zinc-500">
                    Orbital
                  </div>
                  <div className="text-md font-black text-white leading-none">
                    {pad.orbital_launch_attempt_count}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Status Section */}
          {pad.active !== undefined && (
            <div className="p-2 flex flex-col justify-center min-w-35 pl-4">
              <div className="text-[9px] text-zinc-600 uppercase font-black tracking-widest">
                Status
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  pad.active ? 'bg-green-400 animate-pulse' : 'bg-red-400'
                }`} />
                <span className={`text-xs font-bold uppercase tracking-widest ${
                  pad.active ? 'text-green-400' : 'text-red-400'
                }`}>
                  {pad.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          )}

          {/* Performance Section */}
          {pad.fastest_turnaround && (
            <div className="p-5 flex flex-col justify-center flex-1">
              <div className="text-[9px] text-zinc-600 uppercase font-black tracking-widest mb-1">
                Fastest Turnaround
              </div>
              <div className="text-xs font-black text-[#18BBF7] tracking-tight">
                {pad.fastest_turnaround}
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
    </section>
  );
}
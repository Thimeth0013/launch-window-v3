import { Target, Orbit, Globe2, Satellite } from 'lucide-react';

interface DestinationCardProps {
  mission: any;
}

export default function DestinationCard({ mission }: DestinationCardProps) {
  if (!mission) return null;

  const orbit = mission.orbit;
  const celestialBody = orbit?.celestial_body;
  const hasDestination = orbit || mission.type;

  if (!hasDestination) return null;

  return (
    <section className="relative bg-zinc-900/20 border border-white/5 p-8 overflow-hidden">
      {/* Background Effect */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#18BBF7]/5 blur-3xl pointer-events-none" />
      
      {/* Corner Accent */}
      <div className="absolute top-0 left-0 w-16 h-16 border-t border-l border-[#18BBF7]/30 pointer-events-none" />
      
      <div className="relative">
        <div className="flex items-center gap-4 mb-8">
          <Target className="text-[#18BBF7]" size={20} />
          <h3 className="text-[11px] font-black uppercase tracking-[0.5em] text-[#18BBF7]">
            Mission_Target // Orbital_Parameters
          </h3>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Primary Destination Info */}
          <div className="space-y-6">
            
            {/* Mission Type */}
            {mission.type && (
              <div>
                <div className="text-[9px] text-zinc-600 uppercase font-black tracking-widest mb-2">
                  Mission Classification
                </div>
                <div className="text-2xl font-black text-white leading-tight">
                  {mission.type}
                </div>
              </div>
            )}

            {/* Target Orbit */}
            {orbit && (
              <div className="pt-4 border-t border-white/5">
                <div className="text-[9px] text-zinc-600 uppercase font-black tracking-widest mb-2 flex items-center gap-2">
                  <Orbit size={12} className="text-[#FF6B35]" />
                  Target Orbit
                </div>
                <div className="text-3xl font-black text-[#FF6B35] leading-tight mb-1">
                  {orbit.name}
                </div>
                {orbit.abbrev && orbit.abbrev !== orbit.name && (
                  <div className="text-sm text-zinc-400 font-mono">
                    {orbit.desc}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Celestial Body Info */}
          <div className="space-y-6">
            
            {celestialBody && (
              <div className="bg-black/40 border border-white/5 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Globe2 className="text-[#18BBF7]" size={16} />
                  <div className="text-[9px] text-zinc-600 uppercase font-black tracking-widest">
                    Celestial Body
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="text-2xl font-black text-white mb-1">
                      {celestialBody.name}
                    </div>
                    {celestialBody.type?.name && (
                      <div className="text-xs text-[#18BBF7] uppercase font-bold">
                        {celestialBody.type.name}
                      </div>
                    )}
                  </div>

                  {/* Physical Parameters */}
                  {(celestialBody.diameter || celestialBody.mass || celestialBody.gravity) && (
                    <div className="pt-4 border-t border-white/5 space-y-3">
                      {celestialBody.diameter && (
                        <PhysicalParam 
                          label="Diameter" 
                          value={formatDistance(celestialBody.diameter)} 
                        />
                      )}
                      {celestialBody.gravity && (
                        <PhysicalParam 
                          label="Surface Gravity" 
                          value={`${celestialBody.gravity.toFixed(2)} m/s²`} 
                        />
                      )}
                      {celestialBody.length_of_day && (
                        <PhysicalParam 
                          label="Day Length" 
                          value={celestialBody.length_of_day} 
                        />
                      )}
                      {celestialBody.atmosphere !== undefined && (
                        <PhysicalParam 
                          label="Atmosphere" 
                          value={celestialBody.atmosphere ? 'Yes' : 'No'} 
                        />
                      )}
                    </div>
                  )}

                  {/* Launch Statistics for Body */}
                  {(celestialBody.total_attempted_launches || celestialBody.successful_launches) && (
                    <div className="pt-4 border-t border-white/5">
                      <div className="text-[8px] text-zinc-600 uppercase tracking-wider mb-2">
                        Launch History
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {celestialBody.total_attempted_launches !== undefined && (
                          <div>
                            <div className="text-lg font-black text-white">
                              {celestialBody.total_attempted_launches}
                            </div>
                            <div className="text-[7px] text-zinc-600 uppercase">
                              Attempts
                            </div>
                          </div>
                        )}
                        {celestialBody.successful_launches !== undefined && (
                          <div>
                            <div className="text-lg font-black text-green-400">
                              {celestialBody.successful_launches}
                            </div>
                            <div className="text-[7px] text-zinc-600 uppercase">
                              Success
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Mission Agencies */}
            {mission.agencies && mission.agencies.length > 0 && (
              <div className="bg-black/40 border border-white/5 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Satellite size={14} className="text-[#FF6B35]" />
                  <div className="text-[9px] text-zinc-600 uppercase font-black tracking-widest">
                    Mission Agencies
                  </div>
                </div>
                
                <div className="space-y-2">
                  {mission.agencies.map((agency: any, idx: number) => (
                    <div 
                      key={idx}
                      className="flex items-center justify-between border-b border-white/5 pb-2 last:border-0"
                    >
                      <span className="text-sm font-bold text-white">
                        {agency.name}
                      </span>
                      {agency.type?.name && (
                        <span className="text-[8px] text-zinc-500 uppercase tracking-wider">
                          {agency.type.name}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function PhysicalParam({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-[9px] text-zinc-600 uppercase tracking-wider">
        {label}
      </span>
      <span className="text-xs text-white font-mono">
        {value}
      </span>
    </div>
  );
}

function formatDistance(meters: number): string {
  if (meters >= 1000000) {
    return `${(meters / 1000000).toFixed(0)} Mm`;
  } else if (meters >= 1000) {
    return `${(meters / 1000).toFixed(0)} km`;
  }
  return `${meters} m`;
}
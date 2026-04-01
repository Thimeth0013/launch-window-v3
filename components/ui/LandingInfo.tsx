import { MapPin, Target, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface LandingInfoProps {
  spacecraft_stage: any[];
}

export default function LandingInfo({ spacecraft_stage }: LandingInfoProps) {
  if (!spacecraft_stage || spacecraft_stage.length === 0) return null;

  const landingInfo = spacecraft_stage
    .filter((stage: any) => stage.landing)
    .map((stage: any) => stage.landing);

  if (landingInfo.length === 0) return null;

  return (
    <section className="relative bg-zinc-900/20 border border-white/5 p-8">
      <div className="flex items-center gap-4 mb-8">
        <h3 className="text-[11px] font-black uppercase tracking-[0.5em] text-[#18BBF7]">
          Landing_Operations // Recovery_Zone
        </h3>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <div className="space-y-6">
        {landingInfo.map((landing: any, idx: number) => (
          <div 
            key={idx}
            className="bg-black/40 border border-white/5 p-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Landing Status */}
              <div className="md:col-span-2 space-y-4">
                
                {/* Attempt & Success Status */}
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    {landing.attempt ? (
                      <>
                        <CheckCircle className="text-[#18BBF7]" size={16} />
                        <span className="text-sm font-bold text-white uppercase">
                          Landing Attempted
                        </span>
                      </>
                    ) : (
                      <>
                        <XCircle className="text-zinc-600" size={16} />
                        <span className="text-sm font-bold text-zinc-600 uppercase">
                          No Landing Attempt
                        </span>
                      </>
                    )}
                  </div>

                  {landing.attempt && landing.success !== null && (
                    <div className="flex items-center gap-2">
                      {landing.success ? (
                        <>
                          <div className="w-2 h-2 bg-green-400 rounded-full" />
                          <span className="text-xs font-bold text-green-400 uppercase">
                            Successful
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="w-2 h-2 bg-red-400 rounded-full" />
                          <span className="text-xs font-bold text-red-400 uppercase">
                            Failed
                          </span>
                        </>
                      )}
                    </div>
                  )}

                  {landing.attempt && landing.success === null && (
                    <div className="flex items-center gap-2">
                      <AlertCircle className="text-amber-400" size={14} />
                      <span className="text-xs font-bold text-amber-400 uppercase">
                        Pending
                      </span>
                    </div>
                  )}
                </div>

                {/* Landing Type */}
                {landing.type && (
                  <div className="pt-3 border-t border-white/5">
                    <div className="text-[9px] text-zinc-600 uppercase font-black tracking-widest mb-1">
                      Landing Method
                    </div>
                    <div className="text-lg font-black text-white">
                      {landing.type.name}
                    </div>
                    {landing.type.description && (
                      <div className="text-xs text-zinc-400 mt-1">
                        {landing.type.description}
                      </div>
                    )}
                  </div>
                )}

                {/* Description */}
                {landing.description && (
                  <div className="pt-3 border-t border-white/5">
                    <div className="text-[9px] text-zinc-600 uppercase font-black tracking-widest mb-2">
                      Landing Details
                    </div>
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      {landing.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Landing Location */}
              <div className="space-y-4">
                
                {landing.landing_location && (
                  <div className="bg-black/50 border border-white/5 p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <MapPin className="text-[#FF6B35]" size={14} />
                      <div className="text-[9px] text-zinc-600 uppercase font-black tracking-widest">
                        Landing Zone
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="text-lg font-black text-white">
                          {landing.landing_location.name}
                        </div>
                        {landing.landing_location.abbrev && (
                          <div className="text-xs text-zinc-400 font-mono">
                            {landing.landing_location.abbrev}
                          </div>
                        )}
                      </div>

                      {/* Location Stats */}
                      {(landing.landing_location.successful_landings || 
                        landing.landing_location.attempted_landings) && (
                        <div className="pt-3 border-t border-white/5 space-y-2">
                          {landing.landing_location.attempted_landings !== undefined && (
                            <div className="flex justify-between text-xs">
                              <span className="text-zinc-600 uppercase">Total Attempts</span>
                              <span className="text-white font-bold">
                                {landing.landing_location.attempted_landings}
                              </span>
                            </div>
                          )}
                          {landing.landing_location.successful_landings !== undefined && (
                            <div className="flex justify-between text-xs">
                              <span className="text-zinc-600 uppercase">Successful</span>
                              <span className="text-green-400 font-bold">
                                {landing.landing_location.successful_landings}
                              </span>
                            </div>
                          )}
                          {landing.landing_location.failed_landings !== undefined && (
                            <div className="flex justify-between text-xs">
                              <span className="text-zinc-600 uppercase">Failed</span>
                              <span className="text-red-400 font-bold">
                                {landing.landing_location.failed_landings}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Coordinates */}
                      {(landing.landing_location.latitude && landing.landing_location.longitude) && (
                        <div className="pt-3 border-t border-white/5">
                          <div className="text-[8px] text-zinc-600 uppercase tracking-wider mb-2">
                            Coordinates
                          </div>
                          <div className="text-xs text-white font-mono">
                            {landing.landing_location.latitude.toFixed(4)}°, {landing.landing_location.longitude.toFixed(4)}°
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Downrange Distance */}
                {landing.downrange_distance && (
                  <div className="bg-black/50 border border-white/5 p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <Target size={14} className="text-[#18BBF7]" />
                      <div className="text-[9px] text-zinc-600 uppercase font-black tracking-widest">
                        Downrange Distance
                      </div>
                    </div>
                    <div className="text-2xl font-black text-[#18BBF7]">
                      {landing.downrange_distance} km
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

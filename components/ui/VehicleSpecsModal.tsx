import { X, Rocket, Shield, Info, Activity, RefreshCcw, Gauge, MapPin } from 'lucide-react';
import { useEffect } from 'react';
import LandingInfo from '@/components/ui/LandingInfo';

export default function VehicleSpecsModal({ isOpen, onClose, data }: { isOpen: boolean; onClose: () => void; data: any }) {
  const { config, spacecraft, spacecraft_stage } = data;
  const scConfig = spacecraft?.spacecraft_config;
  const stages = data?.launcher_stage || [];

  if (!isOpen) return null;

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const formatISOToHuman = (isoString: string) => {
    if (!isoString) return '---';

    // Match Days, Hours, Minutes
    const days = isoString.match(/(\d+)D/)?.[1];
    const hours = isoString.match(/(\d+)H/)?.[1];
    const minutes = isoString.match(/(\d+)M/)?.[1];

    const parts = [];
    if (days) parts.push(`${days}d`);
    if (hours) parts.push(`${hours}h`);
    if (minutes) parts.push(`${minutes}m`);

    return parts.length > 0 ? parts.join(' ') : 'First Flight';
  };

  return (
    <div className="fixed inset-0 z-1000 flex items-center justify-center p-4 md:p-8">
      {/* Backdrop */}
      <div className="absolute inset-0 backdrop-blur-md" onClick={onClose} />

      {/* Modal Content */}
      <div className="relative w-full max-w-6xl max-h-[90vh] bg-zinc-950 border border-[#18BBF7]/30 overflow-y-auto scrollbar-hide shadow-2xl shadow-cyan-500/10">

        {/* Header Section - ROCKET IMAGE */}
        <div className="relative h-64 md:h-120 border-b border-white/10">
          <img
            src={config?.image?.image_url || config?.image_url || scConfig?.image?.image_url || spacecraft?.image?.image_url}
            className="w-full h-full object-cover opacity-60"
            alt="Launch Vehicle"
          />
          {/* Gradient Overlay for Text Readability */}
          <div className="absolute inset-0 bg-linear-to-t from-zinc-950 via-zinc-950/20 to-transparent" />

          <div className="absolute bottom-8 left-8 right-8">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 bg-[#18BBF7] text-black text-[10px] font-black uppercase tracking-tighter">System Blueprint</span>
              <span className="text-zinc-400 text-[10px] font-mono uppercase tracking-widest bg-black/40 px-2 py-0.5">ID: {String(config?.id || '').substring(0, 8)}</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white uppercase italic tracking-tighter drop-shadow-2xl">
              {config?.full_name || config?.name}
            </h2>
            <p className="text-[#18BBF7] text-sm font-bold tracking-[0.2em] mt-1 uppercase">
              {config?.manufacturer?.name || config?.provider}
            </p>
          </div>

          <button onClick={onClose} className="absolute top-6 right-8 p-2 hover:bg-white border border-black/10 hover:text-black bg-black text-white transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-12">

          {/* SECTION 1: LAUNCH VEHICLE OVERVIEW */}
          <section>
            <div className="flex items-center gap-4 mb-6">
              <Rocket className="text-[#18BBF7]" size={18} />
              <h3 className="text-xs font-black uppercase tracking-[0.4em] text-white">Launch_Vehicle_Data</h3>
              <div className="h-px flex-1 bg-white/5" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Technical Specs */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Technical Specs</h4>
                <div className="space-y-2">
                  <SpecRow label="Family" value={config?.families?.[0]?.name} />
                  <SpecRow label="Variant" value={config?.variant} />
                  <SpecRow label="Status" value={config?.active ? "ACTIVE" : "RETIRED"} />
                  <SpecRow label="Total Flights" value={config?.total_launch_count} />
                  <SpecRow label="Successful" value={config?.successful_launches} />
                </div>
              </div>

              {/* Vehicle Overview */}
              <div className="lg:col-span-2 space-y-4">
                <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Vehicle Overview</h4>
                <p className="text-xs text-zinc-400 leading-relaxed font-light whitespace-pre-line">
                  {config?.description}
                </p>
              </div>
            </div>
          </section>

          {/* SECTION 2: SPACECRAFT MODULE */}
          {scConfig && (
            <section className="relative bg-zinc-950 border border-white/5 overflow-hidden">

              {/* BACKGROUND IMAGE LAYER */}
              <div className="absolute inset-0 z-0">
                <img
                  src={scConfig?.image?.image_url || spacecraft?.image?.image_url}
                  className="w-full h-full object-cover opacity-60" // Lower opacity helps text readability
                  alt="Spacecraft Module"
                />
              </div>

              {/* CONTENT LAYER - Relative z-10 ensures it sits above the image */}
              <div className="relative z-10">

                {/* Header Tag */}
                <div className="p-8 pb-0">
                  <div className="flex items-center gap-2">
                    <Shield className="text-[#FF6B35]" size={16} />
                    <h3 className="text-xs font-black uppercase tracking-[0.4em] text-white">Crew_Module</h3>
                  </div>
                </div>

                <div className="p-8">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                    {/* Module Specs */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Module Specs</h4>
                      <div className="space-y-2">
                        <SpecRow label="Designation" value={scConfig?.name} />
                        <SpecRow label="Serial" value={spacecraft?.serial_number} />
                        <SpecRow label="Human Rated" value={spacecraft?.spacecraft_config?.human_rated ? "YES" : "NO"} />
                        <SpecRow label="Crew Capacity" value={scConfig?.crew_capacity} />
                        <SpecRow label="Height" value={scConfig?.height ? `${scConfig.height}m` : null} />
                        <SpecRow label="Diameter" value={scConfig?.diameter ? `${scConfig.diameter}m` : null} />
                      </div>
                    </div>

                    {/* Technical History */}
                    <div className="lg:col-span-2 space-y-4">
                      <div className="text-sm text-zinc-300 leading-relaxed border-l-2 border-[#FF6B35] pl-4 bg-black/40 backdrop-blur-xs p-4">
                        <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Technical History</h4>
                        "{scConfig?.history}"
                      </div>
                    </div>
                  </div>

                  {/* Performance Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 backdrop-blur-xs">
                    <CapabilityCard label="Primary Capability" value={scConfig?.capability} />
                    <CapabilityCard label="Service Life" value={scConfig?.flight_life} />
                    <CapabilityCard label="Operational Status" value={spacecraft?.status?.name} />
                  </div>

                  {/* Module Details */}
                  <div className="bg-black/40 backdrop-blur-xs p-6 rounded-sm border border-white/5">
                    <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Module Details</h4>
                    <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-line">
                      {scConfig?.details}
                    </p>
                  </div>
                  <div className='pt-4 pr-1 text-end '>
                    {scConfig?.wiki_link && (
                      <a href={scConfig.wiki_link} target="_blank" className="text-[10px] text-[#18BBF7] hover:text-[#FF6B35] transition-colors uppercase font-black italic">Wikipedia_Entry</a>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* SECTION 3: PROPULSION & RECOVERY - Full width for better readability */}
          {stages && stages.length > 0 && (
            <section>
              <div className="flex items-center gap-4 mb-6">
                <Gauge className="text-[#18BBF7]" size={18} />
                <h3 className="text-xs font-black uppercase tracking-[0.4em] text-white">Propulsion_&_Recovery</h3>
                <div className="h-px flex-1 bg-white/5" />
              </div>

              <div className="grid grid-cols-1 gap-6">
                {stages.map((stage: any, index: number) => {
                  const booster = stage.launcher;
                  const landing = stage.landing;
                  return (
                    <div key={index} className="bg-white/3 border border-white/10 flex flex-col">
                      {/* Booster Header */}
                      <div className="p-5 border-b border-white/5">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[9px] text-[#18BBF7] font-black uppercase tracking-widest">
                              {stage.type} Stage // {landing?.type?.abbrev || 'Expendable'}
                            </span>
                            <h4 className="text-xl font-black text-white uppercase italic">
                              {booster?.serial_number || "Experimental Core"}
                            </h4>
                          </div>
                          {stage.reused && (
                            <div className="flex items-center gap-1 bg-green-500/10 border border-green-500/50 px-2 py-1">
                              <RefreshCcw size={10} className="text-green-400" />
                              <span className="text-[9px] text-green-400 font-bold uppercase tracking-tighter">Flight Proven</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Technical Stats */}
                      <div className="p-5 grid grid-cols-2 gap-4">
                        <SpecRow label="Flight Number" value={stage.launcher_flight_number} />
                        <SpecRow label="Total Flights" value={booster?.flights} />
                        <SpecRow label="Turnaround" value={formatISOToHuman(stage.turn_around_time)} />
                        <SpecRow label="Downrange" value={landing?.downrange_distance ? `${landing.downrange_distance} km` : '0 km'} />
                      </div>

                      {/* Recovery Logic */}
                      {landing && (
                        <div className="mt-auto p-5 bg-black/40 border-t border-white/5">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <MapPin size={12} className="text-[#FF6B35]" />
                              <span className="text-[10px] text-white font-black uppercase italic">
                                {landing.landing_location?.name} ({landing.landing_location?.abbrev})
                              </span>
                            </div>
                            <span className={`text-[8px] font-black px-1.5 py-0.5 border ${landing.attempt ? 'border-orange-500/50 text-orange-400' : 'border-zinc-500 text-zinc-500'
                              }`}>
                              {landing.attempt ? 'RECOVERY_TARGET' : 'NOT_RECOVERABLE'}
                            </span>
                          </div>

                          <p className="text-[10px] text-zinc-400 leading-relaxed font-light mb-3">
                            {landing.description}
                          </p>

                          {/* Location Detail Mini-Badge */}
                          <div className="text-[10px] text-zinc-400 uppercase tracking-widest bg-zinc-900/30 p-2 border border-white/5">
                            Target: {landing.landing_location?.description}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* SECTION 4: LANDING INFO - NEW ADDITION */}
          {spacecraft_stage && (
            <LandingInfo spacecraft_stage={spacecraft_stage} />
          )}

          {/* Footer */}
          <p className="text-[9px] text-zinc-600 uppercase font-mono tracking-widest">End_Of_Transmission // 0xCCFF18</p>

        </div>
      </div>
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between items-end border-b border-white/5 pb-1">
      <span className="text-[9px] text-zinc-300 uppercase font-bold">{label}</span>
      <span className="text-xs text-white drop-shadow-lg font-mono">{value || '---'}</span>
    </div>
  );
}

function CapabilityCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 border-l-2 border-[#18BBF7] bg-black/30 transition-colors">
      <div className="flex items-center gap-2 mb-2 text-[#18BBF7]">
        <span className="text-[9px] font-black uppercase tracking-widest opacity-60">{label}</span>
      </div>
      <p className="text-[11px] text-zinc-200 leading-tight uppercase font-bold">{value || 'NOT_AVAILABLE'}</p>
    </div>
  );
}
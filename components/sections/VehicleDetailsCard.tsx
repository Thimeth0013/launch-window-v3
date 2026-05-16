"use client";

import { useState } from 'react';
import { ChevronRight, Rocket } from 'lucide-react';
import VehicleSpecsModal from '@/components/ui/VehicleSpecsModal';

interface VehicleDetailsCardProps {
  rocket?: any;
  config?: any;
}

export default function VehicleDetailsCard({ rocket, config: configProp }: VehicleDetailsCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const config = configProp || rocket?.configuration;
  const spacecraft = rocket?.spacecraft_stage?.[0]?.spacecraft;
  const launcher = rocket?.launcher_stage?.[0]?.launcher;

  if (!config) return null;

  return (
    <>
      <section
        data-scroll-section
        className="relative border border-white/10 hover:border-white/20 transition-colors duration-500 p-5 md:p-8 overflow-hidden"
      >
        {/* Corner accents */}
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#FF6B35] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#FF6B35]/0 hover:border-[#FF6B35] transition-colors duration-500 pointer-events-none" />

        <div className="flex items-center gap-4 mb-6">
          <h3 className="text-[11px] font-black uppercase tracking-[0.5em] text-[#18BBF7]">
            Vehicle_Summary
          </h3>
          <Rocket className="w-3 h-3 text-zinc-600" />
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <div className="space-y-6 relative z-10">
          <div>
            <div className="text-xl md:text-2xl lg:text-3xl font-black text-white uppercase tracking-tight leading-tight mb-2">
              {config.full_name || config.name}
            </div>
            <p className="text-xs md:text-sm text-zinc-400 leading-relaxed line-clamp-3">
              {config.description || config.name}
            </p>
          </div>

          <div data-scroll-stagger className="grid grid-cols-2 gap-3 md:gap-4">
            <StatBox label="Crew Capsule" value={spacecraft?.spacecraft_config?.name || "N/A"} />
            <StatBox label="Booster" value={launcher?.serial_number || launcher?.name || "N/A"} />
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full group flex items-center justify-between bg-[#18BBF7]/10 hover:bg-[#18BBF7]/20 border border-[#18BBF7]/30 hover:border-[#18BBF7]/60 px-4 py-3.5 transition-all"
          >
            <span className="text-[10px] font-black uppercase tracking-widest text-white">
              Access Technical Manual
            </span>
            <ChevronRight size={16} className="text-[#18BBF7] group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>

      {isModalOpen && (
        <VehicleSpecsModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          data={{
            config,
            spacecraft,
            launcher_stage: rocket?.launcher_stage,
            spacecraft_stage: rocket?.spacecraft_stage,
          }}
        />
      )}
    </>
  );

  function StatBox({ label, value }: { label: string; value: any }) {
    return (
      <div className="relative bg-white/[0.03] hover:bg-white/[0.06] p-3 md:p-4 border border-white/5 transition-colors group/stat">
        <div className="absolute top-0 right-0 w-1.5 h-1.5 border-t border-r border-[#FF6B35]/0 group-hover/stat:border-[#FF6B35] transition-colors duration-500" />
        <div className="text-lg md:text-xl font-black text-[#FF6B35] truncate">{value}</div>
        <div className="text-[8px] text-zinc-500 uppercase tracking-widest mt-1.5">{label}</div>
      </div>
    );
  }
}

"use client";

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
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
      <section className="relative border border-white/5 p-8 overflow-hidden">

        <div className="flex items-center gap-4 mb-6">
          <h3 className="text-[11px] font-black uppercase tracking-[0.5em] text-[#18BBF7]">
            Vehicle_Summary
          </h3>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <div className="space-y-6 relative z-10">
          <div>
            <div className="text-2xl font-black text-white">{config.full_name || config.name}</div>
            <p className="text-xs font-mono text-zinc-400">{config.description || config.name}</p>
          </div>

           <div className="grid grid-cols-2 gap-4">
             <StatBox label="Crew Capsule" value={spacecraft?.spacecraft_config?.name || "N/A"}/>
             <StatBox label="Booster" value={launcher?.serial_number || launcher?.name || "N/A"}/>
           </div>

          <button 
            onClick={() => setIsModalOpen(true)}
            className="w-full group flex items-center justify-between bg-[#18BBF7]/10 hover:bg-[#18BBF7]/20 border border-[#18BBF7]/30 p-4 transition-all"
          >
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-white">Access Technical Manual</span>
            </div>
            <ChevronRight size={16} className="text-[#18BBF7] group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>

      {/* Modal logic here */}
      {isModalOpen && (
        <VehicleSpecsModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          data={{ config, spacecraft, launcher_stage: rocket?.launcher_stage, spacecraft_stage: rocket?.spacecraft_stage}}

        />
      )}
    </>
  );

  // Helper for the small stats
  function StatBox({ label, value }: { label: string; value: any }) {
    return (
      <div className="bg-white/5 p-3 border border-white/5">
        <div className={`text-xl font-black text-[#FF6B35]`}>{value}</div>
        <div className="text-[8px] text-zinc-500 uppercase tracking-widest mt-1">{label}</div>
      </div>
    );
}
}
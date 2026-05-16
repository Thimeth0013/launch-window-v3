import { TrendingUp, Globe, MapPin, Building2 } from 'lucide-react';

interface MissionStatisticsProps {
  launch: any;
}

export default function MissionStatistics({ launch }: MissionStatisticsProps) {
  const year = new Date().getFullYear();

  const stats = [
    {
      category: 'Global',
      icon: Globe,
      data: [
        {
          label: 'Orbital Launch Attempt',
          value: launch.orbital_launch_attempt_count,
          subValue:
            launch.orbital_launch_attempt_count_year &&
            `${launch.orbital_launch_attempt_count_year} in ${year}`,
        },
      ],
    },
    {
      category: 'Location',
      icon: MapPin,
      data: [
        {
          label: 'From Location',
          value: launch.location_launch_attempt_count,
          subValue:
            launch.location_launch_attempt_count_year &&
            `${launch.location_launch_attempt_count_year} in ${year}`,
        },
        {
          label: 'From Pad',
          value: launch.pad_launch_attempt_count,
          subValue:
            launch.pad_launch_attempt_count_year &&
            `${launch.pad_launch_attempt_count_year} in ${year}`,
        },
      ],
    },
    {
      category: 'Agency',
      icon: Building2,
      data: [
        {
          label: 'Agency Total Launches',
          value: launch.agency_launch_attempt_count,
          subValue:
            launch.agency_launch_attempt_count_year &&
            `${launch.agency_launch_attempt_count_year} in ${year}`,
        },
      ],
    },
  ];

  const validStats = stats
    .map((category) => ({
      ...category,
      data: category.data.filter(
        (item) => item.value !== undefined && item.value !== null
      ),
    }))
    .filter((category) => category.data.length > 0);

  if (validStats.length === 0) return null;

  return (
    <section
      data-scroll-section
      className="relative bg-zinc-900/20 border border-white/5 hover:border-white/10 transition-colors p-5 md:p-8"
    >
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#FF6B35] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#FF6B35]/0 hover:border-[#FF6B35] transition-colors duration-500 pointer-events-none" />

      <div className="flex items-center gap-4 mb-6 md:mb-8">
        <TrendingUp className="text-[#FF6B35]" size={18} />
        <h3 className="text-[11px] font-black uppercase tracking-[0.5em] text-[#FF6B35]">
          Launch_Statistics
        </h3>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <div
        data-scroll-stagger
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3"
      >
        {validStats.map((category, idx) => (
          <div
            key={idx}
            className="relative bg-black/40 border border-white/5 p-4 md:p-5 hover:border-white/15 transition-colors group/stat"
          >
            {/* Top accent line */}
            <div className="absolute top-0 left-0 h-px w-8 bg-[#18BBF7]/0 group-hover/stat:bg-[#18BBF7]/60 transition-colors duration-500" />

            <div className="flex items-center gap-3 pb-3 mb-3 border-b border-white/5">
              <category.icon className="text-[#18BBF7]" size={14} />
              <div className="text-[10px] md:text-xs font-black uppercase tracking-[0.3em] text-white">
                {category.category}
              </div>
            </div>

            <div className="space-y-4">
              {category.data.map((stat, statIdx) => (
                <div key={statIdx}>
                  <div className="text-[9px] text-zinc-600 uppercase tracking-widest mb-1.5">
                    {stat.label}
                  </div>
                  <div className="font-mono text-2xl md:text-3xl font-black text-white tabular-nums leading-none">
                    {stat.value}
                  </div>
                  {stat.subValue && (
                    <div className="text-[9px] text-zinc-500 mt-2 uppercase tracking-wider font-mono">
                      {stat.subValue}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-6 border-t border-white/5">
        <p className="text-[11px] md:text-xs text-zinc-500 leading-relaxed">
          Historical context for this launch attempt — tracking progress across global
          orbital launches, location-specific operations, and agency performance.
        </p>
      </div>
    </section>
  );
}

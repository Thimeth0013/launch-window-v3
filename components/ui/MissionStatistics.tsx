import { TrendingUp, Globe , MapPin, Building2 } from 'lucide-react';

interface MissionStatisticsProps {
  launch: any;
}

export default function MissionStatistics({ launch }: MissionStatisticsProps) {
  const stats = [
    {
      category: 'Global',
      icon: Globe,
      data: [
        { 
          label: 'Orbital Launch Attempt', 
          value: launch.orbital_launch_attempt_count,
          subValue: launch.orbital_launch_attempt_count_year && `${launch.orbital_launch_attempt_count_year} in ${new Date().getFullYear()}`
        }
      ]
    },
    {
      category: 'Location',
      icon: MapPin,
      data: [
        { 
          label: 'Total from Location', 
          value: launch.location_launch_attempt_count,
          subValue: launch.location_launch_attempt_count_year && `${launch.location_launch_attempt_count_year} in ${new Date().getFullYear()}`
        },
        { 
          label: 'Total from Pad', 
          value: launch.pad_launch_attempt_count,
          subValue: launch.pad_launch_attempt_count_year && `${launch.pad_launch_attempt_count_year} in ${new Date().getFullYear()}`
        }
      ]
    },
    {
      category: 'Agency',
      icon: Building2,
      data: [
        { 
          label: 'Agency Total Launches', 
          value: launch.agency_launch_attempt_count,
          subValue: launch.agency_launch_attempt_count_year && `${launch.agency_launch_attempt_count_year} in ${new Date().getFullYear()}`
        }
      ]
    }
  ];

  // Filter out stats with no data
  const validStats = stats
    .map(category => ({
      ...category,
      data: category.data.filter(item => item.value !== undefined && item.value !== null)
    }))
    .filter(category => category.data.length > 0);

  if (validStats.length === 0) return null;

  return (
    <section className="relative bg-zinc-900/20 border border-white/5 p-8">
      <div className="flex items-center gap-4 mb-8">
        <TrendingUp className="text-[#FF6B35]" size={20} />
        <h3 className="text-[11px] font-black uppercase tracking-[0.5em] text-[#FF6B35]">
          Launch_Statistics
        </h3>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3">
        {validStats.map((category, idx) => (
          <div 
            key={idx}
            className="bg-black/40 p-2 space-y-4"
          >
            {/* Category Header */}
            <div className="flex items-center gap-3 pb-3 border-b border-white/5">
              <category.icon className="text-[#18BBF7]" size={16} />
              <div className="text-xs font-black uppercase tracking-wider text-white">
                {category.category}
              </div>
            </div>

            {/* Stats */}
            <div className="space-y-4">
              {category.data.map((stat, statIdx) => (
                <div key={statIdx}>
                  <div className="text-[8px] text-zinc-600 uppercase tracking-wider mb-1">
                    {stat.label}
                  </div>
                  <div className="text-lg font-black text-white">
                    #{stat.value}
                  </div>
                  {stat.subValue && (
                    <div className="text-[9px] text-zinc-400 mt-1 uppercase">
                      #{stat.subValue}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Additional Context */}
      <div className="mt-6 pt-6 border-t border-white/5">
        <div className="text-xs text-zinc-500 leading-relaxed">
          These statistics provide historical context for this launch attempt, tracking progress across 
          global orbital launches, location-specific operations, and agency performance metrics.
        </div>
      </div>
    </section>
  );
}

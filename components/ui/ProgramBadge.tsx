import { Award, Calendar, ExternalLink } from 'lucide-react';

interface ProgramBadgeProps {
  programs: any[];
}

export default function ProgramBadge({ programs }: ProgramBadgeProps) {
  if (!programs || programs.length === 0) return null;

  return (
    <section className="relative bg-zinc-900/20 border border-white/5 p-8">
      <div className="flex items-center gap-4 mb-8">
        <Award className="text-[#FF6B35]" size={20} />
        <h3 className="text-[11px] font-black uppercase tracking-[0.5em] text-[#FF6B35]">
          Affiliated_Operations
        </h3>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <div className="grid grid-rows-1 gap-6">
        {programs.map((program: any, idx: number) => (
          <div 
            key={idx}
            className="relative bg-black/40 border border-white/5 p-6 hover:border-[#FF6B35]/50 transition-all group"
          >

            <div className="relative space-y-4">
              {/* Program Name */}
              <div>
                <div className="text-2xl font-black text-white mb-1">
                  {program.name}
                </div>
                {program.type?.name && (
                  <div className="text-xs text-[#FF6B35] uppercase font-bold">
                    {program.type.name}
                  </div>
                )}
              </div>

              {/* Timeline */}
              {(program.start_date || program.end_date) && (
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <Calendar size={12} />
                  <span>
                    {program.start_date && new Date(program.start_date).getFullYear()}
                    {program.end_date && ` - ${new Date(program.end_date).getFullYear()}`}
                    {!program.end_date && ' - Present'}
                  </span>
                </div>
              )}

              {/* Description */}
              {program.description && (
                <p className="text-sm text-zinc-400 leading-relaxed">
                  {program.description}
                </p>
              )}

              {/* Agencies */}
              {program.agencies && program.agencies.length > 0 && (
                <div className="pt-3 border-t border-white/5">
                  <div className="text-[8px] text-zinc-600 uppercase tracking-wider mb-2">
                    Agencies
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {program.agencies.map((agency: any, agencyIdx: number) => (
                      <span 
                        key={agencyIdx}
                        className="text-[9px] font-bold text-white bg-zinc-800 px-2 py-1 uppercase tracking-wider"
                      >
                        {agency.abbrev || agency.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Links */}
              <div className="flex gap-3 pt-3">
                {program.info_url && (
                  <a
                    href={program.info_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[9px] text-[#18BBF7] hover:text-[#FF6B35] uppercase font-bold tracking-wider flex items-center gap-1 transition-colors"
                  >
                    Official Site <ExternalLink size={10} />
                  </a>
                )}
                {program.wiki_url && (
                  <a
                    href={program.wiki_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[9px] text-[#18BBF7] hover:text-[#FF6B35] uppercase font-bold tracking-wider flex items-center gap-1 transition-colors"
                  >
                    Wikipedia <ExternalLink size={10} />
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

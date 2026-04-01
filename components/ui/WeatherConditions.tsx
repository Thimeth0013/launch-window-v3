import { Cloud, Percent, AlertTriangle } from 'lucide-react';

interface WeatherAndProbabilityProps {
  probability?: number | null;
  weather_concerns?: string | null;
  window_start?: string;
  window_end?: string;
}

export default function WeatherAndProbability({ 
  probability, 
  weather_concerns,
  window_start,
  window_end 
}: WeatherAndProbabilityProps) {
  
  // Don't render if no relevant data
  if (!probability && !weather_concerns && !window_start) return null;

  return (
    <section className="relative bg-zinc-900/20 border border-white/5 p-8">
      <div className="flex items-center gap-4 mb-8">
        <Cloud className="text-[#18BBF7]" size={20} />
        <h3 className="text-[11px] font-black uppercase tracking-[0.5em] text-[#18BBF7]">
          Weather_Conditions
        </h3>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <div className="grid grid-cols-1 gap-6">
        
        {/* Launch Probability */}
        {probability !== null && probability !== undefined && (
          <div className="bg-black/40 border border-white/5 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Percent className="text-[#18BBF7]" size={20} />
              <div className="text-[9px] text-zinc-600 uppercase font-black tracking-widest">
                Launch Probability
              </div>
            </div>

            <div className="space-y-4">
              {/* Probability Bar */}
              <div>
                <div className="flex items-baseline gap-2 mb-2">
                  <div className="text-5xl font-black text-white">
                    {probability}
                  </div>
                  <div className="text-2xl font-black text-zinc-600">%</div>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full h-2 bg-zinc-800 overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      probability >= 75 ? 'bg-green-400' :
                      probability >= 50 ? 'bg-amber-400' :
                      'bg-red-400'
                    }`}
                    style={{ width: `${probability}%` }}
                  />
                </div>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-2 pt-2">
                <div className={`w-2 h-2 rounded-full ${
                  probability >= 75 ? 'bg-green-400 animate-pulse' :
                  probability >= 50 ? 'bg-amber-400' :
                  'bg-red-400'
                }`} />
                <span className={`text-xs font-bold uppercase tracking-wider ${
                  probability >= 75 ? 'text-green-400' :
                  probability >= 50 ? 'text-amber-400' :
                  'text-red-400'
                }`}>
                  {probability >= 75 ? 'GO for Launch' :
                   probability >= 50 ? 'Moderate Risk' :
                   'High Risk'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Launch Window */}
        {(window_start || window_end) && (
          <div className="bg-black/40 border border-white/5 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Cloud className="text-[#FF6B35]" size={20} />
              <div className="text-[9px] text-zinc-600 uppercase font-black tracking-widest">
                Launch Window
              </div>
            </div>

            <div className="space-y-3">
              {window_start && (
                <div>
                  <div className="text-[8px] text-zinc-600 uppercase tracking-wider mb-1">
                    Window Opens
                  </div>
                  <div className="text-lg font-black text-white">
                    {new Date(window_start).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      timeZoneName: 'short'
                    })}
                  </div>
                </div>
              )}

              {window_end && (
                <div className="pt-3 border-t border-white/5">
                  <div className="text-[8px] text-zinc-600 uppercase tracking-wider mb-1">
                    Window Closes
                  </div>
                  <div className="text-lg font-black text-white">
                    {new Date(window_end).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      timeZoneName: 'short'
                    })}
                  </div>
                </div>
              )}

              {/* Duration */}
              {window_start && window_end && (
                <div className="pt-3 border-t border-white/5">
                  <div className="text-[8px] text-zinc-600 uppercase tracking-wider mb-1">
                    Duration
                  </div>
                  <div className="text-sm font-bold text-[#18BBF7]">
                    {calculateDuration(window_start, window_end)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Weather Concerns */}
      {weather_concerns && (
        <div className="mt-6 bg-black/40 border border-amber-500/20 border-l-4 border-l-amber-500 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18} />
            <div className="flex-1">
              <div className="text-xs font-black uppercase tracking-wider text-amber-500 mb-2">
                Weather Concerns
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">
                {weather_concerns}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function calculateDuration(start: string, end: string): string {
  const startTime = new Date(start);
  const endTime = new Date(end);
  const durationMs = endTime.getTime() - startTime.getTime();
  
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes} minutes`;
}

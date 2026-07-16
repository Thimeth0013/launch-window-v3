// components/LaunchCard.tsx
import Link from 'next/link';
import Image from 'next/image';
import { Video, MapPin, Rocket } from 'lucide-react';

interface LaunchCardProps {
  launch: {
    id: string;
    slug: string;
    name: string;
    date: string;
    status: {
      name: string;
      abbrev: string;
    };
    image?: {
      image_url: string;
      thumbnail_url: string;
    };
    launch_service_provider?: {
      name: string;
      logo?: {
        image_url: string;
      };
    };
    pad?: {
      name: string;
      location?: {
        name: string;
      };
    };
    mission?: {
      name: string;
      description: string;
    };
  };
  streamCount?: number;
}

const LaunchCard = ({ launch, streamCount = 0 }: LaunchCardProps) => {
  const launchDate = new Date(launch.date);
  // Already happened → this is the card shown under "Recent Launches".
  const isRecent = launchDate.getTime() < new Date().getTime();
  const accentDividerClass = isRecent ? 'bg-[#FF6B35]/20' : 'bg-[#18BBF7]/20';
  const accentTextClass = isRecent ? 'text-[#FF6B35]' : 'text-[#18BBF7]';

  const statusName = launch.status.name;
  const getStatusStyle = () => {
    if (statusName.includes('Success') || statusName.includes('Go') || statusName.includes('Deployed')) {
      return 'border-emerald-500/60 text-emerald-400 bg-emerald-500/5';
    }
    if (statusName.includes('TBC') || launch.status.abbrev === 'TBC') {
      return 'border-amber-500/60 text-amber-400 bg-amber-500/5';
    }
    if (statusName.includes('Hold')) {
      return 'border-[#FF6B35]/60 text-[#FF6B35] bg-[#FF6B35]/5';
    }
    if (statusName.includes('Failure') || statusName.includes('Partial')) {
      return 'border-red-500/60 text-red-400 bg-red-500/5';
    }
    if (statusName.includes('TBD') || launch.status.abbrev === 'TBD') {
      return 'border-zinc-600 text-zinc-400 bg-zinc-800/30';
    }
    return 'border-zinc-600 text-zinc-400 bg-zinc-800/30';
  };

  return (
    <Link
      href={`/launches/${launch.slug}`}
      className="block h-full"
    >
      <div className="group relative aspect-video overflow-hidden border border-white/10 bg-black">

        {/* Image as full card background */}
        {launch.image?.image_url ? (
          <Image
            src={launch.image.image_url}
            alt={launch.name}
            fill
            className="object-cover brightness-90"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 bg-zinc-950 flex items-center justify-center">
            <Rocket className="w-12 h-12 text-zinc-800" strokeWidth={1} />
          </div>
        )}

        {/* Dark gradient from the bottom for legibility */}
        <div className="absolute inset-0 bg-linear-to-t from-black via-black/70 to-black/10" />

        {/* Stream count badge */}
        {streamCount > 0 && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-[#FF0000] px-2 py-1 font-mono text-[10px] font-bold tracking-wider text-white">
            <span className="relative flex w-1.5 h-1.5">
              <span className="absolute inline-flex w-full h-full bg-white opacity-75 animate-ping rounded-full" />
              <span className="relative inline-flex w-1.5 h-1.5 bg-white rounded-full" />
            </span>
            <Video className="w-3 h-3" />
            <span>{streamCount}</span>
          </div>
        )}

        {/* Content — overlaid on the image, bottom-anchored */}
        <div className="absolute inset-x-0 bottom-0 p-4">
          <h3 className="text-base font-bold tracking-tight uppercase text-white leading-tight mb-2 truncate">
            {launch.name}
          </h3>

          {/* Agency + location — collapsed to zero height until hover, so the
              title sits low by default and gets pushed up as this opens. */}
          <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-[grid-template-rows] duration-500 ease-out">
            <div className="overflow-hidden">
              <div className="space-y-1.5 pb-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Rocket className="w-3 h-3 text-zinc-500 shrink-0" />
                  <p className="text-zinc-300 text-[10px] tracking-widest uppercase font-light truncate min-w-0">
                    {launch.launch_service_provider?.name || 'Unknown Provider'}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 min-w-0">
                  <MapPin className="w-3 h-3 text-zinc-500 shrink-0" />
                  <p className="text-zinc-500 text-[10px] tracking-widest uppercase truncate min-w-0">
                    {launch.pad?.location?.name || launch.pad?.name || 'Unknown Location'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className={`h-px mb-3 ${accentDividerClass}`} />

          <div className="flex justify-between items-center gap-2">
            <div className="font-mono min-w-0  items-center gap-2 flex">
              <div className="text-[10px] text-zinc-300 tracking-wider uppercase font-light truncate">
                {launchDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} |
              </div>
              <div className={`text-[10px] tracking-wider tabular-nums truncate ${accentTextClass}`}>
                {launchDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
              </div>
            </div>
            <div className={`px-2 py-1 border font-mono text-[9px] font-bold tracking-widest uppercase whitespace-nowrap shrink-0 ${getStatusStyle()}`}>
              {launch.status.abbrev || launch.status.name}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default LaunchCard;

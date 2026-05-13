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
  const now = new Date();
  const diffInMs = launchDate.getTime() - now.getTime();
  const isTPlus = diffInMs < 0;
  const absDiff = Math.abs(diffInMs);
  // Active window: T-1h through T+10min
  const isActive = diffInMs > -10 * 60 * 1000 && diffInMs < 60 * 60 * 1000;

  const getTStatus = () => {
    const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((absDiff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((absDiff / (1000 * 60)) % 60);
    const prefix = isTPlus ? 'T+' : 'T-';
    if (days > 0) return `${prefix}${days}D ${hours}H`;
    if (hours > 0) return `${prefix}${hours}H ${minutes}M`;
    return `${prefix}${minutes}M`;
  };

  const tStatusColor = isActive
    ? 'text-[#FF6B35] animate-pulse'
    : isTPlus
      ? 'text-emerald-400'
      : 'text-[#18BBF7]';

  const statusName = launch.status.name;
  const getStatusStyle = () => {
    if (statusName.includes('Success') || statusName.includes('Go')) {
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
      className="block group h-full"
    >
      <div className="relative bg-black/90 backdrop-blur-xs border-2 border-[#18BBF7]/30 hover:border-[#18BBF7] hover:shadow-[0_0_24px_rgba(24,187,247,0.18)] hover:-translate-y-0.5 transition-all duration-500 h-full flex flex-col overflow-hidden">

        {/* Image / Placeholder */}
        <div className="relative overflow-hidden">
          {launch.image?.image_url ? (
            <div className="relative w-full h-44">
              <Image
                src={launch.image.image_url}
                alt={launch.name}
                fill
                className="object-cover brightness-90 transition-all duration-700 group-hover:scale-105 group-hover:brightness-100 group-hover:saturate-110"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                unoptimized
              />
              <div className="absolute inset-0 bg-linear-to-t from-black via-black/40 to-transparent" />
            </div>
          ) : (
            <div className="relative w-full h-44 bg-zinc-950 flex items-center justify-center border-b border-zinc-900">
              <Rocket className="w-12 h-12 text-zinc-800" strokeWidth={1} />
              <span className="absolute bottom-3 left-3 font-mono text-[9px] text-zinc-700 uppercase tracking-[0.3em]">
                No Visual
              </span>
            </div>
          )}

          {/* T-status overlay on the image */}
          <div className={`absolute bottom-3 left-3 font-mono font-bold text-sm tracking-widest tabular-nums drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] ${tStatusColor}`}>
            {getTStatus()}
          </div>

          {/* Stream count badge */}
          {streamCount > 0 && (
            <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-[#FF0000] px-2 py-1 font-mono text-[10px] font-bold tracking-wider text-white">
              <span className="relative flex w-1.5 h-1.5">
                <span className="absolute inline-flex w-full h-full bg-white opacity-75 animate-ping rounded-full" />
                <span className="relative inline-flex w-1.5 h-1.5 bg-white rounded-full" />
              </span>
              <Video className="w-3 h-3" />
              <span>{streamCount}</span>
            </div>
          )}

          {/* Permanent thin orange rail + hover sweep */}
          <div className="relative h-1 bg-[#FF6B35]/30">
            <div className="absolute inset-0 bg-[#FF6B35] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-700" />
          </div>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 flex flex-col">
          <h3 className="text-base font-bold tracking-tight uppercase text-white group-hover:text-[#18BBF7] transition-colors line-clamp-2 leading-tight mb-3 min-h-[2.5rem]">
            {launch.name}
          </h3>

          <div className="space-y-1.5 flex-1 mb-3">
            <div className="flex items-center gap-1.5">
              <Rocket className="w-3 h-3 text-zinc-500 shrink-0" />
              <p className="text-zinc-300 text-[10px] tracking-widest uppercase font-light truncate">
                {launch.launch_service_provider?.name || 'Unknown Provider'}
              </p>
            </div>
            <div className="flex items-start gap-1.5">
              <MapPin className="w-3 h-3 text-zinc-500 shrink-0 mt-0.5" />
              <p className="text-zinc-500 text-[10px] tracking-widest uppercase line-clamp-2 leading-snug">
                {launch.pad?.location?.name || launch.pad?.name || 'Unknown Location'}
              </p>
            </div>
          </div>

          <div className="h-px bg-[#18BBF7]/20 mb-3" />

          <div className="flex justify-between items-center gap-2">
            <div className="font-mono">
              <div className="text-[10px] text-zinc-300 tracking-wider uppercase font-light">
                {launchDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
              <div className="text-[10px] text-[#18BBF7] tracking-wider mt-0.5 tabular-nums">
                {launchDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
              </div>
            </div>
            <div className={`px-2 py-1 border font-mono text-[9px] font-bold tracking-widest uppercase whitespace-nowrap ${getStatusStyle()}`}>
              {launch.status.abbrev || launch.status.name}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default LaunchCard;

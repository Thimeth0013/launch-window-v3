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

  // Helper to format the T-status string
  const getTStatus = () => {
    const absoluteDiff = Math.abs(diffInMs);
    const hours = Math.floor(absoluteDiff / (1000 * 60 * 60));
    const minutes = Math.floor((absoluteDiff / (1000 * 60)) % 60);
    
    const prefix = isTPlus ? 'T+' : 'T-';
    
    // Format as H:MM or just M
    if (hours > 0) {
      return `${prefix}${hours}H ${minutes}M`;
    }
    return `${prefix}${minutes}M`;
  };
  
  return (
    <Link 
      href={`/launches/${launch.slug}`} 
      className="block group h-full"
    >
      <div 
        className="bg-transparent backdrop-blur-xs border-2 overflow-hidden transition-all duration-300 h-full flex flex-col border-[#18BBF7]/40 hover:border-[#18BBF7]" 
      >
        {launch.image?.image_url && (
          <div className="relative overflow-hidden">
            <div className="relative w-full h-40">
              <Image
                src={launch.image.image_url}
                alt={launch.name}
                fill
                className="brightness-90 object-cover transition-all duration-500 group-hover:scale-105 group-hover:brightness-100 group-hover:saturate-110"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                unoptimized
              />
            </div>
            
            {/* Animated Orange Line */}
            <div className="h-1 bg-[#FF6B35]/40" />
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#ff642c] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
            
            {streamCount > 0 && (
              <div className="absolute top-2 right-2 bg-[#FF6B35] text-white px-2 py-1 flex items-center gap-1 text-xs font-bold tracking-wide">
                <Video className="w-3 h-3" />
                <span>{streamCount}</span>
              </div>
            )}
          </div>
        )}

        <div className="p-4 flex-1 flex flex-col">
          <h3 
            className="text-lg font-bold mb-2 tracking-wide uppercase text-white group-hover:text-[#18BBF7] transition-colors line-clamp-2" 
            style={{ minHeight: '2.5rem' }}
          >
            {launch.name}
          </h3>
          
          <div className="space-y-1 mb-3 flex-1">
            {/* Provider with Icon */}
            <div className="flex items-center gap-1.5">
              <Rocket className="w-3 h-3 text-white" />
              <p className="text-white text-xs tracking-wider uppercase font-light">
                {launch.launch_service_provider?.name || 'Unknown Provider'}
              </p>
            </div>

            {/* Location with Icon */}
            <div className="flex items-start gap-1.5 mt-2">
              <MapPin className="w-3 h-3 text-gray-400"/>
              <p className="text-gray-400 text-xs tracking-widest uppercase line-clamp-2" style={{ fontSize: '0.65rem' }}>
                {launch.pad?.location?.name || launch.pad?.name || 'Unknown Location'}
              </p>
            </div>
          </div>

          <div 
            className="h-px my-2" 
            style={{ backgroundColor: '#18BBF7', opacity: 0.3 }}
          />
          
          <div className="flex justify-between items-center gap-2">
            <div className="text-xs text-white tracking-wider uppercase font-light" style={{ fontSize: '0.65rem' }}>
              <div>{launchDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
              <div className="mt-0.5" style={{ color: '#18BBF7' }}>
                {launchDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
              </div>
            </div>
            
            <div className="flex flex-row items-center gap-4">
              <div 
                className={`text-xs tracking-wider uppercase font-bold ${
                  isTPlus 
                    ? 'text-green-500 animate-pulse'
                    : 'text-cyan-400' 
                }`}
              >
                {getTStatus()}
              </div>
              <div
                className={`px-2 py-1 border text-xs tracking-wider uppercase font-bold${
                  launch.status.name.includes('Go')
                    ? 'border-green-500 text-green-400'
                    : launch.status.name.includes('TBC') || launch.status.abbrev === 'TBC'
                    ? 'border-yellow-500 text-yellow-400'
                    : launch.status.name.includes('TBD') || launch.status.abbrev === 'TBD'
                    ? 'border-gray-500 text-gray-400'
                    : 'border-yellow-500 text-yellow-400'
                }`}
                style={{ fontSize: '0.55rem', whiteSpace: 'nowrap' }} // Reduced font slightly for long names
              >
                {launch.status.name} 
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default LaunchCard;
'use client';
import { Image, Video, FileText, ExternalLink } from 'lucide-react';
import { useState } from 'react';

interface MediaGalleryProps {
  launch: any;
}

export default function MediaGallery({ launch }: MediaGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Collect all available images
  const images = [];

  // Mission patches
  if (launch.mission_patches) {
    launch.mission_patches.forEach((patch: any) => {
      if (patch.image_url) {
        images.push({
          url: patch.image_url,
          thumbnail: patch.image_url,
          title: patch.name || 'Mission Patch',
          credit: patch.agency?.name,
          type: 'patch'
        });
      }
    });
  }

  // Infographic
  if (launch.infographic) {
    images.push({
      url: launch.infographic,
      thumbnail: launch.infographic,
      title: 'Mission Infographic',
      type: 'infographic'
    });
  }

  // Vehicle image
  if (launch.rocket?.configuration?.image?.image_url) {
    images.push({
      url: launch.rocket.configuration.image.image_url,
      thumbnail: launch.rocket.configuration.image.thumbnail_url || launch.rocket.configuration.image.image_url,
      title: launch.rocket.configuration.name,
      credit: launch.rocket.configuration.image.credit,
      type: 'vehicle'
    });
  }

  // Spacecraft image
  if (launch.rocket?.spacecraft_stage?.[0]?.spacecraft?.image?.image_url) {
    const spacecraft = launch.rocket.spacecraft_stage[0].spacecraft;
    images.push({
      url: spacecraft.image.image_url,
      thumbnail: spacecraft.image.thumbnail_url || spacecraft.image.image_url,
      title: spacecraft.name,
      credit: spacecraft.image.credit,
      type: 'spacecraft'
    });
  }

  // Launch pad image
  if (launch.pad?.image?.image_url) {
    images.push({
      url: launch.pad.image.image_url,
      thumbnail: launch.pad.image.thumbnail_url || launch.pad.image.image_url,
      title: launch.pad.name,
      credit: launch.pad.image.credit,
      type: 'pad'
    });
  }

  // Pad map
  if (launch.pad?.map_image) {
    images.push({
      url: launch.pad.map_image,
      thumbnail: launch.pad.map_image,
      title: `${launch.pad.name} - Map`,
      type: 'map'
    });
  }

  // Location image
  if (launch.pad?.location?.image?.image_url) {
    images.push({
      url: launch.pad.location.image.image_url,
      thumbnail: launch.pad.location.image.thumbnail_url || launch.pad.location.image.image_url,
      title: launch.pad.location.name,
      credit: launch.pad.location.image.credit,
      type: 'location'
    });
  }

  // Program images
  if (launch.program) {
    launch.program.forEach((prog: any) => {
      if (prog.image?.image_url) {
        images.push({
          url: prog.image.image_url,
          thumbnail: prog.image.thumbnail_url || prog.image.image_url,
          title: prog.name,
          credit: prog.image.credit,
          type: 'program'
        });
      }
    });
  }

  // Agency logo
  if (launch.launch_service_provider?.logo?.image_url) {
    images.push({
      url: launch.launch_service_provider.logo.image_url,
      thumbnail: launch.launch_service_provider.logo.thumbnail_url || launch.launch_service_provider.logo.image_url,
      title: `${launch.launch_service_provider.name} Logo`,
      type: 'logo'
    });
  }

  const videos = launch.vid_urls || [];

  if (images.length === 0 && videos.length === 0) return null;

  return (
    <section className="relative bg-zinc-900/20 border border-white/5 p-8">
      <div className="flex items-center gap-4 mb-8">
        <Image className="text-[#18BBF7]" size={20} />
        <h3 className="text-[11px] font-black uppercase tracking-[0.5em] text-[#18BBF7]">
          Media_Gallery // Mission_Assets
        </h3>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      {/* Image Gallery */}
      {images.length > 0 && (
        <div className="mb-8">
          <div className="text-[9px] text-zinc-600 uppercase font-black tracking-widest mb-4 flex items-center gap-2">
            <Image size={12} />
            Images & Graphics ({images.length})
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((img, idx) => (
              <div 
                key={idx}
                className="group relative aspect-square bg-black border border-white/5 overflow-hidden cursor-pointer hover:border-[#18BBF7]/50 transition-all"
                onClick={() => setSelectedImage(img.url)}
              >
                <img 
                  src={img.thumbnail} 
                  alt={img.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <div className="text-xs font-bold text-white line-clamp-2">
                      {img.title}
                    </div>
                    {img.credit && (
                      <div className="text-[8px] text-zinc-400 mt-1">
                        © {img.credit}
                      </div>
                    )}
                    <div className="text-[7px] text-[#18BBF7] uppercase tracking-wider mt-1">
                      {img.type}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Webcast Links */}
      {videos.length > 0 && (
        <div>
          <div className="text-[9px] text-zinc-600 uppercase font-black tracking-widest mb-4 flex items-center gap-2">
            <Video size={12} />
            Webcast & Video ({videos.length})
          </div>
          
          <div className="space-y-3">
            {videos.map((video: any, idx: number) => (
              <a
                key={idx}
                href={video.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between bg-black/40 border border-white/5 p-4 hover:border-[#FF6B35]/50 transition-all group"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {video.live && (
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-[8px] text-red-500 font-bold uppercase tracking-wider">
                          LIVE
                        </span>
                      </div>
                    )}
                    <span className="text-sm font-bold text-white">
                      {video.title || 'Webcast'}
                    </span>
                  </div>
                  <div className="text-[9px] text-zinc-500 uppercase">
                    {video.source} {video.publisher && `• ${video.publisher}`}
                  </div>
                </div>
                <ExternalLink className="text-[#18BBF7] group-hover:text-[#FF6B35] transition-colors" size={16} />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-6xl max-h-[90vh]">
            <img 
              src={selectedImage} 
              alt="Full size"
              className="max-w-full max-h-[90vh] object-contain"
            />
            <button
              className="absolute top-4 right-4 bg-black/50 border border-white/20 p-2 hover:bg-white hover:text-black transition-all"
              onClick={() => setSelectedImage(null)}
            >
              <span className="text-xs font-bold">✕ CLOSE</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

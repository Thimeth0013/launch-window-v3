// components/VideoGrid.tsx
'use client';

interface VidUrl {
  priority: number;
  source: string;
  publisher?: string;
  title: string;
  description?: string;
  url: string;
  type: {
    id: number;
    name: string;
  };
  live?: boolean;
  language?: {
    id: number;
    name: string;
    code: string;
  };
}

interface VideoGridProps {
  vidUrls: VidUrl[];
}

export default function VideoGrid({ vidUrls }: VideoGridProps) {
  // Filter and sort video URLs
  const liveStreams = vidUrls
    .filter(vid => vid.live === true)
    .sort((a, b) => a.priority - b.priority);

  const otherStreams = vidUrls
    .filter(vid => vid.live !== true)
    .sort((a, b) => a.priority - b.priority);

  const allStreams = [...liveStreams, ...otherStreams];

  if (allStreams.length === 0) {
    return (
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 text-center text-gray-500">
        No video streams available
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {allStreams.map((stream, index) => (
        <a
          key={index}
          href={stream.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all"
        >
          {/* Live Badge */}
          {stream.live && (
            <div className="bg-red-600 px-4 py-2 flex items-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="text-white text-sm font-bold uppercase">
                Live Stream
              </span>
            </div>
          )}

          {/* Content */}
          <div className="p-6 space-y-3">
            {/* Publisher/Source */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-gray-500 uppercase font-semibold">
                {stream.publisher || stream.source}
              </span>
              {stream.language && (
                <span className="text-xs text-gray-500 uppercase">
                  {stream.language.code}
                </span>
              )}
            </div>

            {/* Title */}
            <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-2">
              {stream.title}
            </h3>

            {/* Description */}
            {stream.description && (
              <p className="text-sm text-gray-400 line-clamp-2">
                {stream.description}
              </p>
            )}

            {/* Type Badge */}
            <div className="pt-3 border-t border-gray-800">
              <span className="inline-block px-3 py-1 bg-gray-800 text-gray-400 rounded-full text-xs font-semibold">
                {stream.type.name}
              </span>
            </div>

            {/* External Link Icon */}
            <div className="flex items-center gap-2 text-blue-400 text-sm font-semibold">
              <span>Watch Stream</span>
              <svg 
                className="w-4 h-4 group-hover:translate-x-1 transition-transform" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M14 5l7 7m0 0l-7 7m7-7H3" 
                />
              </svg>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}
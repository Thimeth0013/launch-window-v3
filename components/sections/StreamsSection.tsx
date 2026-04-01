"use client";

import { useState, useEffect } from 'react';
import { Youtube, MonitorPlay } from 'lucide-react';

interface Stream {
  streamId: string;
  url: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
  scheduledStartTime: string;
  platform: string;
  isLive?: boolean;
  matchScore?: number;
}

export default function StreamsSection({ launchSlug }: { launchSlug: string }) {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchStreams() {
      try {
        const res = await fetch(`/api/launches/${launchSlug}/streams`);
        if (!res.ok) throw new Error('Failed to fetch streams');
        const data: Stream[] = await res.json();
        // Sort by matchScore descending
        setStreams(data.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0)));
      } catch (err) {
        console.error(err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchStreams();
  }, [launchSlug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 border border-white/5 bg-white/5 animate-pulse mt-12 w-full">
        <MonitorPlay className="w-5 h-5 text-gray-500 mr-3 animate-bounce" />
        <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Searching for Broadcasts...</span>
      </div>
    );
  }

  if (error || streams.length === 0) {
    return null;
  }

  return (
    <section className="mt-12 space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <h3 className="text-[11px] font-black uppercase tracking-[0.5em] text-[#FF0000]/80 flex items-center gap-2">
          <Youtube className="w-4 h-4" /> Live Broadcasts
        </h3>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        {streams.map((stream) => (
          <a
            key={stream.streamId}
            href={stream.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative block overflow-hidden border border-white/10 bg-black hover:border-white/30 transition-colors"
          >
            <div className="aspect-video relative overflow-hidden">
              <img
                src={stream.thumbnailUrl}
                alt={stream.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-80 group-hover:opacity-100"
              />
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Youtube className="w-12 h-12 text-white/50 group-hover:text-[#FF0000] transition-colors drop-shadow-lg" />
              </div>
              {stream.isLive && (
                <div className="absolute top-2 left-2 flex items-center gap-1 bg-[#FF0000] px-2 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-white">Live</span>
                </div>
              )}
            </div>
            <div className="p-4 bg-zinc-900 border-t border-white/5">
              <p className="text-[10px] text-[#FF6B35] font-black uppercase tracking-widest mb-1 truncate">
                {stream.channelName}
              </p>
              <h4 className="text-sm font-bold text-white uppercase tracking-tight line-clamp-2 leading-tight">
                {stream.title}
              </h4>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

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
      <div className="flex items-center gap-3 border-y border-white/10 py-6 animate-pulse motion-reduce:animate-none">
        <MonitorPlay className="w-4 h-4 text-zinc-500" aria-hidden="true" />
        <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-[0.12em]">Searching for broadcasts…</span>
      </div>
    );
  }

  const isEmpty = error || streams.length === 0;

  return (
    <div>

      {isEmpty ? (
        <div className="flex items-start gap-3 border-y border-white/10 py-6">
          <Youtube className="mt-0.5 w-4 h-4 shrink-0 text-zinc-500" strokeWidth={1.5} aria-hidden="true" />
          <div className="space-y-1">
            <p className="text-[11px] font-mono text-zinc-400 uppercase tracking-[0.12em]">
              {error ? 'Stream lookup unavailable' : 'No broadcasts scheduled yet'}
            </p>
            <p className="text-xs text-zinc-500">
              {error ? 'Try again shortly.' : 'Channels usually post streams 24–48 hours before launch.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-5 gap-y-8">
          {streams.map((stream) => (
          <a
            key={stream.streamId}
            href={stream.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative block overflow-hidden bg-black focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#18BBF7]"
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
            <div className="pt-3 bg-black">
              <p className="text-[11px] text-zinc-500 font-medium uppercase tracking-[0.12em] mb-1 truncate">
                {stream.channelName}
              </p>
              <h4 className="text-sm font-semibold text-white line-clamp-2 leading-snug group-hover:text-[#18BBF7] transition-colors">
                {stream.title}
              </h4>
            </div>
          </a>
          ))}
        </div>
      )}
    </div>
  );
}

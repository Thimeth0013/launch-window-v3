"use client";

import { useState, useEffect } from 'react';
import { Youtube, MonitorPlay } from 'lucide-react';

// Broadcasts for the launch story's "Watch It Live" chapter.
//
// Two sources, merged:
//  1. `known` — the webcast links The Space Devs attach to the launch
//     (`vid_urls`): official and community streams, typed. Rendered immediately, no API call.
//  2. Our YouTube matcher (`/api/launches/[slug]/streams`), which finds other
//     channels. Its results are appended, skipping videos already listed.

interface Stream {
  key: string;
  url: string;
  title: string;
  channelName: string;
  thumbnailUrl?: string | null;
  /** "Official webcast", "Unofficial webcast", "Re-stream"… (known links only). */
  kind?: string | null;
  isYouTube: boolean;
}

/** A Space Devs `vid_urls` entry, already trimmed on the server. */
export interface KnownStream {
  url: string;
  title?: string | null;
  publisher?: string | null;
  kind?: string | null;
  image?: string | null;
}

interface MatchedStream {
  streamId: string;
  url: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
  isLive?: boolean;
  matchScore?: number;
}

function youTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|live\/|embed\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'Webcast';
  }
}

function fromKnown(s: KnownStream): Stream {
  const id = youTubeId(s.url);
  return {
    key: s.url,
    url: s.url,
    title: s.title || s.publisher || 'Webcast',
    channelName: s.publisher || hostOf(s.url),
    thumbnailUrl: s.image || (id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null),
    kind: s.kind,
    isYouTube: Boolean(id),
  };
}

export default function StreamsSection({ launchSlug, known = [] }: { launchSlug: string; known?: KnownStream[] }) {
  const [matched, setMatched] = useState<MatchedStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchStreams() {
      try {
        const res = await fetch(`/api/launches/${launchSlug}/streams`);
        if (!res.ok) throw new Error('Failed to fetch streams');
        const data: MatchedStream[] = await res.json();
        setMatched(data.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0)));
      } catch (err) {
        console.error(err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchStreams();
  }, [launchSlug]);

  const knownStreams = known.map(fromKnown);
  const seen = new Set(knownStreams.map((s) => youTubeId(s.url) ?? s.url));
  const streams: Stream[] = [
    ...knownStreams,
    ...matched
      .filter((m) => !seen.has(youTubeId(m.url) ?? m.url))
      .map((m) => ({
        key: m.streamId,
        url: m.url,
        title: m.title,
        channelName: m.channelName,
        thumbnailUrl: m.thumbnailUrl,
        isYouTube: true,
      })),
  ];

  if (loading && streams.length === 0) {
    return (
      <div className="flex items-center gap-3 border-y border-white/10 py-6 animate-pulse motion-reduce:animate-none">
        <MonitorPlay className="w-4 h-4 text-zinc-500" aria-hidden="true" />
        <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-[0.12em]">Searching for broadcasts…</span>
      </div>
    );
  }

  if (streams.length === 0) {
    return (
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
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-5 gap-y-8">
        {streams.map((stream) => {
          const Icon = stream.isYouTube ? Youtube : MonitorPlay;
          return (
            <a
              key={stream.key}
              href={stream.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative block overflow-hidden bg-black active:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#18BBF7]"
            >
              <div className="aspect-video relative overflow-hidden bg-zinc-950">
                {stream.thumbnailUrl && (
                  <img
                    src={stream.thumbnailUrl}
                    alt={stream.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-80 group-hover:opacity-100"
                  />
                )}
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <Icon className="w-12 h-12 text-white/50 group-hover:text-[#FF0000] transition-colors drop-shadow-lg" />
                </div>
              </div>
              <div className="pt-3 bg-black">
                <p className="text-[11px] text-zinc-500 font-medium uppercase tracking-[0.12em] mb-1 truncate">
                  {stream.channelName}
                  {stream.kind && <span className="text-zinc-600"> · {stream.kind}</span>}
                </p>
                <h4 className="text-sm font-semibold text-white line-clamp-2 leading-snug group-hover:text-[#18BBF7] transition-colors">
                  {stream.title}
                </h4>
              </div>
            </a>
          );
        })}
      </div>
      {loading && (
        <p className="mt-6 text-[11px] font-mono uppercase tracking-[0.12em] text-zinc-600 animate-pulse motion-reduce:animate-none">
          Looking for more channels…
        </p>
      )}
    </div>
  );
}

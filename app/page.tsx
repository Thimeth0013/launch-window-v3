import Link from "next/link";
import { ChevronRight, ExternalLink, Newspaper, Rocket, Telescope } from "lucide-react";
import { getUpcomingLaunches, fetchUpcomingLaunches } from "@/app/lib/services/launchService";
import { ensureFreshArticles, getLatestArticles } from "@/app/lib/services/articleService";
import { getApod, type Apod } from "@/app/lib/services/nasaService";
import MiniCountdown from "@/components/ui/MiniCountdown";

async function getLatestLaunch() {
  try {
    let launches = await getUpcomingLaunches(1);
    if (!launches || launches.length === 0) {
      await fetchUpcomingLaunches();
      launches = await getUpcomingLaunches(1);
    }
    return launches[0] || null;
  } catch (error) {
    console.error('Failed to fetch launch:', error);
    return null;
  }
}

async function getHomepageArticle() {
  try {
    await ensureFreshArticles();
    const articles = await getLatestArticles(1);
    return articles[0] || null;
  } catch (error) {
    console.error('Failed to fetch article:', error);
    return null;
  }
}

export default async function Home() {
  const [launch, article, apod] = await Promise.all([
    getLatestLaunch(),
    getHomepageArticle(),
    getApod(),
  ]);

  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

  return (
    <div className="h-screen w-full bg-black text-white selection:bg-[#FF6B35] selection:text-black flex flex-col md:overflow-hidden">

      {/* HEADER STRIP */}
      <header className="shrink-0 border-b-2 border-white/10 px-4 md:px-8 py-3 md:py-4 flex items-center justify-between gap-4 bg-black z-30">
        <div className="flex items-center gap-3">
          <span className="relative flex w-2 h-2">
            <span className="absolute inline-flex w-full h-full bg-[#FF6B35] opacity-75 animate-ping" />
            <span className="relative inline-flex w-2 h-2 bg-[#FF6B35]" />
          </span>
          <span className="font-mono text-[10px] md:text-xs text-white uppercase tracking-[0.4em] font-black">
            Launch Window
          </span>
          <span className="hidden md:inline text-zinc-700 font-mono text-[10px]">//</span>
          <span className="hidden md:inline font-mono text-[10px] text-zinc-500 uppercase tracking-widest tabular-nums">
            Terminal 2.3.0 / {today}
          </span>
        </div>
        <nav className="flex items-center gap-4 md:gap-6 font-mono text-[10px] uppercase tracking-widest">
          <Link href="/launches" className="text-zinc-300 hover:text-[#18BBF7] transition-colors">
            Launches
          </Link>
          <Link href="/articles" className="text-zinc-300 hover:text-[#18BBF7] transition-colors">
            Archive
          </Link>
        </nav>
      </header>

      {/* BLOCK GRID */}
      <main className="flex-1 grid grid-cols-1 md:grid-cols-12 md:grid-rows-2 gap-px bg-white/10 md:overflow-hidden">
        <BlockApod apod={apod} />
        <BlockLaunch launch={launch} />
        <BlockArticle article={article} />
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Block 01 — Astronomy Picture of the Day                            */
/* ------------------------------------------------------------------ */

function BlockApod({ apod }: { apod: Apod | null }) {
  const imageSrc = apod?.media_type === 'image' ? apod.url : apod?.thumbnail_url;
  const externalUrl = apod?.hdurl || apod?.url;

  return (
    <section className="relative md:col-span-7 md:row-span-2 bg-black overflow-hidden group min-h-[60vh] md:min-h-0">
      {imageSrc ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt={apod?.title || 'NASA APOD'}
            className="absolute inset-0 w-full h-full object-cover opacity-70 transition-all duration-700 group-hover:opacity-90 group-hover:scale-[1.02]"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black via-black/40 to-transparent" />
          <div className="absolute inset-0 bg-linear-to-r from-black/50 via-transparent to-transparent" />
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Telescope className="w-24 h-24 text-zinc-900" strokeWidth={0.8} />
        </div>
      )}

      {/* Corner accents */}
      <div className="absolute top-4 left-4 w-5 h-5 border-t-2 border-l-2 border-[#FF6B35] z-10 pointer-events-none" />
      <div className="absolute bottom-4 right-4 w-5 h-5 border-b-2 border-r-2 border-[#FF6B35] z-10 pointer-events-none" />

      {/* Block index + label */}
      <div className="absolute top-4 left-12 z-10 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em]">
        <span className="font-black text-[#FF6B35]">[01]</span>
        <span className="text-zinc-500">/</span>
        <span className="text-zinc-300 font-bold">Cosmic Observation</span>
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-end p-6 md:p-12">
        <div className="max-w-3xl">
          <p className="font-mono text-[10px] text-[#18BBF7] uppercase tracking-[0.3em] mb-3">
            NASA / Astronomy Picture Of The Day / {apod?.date || '—'}{apod?.media_type === 'video' ? ' / Video' : ''}
          </p>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-black uppercase tracking-tighter leading-none mb-5">
            {apod?.title || 'Cosmic feed unavailable'}
          </h1>
          {apod?.explanation ? (
            <p className="hidden md:block text-sm text-zinc-300 line-clamp-3 mb-6 max-w-2xl leading-relaxed">
              {apod.explanation}
            </p>
          ) : (
            <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest mb-6">
              Awaiting telemetry from api.nasa.gov
            </p>
          )}
          <div className="flex flex-wrap items-center gap-4">
            {externalUrl && (
              <a
                href={externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group/cta inline-flex items-center gap-2 px-4 py-2 border border-white/30 font-mono text-[10px] uppercase tracking-widest font-bold hover:bg-white hover:text-black transition-colors"
              >
                {apod?.media_type === 'video' ? 'Watch Source' : 'View HD'}
                <ExternalLink className="w-3 h-3 transition-transform group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5" />
              </a>
            )}
            {apod?.copyright && (
              <span className="font-mono text-[9px] text-zinc-600 uppercase tracking-widest truncate max-w-xs">
                © {apod.copyright.trim()}
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Block 02 — Next Primary Objective                                  */
/* ------------------------------------------------------------------ */

function BlockLaunch({ launch }: { launch: any }) {
  if (!launch) {
    return (
      <BlockEmpty
        gridClass="md:col-span-5"
        indexLabel="[02]"
        label="Next Primary Objective"
        message="No launch on manifest"
        accent="cyan"
      />
    );
  }

  return (
    <section className="relative md:col-span-5 bg-black overflow-hidden group min-h-[45vh] md:min-h-0">
      {launch.image?.image_url && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={launch.image.image_url}
            alt={launch.name}
            className="absolute inset-0 w-full h-full object-cover opacity-40 transition-all duration-700 group-hover:opacity-60 group-hover:scale-[1.02]"
          />
          <div className="absolute inset-0 bg-linear-to-r from-black via-black/60 to-black/30" />
          <div className="absolute inset-0 bg-linear-to-t from-black via-transparent to-transparent" />
        </>
      )}

      {/* Corner accents */}
      <div className="absolute top-4 right-4 w-5 h-5 border-t-2 border-r-2 border-[#18BBF7] z-10 pointer-events-none" />
      <div className="absolute bottom-4 left-4 w-5 h-5 border-b-2 border-l-2 border-[#18BBF7]/0 group-hover:border-[#18BBF7] transition-colors duration-500 z-10 pointer-events-none" />

      {/* Block index + label */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em]">
        <span className="font-black text-[#18BBF7]">[02]</span>
        <span className="text-zinc-500">/</span>
        <span className="text-zinc-300 font-bold">Next Primary Objective</span>
      </div>

      <div className="relative z-10 h-full flex flex-col justify-between p-5 md:p-7 pt-14 md:pt-16">
        <div>
          <p className="font-mono text-[10px] text-[#FF6B35] uppercase tracking-widest font-black mb-2">
            {launch.launch_service_provider?.name || 'Unknown Provider'}
          </p>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-black uppercase tracking-tight leading-tight mb-5 line-clamp-3">
            {launch.name}
          </h2>
          <MiniCountdown launchDate={launch.date} statusName={launch.status?.name} />
        </div>

        <div className="flex items-end justify-between gap-3 mt-4">
          <div className="font-mono text-[9px] uppercase tracking-widest text-zinc-500">
            <p>{launch.pad?.location?.name || launch.pad?.name || 'Unknown Pad'}</p>
            <p className="text-zinc-300 mt-1 tabular-nums">
              {new Date(launch.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              <span className="text-zinc-700 mx-1">/</span>
              {new Date(launch.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
            </p>
          </div>
          <Link
            href={`/launches/${launch.slug}`}
            className="group/cta inline-flex items-center gap-2 px-4 py-2 bg-[#18BBF7] text-black font-mono text-[10px] uppercase tracking-widest font-black hover:bg-white transition-colors whitespace-nowrap"
          >
            Mission Intel
            <ChevronRight className="w-3 h-3 transition-transform group-hover/cta:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Block 03 — Orbital News Feed                                       */
/* ------------------------------------------------------------------ */

function BlockArticle({ article }: { article: any }) {
  if (!article) {
    return (
      <BlockEmpty
        gridClass="md:col-span-5"
        indexLabel="[03]"
        label="Orbital News Feed"
        message="No dispatches available"
        accent="orange"
      />
    );
  }

  const publishedDate = new Date(article.published_at);

  return (
    <section className="relative md:col-span-5 bg-black overflow-hidden group min-h-[45vh] md:min-h-0">
      {article.image_url && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={article.image_url}
            alt={article.title}
            className="absolute inset-0 w-full h-full object-cover opacity-30 transition-all duration-700 group-hover:opacity-50 group-hover:scale-[1.02]"
          />
          <div className="absolute inset-0 bg-linear-to-r from-black via-black/70 to-black/40" />
          <div className="absolute inset-0 bg-linear-to-t from-black via-transparent to-transparent" />
        </>
      )}

      {/* Corner accents */}
      <div className="absolute top-4 left-4 w-5 h-5 border-t-2 border-l-2 border-[#FF6B35] z-10 pointer-events-none" />
      <div className="absolute bottom-4 right-4 w-5 h-5 border-b-2 border-r-2 border-[#FF6B35]/0 group-hover:border-[#FF6B35] transition-colors duration-500 z-10 pointer-events-none" />

      {/* Block index + label */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em]">
        <span className="text-zinc-300 font-bold">Orbital News Feed</span>
        <span className="text-zinc-500">/</span>
        <span className="font-black text-[#FF6B35]">[03]</span>
      </div>

      <div className="relative z-10 h-full flex flex-col justify-between p-5 md:p-7 pt-14 md:pt-16">
        <div>
          <p className="font-mono text-[10px] text-[#FF6B35] uppercase tracking-widest font-black mb-3">
            {article.news_site || 'Unknown Source'}
            <span className="text-zinc-700 mx-2">/</span>
            <span className="text-zinc-400 tabular-nums">
              {publishedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </p>
          <h2 className="text-xl md:text-2xl lg:text-3xl font-black uppercase tracking-tight leading-tight line-clamp-3 mb-4">
            {article.title}
          </h2>
          {article.summary && (
            <p className="hidden md:block text-xs text-zinc-400 line-clamp-3 leading-relaxed">
              {article.summary}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 mt-4">
          <Link
            href="/articles"
            className="font-mono text-[9px] text-zinc-500 hover:text-[#18BBF7] uppercase tracking-widest transition-colors"
          >
            Archive.All →
          </Link>
          {article.url && (
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group/cta inline-flex items-center gap-2 px-4 py-2 bg-[#FF6B35] text-black font-mono text-[10px] uppercase tracking-widest font-black hover:bg-white transition-colors whitespace-nowrap"
            >
              Read
              <ExternalLink className="w-3 h-3 transition-transform group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5" />
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Empty / fallback block                                             */
/* ------------------------------------------------------------------ */

function BlockEmpty({
  gridClass,
  indexLabel,
  label,
  message,
  accent,
}: {
  gridClass: string;
  indexLabel: string;
  label: string;
  message: string;
  accent: 'orange' | 'cyan';
}) {
  const accentClass = accent === 'orange' ? 'text-[#FF6B35]' : 'text-[#18BBF7]';
  const Icon = accent === 'cyan' ? Rocket : Newspaper;
  return (
    <section className={`relative bg-black overflow-hidden min-h-[40vh] md:min-h-0 ${gridClass}`}>
      <div className="absolute top-4 left-4 z-10 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] font-black">
        <span className={accentClass}>{indexLabel}</span>
        <span className="text-zinc-500">/</span>
        <span className="text-zinc-300">{label}</span>
      </div>
      <div className="h-full flex flex-col items-center justify-center gap-3">
        <Icon className="w-10 h-10 text-zinc-800" strokeWidth={1} />
        <p className="font-mono text-[10px] text-zinc-700 uppercase tracking-widest">{message}</p>
      </div>
    </section>
  );
}

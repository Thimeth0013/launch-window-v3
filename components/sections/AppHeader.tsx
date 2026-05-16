'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft } from 'lucide-react';

const SCROLL_DELTA_THRESHOLD = 8;
const ALWAYS_SHOW_BELOW = 60;

// Resolve where "back" should go based on the current URL — explicit parent
// route rather than browser history. /launches/[slug] → /launches; any other
// inner page → /.
function resolveBackHref(pathname: string | null): string {
  if (!pathname || pathname === '/') return '/';
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length <= 1) return '/';
  return '/' + segments.slice(0, -1).join('/');
}

export default function AppHeader() {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const backHref = resolveBackHref(pathname);
  const [today, setToday] = useState('');
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    setToday(
      new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    );
  }, []);

  // Hide on scroll down, show on scroll up. Always show within the first
  // ALWAYS_SHOW_BELOW pixels so we don't flash the header in the very top.
  useEffect(() => {
    const handle = () => {
      const y = window.scrollY;
      setScrolled(y > 4);
      if (y < ALWAYS_SHOW_BELOW) {
        setHidden(false);
        lastScrollY.current = y;
        return;
      }
      const diff = y - lastScrollY.current;
      if (Math.abs(diff) > SCROLL_DELTA_THRESHOLD) {
        setHidden(diff > 0);
        lastScrollY.current = y;
      }
    };
    window.addEventListener('scroll', handle, { passive: true });
    return () => window.removeEventListener('scroll', handle);
  }, []);

  const isLaunches = pathname?.startsWith('/launches');
  const isArticles = pathname?.startsWith('/articles');

  // Home keeps its solid brutalist bar always. Internal pages start transparent
  // and switch to a glass-blur + thin bottom border once the user scrolls.
  // Note: the non-scrolled state still renders `border-b border-transparent` so
  // only the border *colour* transitions, not the border width. Animating the
  // width caused a single-frame white flash because Tailwind v4 defaults
  // border-colour to currentColor (white) before our colour utility kicks in.
  const visualBg = isHome
    ? 'bg-black/95 backdrop-blur border-b-2 border-white/10'
    : scrolled
      ? 'bg-black/50 backdrop-blur-md border-b border-white/10'
      : 'bg-transparent border-b border-transparent';

  // sticky works on the homepage (its flex layout keeps the header in flow),
  // but breaks on /launches and /launches/[slug] because both wrappers use
  // overflow-hidden / overflow-x-hidden, which makes the wrapper the sticky
  // containing block. Use position:fixed everywhere else so the header is
  // pinned to the viewport regardless of ancestor overflow.
  const positionClasses = isHome
    ? 'sticky top-0'
    : 'fixed top-0 left-0 right-0';

  return (
    <header
      className={`${positionClasses} z-40 shrink-0 px-4 md:px-8 py-3 md:py-4 flex items-center justify-between gap-4 transition-all duration-300 ${hidden ? '-translate-y-full' : 'translate-y-0'} ${visualBg}`}
    >
      <div className="flex items-center gap-3 md:gap-4">
        {!isHome && (
          <Link
            href={backHref}
            aria-label="Go back"
            className="group inline-flex items-center gap-1.5 text-white/40 border border-white/20 hover:border-white/50 hover:bg-white hover:text-black px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span className="hidden sm:inline">Back</span>
          </Link>
        )}

        {isHome && (
          <>
            <span className="relative flex w-2 h-2 shrink-0">
              <span className="absolute inline-flex w-full h-full bg-[#FF6B35] opacity-75 animate-ping" />
              <span className="relative inline-flex w-2 h-2 bg-[#FF6B35]" />
            </span>

            <Link
              href="/"
              className="font-mono text-[10px] md:text-xs text-white hover:text-[#18BBF7] uppercase tracking-[0.4em] font-black transition-colors"
            >
              Launch Window
            </Link>

            <span className="hidden md:inline text-zinc-700 font-mono text-[10px]">//</span>
            <span className="hidden md:inline font-mono text-[10px] text-zinc-500 uppercase tracking-widest tabular-nums">
              Terminal 2.3.0{today && ` / ${today}`}
            </span>
          </>
        )}
      </div>

      <nav className="flex items-center gap-4 md:gap-6 font-mono text-[10px] uppercase tracking-widest">
        <Link
          href="/launches"
          className={`transition-colors ${isLaunches ? 'text-[#18BBF7]' : 'text-zinc-300 hover:text-[#18BBF7]'}`}
        >
          Launches
        </Link>
        <Link
          href="/articles"
          className={`transition-colors ${isArticles ? 'text-[#18BBF7]' : 'text-zinc-300 hover:text-[#18BBF7]'}`}
        >
          Articles
        </Link>
      </nav>
    </header>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, Menu, X, ArrowUpRight } from 'lucide-react';

const SCROLL_DELTA_THRESHOLD = 8;
const ALWAYS_SHOW_BELOW = 60;

// Resolve where "back" should go based on the current URL
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
  const [isMobileOpen, setIsMobileOpen] = useState(false);
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

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileOpen]);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Scroll hiding logic
  useEffect(() => {
    const handle = () => {
      if (isMobileOpen) return; // Don't hide header if menu is active
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
  }, [isMobileOpen]);

  const isLaunches = pathname?.startsWith('/launches');
  const isArticles = pathname?.startsWith('/articles');
  const isStarship = pathname?.startsWith('/starship');
  const isTracker = pathname?.startsWith('/tracker');

  const visualBg = scrolled
    ? 'bg-black/50 backdrop-blur-md border-b border-white/10'
    : 'bg-transparent border-b border-transparent';

  const positionClasses = 'fixed top-0 left-0 right-0';

  return (
    <>
      <header
        className={`${positionClasses} z-40 shrink-0 px-4 md:px-8 py-3 md:py-4 flex items-center justify-between gap-4 transition-all duration-300 ${hidden && !isMobileOpen ? '-translate-y-full' : 'translate-y-0'} ${visualBg}`}
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

              <span className="hidden md:inline font-mono text-[10px] text-zinc-500 uppercase tracking-widest tabular-nums">
                //{today && ` ${today} `}
              </span>
            </>
          )}
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6 font-mono text-[10px] uppercase tracking-widest">
          <Link href="/launches" className={`transition-colors ${isLaunches ? 'text-[#18BBF7]' : 'text-zinc-300 hover:text-[#18BBF7]'}`}>
            Launches
          </Link>
          <Link href="/articles" className={`transition-colors ${isArticles ? 'text-[#18BBF7]' : 'text-zinc-300 hover:text-[#18BBF7]'}`}>
            News
          </Link>
          <Link href="/tracker" className={`flex items-center gap-1.5 transition-colors ${isTracker ? 'text-[#18BBF7]' : 'text-zinc-300 hover:text-[#18BBF7]'}`}>
            Tracker
          </Link>
          <Link href="/starship" className={`transition-colors ${isStarship ? 'text-[#FF6B35]' : 'text-zinc-300 hover:text-[#FF6B35]'}`}>
            Starship
          </Link>
        </nav>

        {/* Mobile Menu Trigger */}
        <button
          className="md:hidden flex items-center justify-center p-2 text-white hover:text-[#FF6B35] transition-colors"
          onClick={() => setIsMobileOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6" />
        </button>
      </header>

      {/* Mobile Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-500 md:hidden ${isMobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsMobileOpen(false)}
      />

      {/* Mobile Sidebar */}
      <div
        className={`fixed inset-y-0 right-0 w-[85vw] max-w-[400px] z-50 bg-[#0a0a0a]/95 backdrop-blur-2xl border-l border-white/10 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] flex flex-col md:hidden ${isMobileOpen ? 'translate-x-0 shadow-[-20px_0_40px_rgba(0,0,0,0.5)]' : 'translate-x-full'}`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-6 py-6 border-b border-white/10 shrink-0">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-zinc-400">
              <span className="w-1.5 h-1.5 bg-[#FF6B35] animate-pulse"></span>
              SYS.NAV //
            </div>
            <div className="text-white font-black uppercase text-sm tracking-widest">
              Launch Window
            </div>
          </div>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="group relative w-12 h-12 flex items-center justify-center overflow-hidden border border-white/10 text-white transition-all hover:border-[#FF6B35]"
            aria-label="Close menu"
          >
            <div className="absolute inset-0 bg-[#FF6B35] translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
            <X className="w-5 h-5 relative z-10 group-hover:text-black transition-colors" />
          </button>
        </div>

        {/* Sidebar Links */}
        <nav className="flex flex-col px-6 py-8 overflow-y-auto grow gap-2">
          <MobileNavLink href="/" label="HOME" isActive={isHome} index={0} isMobileOpen={isMobileOpen} />
          <MobileNavLink href="/launches" label="LAUNCHES" isActive={isLaunches} index={1} isMobileOpen={isMobileOpen} />
          <MobileNavLink href="/articles" label="NEWS" isActive={isArticles} index={2} isMobileOpen={isMobileOpen} />
          <MobileNavLink href="/starship" label="STARSHIP" isActive={isStarship} index={3} isMobileOpen={isMobileOpen} />
          <MobileNavLink href="/tracker" label="TRACKER" isActive={isTracker} index={4} isMobileOpen={isMobileOpen} />
        </nav>

        {/* Sidebar Footer */}
        <div className="px-6 pb-4 pt-4 shrink-0 flex flex-col gap-4 border-t border-white/10 bg-white/[0.02]">
          <div className="flex items-center justify-end">
            <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest tabular-nums">
              {today}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

// Helpers for the mobile sidebar
function MobileNavLink({ href, label, isActive, index, isMobileOpen }: { href: string; label: string; isActive?: boolean; index: number; isMobileOpen: boolean }) {
  return (
    <Link
      href={href}
      className={`group relative flex items-center py-4 text-4xl font-black uppercase tracking-tighter transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${isActive ? 'text-white' : 'text-zinc-500 hover:text-white'} ${isMobileOpen ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'}`}
      style={{ transitionDelay: `${index * 50}ms` }}
      onClick={() => {
        // Optionally close mobile menu on navigation via Next.js router events or state,
        // but the main component already has a useEffect on pathname change to close it.
      }}
    >
      <div className={`absolute left-0 w-1.5 h-full transition-all duration-300 ${isActive ? 'bg-[#FF6B35] scale-y-100' : 'bg-white/10 scale-y-0 group-hover:scale-y-100'}`} />

      <span className="flex items-center gap-4 pl-6 transition-transform duration-300 group-hover:translate-x-2">
        <span className="font-mono text-xs text-zinc-600 font-normal tracking-widest">
          0{index + 1}
        </span>
        {label}
      </span>
    </Link>
  );
}
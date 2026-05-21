import Link from 'next/link';

// Simple brutalist footer rendered on every page via the root layout.
// Lives inside #page-frame so it scales with the page transition.
export default function AppFooter() {
  return (
    <footer className="relative w-full border-t border-white/10 bg-black px-6 md:px-12 py-10 md:py-14">
      <div className="max-w-7xl mx-auto flex flex-col gap-8 md:flex-row md:items-end md:justify-between">

        {/* Brand */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="relative flex w-2 h-2 shrink-0">
              <span className="absolute inline-flex w-full h-full bg-[#FF6B35] opacity-75 animate-ping" />
              <span className="relative inline-flex w-2 h-2 bg-[#FF6B35]" />
            </span>
            <Link
              href="/"
              className="font-mono text-[10px] md:text-xs text-white uppercase tracking-[0.4em] font-black hover:text-[#18BBF7] transition-colors"
            >
              Launch Window
            </Link>
          </div>
          <p className="font-mono text-[9px] md:text-[10px] text-zinc-600 uppercase tracking-widest pl-5">
            Terminal 2.3.0 / Mission Control
          </p>
        </div>

        {/* Nav */}
        <nav className="flex flex-wrap items-center gap-x-5 md:gap-x-6 gap-y-2 font-mono text-[10px] uppercase tracking-widest">
          <Link href="/launches" className="text-zinc-400 hover:text-[#18BBF7] transition-colors">
            Launches
          </Link>
          <span className="text-zinc-800">/</span>
          <Link href="/articles" className="text-zinc-400 hover:text-[#18BBF7] transition-colors">
            News
          </Link>
          <span className="text-zinc-800">/</span>
          <Link href="/starship" className="text-zinc-400 hover:text-[#FF6B35] transition-colors">
            Starship
          </Link>
        </nav>

        {/* Credits */}
        <div className="flex flex-col gap-1.5 font-mono text-[9px] text-zinc-600 uppercase tracking-widest md:text-right">
          <p>
            Data —{' '}
            <a
              href="https://thespacedevs.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-500 hover:text-[#18BBF7] transition-colors"
            >
              The Space Devs
            </a>
            {' / '}
            <a
              href="https://api.nasa.gov"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-500 hover:text-[#18BBF7] transition-colors"
            >
              NASA
            </a>
            {' / '}
            <a
              href="https://spaceflightnewsapi.net"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-500 hover:text-[#18BBF7] transition-colors"
            >
              SNAPI
            </a>
          </p>
          <p>© {new Date().getFullYear()} Launch Window</p>
        </div>
      </div>
    </footer>
  );
}

import type { ReactNode } from 'react';

// Building blocks for the launch story (`/launches/[slug]`, below the timeline).
//
// The story reads top to bottom in mission order — briefing, rocket, booster,
// crew, pad, window, flight plan, destination, recovery, history, broadcasts,
// live log — one chapter per step. Every chapter
// is a plain-English sentence built from the data, beside a small visual of
// the same data. No boxes, no nested cards: hairlines and whitespace only.
//
// COLOUR RULE
//   cyan   #18BBF7  structure & interaction: chapter titles, the spine and its
//                   nodes, links, focus.
//   orange #FF6B35  this launch: chapter numbers,
//                   the highlighted mark in every visual (this booster flight,
//                   the target orbit, the return arc, T-0, primary bars) and
//                   anything live (timeline "now", the mission log).
//   white           data. Highlighted words in a sentence are data too.
//   zinc            prose, labels, supporting copy.
//   green/amber/red verdicts only (success, marginal, failure).

export const CYAN = '#18BBF7';
export const ORANGE = '#FF6B35';

export type Tone = 'go' | 'warn' | 'fail';
export const TONE_TEXT: Record<Tone, string> = {
  go: 'text-green-400',
  warn: 'text-amber-400',
  fail: 'text-red-400',
};
const TONE_BG: Record<Tone, string> = {
  go: 'bg-green-400',
  warn: 'bg-amber-400',
  fail: 'bg-red-400',
};

/** A data value inside a story sentence. */
export function D({ children }: { children: ReactNode }) {
  return <span className="font-medium text-white">{children}</span>;
}

export function Label({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500 ${className}`}>
      {children}
    </div>
  );
}

/** A number with a label above it. Top hairline is the only chrome. */
export function Stat({
  label,
  value,
  unit,
  sub,
  accent = false,
  tone,
}: {
  label: ReactNode;
  value: ReactNode;
  unit?: ReactNode;
  sub?: ReactNode;
  /** Orange — the number that is about *this* launch. */
  accent?: boolean;
  tone?: Tone;
}) {
  const colour = tone ? TONE_TEXT[tone] : accent ? 'text-[#FF6B35]' : 'text-white';
  return (
    <div className="min-w-0 border-t border-white/10 pt-3">
      <Label className="mb-1">{label}</Label>
      <div className={`font-mono text-xl font-semibold tabular-nums leading-tight md:text-2xl ${colour}`}>
        {value}
        {unit && <span className="ml-1 text-xs font-normal text-zinc-500">{unit}</span>}
      </div>
      {sub && <div className="mt-1 text-[11px] text-zinc-500">{sub}</div>}
    </div>
  );
}

type RowSpec = { label: ReactNode; value: ReactNode; tone?: Tone };

/** Label-left / value-right rows. Empty values are dropped, never shown as "N/A". */
export function Rows({ rows, className = '' }: { rows: Array<RowSpec | null | false | undefined>; className?: string }) {
  const visible = rows.filter((r): r is RowSpec => !!r && r.value !== null && r.value !== undefined && r.value !== '');
  if (!visible.length) return null;
  return (
    <div className={`border-b border-white/10 ${className}`}>
      {visible.map((r, i) => (
        <div key={i} className="flex items-baseline justify-between gap-6 border-t border-white/10 py-2.5">
          <span className="shrink-0 text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-500">{r.label}</span>
          <span className={`min-w-0 text-right text-[13px] ${r.tone ? TONE_TEXT[r.tone] : 'text-zinc-100'}`}>{r.value}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Horizontal bar. `data-bar` lets SlugScrollAnimator grow it in from the left
 * when it scrolls into view; without JS it simply renders at full value.
 */
export function Bar({
  value,
  max,
  tone,
  dim = false,
}: {
  value: number;
  max: number;
  tone?: Tone;
  /** Secondary bars sit back in zinc so the primary (orange) one reads first. */
  dim?: boolean;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="h-1.5 w-full bg-white/10">
      <div
        data-bar
        className={`h-full origin-left ${tone ? TONE_BG[tone] : dim ? 'bg-zinc-500' : 'bg-[#FF6B35]'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/** Label · bar · value, for comparing a handful of quantities. */
export function BarRow({
  label,
  value,
  max,
  display,
  tone,
  dim,
}: {
  label: ReactNode;
  value: number;
  max: number;
  display: ReactNode;
  tone?: Tone;
  dim?: boolean;
}) {
  return (
    <div className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-4 py-2 sm:grid-cols-[8rem_1fr_auto]">
      <span className="truncate text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-500">{label}</span>
      <Bar value={value} max={max} tone={tone} dim={dim} />
      <span className="min-w-16 text-right font-mono text-[13px] tabular-nums text-white">{display}</span>
    </div>
  );
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#18BBF7] transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#18BBF7]"
    >
      {children}
      <span aria-hidden="true">↗</span>
    </a>
  );
}

// ---------------------------------------------------------------------------
// Formatting — pinned to en-US and explicit time zones so the server render
// and the hydrated client always agree.

export function formatNumber(n?: number | string | null): string | null {
  if (n === null || n === undefined || n === '') return null;
  const v = Number(n);
  return Number.isFinite(v) ? v.toLocaleString('en-US') : null;
}

/** 7436 → "7,436th". */
export function ordinal(n?: number | null): string | null {
  if (n === null || n === undefined || !Number.isFinite(n)) return null;
  const tens = n % 100;
  const suffix = tens >= 11 && tens <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
  return `${formatNumber(n)}${suffix}`;
}

/** "P32DT18H55M16S" → "32 days". Coarse on purpose — it goes into sentences. */
export function humanDuration(iso?: string | null): string | null {
  if (!iso) return null;
  const m = iso.match(/^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:[\d.]+S)?)?$/);
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1, 6).map((v) => Number(v ?? 0));
  const days = y * 365 + mo * 30 + d;
  const plural = (n: number, u: string) => `${n} ${u}${n === 1 ? '' : 's'}`;
  if (days >= 2) return plural(days, 'day');
  if (days === 1) return h ? `1 day ${plural(h, 'hour')}` : '1 day';
  if (h) return mi ? `${h}h ${mi}m` : plural(h, 'hour');
  if (mi) return plural(mi, 'minute');
  return null;
}

export function formatDate(iso?: string | null, timeZone = 'UTC'): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone }).format(new Date(iso));
}

export function formatShortDate(iso?: string | null, timeZone = 'UTC'): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', timeZone }).format(new Date(iso));
}

export function formatUtcTime(iso?: string | null): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }).format(new Date(iso));
}

/** Wall-clock time at the pad, e.g. "6:35 PM PST". Null if the zone is unknown. */
export function formatLocalTime(iso?: string | null, timeZone?: string | null): string | null {
  if (!iso || !timeZone) return null;
  try {
    return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone, timeZoneName: 'short' }).format(new Date(iso));
  } catch {
    return null;
  }
}

/** ["a", "b", "c"] → "a, b and c" (as nodes, so items can be highlighted). */
export function joinNodes(items: ReactNode[]): ReactNode[] {
  return items.flatMap((item, i) => {
    if (i === 0) return [item];
    return [i === items.length - 1 ? ' and ' : ', ', item];
  });
}

/** Lower-cases a proper orbit name for use mid-sentence ("Low Earth Orbit" → "low Earth orbit"). */
export function inSentence(name: string): string {
  return name
    .split(' ')
    .map((w) => (/^(Earth|Sun|Moon|Mars|Lagrange|L\d|[A-Z]{2,})$/.test(w) ? w : w.toLowerCase()))
    .join(' ');
}

// ---------------------------------------------------------------------------
// Timeline offsets (LL2 `relative_time`, e.g. "-PT38M", "PT8M11S", "P0D").

export function parseRelativeTime(relativeTime: string): number | null {
  const iso = relativeTime.match(/^(-?)P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/);
  if (iso && relativeTime !== 'P' && relativeTime !== '-P') {
    const [, sign, days, hours, minutes, seconds] = iso;
    const ms =
      (Number(days || 0) * 86400 + Number(hours || 0) * 3600 + Number(minutes || 0) * 60 + parseFloat(seconds || '0')) * 1000;
    return sign === '-' ? -ms : ms;
  }
  const legacy = relativeTime.match(/T([+-])(\d{2}):(\d{2}):(\d{2})/);
  if (legacy) {
    const [, sign, h, m, s] = legacy;
    const ms = (Number(h) * 3600 + Number(m) * 60 + Number(s)) * 1000;
    return sign === '+' ? ms : -ms;
  }
  return null;
}

/** -2280000 → "T-38m"; 491000 → "T+8m 11s". */
export function formatTMinus(ms: number): string {
  if (ms === 0) return 'T-0';
  const prefix = ms < 0 ? 'T-' : 'T+';
  const abs = Math.abs(ms);
  const h = Math.floor(abs / 3600000);
  const m = Math.floor((abs % 3600000) / 60000);
  const s = Math.floor((abs % 60000) / 1000);
  if (h > 0) return `${prefix}${h}h${m ? ` ${m}m` : ''}`;
  if (m > 0) return `${prefix}${m}m${s ? ` ${s}s` : ''}`;
  return `${prefix}${s}s`;
}

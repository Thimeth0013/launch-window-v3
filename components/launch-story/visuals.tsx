import type { RecoveryKind } from '@/app/lib/launch/landing';
import { Label, formatNumber, formatShortDate, formatUtcTime, formatLocalTime } from './primitives';

// Small, data-driven diagrams used by the story chapters. Server-rendered,
// plain DOM/SVG, no chart library.

/* ------------------------------------------------------------------------ */
/* Track record — one bar split into successes and failures.                 */

export function TrackRecord({
  label,
  ok,
  total,
  note,
}: {
  label: string;
  ok: number;
  total: number;
  note?: string | null;
}) {
  const failed = Math.max(0, total - ok);
  const pct = total ? (ok / total) * 100 : 0;
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <Label>{label}</Label>
        <span className="font-mono text-[13px] tabular-nums text-white">
          {formatNumber(ok)} / {formatNumber(total)}
          <span className="ml-2 text-zinc-500">{pct >= 99.95 || pct === 0 ? pct.toFixed(0) : pct.toFixed(1)}%</span>
        </span>
      </div>
      <div className="flex h-1.5 w-full gap-px bg-white/10">
        <div data-bar className="h-full origin-left bg-white" style={{ width: `${pct}%` }} />
        {failed > 0 && <div data-bar className="h-full min-w-[2px] origin-left bg-red-400" style={{ width: `${100 - pct}%` }} />}
      </div>
      {note && <div className="mt-2 text-[11px] text-zinc-500">{note}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Flight dots — one square per flight of a booster, this one highlighted.    */

export function FlightDots({
  flightNumber,
  firstFlight,
  serial,
}: {
  flightNumber: number;
  firstFlight?: string | null;
  serial?: string | null;
}) {
  const n = Math.max(1, flightNumber);
  const shown = Math.min(n, 40);
  return (
    <div>
      <div className="flex flex-wrap gap-1.5" role="img" aria-label={`Flight ${n} of booster ${serial ?? ''}`}>
        {n > shown && <span className="mr-1 self-center font-mono text-[11px] text-zinc-500">+{n - shown}</span>}
        {Array.from({ length: shown }, (_, i) => {
          const current = i === shown - 1;
          return (
            <span
              key={i}
              className={current ? 'h-3 w-3 bg-[#FF6B35] outline outline-offset-2 outline-[#FF6B35]/40' : 'h-3 w-3 bg-zinc-600'}
            />
          );
        })}
      </div>
      <div className="mt-3 flex justify-between gap-4 text-[11px] text-zinc-500">
        <span>{firstFlight ? `First flight · ${formatShortDate(firstFlight)} ${firstFlight.slice(0, 4)}` : 'Flight 1'}</span>
        <span className="text-[#FF6B35]">Flight {n} · this launch</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Launch window — the open/close span with the target time marked.           */

export function WindowTimeline({
  start,
  end,
  net,
  timeZone,
}: {
  start: string;
  end: string;
  net?: string | null;
  timeZone?: string | null;
}) {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const instant = e - s <= 0;
  const t = net ? new Date(net).getTime() : s;
  const pos = instant ? 0 : Math.max(0, Math.min(100, ((t - s) / (e - s)) * 100));
  const showNet = !instant && pos > 2 && pos < 98;

  if (instant) {
    return (
      <div>
        <div className="relative h-6">
          <div className="absolute inset-x-0 top-1/2 h-px bg-white/10" />
          <div className="absolute left-0 top-0 h-6 w-[3px] bg-[#FF6B35]" />
        </div>
        <div className="mt-4">
          <WindowEdge iso={start} align="left" label="Instantaneous window" timeZone={timeZone} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="relative h-6">
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 bg-white/10" />
        <div data-bar className="absolute inset-x-0 top-1/2 h-1.5 origin-left -translate-y-1/2 bg-[#FF6B35]/35" />
        <div className="absolute left-0 top-0 h-6 w-px bg-white" />
        <div className="absolute right-0 top-0 h-6 w-px bg-white" />
        {showNet && (
          <div className="absolute top-0 h-6 w-[3px] -translate-x-1/2 bg-[#FF6B35]" style={{ left: `${pos}%` }}>
            <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] text-[#FF6B35]">
              T-0 {formatUtcTime(net)}
            </span>
          </div>
        )}
      </div>
      <div className="mt-6 flex justify-between gap-6">
        <WindowEdge iso={start} align="left" label="Opens" timeZone={timeZone} />
        <WindowEdge iso={end} align="right" label="Closes" timeZone={timeZone} />
      </div>
    </div>
  );
}

function WindowEdge({
  iso,
  align,
  label,
  timeZone,
}: {
  iso: string;
  align: 'left' | 'right';
  label: string;
  timeZone?: string | null;
}) {
  const local = formatLocalTime(iso, timeZone);
  return (
    <div className={align === 'right' ? 'text-right' : ''}>
      <Label>{label}</Label>
      <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-white md:text-2xl">
        {formatUtcTime(iso)}
        <span className="ml-1 text-xs font-normal text-zinc-500">UTC</span>
      </div>
      <div className="mt-0.5 text-[11px] text-zinc-500">
        {formatShortDate(iso)}
        {local && ` · ${local} at the pad`}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Orbit ladder — where the target orbit sits between the ground and deep     */
/* space. Categorical stops, not to scale.                                    */

const STOPS = [
  { key: 'SUB', label: 'Suborbital', alt: '~100 km' },
  { key: 'LEO', label: 'Low Earth', alt: '160–2,000 km' },
  { key: 'MEO', label: 'Medium Earth', alt: '2,000–35,786 km' },
  { key: 'GEO', label: 'Geostationary', alt: '35,786 km' },
  { key: 'MOON', label: 'The Moon', alt: '384,400 km' },
  { key: 'DEEP', label: 'Deep space', alt: '1.5M km +' },
] as const;

type StopKey = (typeof STOPS)[number]['key'];

/** Maps an LL2 orbit abbreviation to a [from, to] span on the ladder. */
function orbitSpan(abbrev?: string | null, name?: string | null): [StopKey, StopKey] | null {
  const a = (abbrev || '').toUpperCase();
  const n = (name || '').toLowerCase();
  if (a === 'SUB' || a === 'SO' || n.includes('suborbital') || n.includes('sub-orbital')) return ['SUB', 'SUB'];
  if (['LEO', 'SSO', 'PO', 'VLEO', 'ISS'].includes(a) || n.includes('low earth') || n.includes('polar') || n.includes('sun-synchronous')) return ['LEO', 'LEO'];
  if (a === 'MEO' || n.includes('medium earth')) return ['MEO', 'MEO'];
  if (['GTO', 'SUPER-GTO', 'GSO-T'].includes(a) || n.includes('transfer') && n.includes('geo')) return ['LEO', 'GEO'];
  if (['GEO', 'GSO'].includes(a) || n.includes('geostationary') || n.includes('geosynchronous')) return ['GEO', 'GEO'];
  if (['HEO', 'MOLNIYA'].includes(a) || n.includes('highly elliptical')) return ['LEO', 'GEO'];
  if (['TLI', 'LO', 'NRHO', 'SELENOCENTRIC'].includes(a) || n.includes('lunar') || n.includes('moon')) return ['LEO', 'MOON'];
  if (['L1', 'L2', 'HELIO-N', 'HELIOCENTRIC', 'ES-L1', 'ES-L2', 'TMI', 'BEO'].includes(a) || n.includes('heliocentric') || n.includes('mars') || n.includes('lagrange') || n.includes('escape')) return ['LEO', 'DEEP'];
  return null;
}

export function OrbitLadder({ abbrev, name }: { abbrev?: string | null; name?: string | null }) {
  const span = orbitSpan(abbrev, name);
  if (!span) return null;
  const from = STOPS.findIndex((s) => s.key === span[0]);
  const to = STOPS.findIndex((s) => s.key === span[1]);
  const pct = (i: number) => (i / (STOPS.length - 1)) * 100;

  return (
    <div>
      {/* Track */}
      <div className="relative mx-2 h-8">
        <div className="absolute inset-x-0 top-1/2 h-px bg-white/15" />
        {to > from && (
          <div
            data-bar
            className="absolute top-1/2 h-1 origin-left -translate-y-1/2 bg-[#FF6B35]/70"
            style={{ left: `${pct(from)}%`, width: `${pct(to) - pct(from)}%` }}
          />
        )}
        {STOPS.map((s, i) => {
          const target = i === to;
          const passed = i >= from && i < to;
          return (
            <span
              key={s.key}
              className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 ${
                target
                  ? 'h-4 w-4 bg-[#FF6B35] outline outline-offset-[3px] outline-[#FF6B35]/30'
                  : passed
                    ? 'h-2 w-2 bg-[#FF6B35]/70'
                    : 'h-2 w-2 border border-white/30 bg-black'
              }`}
              style={{ left: `${pct(i)}%` }}
            />
          );
        })}
      </div>

      {/* Labels — every stop on desktop; on narrow screens only the target. */}
      <div className="relative mx-2 mt-3 hidden h-10 sm:block">
        {STOPS.map((s, i) => (
          <div
            key={s.key}
            className={`absolute w-24 ${i === 0 ? 'text-left' : i === STOPS.length - 1 ? '-translate-x-full text-right' : '-translate-x-1/2 text-center'}`}
            style={{ left: `${pct(i)}%` }}
          >
            <div className={`text-[11px] ${i === to ? 'font-semibold text-[#FF6B35]' : 'text-zinc-500'}`}>{s.label}</div>
            <div className="font-mono text-[10px] text-zinc-600">{s.alt}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 sm:hidden">
        <div className="text-[11px] font-semibold text-[#FF6B35]">{STOPS[to].label}</div>
        <div className="font-mono text-[10px] text-zinc-500">{STOPS[to].alt}</div>
      </div>
      <div className="mt-3 text-[10px] uppercase tracking-[0.12em] text-zinc-600">Not to scale</div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Recovery paths — every stage and ship that comes back, drawn on one        */
/* schematic: the ascent (dashed) leaves the pad; boosters return from the    */
/* separation point, ships come back in from orbit at the right edge.         */

export type { RecoveryKind };

export type RecoveryPath = {
  who: string;
  kind: RecoveryKind;
  /** Booster/stage (returns from separation) vs. ship/spacecraft (returns from orbit). */
  fromOrbit: boolean;
  /** "Tower catch", "Drone ship landing", … */
  how: string;
  where?: string | null;
  km?: number | null;
  /** Recorded outcome once known: true = recovered as planned, false = not. */
  success?: boolean | null;
  /** What actually happened, in the data provider's words (only once known). */
  note?: string | null;
};

const GROUND = 126;
const PAD_X = 30;
const SEPARATION = { x: 190, y: 30 };
// Ships come back in low from the right (the sea side), clear of the ascent.
const REENTRY = { x: 400, y: 62 };
const PATH_COLOURS = ['#FF6B35', '#FFFFFF', '#A1A1AA'];

function landingPoint(p: RecoveryPath): { x: number; y: number } {
  const byDistance = (fallback: number) =>
    p.km ? Math.round(PAD_X + Math.min(p.km / 800, 1) * 340) : fallback;
  switch (p.kind) {
    // Back to the launch site: the line ends on the pad marker itself.
    case 'catch':
    case 'rtls':
      return { x: PAD_X, y: GROUND - 3 };
    case 'asds':
      return { x: byDistance(290), y: GROUND };
    case 'vertical':
      return { x: byDistance(250), y: GROUND };
    case 'ocean':
      return { x: p.fromOrbit ? 372 : byDistance(340), y: GROUND };
    case 'parachute':
      return { x: 330, y: GROUND };
    default:
      return { x: 300, y: GROUND };
  }
}

function pathFor(p: RecoveryPath): string {
  const L = landingPoint(p);
  const S = p.fromOrbit ? REENTRY : SEPARATION;
  const home = L.x < 120; // returning to the launch site
  let c1: { x: number; y: number };
  let c2: { x: number; y: number };
  if (p.fromOrbit) {
    c1 = home ? { x: S.x - 110, y: S.y - 4 } : { x: S.x - 25, y: S.y };
    c2 = home ? { x: L.x + 150, y: L.y - 18 } : { x: L.x + 10, y: L.y - 45 };
  } else if (home) {
    // Boostback: a short hop past separation, then back down under the ascent.
    c1 = { x: S.x + 35, y: S.y - 8 };
    c2 = { x: L.x + 115, y: L.y - 28 };
  } else {
    c1 = { x: S.x + 45, y: S.y - 24 };
    c2 = { x: L.x + 8, y: L.y - 95 };
  }
  return `M ${S.x} ${S.y} C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${L.x} ${L.y}`;
}

export function RecoveryPaths({ padLabel, paths }: { padLabel: string; paths: RecoveryPath[] }) {
  const drawn = paths.filter((p) => p.kind !== 'expended');
  const colourOf = (p: RecoveryPath) => PATH_COLOURS[Math.min(paths.indexOf(p), PATH_COLOURS.length - 1)];

  return (
    <figure>
      {drawn.length > 0 && (
        <svg
          viewBox="0 0 400 150"
          className="h-auto w-full max-w-xl overflow-visible"
          role="img"
          aria-label={drawn.map((p) => `${p.who}: ${p.how}${p.where ? ` at ${p.where}` : ''}`).join('. ')}
        >
          {/* ground + sea (dotted right of the coast) */}
          <line x1="0" y1={GROUND} x2="210" y2={GROUND} stroke="rgba(255,255,255,0.2)" />
          <line x1="210" y1={GROUND} x2="400" y2={GROUND} stroke="rgba(255,255,255,0.2)" strokeDasharray="2 4" />
          {/* ascent, continuing off-canvas */}
          <path
            d={`M ${PAD_X} ${GROUND} Q ${PAD_X + 10} 50 ${SEPARATION.x} ${SEPARATION.y} T 400 4`}
            fill="none"
            stroke="rgba(255,255,255,0.3)"
            strokeDasharray="3 4"
          />
          {drawn.some((p) => !p.fromOrbit) && (
            <circle cx={SEPARATION.x} cy={SEPARATION.y} r="2.5" fill="none" stroke="rgba(255,255,255,0.5)" />
          )}
          {/* pad */}
          <rect x={PAD_X - 4} y={GROUND - 7} width="8" height="7" fill="white" />
          {/* return paths */}
          {drawn.map((p, i) => {
            const L = landingPoint(p);
            const c = colourOf(p);
            return (
              <g key={i}>
                <path d={pathFor(p)} fill="none" stroke={c} strokeWidth="1.75" strokeDasharray={p.fromOrbit ? '6 3' : undefined} />
                {L.x === PAD_X ? (
                  <rect x={L.x - 7 - i * 3} y={L.y - 7 - i * 3} width={14 + i * 6} height={11 + i * 6} fill="none" stroke={c} strokeWidth="1.25" />
                ) : (
                  <rect x={L.x - 3.5} y={L.y - 3.5} width="7" height="7" fill={c} />
                )}
              </g>
            );
          })}
        </svg>
      )}

      <figcaption className={drawn.length ? 'mt-5' : ''}>
        <div className="mb-3 flex items-center gap-2 text-[11px] text-zinc-500">
          <span className="inline-block h-2 w-2 bg-white" /> {padLabel}
        </div>
        <ul className="border-b border-white/10">
          {paths.map((p, i) => (
            <li key={i} className="border-t border-white/10 py-2.5">
              <div className="flex items-baseline justify-between gap-4">
              <span className="flex min-w-0 items-baseline gap-3">
                <span
                  aria-hidden="true"
                  className="inline-block h-0.5 w-5 shrink-0 translate-y-[-3px]"
                  style={{ background: p.kind === 'expended' ? 'rgba(255,255,255,0.2)' : colourOf(p) }}
                />
                <span className="text-[13px] font-medium text-white">{p.who}</span>
                <span className="truncate text-[11px] uppercase tracking-[0.1em] text-zinc-500">{p.how}</span>
              </span>
              <span className="shrink-0 text-right text-[13px] text-zinc-300">
                {[p.where, p.km ? `${formatNumber(p.km)} km downrange` : null].filter(Boolean).join(' · ')}
                {p.success === true && <span className="ml-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-green-400">Recovered</span>}
                {p.success === false && <span className="ml-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-red-400">Not recovered</span>}
              </span>
              </div>
              {p.note && <p className="mt-1 pl-8 text-xs leading-relaxed text-zinc-400">{p.note}</p>}
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}

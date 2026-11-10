import { TextLink } from './primitives';
import type { ChapterSpec, Figure } from './types';

// One chapter of the story: the sentence and its visual.
//
// Layout (lg and up, 12 columns):
//   default        → sentence left (5), visual right (7). `aside` content
//                    (e.g. the rocket's headline specs) sits under the sentence.
//   split: 'text'  → sentence 2/3, visual or mission patch 1/3 (the briefing).
//   wide           → sentence on top, visual full width underneath (timeline,
//                    broadcasts).
// Below lg everything stacks.

export default function Chapter({ index, spec }: { index: number; spec: ChapterSpec }) {
  const { id, title, lede, ledeSize = 'display', visual, aside, figure, links, wide, split = 'even' } = spec;
  const right = wide ? null : visual ?? (figure ? <Patch figure={figure} /> : null);
  const leftFigure = visual && !wide ? figure : null;
  const cols =
    split === 'text'
      ? { left: 'lg:col-span-8', right: 'lg:col-span-4', alone: 'lg:w-2/3' }
      : { left: 'lg:col-span-5', right: 'lg:col-span-7', alone: 'max-w-3xl' };

  return (
    <section
      id={`chapter-${id}`}
      aria-labelledby={`chapter-${id}-title`}
      data-scroll-section
      className="relative scroll-mt-24 pl-6 md:pl-12"
    >
      {/* Spine marker. A black halo breaks the line around it so it floats;
          grey until the fill reaches it, then a muted blue. SlugScrollAnimator
          flips data-on from the fill's own progress. On by default for no-JS. */}
      <span
        aria-hidden="true"
        data-story-node
        data-on="true"
        className="absolute left-0 top-[4px] h-2 w-2 -translate-x-1/2 rotate-45 bg-zinc-700 shadow-[0_0_0_5px_#000] transition-colors duration-500 data-[on=true]:bg-[#18BBF7]/80"
      />
      <div className={right ? 'grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-16' : ''}>
        <div className={right ? cols.left : cols.alone}>
          <h2
            id={`chapter-${id}-title`}
            className="flex items-baseline gap-3 text-xs font-bold uppercase tracking-[0.2em] text-[#18BBF7]"
          >
            <span className="font-mono font-semibold text-[#FF6B35]">{String(index).padStart(2, '0')}</span>
            {title}
          </h2>

          {lede && (
            <p
              className={
                ledeSize === 'prose'
                  ? 'mt-5 text-base leading-relaxed text-zinc-300 md:text-lg md:leading-relaxed'
                  : 'mt-5 text-xl leading-snug text-zinc-400 md:text-2xl md:leading-snug'
              }
            >
              {lede}
            </p>
          )}

          {links && links.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
              {links.map((l) => (
                <TextLink key={l.href} href={l.href}>
                  {l.label}
                </TextLink>
              ))}
            </div>
          )}

          {aside && <div className="mt-8">{aside}</div>}

          {leftFigure && (
            <div className="mt-8">
              <Patch figure={leftFigure} />
            </div>
          )}
        </div>

        {right && <div className={`min-w-0 lg:pt-9 ${cols.right}`}>{right}</div>}
      </div>

      {wide && visual && <div className={lede ? 'mt-10' : 'mt-6'}>{visual}</div>}
    </section>
  );
}

/** Mission patch: artwork, so never cropped. */
function Patch({ figure }: { figure: Figure }) {
  return (
    <figure className="flex flex-col items-start lg:items-center">
      <img src={figure.src} alt={figure.alt} loading="lazy" className="h-auto max-h-64 w-auto max-w-full object-contain md:max-h-72" />
      {figure.credit && (
        <figcaption className="mt-3 text-[10px] uppercase tracking-[0.12em] text-zinc-600">{figure.credit}</figcaption>
      )}
    </figure>
  );
}

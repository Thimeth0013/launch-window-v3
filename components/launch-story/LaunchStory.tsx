import Chapter from './Chapter';
import {
  aboardChapter,
  boosterChapter,
  destinationChapter,
  logChapter,
  missionChapter,
  newsChapter,
  padChapter,
  programChapter,
  recordsChapter,
  recoveryChapter,
  rocketChapter,
  timelineChapter,
  watchChapter,
  windowChapter,
} from './chapters';
import type { ChapterSpec, StoryContext } from './types';

// Everything on the launch detail page below the hero, told as a story in
// mission order: briefing first, live log last. A faint spine runs down the
// left; SlugScrollAnimator fills it as the reader scrolls (`data-story-progress`).

/* eslint-disable @typescript-eslint/no-explicit-any */

const BUILDERS = [
  missionChapter,
  rocketChapter,
  boosterChapter,
  aboardChapter,
  padChapter,
  windowChapter,
  timelineChapter,
  destinationChapter,
  recoveryChapter,
  recordsChapter,
  programChapter,
  newsChapter,
];

export default function LaunchStory({ launch, news = [] }: { launch: any; news?: any[] }) {
  const ctx: StoryContext = { launch, news };
  const chapters: ChapterSpec[] = BUILDERS.map((build) => build(ctx)).filter((c): c is ChapterSpec => c !== null);

  chapters.push(watchChapter(ctx));

  // The live log closes the story.
  chapters.push(logChapter(ctx));

  return (
    <div data-story className="relative">
      {/* Spine: a faint track with a soft blue fill that follows scroll
          progress. Deliberately quiet — it orients, it doesn't decorate. */}
      <div aria-hidden="true" className="absolute bottom-0 left-0 top-1 w-px bg-white/[0.07]">
        <div data-story-progress className="h-full w-full origin-top bg-[#18BBF7]/45" />
      </div>

      <div className="space-y-24 md:space-y-32">
        {chapters.map((spec, i) => (
          <Chapter key={spec.id} index={i + 1} spec={spec} />
        ))}
      </div>
    </div>
  );
}

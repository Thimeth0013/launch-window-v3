import type { ReactNode } from 'react';

/* eslint-disable @typescript-eslint/no-explicit-any */

/** The mission patch shown beside the briefing. */
export type Figure = { src: string; alt: string; credit?: string | null };

/** One step of the story. Builders return null when the launch has no data for it. */
export type ChapterSpec = {
  id: string;
  title: string;
  /** One or two sentences, data wrapped in <D>. Omit when the visual speaks for itself. */
  lede?: ReactNode;
  /** `prose` sets long passages (e.g. the mission description) at reading size. */
  ledeSize?: 'display' | 'prose';
  /** The same facts, shown rather than told. */
  visual?: ReactNode;
  /** Extra content in the sentence column, under the links (e.g. headline specs). */
  aside?: ReactNode;
  /**
   * Column split on large screens. `even` (default): sentence 5 / visual 7.
   * `text`: sentence 2/3, visual or photo 1/3 — for text-led chapters.
   */
  split?: 'even' | 'text';
  /** The mission patch — only the briefing chapter has one. */
  figure?: Figure | null;
  links?: Array<{ href: string; label: string }>;
  /** Visual spans the full width under the sentence instead of sitting beside it. */
  wide?: boolean;
};

export type StoryContext = {
  launch: any;
};

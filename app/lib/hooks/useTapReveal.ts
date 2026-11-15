'use client';

import { useCallback, useState, type MouseEvent } from 'react';

/**
 * Cards that reveal details on hover have nothing to hover on a phone —
 * Tailwind v4 only applies `hover:` where the device can hover, so the
 * details simply never appear. This toggles a `data-open` flag on tap for
 * touch devices; style the reveal with `group-data-[open=true]:…` next to the
 * existing `group-hover:…`. Mouse users are untouched (capability query, not
 * UA sniffing), and taps on the card's own links/buttons still act normally.
 */
export function useTapReveal() {
  const [open, setOpen] = useState(false);
  const onClick = useCallback((e: MouseEvent<HTMLElement>) => {
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if ((e.target as HTMLElement).closest('a, button')) return;
    setOpen((o) => !o);
  }, []);
  return { 'data-open': open ? 'true' : 'false', onClick } as const;
}

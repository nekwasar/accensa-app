import React from 'react';

/**
 * The two measures this site uses. Anything that needs a width picks one of
 * these rather than inventing its own, which is what let the left edge drift
 * between sections and between routes.
 *
 * `full`   - fluid to the viewport. Marketing sections and data-dense views,
 *            where more horizontal room is useful and there is no long line of
 *            prose to keep readable.
 * `narrow` - capped. Reading and form routes, where an unbounded line length
 *            on a wide monitor is actively worse.
 *
 * Prose inside a `full` container may still cap itself (`max-w-2xl` on a
 * paragraph); that is a measure constraint on a line of text, not a page
 * container, and the two are not in conflict.
 */
export type PageWidth = 'full' | 'narrow';

const WIDTHS: Record<PageWidth, string> = {
  full: 'w-full',
  narrow: 'max-w-3xl',
};

export function PageContainer({
  width = 'full',
  className = '',
  children,
}: {
  width?: PageWidth;
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={`${WIDTHS[width]} mx-auto ${className}`}>{children}</div>;
}

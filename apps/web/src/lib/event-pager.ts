import type { RawEvent } from './stellar-events';

/** Events requested per `getEvents` call. The RPC caps this server-side. */
export const EVENTS_PAGE_LIMIT = 200;

/** One page of `getEvents` output. */
export interface EventPage {
 events: RawEvent[];
 /** Opaque cursor for the next page. Absent once the range is exhausted. */
 cursor?: string;
}

export interface DrainResult {
 events: RawEvent[];
 /**
 * True when the range was consumed to the end. False when paging stopped
 * early against the deadline, which means the final ledger seen may be only
 * partially consumed and the sync cursor must not advance past it.
 */
 drained: boolean;
 /** Number of RPC round trips made. */
 pages: number;
}

/**
 * Ledgers covered by a single `getEvents` request.
 *
 * Soroban RPC bounds how much history one call will scan, and it does not fail
 * loudly when a range exceeds that bound: asked for 100,000 ledgers it returns
 * an empty page with a cursor, or `[-32001] request exceeded processing limit
 * threshold`, depending on load. An empty page is indistinguishable from"no
 * payments here", which is how a backlog turns into silent data loss. Every
 * request is therefore bounded to a window the RPC will actually scan.
 *
 * Measured against testnet: 10,000 ledgers answers in ~3.4s, and a 45s budget
 * covers more than the RPC's whole retention window in one invocation.
 */
export const LEDGER_WINDOW = 10_000;

/**
 * Reads every page of one bounded `getEvents` window.
 *
 * `getEvents` returns at most one page per call. Taking only the first page and
 * then advancing the sync cursor past it silently discards the remainder --
 * payments that exist on chain but never reach the merchant's ledger. So this
 * follows the cursor until the window is exhausted.
 *
 * `withinBudget` bounds the work: a serverless invocation has a wall clock
 * limit, and a busy window can exceed it. When the budget runs out mid-window
 * the caller is told, via `drained: false`, that it is holding a partial result.
 */
export async function drainEvents(
 fetchPage: (params: {
 startLedger?: number;
 endLedger?: number;
 cursor?: string;
 }) => Promise<EventPage>,
 opts: { startLedger: number; endLedger?: number; withinBudget?: () => boolean },
): Promise<DrainResult> {
 const { startLedger, endLedger, withinBudget } = opts;
 const events: RawEvent[] = [];
 let cursor: string | undefined;
 let pages = 0;

 for (;;) {
 // A cursor supersedes startLedger; sending both is rejected by the RPC.
 const page = await fetchPage(cursor ? { cursor } : { startLedger, endLedger });
 pages++;
 events.push(...page.events);

 // Within a bounded window a short page really does mean exhausted. Trusting
 // the cursor alone would loop forever against an RPC that always returns one.
 if (page.events.length < EVENTS_PAGE_LIMIT) return { events, drained: true, pages };

 const next = page.cursor ?? page.events[page.events.length - 1]?.id;
 if (!next) return { events, drained: true, pages };
 cursor = next;

 if (withinBudget && !withinBudget()) return { events, drained: false, pages };
 }
}

export interface SweepResult {
 events: RawEvent[];
 /**
  * The last ledger known to be fully consumed, and so the furthest the sync
  * cursor may advance. Only ever a completed window boundary, so it is safe
  * whether or not the sweep finished.
  */
 sweptThrough: number;
 /** True when the sweep reached `endLedger` rather than stopping on budget. */
 complete: boolean;
 pages: number;
 windows: number;
}

/**
 * Sweeps `[startLedger, endLedger]` in windows the RPC will honour.
 *
 * The cursor advances only across whole windows. A window abandoned against the
 * budget contributes its events -- the payments upsert is idempotent, so they
 * cost nothing to see twice -- but never moves `sweptThrough`, so the next run
 * re-reads it from the start rather than stepping over the part it never saw.
 */
export async function sweepLedgerRange(
 fetchPage: (params: {
 startLedger?: number;
 endLedger?: number;
 cursor?: string;
 }) => Promise<EventPage>,
 opts: {
 startLedger: number;
 endLedger: number;
 windowSize?: number;
 withinBudget?: () => boolean;
 },
): Promise<SweepResult> {
 const { startLedger, endLedger, windowSize = LEDGER_WINDOW, withinBudget } = opts;
 const events: RawEvent[] = [];
 let sweptThrough = startLedger - 1;
 let pages = 0;
 let windows = 0;

 while (sweptThrough < endLedger) {
 if (withinBudget && !withinBudget()) {
 return { events, sweptThrough, complete: false, pages, windows };
 }

 const from = sweptThrough + 1;
 const to = Math.min(from + windowSize - 1, endLedger);
 const window = await drainEvents(fetchPage, {
 startLedger: from,
 endLedger: to,
 withinBudget,
 });

 windows++;
 pages += window.pages;
 events.push(...window.events);

 if (!window.drained) {
 return { events, sweptThrough, complete: false, pages, windows };
 }
 sweptThrough = to;
 }

 return { events, sweptThrough, complete: true, pages, windows };
}

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
 * Reads every page of a `getEvents` range.
 *
 * `getEvents` returns at most one page per call. Taking only the first page and
 * then advancing the sync cursor past it silently discards the remainder --
 * payments that exist on chain but never reach the merchant's ledger. So this
 * follows the cursor until the range is exhausted.
 *
 * `withinBudget` bounds the work: a serverless invocation has a wall clock
 * limit, and a large backlog can exceed it. When the budget runs out mid-range
 * the caller is told, via `drained: false`, that it is holding a partial result.
 */
export async function drainEvents(
 fetchPage: (params: { startLedger?: number; cursor?: string }) => Promise<EventPage>,
 opts: { startLedger: number; withinBudget?: () => boolean },
): Promise<DrainResult> {
 const { startLedger, withinBudget } = opts;
 const events: RawEvent[] = [];
 let cursor: string | undefined;
 let pages = 0;

 for (;;) {
 // A cursor supersedes startLedger; sending both is rejected by the RPC.
 const page = await fetchPage(cursor ? { cursor } : { startLedger });
 pages++;
 events.push(...page.events);

 // A short page means the range is exhausted, whether or not a cursor came
 // back with it. Trusting the cursor alone would loop forever against an
 // RPC that always returns one.
 if (page.events.length < EVENTS_PAGE_LIMIT) return { events, drained: true, pages };

 const next = page.cursor ?? page.events[page.events.length - 1]?.id;
 if (!next) return { events, drained: true, pages };
 cursor = next;

 if (withinBudget && !withinBudget()) return { events, drained: false, pages };
 }
}

/**
 * The ledger the sync cursor may safely advance to.
 *
 * Events arrive in ledger order, so a partial read ends somewhere inside a
 * ledger rather than on a boundary. Advancing to that ledger would skip the
 * events in it that were never fetched, and nothing would ever look at that
 * range again. Stopping one short replays it instead -- the payments upsert is
 * idempotent, so replay costs a little work and loses nothing.
 *
 * Returns `startLedger - 1` (no progress) when nothing decodable was seen,
 * never a value below it.
 */
export function safeCursorLedger(
 maxLedgerSeen: number,
 drained: boolean,
 startLedger: number,
): number {
 const floor = startLedger - 1;
 if (maxLedgerSeen < startLedger) return floor;
 return Math.max(floor, drained ? maxLedgerSeen : maxLedgerSeen - 1);
}

import { describe, it, expect } from 'vitest';
import { drainEvents, safeCursorLedger, EVENTS_PAGE_LIMIT, type EventPage } from './event-pager';
import type { RawEvent } from './stellar-events';

/** Builds `count` events spread across ledgers, ids ascending from `from`. */
function makeEvents(count: number, ledgerOf: (i: number) => number, from = 0): RawEvent[] {
 return Array.from({ length: count }, (_, i) => ({
 id: `evt-${from + i}`,
 txHash: `tx-${from + i}`,
 ledger: ledgerOf(from + i),
 }));
}

/** A fake RPC that serves a fixed event list in pages of EVENTS_PAGE_LIMIT. */
function pagedSource(all: RawEvent[], opts: { omitCursor?: boolean } = {}) {
 const calls: Array<{ startLedger?: number; cursor?: string }> = [];
 const fetchPage = async (params: { startLedger?: number; cursor?: string }): Promise<EventPage> => {
 calls.push(params);
 const offset = params.cursor ? all.findIndex((e) => e.id === params.cursor) + 1 : 0;
 const events = all.slice(offset, offset + EVENTS_PAGE_LIMIT);
 const cursor = events.length ? events[events.length - 1].id : undefined;
 return opts.omitCursor ? { events } : { events, cursor };
 };
 return { fetchPage, calls };
}

describe('drainEvents', () => {
 it('returns a single short page without asking for more', async () => {
 const { fetchPage, calls } = pagedSource(makeEvents(4, () => 100));

 const result = await drainEvents(fetchPage, { startLedger: 100 });

 expect(result.events).toHaveLength(4);
 expect(result.drained).toBe(true);
 expect(result.pages).toBe(1);
 expect(calls).toEqual([{ startLedger: 100 }]);
 });

 it('follows the cursor across every page', async () => {
 // 512 events => 200 + 200 + 112, i.e. three pages.
 const all = makeEvents(512, (i) => 100 + Math.floor(i / 10));
 const { fetchPage, calls } = pagedSource(all);

 const result = await drainEvents(fetchPage, { startLedger: 100 });

 expect(result.events).toHaveLength(512);
 expect(result.pages).toBe(3);
 expect(result.drained).toBe(true);
 // The first call ranges by ledger, every later one by cursor - never both.
 expect(calls[0]).toEqual({ startLedger: 100 });
 expect(calls[1]).toEqual({ cursor: 'evt-199' });
 expect(calls[2]).toEqual({ cursor: 'evt-399' });
 });

 it('does not drop events that straddle a page boundary', async () => {
 // Every event sits in ledger 500, so a naive single-page read would take
 // 200 of them and then advance the sync cursor past ledger 500 entirely.
 const all = makeEvents(250, () => 500);
 const { fetchPage } = pagedSource(all);

 const result = await drainEvents(fetchPage, { startLedger: 500 });

 expect(result.events).toHaveLength(250);
 expect(result.events.map((e) => e.txHash)).toContain('tx-249');
 });

 it('falls back to the last event id when the page carries no cursor', async () => {
 const all = makeEvents(300, () => 100);
 const { fetchPage, calls } = pagedSource(all, { omitCursor: true });

 const result = await drainEvents(fetchPage, { startLedger: 100 });

 expect(result.events).toHaveLength(300);
 expect(calls[1]).toEqual({ cursor: 'evt-199' });
 });

 it('stops on a full page that yields no cursor, rather than looping', async () => {
 const fetchPage = async (): Promise<EventPage> => ({
 events: Array.from({ length: EVENTS_PAGE_LIMIT }, () => ({ ledger: 1 })),
 });

 const result = await drainEvents(fetchPage, { startLedger: 1 });

 expect(result.pages).toBe(1);
 expect(result.events).toHaveLength(EVENTS_PAGE_LIMIT);
 });

 it('reports a partial read when the budget runs out', async () => {
 const all = makeEvents(1000, (i) => 100 + i);
 const { fetchPage } = pagedSource(all);
 let calls = 0;

 const result = await drainEvents(fetchPage, {
 startLedger: 100,
 withinBudget: () => ++calls < 2,
 });

 expect(result.drained).toBe(false);
 expect(result.pages).toBe(2);
 expect(result.events).toHaveLength(400);
 });
});

describe('safeCursorLedger', () => {
 it('advances to the last ledger seen on a complete read', () => {
 expect(safeCursorLedger(520, true, 500)).toBe(520);
 });

 it('stops one short on a partial read, so the split ledger is replayed', () => {
 expect(safeCursorLedger(520, false, 500)).toBe(519);
 });

 it('makes no progress when nothing decodable was seen', () => {
 expect(safeCursorLedger(0, true, 500)).toBe(499);
 expect(safeCursorLedger(0, false, 500)).toBe(499);
 });

 it('never regresses below the start of the range', () => {
 // A partial read whose only ledger is the first in range must not rewind.
 expect(safeCursorLedger(500, false, 500)).toBe(499);
 expect(safeCursorLedger(499, true, 500)).toBe(499);
 });
});

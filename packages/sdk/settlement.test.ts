import { describe, it, expect } from 'vitest';
import { parseSettlementHeader, settlementFromResult, routeFromResourceUrl } from './settlement';

const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64');

const settled = {
  success: true,
  transaction: 'a'.repeat(64),
  network: 'stellar:testnet',
  payer: 'GAQW' + 'A'.repeat(52),
  amount: '1000',
};

describe('parseSettlementHeader', () => {
  it('decodes a base64 x402 settle response', () => {
    expect(parseSettlementHeader(encode(settled))).toEqual(settled);
  });

  it('tolerates surrounding whitespace', () => {
    expect(parseSettlementHeader(`  ${encode(settled)}  `)).toEqual(settled);
  });

  it('keeps a failed settlement rather than discarding it', () => {
    // The caller decides what a failure means; parsing only reports what x402 said.
    const failure = { success: false, transaction: '', errorReason: 'insufficient_funds' };
    expect(parseSettlementHeader(encode(failure))).toMatchObject({
      success: false,
      errorReason: 'insufficient_funds',
    });
  });

  it('omits optional fields that are absent', () => {
    const minimal = { success: true, transaction: 'b'.repeat(64) };
    expect(parseSettlementHeader(encode(minimal))).toEqual({
      success: true,
      transaction: 'b'.repeat(64),
      network: undefined,
      payer: undefined,
      amount: undefined,
      errorReason: undefined,
    });
  });

  it('ignores optional fields of the wrong type', () => {
    const odd = { success: true, transaction: 'c'.repeat(64), payer: 42, amount: null };
    expect(parseSettlementHeader(encode(odd))).toMatchObject({
      payer: undefined,
      amount: undefined,
    });
  });

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['empty string', ''],
    ['whitespace', '   '],
  ])('returns null for %s', (_label, input) => {
    expect(parseSettlementHeader(input as string | undefined | null)).toBeNull();
  });

  it('returns null when the payload is not valid JSON', () => {
    expect(parseSettlementHeader(Buffer.from('not json').toString('base64'))).toBeNull();
  });

  it('returns null for a JSON array', () => {
    expect(parseSettlementHeader(encode([1, 2, 3]))).toBeNull();
  });

  it('returns null for a JSON primitive', () => {
    expect(parseSettlementHeader(encode('nope'))).toBeNull();
  });

  it('returns null when success is missing', () => {
    expect(parseSettlementHeader(encode({ transaction: 'd'.repeat(64) }))).toBeNull();
  });

  it('returns null when transaction is missing', () => {
    expect(parseSettlementHeader(encode({ success: true }))).toBeNull();
  });

  it('returns null when transaction is not a string', () => {
    expect(parseSettlementHeader(encode({ success: true, transaction: 12345 }))).toBeNull();
  });
});

describe('settlementFromResult', () => {
  const facts = { route: '/api/hello', method: 'get', requestId: 'req-1' };

  it('builds a settlement from a successful result', () => {
    expect(settlementFromResult(settled, facts)).toEqual({
      txHash: settled.transaction,
      route: '/api/hello',
      method: 'GET',
      requestId: 'req-1',
      payer: settled.payer,
      amount: '1000',
      network: 'stellar:testnet',
    });
  });

  it('normalises the method to upper case', () => {
    expect(settlementFromResult(settled, { ...facts, method: 'post' })?.method).toBe('POST');
  });

  it('drops an empty request id rather than storing a blank', () => {
    expect(settlementFromResult(settled, { ...facts, requestId: '  ' })?.requestId).toBeUndefined();
  });

  it('omits the request id when absent', () => {
    expect(
      settlementFromResult(settled, { route: '/x', method: 'GET' })?.requestId,
    ).toBeUndefined();
  });

  it('returns null for a failed settlement', () => {
    expect(settlementFromResult({ ...settled, success: false }, facts)).toBeNull();
  });

  it('returns null when there is no result at all', () => {
    expect(settlementFromResult(null, facts)).toBeNull();
    expect(settlementFromResult(undefined, facts)).toBeNull();
  });

  // The regression this whole module exists to prevent: the previous
  // implementation invented `mock_hash_<timestamp>` when it could not find a
  // hash, producing attribution rows that no ledger could ever confirm.
  it('never invents a transaction hash when one is missing', () => {
    expect(settlementFromResult({ success: true, transaction: '' }, facts)).toBeNull();
    expect(settlementFromResult({ success: true, transaction: '   ' }, facts)).toBeNull();
  });

  it('returns null without a route to attribute to', () => {
    expect(settlementFromResult(settled, { route: '', method: 'GET' })).toBeNull();
    expect(settlementFromResult(settled, { route: '   ', method: 'GET' })).toBeNull();
  });

  it('returns null without a method', () => {
    expect(settlementFromResult(settled, { route: '/x', method: '' })).toBeNull();
  });
});

describe('routeFromResourceUrl', () => {
  // x402 identifies the paid resource by absolute URL, not by path — this was
  // found by running a real payment end to end, where reading a `path` field
  // that does not exist produced an unattributable settlement.
  it('reduces an absolute resource URL to its path', () => {
    expect(routeFromResourceUrl('http://localhost:3001/api/hello')).toBe('/api/hello');
    expect(routeFromResourceUrl('https://api.example.com/v1/quotes')).toBe('/v1/quotes');
  });

  it('drops the query string and fragment', () => {
    expect(routeFromResourceUrl('https://x.dev/api/hello?a=1#frag')).toBe('/api/hello');
  });

  it('returns / for a bare origin', () => {
    expect(routeFromResourceUrl('https://x.dev')).toBe('/');
  });

  it('accepts a bare path unchanged', () => {
    expect(routeFromResourceUrl('/api/hello')).toBe('/api/hello');
  });

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['empty', ''],
    ['whitespace', '   '],
    ['a non-URL, non-path string', 'not a url'],
  ])('returns empty string for %s', (_label, input) => {
    expect(routeFromResourceUrl(input as string | undefined | null)).toBe('');
  });
});

import { describe, it, expect } from 'vitest';
import { parseSettlementReport } from './settlement-report';

const TX = 'a'.repeat(64);
const PAYER = 'G' + 'A'.repeat(55);

const valid = { tx_hash: TX, route: '/api/hello', method: 'GET' };

function expectError(body: unknown, match: RegExp) {
 const result = parseSettlementReport(body);
 expect(result.ok).toBe(false);
 if (!result.ok) expect(result.error).toMatch(match);
}

describe('parseSettlementReport', () => {
 it('accepts a minimal valid report', () => {
 const result = parseSettlementReport(valid);
 expect(result).toEqual({
 ok: true,
 report: { txHash: TX, route: '/api/hello', method: 'GET', requestId: null, payer: null },
 });
 });

 it('lower-cases the transaction hash so lookups match the indexer', () => {
 const result = parseSettlementReport({ ...valid, tx_hash: TX.toUpperCase() });
 expect(result.ok && result.report.txHash).toBe(TX);
 });

 it('upper-cases the method', () => {
 const result = parseSettlementReport({ ...valid, method: 'post' });
 expect(result.ok && result.report.method).toBe('POST');
 });

 it('carries through an optional request id and payer', () => {
 const result = parseSettlementReport({ ...valid, request_id: 'req-9', payer: PAYER });
 expect(result.ok && result.report).toMatchObject({ requestId: 'req-9', payer: PAYER });
 });

 it('treats a blank request id as absent', () => {
 const result = parseSettlementReport({ ...valid, request_id: ' ' });
 expect(result.ok && result.report.requestId).toBeNull();
 });

 it.each([
 ['a string', 'nope'],
 ['null', null],
 ['an array', []],
 ])('rejects a body that is %s', (_label, body) => {
 expectError(body, /JSON object/);
 });

 it.each([
 ['missing', undefined],
 ['too short', 'abc'],
 ['not hex', 'z'.repeat(64)],
 ['not a string', 12345],
 ])('rejects a tx_hash that is %s', (_label, tx_hash) => {
 expectError({ ...valid, tx_hash }, /tx_hash/);
 });

 // The reason this endpoint exists: mock hashes must never reach the database.
 it('rejects a fabricated mock hash', () => {
 expectError({ ...valid, tx_hash: `mock_hash_${Date.now()}` }, /tx_hash/);
 });

 it('rejects a missing route', () => {
 expectError({ tx_hash: TX, method: 'GET' }, /route is required/);
 });

 it('rejects an over-long route rather than truncating it', () => {
 expectError({ ...valid, route: '/' + 'a'.repeat(255) }, /at most 255/);
 });

 it('rejects an over-long request id rather than truncating it', () => {
 expectError({ ...valid, request_id: 'r'.repeat(65) }, /at most 64/);
 });

 it.each([['TRACE'], ['CONNECT'], ['nonsense'], ['']])('rejects the method %s', (method) => {
 expectError({ ...valid, method }, /method/);
 });

 it('rejects a payer that is not a Stellar account id', () => {
 expectError({ ...valid, payer: 'not-an-account' }, /Stellar account/);
 });

 it('rejects a non-string request id', () => {
 expectError({ ...valid, request_id: 5 }, /request_id/);
 });
});

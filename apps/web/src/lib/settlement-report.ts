/**
 * Validation for merchant-reported settlements arriving at /api/hook/settle.
 *
 * Kept separate from the route handler so the rules are unit-testable without a
 * database. Everything here is deliberately strict: this endpoint is the one
 * write path into `payments` that does not originate from the ledger, so a
 * malformed or over-long field must be rejected rather than normalized.
 */

export interface SettlementReport {
 txHash: string;
 route: string;
 method: string;
 requestId: string | null;
 payer: string | null;
}

export type ParseResult =
 | { ok: true; report: SettlementReport }
 | { ok: false; error: string };

/** Stellar transaction hashes are 32 bytes, hex-encoded. */
const TX_HASH = /^[0-9a-f]{64}$/i;

/** Stellar public keys: 56-character base32 starting with G. */
const ACCOUNT_ID = /^G[A-Z2-7]{55}$/;

const METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);

/** Column widths in the payments table; over-long input is an error, not a truncation. */
const MAX_ROUTE = 255;
const MAX_REQUEST_ID = 64;

export function parseSettlementReport(body: unknown): ParseResult {
 if (typeof body !== 'object' || body === null || Array.isArray(body)) {
 return { ok: false, error: 'Body must be a JSON object' };
 }

 const b = body as Record<string, unknown>;

 const txHash = typeof b.tx_hash === 'string' ? b.tx_hash.trim() : '';
 if (!TX_HASH.test(txHash)) {
 return { ok: false, error: 'tx_hash must be a hex-encoded 32-byte transaction hash' };
 }

 const route = typeof b.route === 'string' ? b.route.trim() : '';
 if (route === '') return { ok: false, error: 'route is required' };
 if (route.length > MAX_ROUTE) {
 return { ok: false, error: `route must be at most ${MAX_ROUTE} characters` };
 }

 const method = typeof b.method === 'string' ? b.method.trim().toUpperCase() : '';
 if (!METHODS.has(method)) {
 return { ok: false, error: 'method must be a standard HTTP method' };
 }

 let requestId: string | null = null;
 if (b.request_id !== undefined && b.request_id !== null) {
 if (typeof b.request_id !== 'string') {
 return { ok: false, error: 'request_id must be a string' };
 }
 const trimmed = b.request_id.trim();
 if (trimmed.length > MAX_REQUEST_ID) {
 return { ok: false, error: `request_id must be at most ${MAX_REQUEST_ID} characters` };
 }
 requestId = trimmed === '' ? null : trimmed;
 }

 // The payer is only ever a hint used to stage a not-yet-indexed payment; the
 // indexer overwrites it with the value read from the ledger. Reject a
 // malformed one rather than persisting a value that can never reconcile.
 let payer: string | null = null;
 if (b.payer !== undefined && b.payer !== null) {
 if (typeof b.payer !== 'string') {
 return { ok: false, error: 'payer must be a string' };
 }
 const trimmed = b.payer.trim();
 if (trimmed !== '' && !ACCOUNT_ID.test(trimmed)) {
 return { ok: false, error: 'payer must be a Stellar account ID' };
 }
 payer = trimmed === '' ? null : trimmed;
 }

 return { ok: true, report: { txHash: txHash.toLowerCase(), route, method, requestId, payer } };
}

/**
 * Constant-time-ish bearer token comparison.
 *
 * Length is compared first and the loop always runs to completion over the
 * expected token, so a mismatched byte does not short-circuit.
 */
export function bearerMatches(header: string | null, expected: string): boolean {
 if (!header || !expected) return false;
 const prefix = 'Bearer ';
 if (!header.startsWith(prefix)) return false;

 const provided = header.slice(prefix.length);
 if (provided.length !== expected.length) return false;

 let diff = 0;
 for (let i = 0; i < expected.length; i++) {
 diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
 }
 return diff === 0;
}

/**
 * Settlement extraction for x402 sellers.
 *
 * Route attribution is the one thing the ledger cannot tell you. A Stellar
 * Asset Contract `transfer` event carries payer, amount, and asset — it does
 * not carry the HTTP route that was paid for. That mapping exists only inside
 * the seller's process, at the moment x402 settles.
 *
 * So this module's job is narrow: take what the x402 layer actually reports and
 * turn it into a settlement record, or return null. It never invents a
 * transaction hash. An attribution record whose tx_hash cannot be matched
 * against a real on-chain transfer is worse than no record at all — it puts a
 * row in the merchant's payment history that no ledger will ever confirm.
 */

/** The response header x402 uses to report settlement back to the caller. */
export const SETTLEMENT_HEADER = 'X-PAYMENT-RESPONSE';

/**
 * The settle result reported by x402, narrowed to the fields we use.
 *
 * Declared structurally rather than imported from `@x402/core` so the SDK does
 * not take a hard dependency on a specific x402 major version.
 */
export interface X402SettleResult {
  success: boolean;
  transaction: string;
  network?: string;
  payer?: string;
  /** Atomic token units. Present for schemes where settled ≠ authorized. */
  amount?: string;
  errorReason?: string;
}

/** A settlement we are willing to attribute to a route. */
export interface Settlement {
  txHash: string;
  route: string;
  method: string;
  requestId?: string;
  payer?: string;
  amount?: string;
  network?: string;
}

export interface RequestFacts {
  route: string;
  method: string;
  requestId?: string;
}

function decodeBase64(value: string): string | null {
  try {
    if (typeof globalThis.Buffer !== 'undefined') {
      return globalThis.Buffer.from(value, 'base64').toString('utf8');
    }
    if (typeof globalThis.atob === 'function') {
      return globalThis.atob(value);
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Decodes the `X-PAYMENT-RESPONSE` header.
 *
 * x402 base64-encodes a JSON settle response into this header. Returns null for
 * anything we cannot read with confidence — absent, malformed, or not an
 * object. Callers treat null as "no settlement happened", which is the safe
 * reading: a request that was not paid for looks exactly the same.
 */
export function parseSettlementHeader(header: string | undefined | null): X402SettleResult | null {
  if (typeof header !== 'string' || header.trim() === '') return null;

  const json = decodeBase64(header.trim());
  if (json === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;

  const candidate = parsed as Record<string, unknown>;
  if (typeof candidate.success !== 'boolean') return null;
  if (typeof candidate.transaction !== 'string') return null;

  return {
    success: candidate.success,
    transaction: candidate.transaction,
    network: typeof candidate.network === 'string' ? candidate.network : undefined,
    payer: typeof candidate.payer === 'string' ? candidate.payer : undefined,
    amount: typeof candidate.amount === 'string' ? candidate.amount : undefined,
    errorReason: typeof candidate.errorReason === 'string' ? candidate.errorReason : undefined,
  };
}

/**
 * Combines an x402 settle result with the request it paid for.
 *
 * Returns null unless settlement actually succeeded and carries a transaction
 * hash — a failed settlement has no payment to attribute, and a success without
 * a hash cannot be reconciled against the chain.
 */
export function settlementFromResult(
  result: X402SettleResult | null | undefined,
  facts: RequestFacts,
): Settlement | null {
  if (!result || result.success !== true) return null;

  const txHash = typeof result.transaction === 'string' ? result.transaction.trim() : '';
  if (txHash === '') return null;

  const route = typeof facts.route === 'string' ? facts.route.trim() : '';
  const method = typeof facts.method === 'string' ? facts.method.trim().toUpperCase() : '';
  if (route === '' || method === '') return null;

  return {
    txHash,
    route,
    method,
    requestId: facts.requestId?.trim() || undefined,
    payer: result.payer,
    amount: result.amount,
    network: result.network,
  };
}

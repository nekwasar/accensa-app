import type { Request, Response, NextFunction } from 'express';
import {
  SETTLEMENT_HEADER,
  parseSettlementHeader,
  settlementFromResult,
  type RequestFacts,
  type Settlement,
  type X402SettleResult,
} from './settlement';

export { verifyReceipt } from './merkle';
export {
  SETTLEMENT_HEADER,
  parseSettlementHeader,
  settlementFromResult,
  type RequestFacts,
  type Settlement,
  type X402SettleResult,
} from './settlement';

/** Path the Accensa app exposes for merchant-reported route attribution. */
export const SETTLE_ENDPOINT = '/api/hook/settle';

export interface AccensaHookOptions {
  /** Base URL of your Accensa deployment, e.g. https://accensa-dashboard.vercel.app */
  indexerUrl: string;
  /** Shared secret; must match HOOK_API_KEY on the Accensa side. */
  apiKey: string;
  /** Injected in tests. Defaults to global fetch. */
  fetchImpl?: typeof fetch;
  /**
   * Called when reporting fails. Reporting is best-effort by design — a paid
   * request must not fail because attribution could not be recorded — but
   * failures should be visible rather than swallowed.
   */
  onError?: (error: unknown) => void;
}

/**
 * Reports one settlement to Accensa.
 *
 * Best-effort: resolves false rather than throwing, so a caller in a request
 * path can ignore the result safely.
 */
export async function reportSettlement(
  settlement: Settlement,
  opts: AccensaHookOptions,
): Promise<boolean> {
  const doFetch = opts.fetchImpl ?? globalThis.fetch;
  if (typeof doFetch !== 'function') {
    opts.onError?.(new Error('No fetch implementation available'));
    return false;
  }

  try {
    const response = await doFetch(`${opts.indexerUrl.replace(/\/$/, '')}${SETTLE_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${opts.apiKey}`,
      },
      body: JSON.stringify({
        tx_hash: settlement.txHash,
        route: settlement.route,
        method: settlement.method,
        request_id: settlement.requestId,
        payer: settlement.payer,
        amount: settlement.amount,
        network: settlement.network,
      }),
    });

    if (!response.ok) {
      opts.onError?.(new Error(`Accensa returned ${response.status} for ${settlement.txHash}`));
      return false;
    }
    return true;
  } catch (error) {
    opts.onError?.(error);
    return false;
  }
}

/**
 * Express middleware that reports route attribution for x402-paid requests.
 *
 * Reads the settlement from the `X-PAYMENT-RESPONSE` header the x402 middleware
 * sets, once the response is complete. Requests that were not paid for carry no
 * such header and are ignored.
 *
 * Mount this *after* your x402 payment middleware, so the header exists by the
 * time the response finishes.
 *
 * If your server uses `@x402/core`'s resource server directly, prefer
 * {@link createSettleHook} — it receives the settle result as ground truth
 * rather than reading it back off the wire.
 */
export function attachAccensaHook(opts: AccensaHookOptions) {
  return function accensaHook(req: Request, res: Response, next: NextFunction) {
    res.on('finish', () => {
      const header = res.getHeader(SETTLEMENT_HEADER);
      const settlement = settlementFromResult(
        parseSettlementHeader(typeof header === 'string' ? header : undefined),
        requestFacts(req),
      );
      if (settlement) void reportSettlement(settlement, opts);
    });

    next();
  };
}

/**
 * Builds an `onAfterSettle` handler for an x402 resource server.
 *
 * This is the preferred integration: the settle result arrives directly from
 * the facilitator, so nothing has to be parsed back out of a response.
 *
 * ```ts
 * resourceServer.onAfterSettle(createSettleHook({ indexerUrl, apiKey }));
 * ```
 */
export function createSettleHook(opts: AccensaHookOptions) {
  return async function onAfterSettle(ctx: {
    result: X402SettleResult;
    paymentPayload?: { path?: string; method?: string; requestId?: string };
  }): Promise<void> {
    const settlement = settlementFromResult(ctx.result, {
      route: ctx.paymentPayload?.path ?? '',
      method: ctx.paymentPayload?.method ?? 'GET',
      requestId: ctx.paymentPayload?.requestId,
    });
    if (settlement) await reportSettlement(settlement, opts);
  };
}

function requestFacts(req: Request): RequestFacts {
  const requestId = req.headers['x-request-id'];
  return {
    route: req.route?.path ?? req.path ?? '',
    method: req.method ?? '',
    requestId: Array.isArray(requestId) ? requestId[0] : requestId,
  };
}

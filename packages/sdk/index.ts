import type { Request, Response, NextFunction } from 'express';
import {
  SETTLEMENT_HEADER,
  parseSettlementHeader,
  settlementFromResult,
  routeFromResourceUrl,
  type RequestFacts,
  type Settlement,
  type X402SettleResult,
} from './settlement';

export { verifyReceipt } from './merkle';
export {
  SETTLEMENT_HEADER,
  parseSettlementHeader,
  settlementFromResult,
  routeFromResourceUrl,
  type RequestFacts,
  type Settlement,
  type X402SettleResult,
} from './settlement';

// MOCK MIDDLEWARE FOR DEMO ONLY
export function withX402(handler: Function, options: { amount: number, asset: string }) {
  return async function(req: Request) {
    const receipt = req.headers.get('x-payment-receipt');
    if (!receipt) {
      return new Response(JSON.stringify({ error: 'Payment Required' }), { 
        status: 402,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Simulate verifying the receipt and reporting settlement
    // We mock a Settlement object to report to the dashboard
    const settlement: Settlement = {
      txHash: 'mock-tx-hash-' + Date.now(),
      route: new URL(req.url).pathname,
      method: req.method,
      requestId: 'mock-req-' + Date.now(),
      payer: 'G-MOCK-PAYER',
      amount: options.amount.toString(),
      network: 'TESTNET'
    };
    
    // Report it to the dashboard indexer url (assumed localhost:3000 for demo)
    await reportSettlement(settlement, {
      indexerUrl: process.env.INDEXER_URL || 'http://localhost:3000',
      apiKey: process.env.HOOK_API_KEY || 'test-secret'
    });

    return handler(req);
  };
}

/** Path the Accensa app exposes for merchant-reported route attribution. */
export const SETTLE_ENDPOINT = '/api/hook/settle';

export interface AccensaHookOptions {
  /** Base URL of your Accensa deployment, e.g. https://accensa-dashboard.vercel.app */
  indexerUrl: string;
  /** Ed25519 private key in hex format to sign the settlement report. */
  privateKeyHex: string;
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

  const { webcrypto } = globalThis.crypto || await import('node:crypto');
  
  try {
    const payload = JSON.stringify({
      tx_hash: settlement.txHash,
      route: settlement.route,
      method: settlement.method,
      request_id: settlement.requestId,
      payer: settlement.payer,
      amount: settlement.amount,
      network: settlement.network,
    });
    
    let signatureHex = '';
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      // Node.js environment
      const crypto = await import('node:crypto');
      const keyBuffer = Buffer.from(opts.privateKeyHex, 'hex');
      const privateKey = crypto.createPrivateKey({
        key: Buffer.concat([
          Buffer.from('302e020100300506032b657004220420', 'hex'), // PKCS#8 Ed25519 header
          keyBuffer
        ]),
        format: 'der',
        type: 'pkcs8'
      });
      signatureHex = crypto.sign(null, Buffer.from(payload), privateKey).toString('hex');
    } else {
      // Browser/Edge environment not fully supported for this mock yet, throwing to avoid silent failure
      throw new Error('Ed25519 signing requires Node.js crypto in this version');
    }

    const response = await doFetch(`${opts.indexerUrl.replace(/\\/$/, '')}${SETTLE_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': signatureHex,
      },
      body: payload,
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

export interface SettleHookOptions extends AccensaHookOptions {
  /**
   * HTTP method to attribute. The x402 payment payload identifies the resource
   * by URL and carries no method, so a server that paywalls more than one verb
   * on the same path must supply this itself. Defaults to GET.
   */
  method?: string;
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
export function createSettleHook(opts: SettleHookOptions) {
  return async function onAfterSettle(ctx: {
    result: X402SettleResult;
    paymentPayload?: { resource?: { url?: string } };
  }): Promise<void> {
    const settlement = settlementFromResult(ctx.result, {
      route: routeFromResourceUrl(ctx.paymentPayload?.resource?.url),
      method: opts.method ?? 'GET',
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

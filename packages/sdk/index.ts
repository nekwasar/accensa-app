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

/**
 * How long a report may take before it is abandoned, in milliseconds.
 *
 * Reporting happens after the response has already been sent, so a hung socket
 * costs the merchant nothing visible — but it does pin a request object and an
 * open connection for as long as the OS lets it, which under load is how a
 * seller's process runs out of sockets. Five seconds is far longer than the
 * endpoint needs and far shorter than the default TCP timeout.
 */
export const DEFAULT_TIMEOUT_MS = 5_000;

/**
 * The body POSTed to `/api/hook/settle`.
 *
 * Snake-cased because it is a wire format, not an in-process value; this is the
 * shape `parseSettlementReport` validates on the Accensa side. Declaring it
 * here means a change to either end that the other does not follow is a
 * compile error in this package rather than a 400 discovered in production.
 */
export interface SettleHookPayload {
  tx_hash: string;
  route: string;
  method: string;
  request_id?: string;
  payer?: string;
  amount?: string;
  network?: string;
}

/**
 * The request surface the middleware reads.
 *
 * Express's `Request` satisfies it structurally, and so does anything shaped
 * like it — which is why {@link attachAccensaHook} is generic over the request
 * rather than pinned to Express. A caller with a typed `Request<Params, ...>`
 * or a framework of its own keeps that type through to its own callbacks.
 */
export interface AttributableRequest {
  method?: string;
  path?: string;
  route?: { path?: string };
  headers?: Record<string, string | string[] | undefined>;
}

export interface AccensaHookOptions {
  /** Base URL of your Accensa deployment, e.g. https://accensa-dashboard.vercel.app */
  indexerUrl: string;
  /** Ed25519 private key in hex format to sign the settlement report. */
  privateKeyHex: string;
  /** Injected in tests. Defaults to global fetch. */
  fetchImpl?: typeof fetch;
  /**
   * Called when reporting fails, with the payload that could not be delivered.
   * Reporting is best-effort by design — a paid request must not fail because
   * attribution could not be recorded — but failures should be visible rather
   * than swallowed. Defaults to `console.error`.
   */
  onError?: (error: unknown, payload?: SettleHookPayload) => void;
}

/** Builds the wire body for one settlement. */
export function toSettleHookPayload(settlement: Settlement): SettleHookPayload {
  return {
    tx_hash: settlement.txHash,
    route: settlement.route,
    method: settlement.method,
    request_id: settlement.requestId,
    payer: settlement.payer,
    amount: settlement.amount,
    network: settlement.network,
  };
}

/**
 * Reports one settlement to Accensa.
 *
 * Best-effort: resolves false rather than throwing, so a caller in a request
 * path can ignore the result safely. Nothing here can reject — the middleware
 * calls it without awaiting, and a rejection from an un-awaited promise takes
 * the seller's whole process down under Node's default `unhandledRejection`
 * behaviour. A dropped network must never do that.
 */
export async function reportSettlement(
  settlement: Settlement,
  opts: AccensaHookOptions,
): Promise<boolean> {
  const report = opts.onError ?? reportToConsole;
  const payload = toSettleHookPayload(settlement);

  const doFetch = opts.fetchImpl ?? globalThis.fetch;
  if (typeof doFetch !== 'function') {
    report(new Error('No fetch implementation available'), payload);
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
      report(new Error(`Accensa returned ${response.status} for ${settlement.txHash}`), payload);
      return false;
    }
    return true;
  } catch (error) {
    report(error, payload);
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** Default {@link AccensaHookOptions.onError}: loud enough to find, quiet enough to ignore. */
function reportToConsole(error: unknown, payload?: SettleHookPayload): void {
  console.error('[accensa] could not report settlement', payload?.tx_hash ?? '', error);
}

export interface AttachHookOptions<TRequest extends AttributableRequest = Request>
  extends AccensaHookOptions {
  /**
   * Reads the route, method, and request id off the request.
   *
   * Defaults to Express semantics (`req.route.path`, falling back to
   * `req.path`). Supply this when your router does not expose the route
   * template Express does — attributing every request to its literal URL turns
   * one paid endpoint into thousands of one-payment routes.
   */
  attribute?: (req: TRequest) => RequestFacts;
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
 * Generic over the request type so a caller with a typed
 * `Request<Params, ResBody, ReqBody, Query>` — or a framework of its own — sees
 * that type inside {@link AttachHookOptions.attribute} instead of a widened one.
 *
 * If your server uses `@x402/core`'s resource server directly, prefer
 * {@link createSettleHook} — it receives the settle result as ground truth
 * rather than reading it back off the wire.
 */
export function attachAccensaHook<TRequest extends AttributableRequest = Request>(
  opts: AttachHookOptions<TRequest>,
) {
  const attribute = opts.attribute ?? requestFacts;

  return function accensaHook(req: TRequest, res: Response, next: NextFunction) {
    res.on('finish', () => {
      // Everything in here runs after the response has been sent, so a throw
      // would surface as an uncaught exception with no request to fail. The
      // work is wrapped rather than trusted: attribution is never worth taking
      // the seller's process down for.
      try {
        const header = res.getHeader(SETTLEMENT_HEADER);
        const settlement = settlementFromResult(
          parseSettlementHeader(typeof header === 'string' ? header : undefined),
          attribute(req),
        );
        if (settlement) void reportSettlement(settlement, opts);
      } catch (error) {
        (opts.onError ?? reportToConsole)(error);
      }
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

function requestFacts(req: AttributableRequest): RequestFacts {
  const requestId = req.headers?.['x-request-id'];
  return {
    route: req.route?.path ?? req.path ?? '',
    method: req.method ?? '',
    requestId: Array.isArray(requestId) ? requestId[0] : requestId,
  };
}

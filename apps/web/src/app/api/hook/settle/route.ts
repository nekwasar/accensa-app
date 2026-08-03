import { NextResponse } from 'next/server';
import { withClient, ensureSchema, recordSettlement } from '@/lib/db';
import { parseSettlementReport, bearerMatches } from '@/lib/settlement-report';

export const dynamic = 'force-dynamic';

/**
 * Records route attribution reported by an x402 seller.
 *
 * A SAC `transfer` event carries payer, amount, and asset — never the HTTP
 * route that was paid for. That mapping exists only in the seller's process, so
 * it has to be reported rather than indexed. This is consequently the only
 * write path into `payments` that is not derived from the ledger, which is why
 * it fails closed: without HOOK_API_KEY configured the endpoint refuses to
 * accept anything at all.
 *
 * Ledger-owned fields (ledger, amount, asset, ts) are never written here.
 */
export async function POST(request: Request) {
  const expected = process.env.HOOK_API_KEY;
  if (!expected) {
    return NextResponse.json(
      { error: 'Settlement reporting is not configured' },
      { status: 503 },
    );
  }

  if (!bearerMatches(request.headers.get('authorization'), expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'DATABASE_URL is not configured' }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be JSON' }, { status: 400 });
  }

  const parsed = parseSettlementReport(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const { matchedExistingPayment } = await withClient(async (client) => {
      await ensureSchema(client);
      return recordSettlement(client, parsed.report);
    });

    return NextResponse.json({
      recorded: true,
      txHash: parsed.report.txHash,
      // False means the transfer has not been indexed yet and the attribution
      // was staged. The sync job completes the row when it reaches that ledger.
      matchedExistingPayment,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Could not record settlement: ${message}` }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { withClient, ensureSchema, getSyncState } from '@/lib/db';
import type { SyncState } from '@/lib/sync-status';

export const dynamic = 'force-dynamic';

export interface PaymentRow {
 tx_hash: string;
 ledger: number | null;
 payer: string;
 /** Decimal string. Deliberately not a number - see below. */
 amount: string;
 asset: string | null;
 ts: string;
 route: string | null;
 method: string | null;
}

export interface PaymentsResponse {
 payments: PaymentRow[];
 /** Null until the indexer has run at least once. */
 sync: SyncState | null;
 next_cursor?: string | null;
}

export async function GET(request: Request) {
 if (!process.env.DATABASE_URL) {
 return NextResponse.json({ error: 'DATABASE_URL is not configured' }, { status: 500 });
 }

 const { searchParams } = new URL(request.url);
 const limit = Math.min(Number(searchParams.get('limit') || '100'), 1000);
 const cursor = searchParams.get('cursor');

 try {
 const { rows, sync } = await withClient(async (client) => {
 await ensureSchema(client);
 
 let query = `SELECT tx_hash, ledger, payer, amount::text AS amount, asset, ts, route, method FROM payments WHERE ts IS NOT NULL`;
 const params: (string | number)[] = [];
 
 if (cursor) {
  const [ts, txHash] = Buffer.from(cursor, 'base64').toString().split('|');
  query += ` AND (ts < $1 OR (ts = $1 AND tx_hash < $2))`;
  params.push(ts, txHash);
 }
 
 query += ` ORDER BY ts DESC, tx_hash DESC LIMIT $${params.length + 1}`;
 params.push(limit);

 const result = await client.query(query, params);
 return { rows: result.rows, sync: await getSyncState(client) };
 });

 const next_cursor = rows.length === limit ? Buffer.from(`${(rows[rows.length - 1].ts instanceof Date ? rows[rows.length - 1].ts.toISOString() : rows[rows.length - 1].ts)}|${rows[rows.length - 1].tx_hash}`).toString('base64') : null;

 const body: PaymentsResponse = {
 payments: rows.map(
 (row): PaymentRow => ({
 tx_hash: row.tx_hash,
 ledger: row.ledger === null ? null : Number(row.ledger),
 payer: row.payer,
 amount: String(row.amount),
 asset: row.asset,
 ts: row.ts instanceof Date ? row.ts.toISOString() : String(row.ts),
 route: row.route,
 method: row.method,
 }),
 ),
 sync,
 next_cursor,
 };
 return NextResponse.json(body);
 } catch (error: unknown) {
 const message = error instanceof Error ? error.message : 'Unknown error';
 return NextResponse.json({ error: message }, { status: 500 });
 }
}

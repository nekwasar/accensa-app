import { NextResponse } from 'next/server';
import { withClient, ensureSchema } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
 if (!process.env.DATABASE_URL) {
 return NextResponse.json({ error: 'DATABASE_URL is not configured' }, { status: 500 });
 }

 const { searchParams } = new URL(request.url);
 const from = searchParams.get('from');
 const to = searchParams.get('to');

 try {
 const rows = await withClient(async (client) => {
 await ensureSchema(client);
 let query = `
 SELECT COALESCE(route, '(unattributed)') as route, method, SUM(amount) as total_revenue, COUNT(*) as calls
 FROM payments
 WHERE ts IS NOT NULL
 `;
 const params: any[] = [];
 
 if (from) {
 params.push(from);
 query += ` AND ts >= $${params.length}`;
 }
 if (to) {
 params.push(to);
 query += ` AND ts <= $${params.length}`;
 }
 
 query += ` GROUP BY route, method ORDER BY total_revenue DESC`;

 const result = await client.query(query, params);
 return result.rows;
 });

 return NextResponse.json(rows.map(r => ({ ...r, total_revenue: String(r.total_revenue), calls: Number(r.calls) })));
 } catch (error: unknown) {
 const message = error instanceof Error ? error.message : 'Unknown error';
 return NextResponse.json({ error: message }, { status: 500 });
 }
}

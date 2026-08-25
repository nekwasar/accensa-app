import { NextResponse } from 'next/server';
import { withClient, ensureSchema } from '@/lib/db';

export const dynamic = 'force-dynamic';

function isValidTimestamp(value: string): boolean {
  if (value.trim() === '') return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'DATABASE_URL is not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (from && !isValidTimestamp(from)) {
    return NextResponse.json({ error: 'from must be a valid ISO 8601 timestamp' }, { status: 400 });
  }
  if (to && !isValidTimestamp(to)) {
    return NextResponse.json({ error: 'to must be a valid ISO 8601 timestamp' }, { status: 400 });
  }
  if (from && to && new Date(from) > new Date(to)) {
    return NextResponse.json({ error: 'from must not be later than to' }, { status: 400 });
  }

  try {
    const rows = await withClient(async (client) => {
      await ensureSchema(client);
      let query = `
        SELECT COALESCE(route, '(unattributed)') as route, method, SUM(amount) as total_revenue, COUNT(*) as calls
        FROM payments
        WHERE ts IS NOT NULL
      `;
      const params: string[] = [];

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

    return NextResponse.json(
      rows.map((r) => ({ ...r, total_revenue: String(r.total_revenue), calls: Number(r.calls) })),
    );
  } catch (error: unknown) {
    console.error('Error fetching routes:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

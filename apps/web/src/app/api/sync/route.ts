import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ success: true, message: 'Sync logic migrated to background worker' });
}

export async function POST() {
  return NextResponse.json({ success: true, message: 'Sync logic migrated to background worker' });
}

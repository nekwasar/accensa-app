import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const secretKey = process.env.JWT_SECRET_KEY || 'default_secret_key_for_development';
const key = new TextEncoder().encode(secretKey);

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Define public and private paths
  const isPublicApi = path.startsWith('/api/verify') || path.startsWith('/api/auth');
  const isCronSync = path === '/api/sync' && request.method === 'GET';
  const isPrivateApi = path.startsWith('/api/') && !isPublicApi && !isCronSync;
  const isDashboard = path.startsWith('/dashboard');

  if (isPrivateApi || isDashboard) {
    const sessionCookie = request.cookies.get('accensa_session')?.value;
    if (!sessionCookie) {
      if (isPrivateApi) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
      await jwtVerify(sessionCookie, key, { algorithms: ['HS256'] });
      return NextResponse.next();
    } catch {
      if (isPrivateApi) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Enforce CRON_SECRET for GET /api/sync
  if (isCronSync) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
};

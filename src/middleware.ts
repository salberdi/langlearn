import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);

const locales = routing.locales as readonly string[];

// Paths that bypass auth (but still need locale detection)
const publicPaths = [
  '/api/auth',
  '/api/cron',
  '/api/admin',
  '/api/languages',
  '/auth/signin',
  '/_next/static',
  '/_next/image',
  '/favicon.ico',
  '/manifest.json',
  '/fonts',
];

/** Strip leading locale prefix, e.g. /en/auth/signin → /auth/signin */
function stripLocalePrefix(pathname: string): string {
  for (const locale of locales) {
    const prefix = `/${locale}`;
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return pathname.slice(prefix.length) || '/';
    }
  }
  return pathname;
}

function isPublicPath(pathname: string) {
  const bare = stripLocalePrefix(pathname);
  return publicPaths.some((p) => bare.startsWith(p));
}

function isApiPath(pathname: string) {
  return pathname.startsWith('/api/');
}

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // API routes: skip intl, just do auth
  if (isApiPath(pathname)) {
    if (!isPublicPath(pathname)) {
      const token = await getToken({ req });
      if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
    return NextResponse.next();
  }

  // Static assets: pass through
  if (pathname.startsWith('/_next/') || pathname === '/favicon.ico' || pathname === '/manifest.json') {
    return NextResponse.next();
  }

  // Public pages (signin): apply intl but skip auth
  if (isPublicPath(pathname)) {
    return intlMiddleware(req);
  }

  // Protected pages: auth first, then intl
  const token = await getToken({ req });
  if (!token) {
    const signInUrl = new URL('/auth/signin', req.url);
    return NextResponse.redirect(signInUrl);
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|fonts).*)',
  ],
};

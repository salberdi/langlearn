import { NextResponse } from 'next/server';
import NextAuth from 'next-auth';
import createIntlMiddleware from 'next-intl/middleware';
import { authConfig } from '@/auth.config';
import { routing } from '@/i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);

const { auth } = NextAuth(authConfig);

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

function isPublicPath(pathname: string) {
  return publicPaths.some((p) => pathname.startsWith(p));
}

function isApiPath(pathname: string) {
  return pathname.startsWith('/api/');
}

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // API routes: skip intl, just do auth
  if (isApiPath(pathname)) {
    if (!req.auth && !isPublicPath(pathname)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
  if (!req.auth) {
    const signInUrl = new URL('/auth/signin', req.url);
    return NextResponse.redirect(signInUrl);
  }

  return intlMiddleware(req);
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|fonts).*)',
  ],
};

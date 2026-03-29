import { NextResponse } from 'next/server';
import { auth } from '@/auth';

export default auth((req) => {
  if (!req.auth) {
    if (req.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const signInUrl = new URL('/auth/signin', req.url);
    return NextResponse.redirect(signInUrl);
  }
  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!api/auth|api/cron|api/admin|api/languages|auth/signin|_next/static|_next/image|favicon.ico|manifest.json|fonts).*)',
  ],
};

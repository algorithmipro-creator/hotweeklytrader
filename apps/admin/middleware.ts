import { NextRequest, NextResponse } from 'next/server';
import { shouldRedirectFromLogin, shouldRedirectToLogin } from './src/lib/auth-routing.js';

const LOGIN_PATH = '/login';
const ADMIN_TOKEN_KEY = 'admin_token';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    pathname.startsWith('/api')
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(ADMIN_TOKEN_KEY)?.value;

  if (pathname === LOGIN_PATH) {
    if (shouldRedirectFromLogin(token)) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  if (shouldRedirectToLogin(token)) {
    return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};

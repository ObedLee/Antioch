import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public paths that don't require authentication
const PUBLIC_PATHS = ['/login', '/_next', '/api', '/favicon.ico', '/fonts', '/'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  console.log(`[Middleware] 요청 경로: ${pathname}`);
  
  // Skip middleware for public paths
  if (PUBLIC_PATHS.some(path => pathname === path || pathname.startsWith(`${path}/`))) {
    console.log(`[Middleware] 공개 경로 감지, 미들웨어 스킵: ${pathname}`);
    return NextResponse.next();
  }

  // Check for auth token with improved handling
  const sessionToken = request.cookies.get('__session')?.value;
  const firebaseToken = request.cookies.get('firebase-auth-token')?.value;
  
  console.log(`[Middleware] 세션 토큰: ${!!sessionToken}, Firebase 토큰: ${!!firebaseToken}`);
  
  // More lenient auth check - allow if either token exists
  const hasValidAuth = sessionToken || firebaseToken;
  
  // If no auth tokens and trying to access protected route, redirect to login
  if (!hasValidAuth && pathname.startsWith('/dashboard')) {
    // Add a small delay to prevent race conditions
    const response = NextResponse.next();
    response.headers.set('x-auth-check', 'pending');
    
    // Only redirect if we're sure there's no auth
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    console.log(`[Middleware] 인증 없음, 리디렉트: ${loginUrl.toString()}`);
    return NextResponse.redirect(loginUrl);
  }

  console.log(`[Middleware] 인증 확인 완료, 접근 허용: ${pathname}`);
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*']
};

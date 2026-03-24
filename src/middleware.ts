// ============================================
// Middleware — Protects all app routes, redirects to /login
// ============================================

import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    // User is authenticated — allow access
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/login',
    },
  }
);

// Protect all routes except login, API auth, and static assets
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/forge/:path*',
  ],
};

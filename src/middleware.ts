import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJWT } from '@/lib/jwt';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Retrieve token cookie
  const token = request.cookies.get('token')?.value;

  const isAuthRoute = path.startsWith('/auth/login') || path.startsWith('/auth/register');
  const isEmployeeRoute = path.startsWith('/employee');
  const isCanteenRoute = path.startsWith('/canteen');
  const isAdminRoute = path.startsWith('/admin');
  const isRootRoute = path === '/';

  // If root route is hit
  if (isRootRoute) {
    if (!token) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
    const jwtSecret = process.env.JWT_SECRET || 'fallback-jwt-secret-string-do-not-use-in-prod';
    const payload = await verifyJWT(token, jwtSecret);
    if (!payload) {
      // Clear invalid token cookie and redirect
      const response = NextResponse.redirect(new URL('/auth/login', request.url));
      response.cookies.delete('token');
      return response;
    }

    if (payload.role === 'ADMIN') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    } else if (payload.role === 'CANTEEN') {
      return NextResponse.redirect(new URL('/canteen/dashboard', request.url));
    } else {
      return NextResponse.redirect(new URL('/employee/dashboard', request.url));
    }
  }

  // Handle Auth Routes (login/register)
  if (isAuthRoute) {
    if (token) {
      const jwtSecret = process.env.JWT_SECRET || 'fallback-jwt-secret-string-do-not-use-in-prod';
      const payload = await verifyJWT(token, jwtSecret);
      if (payload) {
        if (payload.role === 'ADMIN') {
          return NextResponse.redirect(new URL('/admin/dashboard', request.url));
        } else if (payload.role === 'CANTEEN') {
          return NextResponse.redirect(new URL('/canteen/dashboard', request.url));
        } else {
          return NextResponse.redirect(new URL('/employee/dashboard', request.url));
        }
      }
    }
    return NextResponse.next();
  }

  // Handle protected dashboards
  if (isEmployeeRoute || isCanteenRoute || isAdminRoute) {
    if (!token) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    const jwtSecret = process.env.JWT_SECRET || 'fallback-jwt-secret-string-do-not-use-in-prod';
    const payload = await verifyJWT(token, jwtSecret);

    if (!payload) {
      const response = NextResponse.redirect(new URL('/auth/login', request.url));
      response.cookies.delete('token');
      return response;
    }

    // Role verification
    if (isEmployeeRoute && payload.role !== 'EMPLOYEE') {
      return redirectBasedOnRole(payload.role, request);
    }

    if (isCanteenRoute && payload.role !== 'CANTEEN') {
      return redirectBasedOnRole(payload.role, request);
    }

    if (isAdminRoute && payload.role !== 'ADMIN') {
      return redirectBasedOnRole(payload.role, request);
    }
  }

  return NextResponse.next();
}

function redirectBasedOnRole(role: string, request: NextRequest) {
  if (role === 'ADMIN') {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  } else if (role === 'CANTEEN') {
    return NextResponse.redirect(new URL('/canteen/dashboard', request.url));
  } else {
    return NextResponse.redirect(new URL('/employee/dashboard', request.url));
  }
}

// Ensure the middleware intercepts all specified routes, excluding asset files and API routes
export const config = {
  matcher: [
    '/',
    '/auth/login',
    '/auth/register',
    '/employee/:path*',
    '/canteen/:path*',
    '/admin/:path*',
  ],
};

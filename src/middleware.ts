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
  const isCashierRoute = path.startsWith('/cashier');
  const isAdminRoute = path.startsWith('/admin');
  const isSuperAdminRoute = path.startsWith('/superadmin');
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

    if (payload.role === 'SUPERADMIN' || payload.role === 'ADMIN' || payload.role === 'LIVE_ADMIN') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    } else if (payload.role === 'CANTEEN') {
      return NextResponse.redirect(new URL('/canteen/dashboard', request.url));
    } else if (payload.role === 'CASHIER') {
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
        if (payload.role === 'SUPERADMIN' || payload.role === 'ADMIN' || payload.role === 'LIVE_ADMIN') {
          return NextResponse.redirect(new URL('/admin/dashboard', request.url));
        } else if (payload.role === 'CANTEEN') {
          return NextResponse.redirect(new URL('/canteen/dashboard', request.url));
        } else if (payload.role === 'CASHIER') {
          return NextResponse.redirect(new URL('/cashier/dashboard', request.url));
        } else {
          return NextResponse.redirect(new URL('/employee/dashboard', request.url));
        }
      }
    }
    return NextResponse.next();
  }

  // Handle protected dashboards
  if (isEmployeeRoute || isCanteenRoute || isCashierRoute || isAdminRoute || isSuperAdminRoute) {
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
    if (isSuperAdminRoute && payload.role !== 'SUPERADMIN' && payload.role !== 'ADMIN') {
      return redirectBasedOnRole(payload.role, request);
    }

    if (isAdminRoute && payload.role !== 'ADMIN' && payload.role !== 'SUPERADMIN' && payload.role !== 'LIVE_ADMIN') {
      return redirectBasedOnRole(payload.role, request);
    }

    // Strict LIVE_ADMIN protection: allow only /admin/dashboard and /admin/orders
    if (payload.role === 'LIVE_ADMIN') {
      const isAllowedLiveAdminPath = path === '/admin/dashboard' || path.startsWith('/admin/orders');
      if (!isAllowedLiveAdminPath && (isAdminRoute || isSuperAdminRoute)) {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      }
    }

    if (isEmployeeRoute && payload.role !== 'EMPLOYEE') {
      return redirectBasedOnRole(payload.role, request);
    }

    if (isCanteenRoute && payload.role !== 'CANTEEN' && payload.role !== 'ADMIN' && payload.role !== 'SUPERADMIN') {
      return redirectBasedOnRole(payload.role, request);
    }

    if (isCashierRoute && payload.role !== 'CASHIER' && payload.role !== 'ADMIN' && payload.role !== 'SUPERADMIN') {
      return redirectBasedOnRole(payload.role, request);
    }
  }

  return NextResponse.next();
}

function redirectBasedOnRole(role: string, request: NextRequest) {
  if (role === 'SUPERADMIN' || role === 'ADMIN' || role === 'LIVE_ADMIN') {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  } else if (role === 'CANTEEN') {
    return NextResponse.redirect(new URL('/canteen/dashboard', request.url));
  } else if (role === 'CASHIER') {
    return NextResponse.redirect(new URL('/cashier/dashboard', request.url));
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
    '/cashier/:path*',
    '/admin/:path*',
  ],
};

import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/jwt';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user || (user.role !== 'MANUAL_ORDER_ADMIN' && user.role !== 'ADMIN' && user.role !== 'SUPERADMIN')) {
      return NextResponse.json({ authenticated: false });
    }
    return NextResponse.json({ authenticated: true, user: { fullName: user.fullName, employeeNo: user.employeeNo } });
  } catch {
    return NextResponse.json({ authenticated: false });
  }
}

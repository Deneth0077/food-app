import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getAuthUser } from '@/lib/jwt';

export const dynamic = 'force-dynamic';

// GET: Search employees for Manual Order Admin
export async function GET(request: Request) {
  try {
    await dbConnect();
    const manualUser = await getAuthUser(request);

    if (!manualUser || (manualUser.role !== 'MANUAL_ORDER_ADMIN' && manualUser.role !== 'ADMIN' && manualUser.role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    const query: any = { isActive: true, role: 'EMPLOYEE' };

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { fullName: searchRegex },
        { employeeNo: searchRegex },
        { phoneNumber: searchRegex },
      ];
    }

    const employees = await User.find(query).select('-password').sort({ fullName: 1 }).limit(20);
    return NextResponse.json({ employees });
  } catch (error: any) {
    console.error('Manual Order Employee Search Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

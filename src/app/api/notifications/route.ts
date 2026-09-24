import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Notification from '@/models/Notification';
import User from '@/models/User';
import { verifyJWT } from '@/lib/jwt';
import { cookies } from 'next/headers';

// Helper to get authenticated user
async function getAuthUser() {
  const cookieStore = cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;

  const jwtSecret = process.env.JWT_SECRET || 'fallback-jwt-secret-string-do-not-use-in-prod';
  const payload = await verifyJWT(token, jwtSecret);
  if (!payload) return null;

  await dbConnect();
  const user = await User.findById(payload.userId);
  return user;
}

// GET: Fetch notifications for the logged-in user (Employee or Admin)
export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Auto-remove notifications older than 2 days (48 hours)
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    await Notification.deleteMany({ createdAt: { $lt: twoDaysAgo } });

    let query: any = {};
    if (authUser.role === 'EMPLOYEE') {
      // Employees see their own order notifications (placed/cancelled) + price updates / system notices
      query = {
        $or: [
          { employeeNo: authUser.employeeNo },
          { type: 'PRICE_CHANGED' },
          { type: 'SYSTEM_ANNOUNCEMENT' },
        ],
      };
    } else {
      // Admins & Canteen/Cashiers see all non-superadmin notifications
      query = { employeeNo: { $ne: 'SUPERADMIN' } };
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(50);

    return NextResponse.json({ notifications });
  } catch (error: any) {
    console.error('Fetch Notifications Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH: Mark notification(s) as read
export async function PATCH(request: Request) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const body = await request.json();
    const { notificationId, markAll } = body;

    if (markAll) {
      let query: any = {};
      if (authUser.role === 'EMPLOYEE') {
        query = {
          $or: [
            { employeeNo: authUser.employeeNo },
            { type: 'PRICE_CHANGED' },
            { type: 'SYSTEM_ANNOUNCEMENT' },
          ],
        };
      }
      await Notification.updateMany(query, { $set: { isRead: true } });
      return NextResponse.json({ message: 'All notifications marked as read' });
    }

    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });
    }

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    notification.isRead = true;
    await notification.save();

    return NextResponse.json({ message: 'Notification marked as read', notification });
  } catch (error: any) {
    console.error('Update Notification Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

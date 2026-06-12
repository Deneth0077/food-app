import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Notification from '@/models/Notification';
import { getAuthUser } from '@/lib/jwt';

export const dynamic = 'force-dynamic';

// GET: Fetch all notifications for the Admin Dashboard (limited to latest 50)
export async function GET(request: Request) {
  try {
    await dbConnect();
    const user = await getAuthUser(request);

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const notifications = await Notification.find({})
      .sort({ createdAt: -1 })
      .limit(50);

    return NextResponse.json({ notifications });
  } catch (error: any) {
    console.error('Fetch Notifications Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH: Mark notification(s) as read
export async function PATCH(request: Request) {
  try {
    await dbConnect();
    const user = await getAuthUser(request);

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { notificationId, markAll } = body;

    if (markAll) {
      await Notification.updateMany({ isRead: false }, { isRead: true });
      return NextResponse.json({ message: 'All notifications marked as read' });
    }

    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID or markAll is required' }, { status: 400 });
    }

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    notification.isRead = true;
    await notification.save();

    return NextResponse.json({ message: 'Notification marked as read', notification });
  } catch (error: any) {
    console.error('Update Notifications Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE: Clear all read notifications, or delete a specific one
export async function DELETE(request: Request) {
  try {
    await dbConnect();
    const user = await getAuthUser(request);

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('notificationId');
    const clearAllRead = searchParams.get('clearAllRead');

    if (clearAllRead === 'true') {
      await Notification.deleteMany({ isRead: true });
      return NextResponse.json({ message: 'All read notifications cleared' });
    }

    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID or clearAllRead query param is required' }, { status: 400 });
    }

    const notification = await Notification.findByIdAndDelete(notificationId);
    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Notification deleted successfully' });
  } catch (error: any) {
    console.error('Delete Notifications Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

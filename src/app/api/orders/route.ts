import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Order from '@/models/Order';
import User from '@/models/User';
import Notification from '@/models/Notification';
import { getAuthUser } from '@/lib/jwt';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';


// GET: Fetch orders based on role and filters
export async function GET(request: Request) {
  try {
    await dbConnect();
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Auto-collect all pending (ORDERED) orders for today or the past
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    await Order.updateMany(
      { requestDate: { $lte: todayStr }, status: 'ORDERED' },
      { $set: { status: 'COLLECTED', collectedAt: new Date() } }
    );

    const { searchParams } = new URL(request.url);
    const role = user.role;

    if (role === 'EMPLOYEE') {
      // Employees only see their own history
      const orders = await Order.find({ userId: user.userId }).sort({ requestedAt: -1 });
      return NextResponse.json({ orders });
    }

    // ADMIN or CANTEEN can filter and search all orders
    const targetUserId = searchParams.get('userId');
    const requestDate = searchParams.get('requestDate') || (targetUserId ? 'all' : todayStr);
    const mealType = searchParams.get('mealType');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const query: any = {};

    if (targetUserId) {
      query.userId = targetUserId;
    }

    // Filter by request date unless specified as "all" for general history
    if (requestDate !== 'all') {
      query.requestDate = requestDate;
    }

    if (mealType && mealType !== 'ALL') {
      query.mealType = mealType;
    }

    if (status && status !== 'ALL') {
      query.status = status;
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { employeeName: searchRegex },
        { employeeNo: searchRegex }
      ];
    }

    const orders = await Order.find(query).sort({ requestedAt: -1 });
    return NextResponse.json({ orders });
  } catch (error: any) {
    console.error('Fetch Orders Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Submit a meal request (Employee only)
export async function POST(request: Request) {
  try {
    await dbConnect();
    const authUser = await getAuthUser(request);

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (authUser.role !== 'EMPLOYEE') {
      return NextResponse.json({ error: 'Only employees can request meals' }, { status: 403 });
    }

    const body = await request.json();
    const { mealType, mealOption, notes, requestDate, department } = body;

    if (!mealType || !['BREAKFAST', 'LUNCH', 'DINNER'].includes(mealType)) {
      return NextResponse.json({ error: 'Invalid meal type requested' }, { status: 400 });
    }

    if (!mealOption || !['VEGETARIAN', 'MEAT'].includes(mealOption)) {
      return NextResponse.json({ error: `Please select Vegetarian or Non vegetarian for ${mealType.toLowerCase()}.` }, { status: 400 });
    }

    if (department && !['CWIT', 'ECT', 'SAGT'].includes(department)) {
      return NextResponse.json({ error: 'Invalid department/site selected' }, { status: 400 });
    }

    // Fetch full user details to ensure they are active and get phone number
    const dbUser = await User.findById(authUser.userId);
    if (!dbUser || !dbUser.isActive) {
      return NextResponse.json({ error: 'User is inactive or not found' }, { status: 403 });
    }

    const orderDepartment = department || dbUser.department;
    if (!orderDepartment) {
      return NextResponse.json({ error: 'Please select your work site (CWIT, ECT, or SAGT) first.' }, { status: 400 });
    }

    if (!dbUser.department && department) {
      dbUser.department = department;
      await dbUser.save();
    }

    const now = new Date();
    const currentHour = now.getHours();
    const todayStr = format(now, 'yyyy-MM-dd');

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');

    const targetDateStr = requestDate || todayStr;

    if (targetDateStr < todayStr) {
      return NextResponse.json({ error: 'Cannot place orders for past dates.' }, { status: 400 });
    }

    if (targetDateStr !== todayStr && targetDateStr !== tomorrowStr) {
      return NextResponse.json(
        { error: `${mealType.charAt(0) + mealType.slice(1).toLowerCase()} can only be ordered for today or tomorrow.` },
        { status: 400 }
      );
    }

    // Unified lock validation
    const targetDate = new Date(targetDateStr + 'T00:00:00');
    if (mealType === 'BREAKFAST') {
      const dayBefore = new Date(targetDate.getTime());
      dayBefore.setDate(dayBefore.getDate() - 1);
      dayBefore.setHours(20, 0, 0, 0); // 8:00 PM
      if (now.getTime() >= dayBefore.getTime()) {
        const displayTime = targetDateStr === tomorrowStr ? '8:00 PM today' : `8:00 PM on ${format(dayBefore, 'yyyy-MM-dd')}`;
        return NextResponse.json(
          { error: `Breakfast orders for ${targetDateStr} closed at ${displayTime}.` },
          { status: 400 }
        );
      }
    } else if (mealType === 'LUNCH') {
      const dayOf = new Date(targetDate.getTime());
      dayOf.setHours(9, 0, 0, 0); // 9:00 AM
      if (now.getTime() >= dayOf.getTime()) {
        const displayTime = targetDateStr === todayStr ? '9:00 AM today' : `9:00 AM on ${targetDateStr}`;
        return NextResponse.json(
          { error: `Lunch orders for ${targetDateStr} closed at ${displayTime}.` },
          { status: 400 }
        );
      }
    } else if (mealType === 'DINNER') {
      const dayOf = new Date(targetDate.getTime());
      dayOf.setHours(17, 0, 0, 0); // 5:00 PM
      if (now.getTime() >= dayOf.getTime()) {
        const displayTime = targetDateStr === todayStr ? '5:00 PM today' : `5:00 PM on ${targetDateStr}`;
        return NextResponse.json(
          { error: `Dinner orders for ${targetDateStr} closed at ${displayTime}.` },
          { status: 400 }
        );
      }
    }

    const displayDay = targetDateStr === todayStr ? 'today' : targetDateStr === tomorrowStr ? 'tomorrow' : targetDateStr;

    // Prevent duplicates: Check if an order already exists for this user, date, and meal type
    const existingOrder = await Order.findOne({
      userId: dbUser._id,
      requestDate: targetDateStr,
      mealType
    });

    if (existingOrder) {
      return NextResponse.json(
        { error: `You have already requested ${mealType.toLowerCase()} for ${displayDay}. You cannot place duplicate requests for the same mealtime.` },
        { status: 400 }
      );
    }

    // Create Order
    const newOrder = await Order.create({
      userId: dbUser._id,
      employeeName: dbUser.fullName,
      employeeNo: dbUser.employeeNo,
      phoneNumber: dbUser.phoneNumber,
      mealType,
      mealOption,
      notes: notes ? notes.trim() : undefined,
      status: 'ORDERED',
      requestDate: targetDateStr,
      requestedAt: new Date(),
      department: department || dbUser.department,
    });

    // Create Admin Notification
    try {
      await Notification.create({
        employeeName: dbUser.fullName,
        employeeNo: dbUser.employeeNo,
        mealType,
        mealOption,
        notes: notes ? notes.trim() : undefined,
      });
    } catch (notifError) {
      // Log notification error but don't fail the order submission
      console.error('Failed to create notification:', notifError);
    }

    return NextResponse.json({ message: 'Request submitted successfully', order: newOrder }, { status: 201 });
  } catch (error: any) {
    console.error('Create Order Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH: Mark meal request(s) as collected (Canteen, Admin or Employee self-collect)
export async function PATCH(request: Request) {
  try {
    await dbConnect();
    const authUser = await getAuthUser(request);

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, orderIds } = body;

    if (!orderId && (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0)) {
      return NextResponse.json({ error: 'Order ID or Order IDs are required' }, { status: 400 });
    }

    const targetIds = orderId ? [orderId] : orderIds;

    // If role is employee, enforce self-collection constraint (own orders only)
    if (authUser.role === 'EMPLOYEE') {
      const result = await Order.updateMany(
        { _id: { $in: targetIds }, userId: authUser.userId, status: 'ORDERED' },
        { $set: { status: 'COLLECTED', collectedAt: new Date() } }
      );

      return NextResponse.json({ 
        message: `${result.modifiedCount} order(s) successfully marked as collected.`,
        modifiedCount: result.modifiedCount
      });
    }

    if (authUser.role !== 'CANTEEN' && authUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const result = await Order.updateMany(
      { _id: { $in: targetIds }, status: 'ORDERED' },
      { $set: { status: 'COLLECTED', collectedAt: new Date() } }
    );

    return NextResponse.json({ 
      message: `${result.modifiedCount} order(s) successfully marked as collected.`,
      modifiedCount: result.modifiedCount
    });
  } catch (error: any) {
    console.error('Update Order Status Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT: Update notes for today's active order (Employee only)
export async function PUT(request: Request) {
  try {
    await dbConnect();
    const authUser = await getAuthUser(request);

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (authUser.role !== 'EMPLOYEE') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { mealType, mealOption, notes, skipTimer, requestDate, department } = body;

    if (!mealType || !['BREAKFAST', 'LUNCH', 'DINNER'].includes(mealType)) {
      return NextResponse.json({ error: 'Invalid or missing meal type.' }, { status: 400 });
    }

    if (department && !['CWIT', 'ECT', 'SAGT'].includes(department)) {
      return NextResponse.json({ error: 'Invalid department/site selected' }, { status: 400 });
    }

    const now = new Date();
    const currentHour = now.getHours();
    const todayStr = format(now, 'yyyy-MM-dd');

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');

    const targetDateStr = requestDate || todayStr;

    if (targetDateStr < todayStr) {
      return NextResponse.json({ error: 'Cannot update orders for past dates.' }, { status: 400 });
    }

    if (targetDateStr !== todayStr && targetDateStr !== tomorrowStr) {
      return NextResponse.json(
        { error: `${mealType.charAt(0) + mealType.slice(1).toLowerCase()} can only be ordered for today or tomorrow.` },
        { status: 400 }
      );
    }

    // Unified lock validation
    const targetDate = new Date(targetDateStr + 'T00:00:00');
    if (mealType === 'BREAKFAST') {
      const dayBefore = new Date(targetDate.getTime());
      dayBefore.setDate(dayBefore.getDate() - 1);
      dayBefore.setHours(20, 0, 0, 0); // 8:00 PM
      if (now.getTime() >= dayBefore.getTime()) {
        return NextResponse.json(
          { error: `Breakfast orders for ${targetDateStr} closed at 8:00 PM on ${format(dayBefore, 'yyyy-MM-dd')}.` },
          { status: 400 }
        );
      }
    } else if (mealType === 'LUNCH') {
      const dayOf = new Date(targetDate.getTime());
      dayOf.setHours(9, 0, 0, 0); // 9:00 AM
      if (now.getTime() >= dayOf.getTime()) {
        return NextResponse.json(
          { error: `Lunch orders for ${targetDateStr} closed at 9:00 AM on ${targetDateStr}.` },
          { status: 400 }
        );
      }
    } else if (mealType === 'DINNER') {
      const dayOf = new Date(targetDate.getTime());
      dayOf.setHours(17, 0, 0, 0); // 5:00 PM
      if (now.getTime() >= dayOf.getTime()) {
        return NextResponse.json(
          { error: `Dinner orders for ${targetDateStr} closed at 5:00 PM on ${targetDateStr}.` },
          { status: 400 }
        );
      }
    }

    const displayDay = targetDateStr === todayStr ? 'today' : targetDateStr === tomorrowStr ? 'tomorrow' : targetDateStr;

    // Find the order for this user and specific mealType and targetDateStr
    const order = await Order.findOne({
      userId: authUser.userId,
      requestDate: targetDateStr,
      mealType
    });

    if (!order) {
      return NextResponse.json({ error: `No active ${mealType.toLowerCase()} order found for ${displayDay} to update.` }, { status: 404 });
    }

    // If skipping cancellation timer, shift requestedAt to 11 minutes ago
    if (skipTimer) {
      order.requestedAt = new Date(Date.now() - 11 * 60 * 1000);
      await order.save();
      return NextResponse.json({ message: 'Cancellation window skipped successfully', order });
    }

    // Update fields
    if (mealOption) {
      if (!['VEGETARIAN', 'MEAT'].includes(mealOption)) {
        return NextResponse.json({ error: 'Invalid preference choice.' }, { status: 400 });
      }
      order.mealOption = mealOption;
    }
    order.notes = notes !== undefined ? (notes ? notes.trim() : undefined) : order.notes;
    if (department) {
      order.department = department;
    }
    await order.save();

    // Also update notification if it exists for this user, today, and matching mealType
    try {
      const dbUser = await User.findById(authUser.userId);
      if (dbUser) {
        const notification = await Notification.findOne({
          employeeNo: dbUser.employeeNo,
          mealType,
          createdAt: {
            $gte: new Date(new Date().setHours(0, 0, 0, 0)),
            $lt: new Date(new Date().setHours(23, 59, 59, 999))
          }
        });
        if (notification) {
          if (mealOption) {
            notification.mealOption = mealOption;
          }
          notification.notes = notes !== undefined ? (notes ? notes.trim() : undefined) : notification.notes;
          await notification.save();
        }
      }
    } catch (notifErr) {
      console.error('Failed to update notification:', notifErr);
    }

    return NextResponse.json({ message: 'Request notes updated successfully', order });
  } catch (error: any) {
    console.error('Update Order Notes Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE: Cancel today's active order within 10 minutes (Employee only)
export async function DELETE(request: Request) {
  try {
    await dbConnect();
    const authUser = await getAuthUser(request);

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (authUser.role !== 'EMPLOYEE') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const mealType = searchParams.get('mealType');
    const requestDate = searchParams.get('requestDate');

    if (!mealType || !['BREAKFAST', 'LUNCH', 'DINNER'].includes(mealType)) {
      return NextResponse.json({ error: 'Invalid or missing meal type to cancel.' }, { status: 400 });
    }

    const now = new Date();
    const currentHour = now.getHours();
    const todayStr = format(now, 'yyyy-MM-dd');

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');

    const targetDateStr = requestDate || todayStr;

    if (targetDateStr < todayStr) {
      return NextResponse.json({ error: 'Cannot cancel orders for past dates.' }, { status: 400 });
    }

    if (targetDateStr !== todayStr && targetDateStr !== tomorrowStr) {
      return NextResponse.json(
        { error: `${mealType.charAt(0) + mealType.slice(1).toLowerCase()} can only be ordered for today or tomorrow.` },
        { status: 400 }
      );
    }

    // Unified lock validation
    const targetDate = new Date(targetDateStr + 'T00:00:00');
    if (mealType === 'BREAKFAST') {
      const dayBefore = new Date(targetDate.getTime());
      dayBefore.setDate(dayBefore.getDate() - 1);
      dayBefore.setHours(20, 0, 0, 0); // 8:00 PM
      if (now.getTime() >= dayBefore.getTime()) {
        return NextResponse.json(
          { error: `Breakfast orders for ${targetDateStr} closed at 8:00 PM on ${format(dayBefore, 'yyyy-MM-dd')}.` },
          { status: 400 }
        );
      }
    } else if (mealType === 'LUNCH') {
      const dayOf = new Date(targetDate.getTime());
      dayOf.setHours(9, 0, 0, 0); // 9:00 AM
      if (now.getTime() >= dayOf.getTime()) {
        return NextResponse.json(
          { error: `Lunch orders for ${targetDateStr} closed at 9:00 AM on ${targetDateStr}.` },
          { status: 400 }
        );
      }
    } else if (mealType === 'DINNER') {
      const dayOf = new Date(targetDate.getTime());
      dayOf.setHours(17, 0, 0, 0); // 5:00 PM
      if (now.getTime() >= dayOf.getTime()) {
        return NextResponse.json(
          { error: `Dinner orders for ${targetDateStr} closed at 5:00 PM on ${targetDateStr}.` },
          { status: 400 }
        );
      }
    }

    const displayDay = targetDateStr === todayStr ? 'today' : targetDateStr === tomorrowStr ? 'tomorrow' : targetDateStr;

    // Find the order for this user and specific mealType and targetDateStr
    const order = await Order.findOne({
      userId: authUser.userId,
      requestDate: targetDateStr,
      mealType
    });

    if (!order) {
      return NextResponse.json({ error: `No active order found for ${displayDay} to cancel.` }, { status: 404 });
    }

    if (order.status === 'COLLECTED') {
      return NextResponse.json({ error: 'Collected meals cannot be cancelled.' }, { status: 400 });
    }

    // Check time difference (10 minutes limit)
    const orderTime = new Date(order.requestedAt).getTime();
    const nowTime = new Date().getTime();
    const diffMs = nowTime - orderTime;
    const diffMins = diffMs / (1000 * 60);

    if (diffMins > 10) {
      return NextResponse.json(
        { error: 'Orders can only be cancelled within 10 minutes of placement.' },
        { status: 400 }
      );
    }

    // Delete the order
    await Order.deleteOne({ _id: order._id });

    // Also delete today's matching notification
    try {
      const dbUser = await User.findById(authUser.userId);
      if (dbUser) {
        await Notification.deleteOne({
          employeeNo: dbUser.employeeNo,
          mealType: order.mealType,
          createdAt: {
            $gte: new Date(new Date().setHours(0, 0, 0, 0)),
            $lt: new Date(new Date().setHours(23, 59, 59, 999))
          }
        });
      }
    } catch (notifErr) {
      console.error('Failed to delete associated notification:', notifErr);
    }

    return NextResponse.json({ message: 'Order cancelled successfully.' });
  } catch (error: any) {
    console.error('Cancel Order Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

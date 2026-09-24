import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Order from '@/models/Order';
import User from '@/models/User';
import Notification from '@/models/Notification';
import SystemSetting from '@/models/SystemSetting';
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

    // Auto-collect all pending (ORDERED) orders for past dates
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    await Order.updateMany(
      { requestDate: { $lt: todayStr }, status: 'ORDERED' },
      { $set: { status: 'COLLECTED', collectedAt: new Date() } }
    );

    const { searchParams } = new URL(request.url);
    const role = user.role;

    if (role === 'EMPLOYEE') {
      // Employees only see their own history
      const orders = await Order.find({ userId: user.userId }).sort({ requestedAt: -1 });
      return NextResponse.json({ orders });
    }

    // ADMIN, SUPERADMIN, CANTEEN, or CASHIER can filter and search all orders
    const targetUserId = searchParams.get('userId');
    const requestDate = searchParams.get('requestDate') || (targetUserId ? 'all' : todayStr);
    const mealType = searchParams.get('mealType');
    const status = searchParams.get('status');
    const department = searchParams.get('department');
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

    if (department && department !== 'ALL') {
      query.department = department;
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { employeeName: searchRegex },
        { employeeNo: searchRegex },
        { phoneNumber: searchRegex },
        { notes: searchRegex }
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

    if (department && !['CWIT', 'ECT', 'SAGT', 'CICT'].includes(department)) {
      return NextResponse.json({ error: 'Invalid department/site selected' }, { status: 400 });
    }

    // Fetch full user details to ensure they are active and get phone number
    const dbUser = await User.findById(authUser.userId);
    if (!dbUser || !dbUser.isActive) {
      return NextResponse.json({ error: 'User is inactive or not found' }, { status: 403 });
    }

    const orderDepartment = department || dbUser.department;
    if (!orderDepartment) {
      return NextResponse.json({ error: 'Please select your work site (CWIT, ECT, SAGT, or CICT) first.' }, { status: 400 });
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
      dayOf.setHours(10, 0, 0, 0); // 10:00 AM
      if (now.getTime() >= dayOf.getTime()) {
        const displayTime = targetDateStr === todayStr ? '10:00 AM today' : `10:00 AM on ${targetDateStr}`;
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
      if (existingOrder.status === 'CANCELLED') {
        // Re-activate previously cancelled order
        existingOrder.status = 'ORDERED';
        existingOrder.mealOption = mealOption;
        existingOrder.notes = notes ? notes.trim() : undefined;
        existingOrder.department = department || dbUser.department;
        existingOrder.requestedAt = new Date();
        existingOrder.cancelledAt = undefined;
        existingOrder.cancelledBy = undefined;
        await existingOrder.save();

        // Create Admin Notification (Skip for Superadmin)
        if (dbUser.role !== 'SUPERADMIN') {
          try {
            await Notification.create({
              employeeName: dbUser.fullName,
              employeeNo: dbUser.employeeNo,
              mealType,
              mealOption,
              notes: notes ? notes.trim() : undefined,
            });
          } catch (notifErr) {
            console.error('Notification creation failed:', notifErr);
          }
        }

        return NextResponse.json(
          { message: `${mealType.charAt(0) + mealType.slice(1).toLowerCase()} requested successfully`, order: existingOrder },
          { status: 201 }
        );
      }

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

    // Create Admin Notification (Skip for Superadmin)
    if (dbUser.role !== 'SUPERADMIN') {
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
    }

    return NextResponse.json({ message: 'Request submitted successfully', order: newOrder }, { status: 201 });
  } catch (error: any) {
    console.error('Create Order Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH: Mark meal request(s) as collected / payment confirmed (Canteen, Cashier, Admin or Employee self-collect)
export async function PATCH(request: Request) {
  try {
    await dbConnect();
    const authUser = await getAuthUser(request);

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, orderIds, status: targetStatus, confirmPayment, revertPayment } = body;

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

    if (authUser.role !== 'CANTEEN' && authUser.role !== 'CASHIER' && authUser.role !== 'ADMIN' && authUser.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Handle revert/undo payment confirmation request
    if (revertPayment || targetStatus === 'ORDERED') {
      // Check if any target order was confirmed > 10 minutes ago
      const existingOrders = await Order.find({ _id: { $in: targetIds } });
      const now = new Date();

      for (const ord of existingOrders) {
        if (ord.paymentConfirmedAt && authUser.role !== 'ADMIN' && authUser.role !== 'SUPERADMIN') {
          const diffMins = (now.getTime() - new Date(ord.paymentConfirmedAt).getTime()) / (1000 * 60);
          if (diffMins > 10) {
            return NextResponse.json(
              { error: `Confirmation for ${ord.employeeName} (${ord.employeeNo}) cannot be undone. The 10-minute grace window has expired.` },
              { status: 400 }
            );
          }
        }
      }

      const result = await Order.updateMany(
        { _id: { $in: targetIds } },
        {
          $set: { status: 'ORDERED', paymentConfirmed: false, confirmedByCashier: false },
          $unset: { collectedAt: 1, paymentConfirmedAt: 1 }
        }
      );

      return NextResponse.json({
        message: `${result.modifiedCount} order(s) successfully reverted to pending.`,
        modifiedCount: result.modifiedCount
      });
    }

    // Confirm Payment & Hand Over
    const result = await Order.updateMany(
      { _id: { $in: targetIds } },
      {
        $set: {
          status: 'COLLECTED',
          collectedAt: new Date(),
          paymentConfirmed: true,
          paymentConfirmedAt: new Date(),
          confirmedByCashier: true
        }
      }
    );

    return NextResponse.json({
      message: `${result.modifiedCount} order(s) successfully updated as confirmed & paid.`,
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

    if (department && !['CWIT', 'ECT', 'SAGT', 'CICT'].includes(department)) {
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
      dayOf.setHours(10, 0, 0, 0); // 10:00 AM
      if (now.getTime() >= dayOf.getTime()) {
        return NextResponse.json(
          { error: `Lunch orders for ${targetDateStr} closed at 10:00 AM on ${targetDateStr}.` },
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

    // If skipping cancellation timer, shift requestedAt to 61 minutes ago
    if (skipTimer) {
      order.requestedAt = new Date(Date.now() - 61 * 60 * 1000);
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

// DELETE: Cancel an active order (Employee or Admin)
export async function DELETE(request: Request) {
  try {
    await dbConnect();
    const authUser = await getAuthUser(request);

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    const mealType = searchParams.get('mealType');
    const requestDate = searchParams.get('requestDate');

    let order;
    if (orderId) {
      order = await Order.findById(orderId);
    } else if (mealType && ['BREAKFAST', 'LUNCH', 'DINNER'].includes(mealType)) {
      const now = new Date();
      const todayStr = format(now, 'yyyy-MM-dd');
      const targetDateStr = requestDate || todayStr;

      order = await Order.findOne({
        userId: authUser.userId,
        requestDate: targetDateStr,
        mealType,
        status: { $ne: 'CANCELLED' }
      });
    }

    if (!order) {
      return NextResponse.json({ error: 'No active order found to cancel.' }, { status: 404 });
    }

    if (order.status === 'COLLECTED') {
      return NextResponse.json({ error: 'Collected meals cannot be cancelled.' }, { status: 400 });
    }

    // Check if non-admin is trying to cancel someone else's order
    if (authUser.role !== 'ADMIN' && authUser.role !== 'SUPERADMIN' && order.userId.toString() !== authUser.userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Lock time check (for non-admins)
    if (authUser.role !== 'ADMIN' && authUser.role !== 'SUPERADMIN') {
      const now = new Date();
      const todayStr = format(now, 'yyyy-MM-dd');
      const targetDateStr = order.requestDate || todayStr;
      const targetDate = new Date(targetDateStr + 'T00:00:00');

      if (order.mealType === 'BREAKFAST') {
        const dayBefore = new Date(targetDate.getTime());
        dayBefore.setDate(dayBefore.getDate() - 1);
        dayBefore.setHours(20, 0, 0, 0); // 8:00 PM
        if (now.getTime() >= dayBefore.getTime()) {
          return NextResponse.json(
            { error: `Breakfast orders for ${targetDateStr} closed at 8:00 PM on ${format(dayBefore, 'yyyy-MM-dd')}.` },
            { status: 400 }
          );
        }
      } else if (order.mealType === 'LUNCH') {
        const dayOf = new Date(targetDate.getTime());
        dayOf.setHours(10, 0, 0, 0); // 10:00 AM
        if (now.getTime() >= dayOf.getTime()) {
          return NextResponse.json(
            { error: `Lunch orders for ${targetDateStr} closed at 10:00 AM on ${targetDateStr}.` },
            { status: 400 }
          );
        }
      } else if (order.mealType === 'DINNER') {
        const dayOf = new Date(targetDate.getTime());
        dayOf.setHours(17, 0, 0, 0); // 5:00 PM
        if (now.getTime() >= dayOf.getTime()) {
          return NextResponse.json(
            { error: `Dinner orders for ${targetDateStr} closed at 5:00 PM on ${targetDateStr}.` },
            { status: 400 }
          );
        }
      }

      // Fetch system settings for dynamic cancellation window
      const sysSettings = await SystemSetting.findOne({ key: 'GLOBAL_SETTINGS' });
      const cancellationWindowMins = sysSettings?.cancellationWindowMinutes ?? 60;

      // Check time difference against dynamic cancellation window
      const orderTime = new Date(order.requestedAt).getTime();
      const nowTime = new Date().getTime();
      const diffMs = nowTime - orderTime;
      const diffMins = diffMs / (1000 * 60);

      if (diffMins > cancellationWindowMins) {
        return NextResponse.json(
          { error: `Orders can only be cancelled within ${cancellationWindowMins} minutes of placement.` },
          { status: 400 }
        );
      }
    }

    // Mark order as CANCELLED directly
    order.status = 'CANCELLED';
    order.cancelledAt = new Date();
    order.cancelledBy = authUser.role === 'ADMIN' || authUser.role === 'SUPERADMIN' ? 'ADMIN' : 'EMPLOYEE';
    await order.save();

    // Create a cancellation notification for Admin and Employee records
    try {
      await Notification.create({
        employeeName: order.employeeName,
        employeeNo: order.employeeNo,
        mealType: order.mealType,
        mealOption: order.mealOption,
        type: 'ORDER_CANCELLED',
        notes: `Order cancelled by ${order.cancelledBy === 'ADMIN' ? 'Admin' : order.employeeName}`,
      });
    } catch (notifErr) {
      console.error('Failed to create cancellation notification:', notifErr);
    }

    return NextResponse.json({ message: 'Order cancelled successfully.', order });
  } catch (error: any) {
    console.error('Cancel Order Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

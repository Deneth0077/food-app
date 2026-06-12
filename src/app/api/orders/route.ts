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

    const { searchParams } = new URL(request.url);
    const role = user.role;

    if (role === 'EMPLOYEE') {
      // Employees only see their own history
      const orders = await Order.find({ userId: user.userId }).sort({ requestedAt: -1 });
      return NextResponse.json({ orders });
    }

    // ADMIN or CANTEEN can filter and search all orders
    const todayStr = format(new Date(), 'yyyy-MM-dd');
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
    const { mealType, mealOption, notes } = body;

    if (!mealType || !['BREAKFAST', 'LUNCH', 'DINNER'].includes(mealType)) {
      return NextResponse.json({ error: 'Invalid meal type requested' }, { status: 400 });
    }

    if (!mealOption || !['VEGETARIAN', 'MEAT'].includes(mealOption)) {
      return NextResponse.json({ error: `Please select Vegetarian or Meat for ${mealType.toLowerCase()}.` }, { status: 400 });
    }

    // Fetch full user details to ensure they are active and get phone number
    const dbUser = await User.findById(authUser.userId);
    if (!dbUser || !dbUser.isActive) {
      return NextResponse.json({ error: 'User is inactive or not found' }, { status: 403 });
    }

    const todayStr = format(new Date(), 'yyyy-MM-dd');

    // Prevent duplicates: Check if order already exists for this user, date, and meal type
    const existingOrder = await Order.findOne({
      userId: dbUser._id,
      requestDate: todayStr,
      mealType: mealType
    });

    if (existingOrder) {
      return NextResponse.json(
        { error: `You have already requested ${mealType.toLowerCase()} for today.` },
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
      requestDate: todayStr,
      requestedAt: new Date(),
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

// PATCH: Mark meal request as collected (Canteen or Admin)
export async function PATCH(request: Request) {
  try {
    await dbConnect();
    const authUser = await getAuthUser(request);

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (authUser.role !== 'CANTEEN' && authUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.status === 'COLLECTED') {
      return NextResponse.json({ error: 'Order has already been collected' }, { status: 400 });
    }

    // Update status to COLLECTED
    order.status = 'COLLECTED';
    order.collectedAt = new Date();
    await order.save();

    return NextResponse.json({ message: 'Order marked as collected', order });
  } catch (error: any) {
    console.error('Update Order Status Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

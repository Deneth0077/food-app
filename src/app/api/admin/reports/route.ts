import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Order from '@/models/Order';
import User from '@/models/User';
import { getAuthUser } from '@/lib/jwt';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

export const dynamic = 'force-dynamic';


export async function GET(request: Request) {
  try {
    await dbConnect();
    const user = await getAuthUser(request);

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get('month'); // e.g. "2026-06"

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const currentMonthStr = monthParam || format(new Date(), 'yyyy-MM');

    // Auto-collect all pending (ORDERED) orders for today or the past
    await Order.updateMany(
      { requestDate: { $lte: todayStr }, status: 'ORDERED' },
      { $set: { status: 'COLLECTED', collectedAt: new Date() } }
    );

    // 1. Employee stats
    const totalEmployees = await User.countDocuments({ role: 'EMPLOYEE' });
    const activeEmployees = await User.countDocuments({ role: 'EMPLOYEE', isActive: true });

    // 2. Daily Summary (Today)
    const todayOrders = await Order.find({ requestDate: todayStr });
    const todayStats = {
      total: todayOrders.length,
      breakfast: todayOrders.filter(o => o.mealType === 'BREAKFAST').length,
      breakfastVeg: todayOrders.filter(o => o.mealType === 'BREAKFAST' && o.mealOption === 'VEGETARIAN').length,
      breakfastMeat: todayOrders.filter(o => o.mealType === 'BREAKFAST' && o.mealOption === 'MEAT').length,
      lunch: todayOrders.filter(o => o.mealType === 'LUNCH').length,
      lunchVeg: todayOrders.filter(o => o.mealType === 'LUNCH' && o.mealOption === 'VEGETARIAN').length,
      lunchMeat: todayOrders.filter(o => o.mealType === 'LUNCH' && o.mealOption === 'MEAT').length,
      dinner: todayOrders.filter(o => o.mealType === 'DINNER').length,
      dinnerVeg: todayOrders.filter(o => o.mealType === 'DINNER' && o.mealOption === 'VEGETARIAN').length,
      dinnerMeat: todayOrders.filter(o => o.mealType === 'DINNER' && o.mealOption === 'MEAT').length,
      collected: todayOrders.filter(o => o.status === 'COLLECTED').length,
      pending: todayOrders.filter(o => o.status === 'ORDERED').length,
    };

    // 3. Monthly Summary
    // Find all orders that match the month string prefix in YYYY-MM-DD format
    const monthlyOrders = await Order.find({
      requestDate: { $regex: new RegExp(`^${currentMonthStr}`) }
    });

    const monthlyStats = {
      total: monthlyOrders.length,
      breakfast: monthlyOrders.filter(o => o.mealType === 'BREAKFAST').length,
      breakfastVeg: monthlyOrders.filter(o => o.mealType === 'BREAKFAST' && o.mealOption === 'VEGETARIAN').length,
      breakfastMeat: monthlyOrders.filter(o => o.mealType === 'BREAKFAST' && o.mealOption === 'MEAT').length,
      lunch: monthlyOrders.filter(o => o.mealType === 'LUNCH').length,
      lunchVeg: monthlyOrders.filter(o => o.mealType === 'LUNCH' && o.mealOption === 'VEGETARIAN').length,
      lunchMeat: monthlyOrders.filter(o => o.mealType === 'LUNCH' && o.mealOption === 'MEAT').length,
      dinner: monthlyOrders.filter(o => o.mealType === 'DINNER').length,
      dinnerVeg: monthlyOrders.filter(o => o.mealType === 'DINNER' && o.mealOption === 'VEGETARIAN').length,
      dinnerMeat: monthlyOrders.filter(o => o.mealType === 'DINNER' && o.mealOption === 'MEAT').length,
      collected: monthlyOrders.filter(o => o.status === 'COLLECTED').length,
      pending: monthlyOrders.filter(o => o.status === 'ORDERED').length,
    };

    // 4. Daily distribution for charts (last 7 days or date breakdown of current month)
    // We group monthly orders by date to send back for graphs
    const dailyDistribution: { [key: string]: { breakfast: number; lunch: number; dinner: number } } = {};
    
    // Initialize current month's dates
    const parsedMonth = new Date(currentMonthStr + '-02'); // Offset to avoid timezone shifting
    const start = startOfMonth(parsedMonth);
    const end = endOfMonth(parsedMonth);
    const daysInMonth = eachDayOfInterval({ start, end });

    daysInMonth.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      dailyDistribution[dateStr] = { breakfast: 0, lunch: 0, dinner: 0 };
    });

    // Populate actual request counts
    monthlyOrders.forEach(o => {
      if (dailyDistribution[o.requestDate]) {
        if (o.mealType === 'BREAKFAST') dailyDistribution[o.requestDate].breakfast++;
        else if (o.mealType === 'LUNCH') dailyDistribution[o.requestDate].lunch++;
        else if (o.mealType === 'DINNER') dailyDistribution[o.requestDate].dinner++;
      }
    });

    // Convert daily distribution to a sorted array
    const chartData = Object.keys(dailyDistribution).sort().map(date => ({
      date,
      dayName: format(new Date(date + 'T00:00:00'), 'EEE'),
      ...dailyDistribution[date]
    }));

    return NextResponse.json({
      employeeStats: {
        total: totalEmployees,
        active: activeEmployees,
      },
      todayStats,
      monthlyStats,
      chartData
    });
  } catch (error: any) {
    console.error('Reports Aggregation Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Order from '@/models/Order';
import User from '@/models/User';
import PriceConfig from '@/models/PriceConfig';
import { getAuthUser } from '@/lib/jwt';
import { format } from 'date-fns';

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
    const currentMonthStr = monthParam || format(new Date(), 'yyyy-MM');

    // Auto-collect all pending (ORDERED) orders for today or the past
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    await Order.updateMany(
      { requestDate: { $lte: todayStr }, status: 'ORDERED' },
      { $set: { status: 'COLLECTED', collectedAt: new Date() } }
    );

    // 1. Fetch current price configs
    let priceConfig = await PriceConfig.findOne();
    if (!priceConfig) {
      priceConfig = {
        breakfast: 300,
        lunch: 350,
        dinner: 400
      };
    }

    // 2. Fetch all orders matching month prefix in requestDate (YYYY-MM-DD)
    const monthlyOrders = await Order.find({
      requestDate: { $regex: new RegExp(`^${currentMonthStr}`) }
    }).select('employeeNo employeeName mealType status collectedAt requestDate mealOption notes');

    // 3. Fetch all active/existing employees to initialize map
    const employees = await User.find({ role: 'EMPLOYEE' }).select('employeeNo fullName');
    
    const employeeMap: {
      [key: string]: {
        employeeNo: string;
        employeeName: string;
        breakfastCount: number;
        breakfastCollected: number;
        lunchCount: number;
        lunchCollected: number;
        dinnerCount: number;
        dinnerCollected: number;
      };
    } = {};

    employees.forEach(emp => {
      employeeMap[emp.employeeNo] = {
        employeeNo: emp.employeeNo,
        employeeName: emp.fullName,
        breakfastCount: 0,
        breakfastCollected: 0,
        lunchCount: 0,
        lunchCollected: 0,
        dinnerCount: 0,
        dinnerCollected: 0
      };
    });

    // 4. Aggregate counts from orders
    monthlyOrders.forEach(o => {
      const empNo = o.employeeNo;
      if (!employeeMap[empNo]) {
        employeeMap[empNo] = {
          employeeNo: o.employeeNo,
          employeeName: o.employeeName,
          breakfastCount: 0,
          breakfastCollected: 0,
          lunchCount: 0,
          lunchCollected: 0,
          dinnerCount: 0,
          dinnerCollected: 0
        };
      }

      const isCollected = o.status === 'COLLECTED';

      if (o.mealType === 'BREAKFAST') {
        employeeMap[empNo].breakfastCount++;
        if (isCollected) employeeMap[empNo].breakfastCollected++;
      } else if (o.mealType === 'LUNCH') {
        employeeMap[empNo].lunchCount++;
        if (isCollected) employeeMap[empNo].lunchCollected++;
      } else if (o.mealType === 'DINNER') {
        employeeMap[empNo].dinnerCount++;
        if (isCollected) employeeMap[empNo].dinnerCollected++;
      }
    });

    // 5. Convert to array and compute total costs
    const spendingList = Object.values(employeeMap).map(emp => {
      const totalCost =
        emp.breakfastCount * priceConfig.breakfast +
        emp.lunchCount * priceConfig.lunch +
        emp.dinnerCount * priceConfig.dinner;
      
      return {
        ...emp,
        totalCost
      };
    });

    // Sort by total cost descending, then by employee No
    spendingList.sort((a, b) => b.totalCost - a.totalCost || a.employeeNo.localeCompare(b.employeeNo));

    return NextResponse.json({
      month: currentMonthStr,
      prices: {
        breakfast: priceConfig.breakfast,
        lunch: priceConfig.lunch,
        dinner: priceConfig.dinner
      },
      spendingList,
      detailedOrders: monthlyOrders
    });
  } catch (error: any) {
    console.error('Spending Report API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

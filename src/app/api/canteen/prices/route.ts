import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import PriceConfig from '@/models/PriceConfig';
import Notification from '@/models/Notification';
import { getAuthUser } from '@/lib/jwt';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await dbConnect();
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'CANTEEN' && user.role !== 'ADMIN' && user.role !== 'EMPLOYEE') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    let config = await PriceConfig.findOne();
    if (!config) {
      config = await PriceConfig.create({
        breakfast: 300,
        lunch: 350,
        dinner: 400
      });
    }

    return NextResponse.json({ prices: config });
  } catch (error: any) {
    console.error('Fetch Prices Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await dbConnect();
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { breakfast, lunch, dinner } = body;

    if (typeof breakfast !== 'number' || typeof lunch !== 'number' || typeof dinner !== 'number') {
      return NextResponse.json({ error: 'All prices must be valid numbers' }, { status: 400 });
    }

    if (breakfast < 0 || lunch < 0 || dinner < 0) {
      return NextResponse.json({ error: 'Prices cannot be negative' }, { status: 400 });
    }

    let config = await PriceConfig.findOne();
    if (!config) {
      config = new PriceConfig();
    }

    config.breakfast = breakfast;
    config.lunch = lunch;
    config.dinner = dinner;
    await config.save();

    // Create admin notification for price change
    await Notification.create({
      employeeName: 'System Admin',
      employeeNo: 'PRICES',
      mealType: 'BREAKFAST', // satisfy required schema validation
      notes: `Breakfast: Rs. ${breakfast} | Lunch: Rs. ${lunch} | Dinner: Rs. ${dinner}`
    });

    return NextResponse.json({ message: 'Prices updated successfully', prices: config });
  } catch (error: any) {
    console.error('Update Prices Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Order from '@/models/Order';
import User from '@/models/User';
import SystemSetting from '@/models/SystemSetting';
import { getAuthUser } from '@/lib/jwt';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

const CICT_TEAMS = [
  'Special Team', 'Spreader Team', 'QC – Electrical Team', 'QC – Mechanical Team',
  'On-Duty Team', 'Mobile Team', 'RTG – Electrical Team', 'RTG – Mechanical Team',
  'FAC Team', 'ECT Team', 'CWIT Team', 'Stores', 'Sgs stores', 'General',
];

// POST: Create a manual order via Manual Order Admin
export async function POST(request: Request) {
  try {
    await dbConnect();
    const manualUser = await getAuthUser(request);

    if (!manualUser || (manualUser.role !== 'MANUAL_ORDER_ADMIN' && manualUser.role !== 'ADMIN' && manualUser.role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check feature is still enabled
    const settings = await SystemSetting.findOne({ key: 'GLOBAL_SETTINGS' });
    if (settings?.manualEmployeeOrder === false) {
      return NextResponse.json(
        { error: 'Manual Employee Order service is currently deactivated.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { targetUserId, mealType, mealOption, eggPreference, paymentType, notes, requestDate, department, cictTeam, orderMode } = body;

    if (!mealType || !['BREAKFAST', 'LUNCH', 'DINNER'].includes(mealType)) {
      return NextResponse.json({ error: 'Invalid meal type' }, { status: 400 });
    }

    if (!mealOption || !['VEGETARIAN', 'MEAT'].includes(mealOption)) {
      return NextResponse.json({ error: 'Please select Vegetarian or Non-Vegetarian' }, { status: 400 });
    }

    if (!targetUserId) {
      return NextResponse.json({ error: 'Employee selection is required' }, { status: 400 });
    }

    const dbUser = await User.findById(targetUserId);
    if (!dbUser || !dbUser.isActive) {
      return NextResponse.json({ error: 'Employee not found or inactive' }, { status: 404 });
    }

    const now = new Date();
    const todayStr = format(now, 'yyyy-MM-dd');
    const targetDateStr = requestDate || todayStr;
    const orderDepartment = department || dbUser.department || 'CWIT';
    const finalCictTeam = orderDepartment === 'CICT' ? (cictTeam || dbUser.cictTeam || 'General') : undefined;
    const isReportOnly = orderMode === 'REPORT_ONLY';
    const initialStatus = isReportOnly ? 'COLLECTED' : 'ORDERED';

    // Prevent duplicate orders
    const existingOrder = await Order.findOne({
      userId: dbUser._id,
      requestDate: targetDateStr,
      mealType,
    });

    if (existingOrder) {
      if (existingOrder.status === 'CANCELLED') {
        existingOrder.status = initialStatus;
        existingOrder.mealOption = mealOption;
        existingOrder.eggPreference = mealOption === 'VEGETARIAN' ? (eggPreference || 'WITH_EGG') : undefined;
        existingOrder.paymentType = paymentType || 'FREE';
        existingOrder.notes = notes ? notes.trim() : undefined;
        existingOrder.department = orderDepartment;
        existingOrder.requestedAt = now;
        existingOrder.cancelledAt = undefined;
        existingOrder.cancelledBy = undefined;
        if (isReportOnly) {
          existingOrder.paymentConfirmed = true;
          existingOrder.confirmedByCashier = true;
          existingOrder.paymentConfirmedAt = now;
          existingOrder.collectedAt = now;
        }
        await existingOrder.save();
        return NextResponse.json(
          { message: `${mealType.charAt(0) + mealType.slice(1).toLowerCase()} order for ${dbUser.fullName} added successfully.`, order: existingOrder },
          { status: 201 }
        );
      }
      return NextResponse.json(
        { error: `${dbUser.fullName} (${dbUser.employeeNo}) already has an active ${mealType.toLowerCase()} order for ${targetDateStr}.` },
        { status: 400 }
      );
    }

    const newOrder = await Order.create({
      userId: dbUser._id,
      employeeName: dbUser.fullName,
      employeeNo: dbUser.employeeNo,
      phoneNumber: dbUser.phoneNumber,
      mealType,
      mealOption,
      eggPreference: mealOption === 'VEGETARIAN' ? (eggPreference || 'WITH_EGG') : undefined,
      paymentType: paymentType || 'FREE',
      notes: notes ? notes.trim() : undefined,
      status: initialStatus,
      paymentConfirmed: isReportOnly,
      paymentConfirmedAt: isReportOnly ? now : undefined,
      confirmedByCashier: isReportOnly,
      collectedAt: isReportOnly ? now : undefined,
      requestDate: targetDateStr,
      requestedAt: now,
      department: orderDepartment,
      cictTeam: finalCictTeam,
    });

    return NextResponse.json(
      { message: `${mealType.charAt(0) + mealType.slice(1).toLowerCase()} order for ${dbUser.fullName} added successfully.`, order: newOrder },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Manual Order Creation Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import SystemSetting from '@/models/SystemSetting';
import { getAuthUser } from '@/lib/jwt';
import bcrypt from 'bcryptjs';

// Helper to retrieve or initialize system settings
async function getOrCreateSettings() {
  let settings = await SystemSetting.findOne({ key: 'GLOBAL_SETTINGS' });
  if (!settings) {
    settings = await SystemSetting.create({
      key: 'GLOBAL_SETTINGS',
      mealPricesManagement: false, // Deactivated by default as requested
      menuManagement: true,
      orderCancellation: true,
      cancellationWindowMinutes: 60,
      mealOrdering: true,
      selfCollection: true,
      reportsExport: true,
      employeeDirectory: true,
      liveOrderManagement: true,
      manualEmployeeOrder: true,
      manualOrderAdminUsername: 'ORDERADMIN',
      maintenanceMessage: 'This service is temporarily deactivated',
      breakfastCutoffTime: '22:00',
      lunchCutoffTime: '10:00',
      dinnerCutoffTime: '17:00',
    });
  }
  return settings;
}

// GET: Return current system feature settings
export async function GET() {
  try {
    await dbConnect();
    const settings = await getOrCreateSettings();

    return NextResponse.json({
      success: true,
      settings: {
        mealPricesManagement: settings.mealPricesManagement,
        menuManagement: settings.menuManagement,
        orderCancellation: settings.orderCancellation,
        cancellationWindowMinutes: settings.cancellationWindowMinutes ?? 60,
        mealOrdering: settings.mealOrdering,
        selfCollection: settings.selfCollection,
        reportsExport: settings.reportsExport,
        employeeDirectory: settings.employeeDirectory,
        liveOrderManagement: settings.liveOrderManagement ?? true,
        manualEmployeeOrder: settings.manualEmployeeOrder ?? true,
        manualOrderAdminUsername: settings.manualOrderAdminUsername || 'ORDERADMIN',
        maintenanceMessage: settings.maintenanceMessage,
        breakfastCutoffTime: settings.breakfastCutoffTime || '22:00',
        lunchCutoffTime: settings.lunchCutoffTime || '10:00',
        dinnerCutoffTime: settings.dinnerCutoffTime || '17:00',
        updatedAt: settings.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Error fetching system settings:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve system settings' },
      { status: 500 }
    );
  }
}

// PUT: Update feature flags (Admin / Superadmin)
export async function PUT(request: Request) {
  try {
    await dbConnect();
    const authUser = await getAuthUser(request);

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (authUser.role !== 'SUPERADMIN' && authUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: Only Admin or Superadmin can modify system service settings.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const settings = await getOrCreateSettings();

    const allowedFields = [
      'mealPricesManagement',
      'menuManagement',
      'orderCancellation',
      'cancellationWindowMinutes',
      'mealOrdering',
      'selfCollection',
      'reportsExport',
      'employeeDirectory',
      'liveOrderManagement',
      'manualEmployeeOrder',
      'manualOrderAdminUsername',
      'maintenanceMessage',
      'breakfastCutoffTime',
      'lunchCutoffTime',
      'dinnerCutoffTime',
    ];

    allowedFields.forEach((field) => {
      if (body[field] !== undefined) {
        settings[field] = body[field];
      }
    });

    if (body.manualOrderAdminPin && body.manualOrderAdminPin.trim() !== '') {
      settings.manualOrderAdminPin = await bcrypt.hash(body.manualOrderAdminPin, 10);
    }

    settings.updatedBy = `${authUser.fullName} (${authUser.employeeNo})`;
    await settings.save();

    return NextResponse.json({
      success: true,
      message: 'System feature settings updated successfully',
      settings,
    });
  } catch (error: any) {
    console.error('Error updating system settings:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update system settings' },
      { status: 500 }
    );
  }
}

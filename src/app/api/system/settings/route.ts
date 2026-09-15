import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import SystemSetting from '@/models/SystemSetting';
import { getAuthUser } from '@/lib/jwt';

// Helper to retrieve or initialize system settings
async function getOrCreateSettings() {
  let settings = await SystemSetting.findOne({ key: 'GLOBAL_SETTINGS' });
  if (!settings) {
    settings = await SystemSetting.create({
      key: 'GLOBAL_SETTINGS',
      mealPricesManagement: false, // Deactivated by default as requested
      menuManagement: true,
      orderCancellation: true,
      mealOrdering: true,
      selfCollection: true,
      reportsExport: true,
      employeeDirectory: true,
      maintenanceMessage: 'This service is temporarily deactivated',
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
        mealOrdering: settings.mealOrdering,
        selfCollection: settings.selfCollection,
        reportsExport: settings.reportsExport,
        employeeDirectory: settings.employeeDirectory,
        maintenanceMessage: settings.maintenanceMessage,
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

// PUT: Update feature flags (Superadmin ONLY)
export async function PUT(request: Request) {
  try {
    await dbConnect();
    const authUser = await getAuthUser(request);

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (authUser.role !== 'SUPERADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: Only Superadmin has permission to modify system service settings.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const settings = await getOrCreateSettings();

    const allowedFields = [
      'mealPricesManagement',
      'menuManagement',
      'orderCancellation',
      'mealOrdering',
      'selfCollection',
      'reportsExport',
      'employeeDirectory',
      'maintenanceMessage',
    ];

    allowedFields.forEach((field) => {
      if (body[field] !== undefined) {
        settings[field] = body[field];
      }
    });

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

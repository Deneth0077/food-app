import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getAuthUser } from '@/lib/jwt';

export const dynamic = 'force-dynamic';


export async function GET(request: Request) {
  try {
    await dbConnect();
    const user = await getAuthUser(request);

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const role = searchParams.get('role');
    const department = searchParams.get('department');

    const query: any = {};

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { fullName: searchRegex },
        { employeeNo: searchRegex },
        { phoneNumber: searchRegex }
      ];
    }

    if (role && role !== 'ALL') {
      query.role = role;
    }

    if (department && department !== 'ALL') {
      query.department = department;
    }

    const employees = await User.find(query).select('-password').sort({ fullName: 1 });
    return NextResponse.json({ employees });
  } catch (error: any) {
    console.error('Fetch Employees Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await dbConnect();
    const authUser = await getAuthUser(request);

    if (!authUser || authUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { employeeId, isActive, role, department } = body;

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
    }

    const employee = await User.findById(employeeId);
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Protect against self-deactivation or self-role change
    if (employeeId === authUser.userId) {
      return NextResponse.json({ error: 'You cannot modify your own admin account settings' }, { status: 400 });
    }

    if (typeof isActive === 'boolean') {
      employee.isActive = isActive;
    }

    if (role && ['ADMIN', 'EMPLOYEE', 'CANTEEN'].includes(role)) {
      employee.role = role;
    }

    if (department && ['CWIT', 'ECT', 'SAGT'].includes(department)) {
      employee.department = department;
    }

    await employee.save();

    // Fetch updated list of employees or return updated details
    return NextResponse.json({ 
      message: 'Employee updated successfully', 
      employee: {
        id: employee._id,
        fullName: employee.fullName,
        employeeNo: employee.employeeNo,
        role: employee.role,
        isActive: employee.isActive,
        department: employee.department
      }
    });
  } catch (error: any) {
    console.error('Update Employee Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

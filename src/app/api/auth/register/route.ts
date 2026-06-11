import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { signJWT } from '@/lib/jwt';

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { fullName, employeeNo, phoneNumber, password } = body;

    // Validation
    if (!fullName || !employeeNo || !phoneNumber || !password) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Check if employeeNo unique
    const existingUser = await User.findOne({ employeeNo: employeeNo.trim() });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Employee number is already registered' },
        { status: 400 }
      );
    }

    // Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create User (First registered user is ADMIN, others are default EMPLOYEE for easy demo/setup, or default to EMPLOYEE. Wait, let's look at standard - default to EMPLOYEE, but check if we can make a default admin if there are none, or just register normally).
    // Let's check: we will register with default role 'EMPLOYEE' but if employeeNo is e.g. "ADMIN001" or starts with "ADMIN", make it ADMIN, or canteen if starts with "CANTEEN". This makes setup and demo extremely easy for the user!
    let role = 'EMPLOYEE';
    const cleanEmpNo = employeeNo.trim().toUpperCase();
    if (cleanEmpNo.startsWith('ADMIN')) {
      role = 'ADMIN';
    } else if (cleanEmpNo.startsWith('CANTEEN')) {
      role = 'CANTEEN';
    }

    const newUser = await User.create({
      fullName: fullName.trim(),
      employeeNo: cleanEmpNo,
      phoneNumber: phoneNumber.trim(),
      password: hashedPassword,
      role,
      isActive: true,
    });

    // Generate JWT Token
    const jwtSecret = process.env.JWT_SECRET || 'fallback-jwt-secret-string-do-not-use-in-prod';
    const tokenPayload = {
      userId: newUser._id.toString(),
      fullName: newUser.fullName,
      employeeNo: newUser.employeeNo,
      role: newUser.role,
    };
    const token = await signJWT(tokenPayload, jwtSecret);

    // Create response
    const response = NextResponse.json(
      { 
        message: 'Registration successful', 
        user: { 
          id: newUser._id, 
          fullName: newUser.fullName, 
          employeeNo: newUser.employeeNo, 
          role: newUser.role 
        } 
      },
      { status: 201 }
    );

    // Set HTTP-Only Cookie
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Registration Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

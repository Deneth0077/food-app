import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { signJWT } from '@/lib/jwt';

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { employeeNo, password } = body;

    if (!employeeNo || !password) {
      return NextResponse.json(
        { error: 'Employee number and password are required' },
        { status: 400 }
      );
    }

    // Find User
    const user = await User.findOne({ employeeNo: employeeNo.trim().toUpperCase() });
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid Employee Number or password' },
        { status: 401 }
      );
    }

    // Check if Active
    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Your account has been deactivated. Please contact support.' },
        { status: 403 }
      );
    }

    // Verify Password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { error: 'Invalid Employee Number or password' },
        { status: 401 }
      );
    }

    // Generate JWT Token
    const jwtSecret = process.env.JWT_SECRET || 'fallback-jwt-secret-string-do-not-use-in-prod';
    const tokenPayload = {
      userId: user._id.toString(),
      fullName: user.fullName,
      employeeNo: user.employeeNo,
      role: user.role,
    };
    const token = await signJWT(tokenPayload, jwtSecret);

    // Role specific redirect path
    let redirectUrl = '/employee/dashboard';
    if (user.role === 'ADMIN') {
      redirectUrl = '/admin/dashboard';
    } else if (user.role === 'CANTEEN') {
      redirectUrl = '/canteen/dashboard';
    }

    // Create response
    const response = NextResponse.json({
      message: 'Login successful',
      user: {
        id: user._id,
        fullName: user.fullName,
        employeeNo: user.employeeNo,
        role: user.role,
      },
      redirectUrl
    });

    // Set HTTP-Only Cookie
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 365, // 1 year (Persistent stay logged in)
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Login Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

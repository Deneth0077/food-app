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

    // Full Name max 20 characters validation
    if (fullName.trim().length > 20) {
      return NextResponse.json(
        { error: 'Full name cannot exceed 20 characters' },
        { status: 400 }
      );
    }

    // Phone Number exactly 10 digits validation
    const cleanPhone = phoneNumber.trim().replace(/\s+/g, '');
    if (!/^\d{10}$/.test(cleanPhone)) {
      return NextResponse.json(
        { error: 'Phone number must be exactly 10 digits (e.g., 0771234567)' },
        { status: 400 }
      );
    }

    const isPinValid = /^\d{4}$/.test(password);
    if (!isPinValid) {
      return NextResponse.json(
        { error: 'PIN must be exactly 4 digits' },
        { status: 400 }
      );
    }

    const cleanEmpNo = employeeNo.trim().toUpperCase();

    // Check role prefixes or numerical employee number validation
    let role = 'EMPLOYEE';
    if (cleanEmpNo.startsWith('SUPERADMIN')) {
      role = 'SUPERADMIN';
    } else if (cleanEmpNo.startsWith('ADMIN')) {
      role = 'ADMIN';
    } else if (cleanEmpNo.startsWith('CANTEEN')) {
      role = 'CANTEEN';
    } else if (cleanEmpNo.startsWith('CASHIER')) {
      role = 'CASHIER';
    } else {
      // Validate Employee Number: No english characters, exactly 4 digits zero padded (e.g. 0234, 0023, 0001), < 2000
      if (!/^\d{4}$/.test(cleanEmpNo)) {
        return NextResponse.json(
          { error: 'Employee number must be entered in 4-digit zero-padded format (e.g., 0234, 0023, 0001). English characters are not allowed.' },
          { status: 400 }
        );
      }

      const empVal = parseInt(cleanEmpNo, 10);
      if (isNaN(empVal) || empVal >= 2000 || empVal < 1) {
        return NextResponse.json(
          { error: 'Wrong Emp ID! All employee numbers must be less than 2000 (0001 to 1999).' },
          { status: 400 }
        );
      }
    }

    // Check if employeeNo unique
    const existingUser = await User.findOne({ employeeNo: cleanEmpNo });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Employee number is already registered' },
        { status: 400 }
      );
    }

    // Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);

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

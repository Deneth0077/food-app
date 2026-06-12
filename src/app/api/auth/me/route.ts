import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { verifyJWT } from '@/lib/jwt';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await dbConnect();
    
    // Get token using Next.js cookies() helper (robust and standard)
    const token = cookies().get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const jwtSecret = process.env.JWT_SECRET || 'fallback-jwt-secret-string-do-not-use-in-prod';
    const payload = await verifyJWT(token, jwtSecret);

    if (!payload || !payload.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await User.findById(payload.userId).select('-password');
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Account is deactivated' },
        { status: 403 }
      );
    }

    return NextResponse.json({ user });
  } catch (error: any) {
    console.error('Me Auth Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    await dbConnect();
    
    // Get token
    const token = cookies().get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const jwtSecret = process.env.JWT_SECRET || 'fallback-jwt-secret-string-do-not-use-in-prod';
    const payload = await verifyJWT(token, jwtSecret);

    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await User.findById(payload.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: 'Account is deactivated' }, { status: 403 });
    }

    const body = await request.json();
    const { fullName, pin } = body;

    if (fullName) {
      const trimmedName = fullName.trim();
      if (trimmedName.length < 2) {
        return NextResponse.json({ error: 'Full name must be at least 2 characters' }, { status: 400 });
      }
      user.fullName = trimmedName;
    }

    if (pin) {
      const trimmedPin = pin.trim();
      if (!/^\d{4}$/.test(trimmedPin)) {
        return NextResponse.json({ error: 'PIN must be exactly 4 digits' }, { status: 400 });
      }
      const hashedPassword = await bcrypt.hash(trimmedPin, 10);
      user.password = hashedPassword;
    }

    await user.save();

    // Remove password from response
    const updatedUser = user.toObject();
    delete updatedUser.password;

    return NextResponse.json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (error: any) {
    console.error('Update Profile Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

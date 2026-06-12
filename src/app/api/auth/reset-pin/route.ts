import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

// POST: Verify employeeNo + phoneNumber and update PIN
export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { employeeNo, phoneNumber, newPin } = body;

    if (!employeeNo || !phoneNumber) {
      return NextResponse.json(
        { error: 'Employee ID and Phone Number are required' },
        { status: 400 }
      );
    }

    // Find the user matching both Employee Number and Phone Number
    const user = await User.findOne({
      employeeNo: employeeNo.trim(),
      phoneNumber: phoneNumber.trim(),
    });

    if (!user) {
      return NextResponse.json(
        { error: 'No matching employee found with these details.' },
        { status: 404 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'This account is deactivated.' },
        { status: 403 }
      );
    }

    // If a new PIN is provided, hash and save it. Otherwise, this is a validation step.
    if (newPin !== undefined) {
      const trimmedPin = newPin.trim();
      if (!/^\d{4}$/.test(trimmedPin)) {
        return NextResponse.json(
          { error: 'PIN must be exactly 4 digits' },
          { status: 400 }
        );
      }

      const hashedPassword = await bcrypt.hash(trimmedPin, 10);
      user.password = hashedPassword;
      await user.save();

      return NextResponse.json({ message: 'PIN reset successfully.' });
    }

    // Validation step succeeded (tell frontend details match)
    return NextResponse.json({ message: 'Details verified successfully.', verified: true });
  } catch (error: any) {
    console.error('Reset PIN Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

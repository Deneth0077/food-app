import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Menu from '@/models/Menu';
import { getAuthUser } from '@/lib/jwt';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

// GET: Retrieve daily menu for a given date
export async function GET(request: Request) {
  try {
    await dbConnect();
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd');

    const menu = await Menu.findOne({ date });
    return NextResponse.json({ menu: menu || null, date });
  } catch (error: any) {
    console.error('Fetch Menu Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Create or update (upsert) menu items for a meal or whole day (Admin only)
export async function POST(request: Request) {
  try {
    await dbConnect();
    const user = await getAuthUser(request);

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { date, mealType, title, description, items, isAvailable, fullMenu } = body;

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    let menu = await Menu.findOne({ date });

    if (!menu) {
      menu = new Menu({
        date,
        createdBy: user.userId,
        breakfast: { title: '', description: '', items: [], isAvailable: true },
        lunch: { title: '', description: '', items: [], isAvailable: true },
        dinner: { title: '', description: '', items: [], isAvailable: true },
      });
    }

    // If updating a full menu payload directly
    if (fullMenu) {
      if (fullMenu.breakfast) menu.breakfast = fullMenu.breakfast;
      if (fullMenu.lunch) menu.lunch = fullMenu.lunch;
      if (fullMenu.dinner) menu.dinner = fullMenu.dinner;
    } else if (mealType) {
      const typeKey = mealType.toLowerCase() as 'breakfast' | 'lunch' | 'dinner';
      if (!['breakfast', 'lunch', 'dinner'].includes(typeKey)) {
        return NextResponse.json({ error: 'Invalid mealType' }, { status: 400 });
      }

      menu[typeKey] = {
        title: title !== undefined ? title : menu[typeKey]?.title || '',
        description: description !== undefined ? description : menu[typeKey]?.description || '',
        items: Array.isArray(items) ? items : menu[typeKey]?.items || [],
        isAvailable: isAvailable !== undefined ? isAvailable : (menu[typeKey]?.isAvailable ?? true),
      };
    }

    await menu.save();
    return NextResponse.json({ success: true, menu });
  } catch (error: any) {
    console.error('Save Menu Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// PUT: Update meal items or status (Admin only)
export async function PUT(request: Request) {
  return POST(request);
}

// DELETE: Delete a meal's items or entire menu for a date (Admin only)
export async function DELETE(request: Request) {
  try {
    await dbConnect();
    const user = await getAuthUser(request);

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const mealType = searchParams.get('mealType');

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    if (mealType) {
      const typeKey = mealType.toLowerCase() as 'breakfast' | 'lunch' | 'dinner';
      if (!['breakfast', 'lunch', 'dinner'].includes(typeKey)) {
        return NextResponse.json({ error: 'Invalid mealType' }, { status: 400 });
      }

      const menu = await Menu.findOne({ date });
      if (menu) {
        menu[typeKey] = {
          title: '',
          description: '',
          items: [],
          isAvailable: true,
        };
        await menu.save();
        return NextResponse.json({ success: true, menu, message: `${mealType} menu cleared` });
      }
      return NextResponse.json({ success: true, message: 'No menu found' });
    }

    // If no mealType, delete whole day's menu
    await Menu.deleteOne({ date });
    return NextResponse.json({ success: true, message: `Menu deleted for ${date}` });
  } catch (error: any) {
    console.error('Delete Menu Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

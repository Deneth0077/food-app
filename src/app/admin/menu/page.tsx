'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Utensils, 
  Coffee, 
  Moon, 
  Calendar as CalendarIcon, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  Copy, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  ChevronLeft, 
  Loader2, 
  Sparkles, 
  Tag,
  Clock,
  ArrowRight,
  Eye,
  Check
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, addDays, subDays } from 'date-fns';

interface MenuItem {
  name: string;
  category?: string;
  dietary?: 'VEG' | 'NON_VEG' | 'ALL';
}

interface MealPlan {
  title?: string;
  description?: string;
  items: MenuItem[];
  isAvailable: boolean;
}

interface DailyMenu {
  _id?: string;
  date: string;
  breakfast: MealPlan;
  lunch: MealPlan;
  dinner: MealPlan;
}

const DEFAULT_MEAL_PLAN: MealPlan = {
  title: '',
  description: '',
  items: [],
  isAvailable: true,
};

type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER';

export default function AdminMenuPage() {
  const router = useRouter();
  const { toast } = useToast();

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [activeMeal, setActiveMeal] = useState<MealType>('LUNCH');
  
  const [menu, setMenu] = useState<DailyMenu>({
    date: todayStr,
    breakfast: { ...DEFAULT_MEAL_PLAN },
    lunch: { ...DEFAULT_MEAL_PLAN },
    dinner: { ...DEFAULT_MEAL_PLAN },
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);

  // New item inputs
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Main');
  const [newItemDietary, setNewItemDietary] = useState<'ALL' | 'VEG' | 'NON_VEG'>('ALL');

  // Edit item state
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [editItemName, setEditItemName] = useState('');
  const [editItemCategory, setEditItemCategory] = useState('Main');
  const [editItemDietary, setEditItemDietary] = useState<'ALL' | 'VEG' | 'NON_VEG'>('ALL');

  // Meal title and description local edit state for active meal
  const currentMealKey = activeMeal.toLowerCase() as 'breakfast' | 'lunch' | 'dinner';
  const currentMealPlan = menu[currentMealKey] || DEFAULT_MEAL_PLAN;

  const fetchMenuForDate = useCallback(async (dateStr: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/menu?date=${dateStr}`);
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          router.push('/auth/login');
          return;
        }
        throw new Error('Failed to fetch menu');
      }

      const data = await res.json();
      if (data.menu) {
        setMenu({
          _id: data.menu._id,
          date: dateStr,
          breakfast: data.menu.breakfast || { ...DEFAULT_MEAL_PLAN },
          lunch: data.menu.lunch || { ...DEFAULT_MEAL_PLAN },
          dinner: data.menu.dinner || { ...DEFAULT_MEAL_PLAN },
        });
      } else {
        setMenu({
          date: dateStr,
          breakfast: { ...DEFAULT_MEAL_PLAN },
          lunch: { ...DEFAULT_MEAL_PLAN },
          dinner: { ...DEFAULT_MEAL_PLAN },
        });
      }
    } catch (err: any) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load menu for selected date.',
      });
    } finally {
      setLoading(false);
    }
  }, [router, toast]);

  useEffect(() => {
    fetchMenuForDate(selectedDate);
  }, [selectedDate, fetchMenuForDate]);

  // Handle adding a new item
  const handleAddItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newItemName.trim();
    if (!trimmed) {
      toast({
        variant: 'destructive',
        title: 'Item name required',
        description: 'Please enter a name for the menu item.',
      });
      return;
    }

    const newItem: MenuItem = {
      name: trimmed,
      category: newItemCategory,
      dietary: newItemDietary,
    };

    setMenu(prev => {
      const currentList = prev[currentMealKey]?.items || [];
      return {
        ...prev,
        [currentMealKey]: {
          ...prev[currentMealKey],
          items: [...currentList, newItem],
        },
      };
    });

    setNewItemName('');
  };

  // Handle removing an item
  const handleRemoveItem = (index: number) => {
    setMenu(prev => {
      const currentList = [...(prev[currentMealKey]?.items || [])];
      currentList.splice(index, 1);
      return {
        ...prev,
        [currentMealKey]: {
          ...prev[currentMealKey],
          items: currentList,
        },
      };
    });
  };

  // Start editing item
  const handleStartEdit = (index: number) => {
    const target = currentMealPlan.items[index];
    if (target) {
      setEditingItemIndex(index);
      setEditItemName(target.name);
      setEditItemCategory(target.category || 'Main');
      setEditItemDietary(target.dietary || 'ALL');
    }
  };

  // Save edited item
  const handleSaveEditItem = () => {
    if (editingItemIndex === null) return;
    const trimmed = editItemName.trim();
    if (!trimmed) return;

    setMenu(prev => {
      const currentList = [...(prev[currentMealKey]?.items || [])];
      currentList[editingItemIndex] = {
        name: trimmed,
        category: editItemCategory,
        dietary: editItemDietary,
      };
      return {
        ...prev,
        [currentMealKey]: {
          ...prev[currentMealKey],
          items: currentList,
        },
      };
    });

    setEditingItemIndex(null);
  };

  // Save current meal changes to backend
  const handleSaveMealMenu = async () => {
    try {
      setSaving(true);
      const payload = {
        date: selectedDate,
        mealType: activeMeal,
        title: currentMealPlan.title || '',
        description: currentMealPlan.description || '',
        items: currentMealPlan.items || [],
        isAvailable: currentMealPlan.isAvailable ?? true,
      };

      const res = await fetch('/api/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save menu');

      toast({
        title: 'Menu Saved!',
        description: `Successfully updated ${activeMeal.toLowerCase()} menu for ${selectedDate}.`,
      });

      // Refresh to ensure synced state
      fetchMenuForDate(selectedDate);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: err.message || 'Something went wrong while saving.',
      });
    } finally {
      setSaving(false);
    }
  };

  // Save full day menu at once
  const handleSaveFullDay = async () => {
    try {
      setSaving(true);
      const res = await fetch('/api/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          fullMenu: {
            breakfast: menu.breakfast,
            lunch: menu.lunch,
            dinner: menu.dinner,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save daily menu');

      toast({
        title: 'All Menus Saved',
        description: `All meal menus for ${selectedDate} have been saved successfully.`,
      });
      fetchMenuForDate(selectedDate);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to save all menus.',
      });
    } finally {
      setSaving(false);
    }
  };

  // Clear current active meal
  const handleClearCurrentMeal = async () => {
    if (!confirm(`Are you sure you want to clear the ${activeMeal} menu for ${selectedDate}?`)) {
      return;
    }

    try {
      setSaving(true);
      const res = await fetch(`/api/menu?date=${selectedDate}&mealType=${activeMeal}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to clear meal menu');

      toast({
        title: 'Meal Cleared',
        description: `${activeMeal} menu has been reset for ${selectedDate}.`,
      });
      fetchMenuForDate(selectedDate);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to clear meal.',
      });
    } finally {
      setSaving(false);
    }
  };

  // Copy menu from previous day helper
  const handleCopyFromYesterday = async () => {
    try {
      setCopying(true);
      const yesterday = subDays(new Date(selectedDate + 'T00:00:00'), 1);
      const yesterdayStr = format(yesterday, 'yyyy-MM-dd');

      const res = await fetch(`/api/menu?date=${yesterdayStr}`);
      if (!res.ok) throw new Error('Failed to fetch previous day menu');

      const data = await res.json();
      if (!data.menu || (!data.menu.breakfast.items.length && !data.menu.lunch.items.length && !data.menu.dinner.items.length)) {
        toast({
          variant: 'destructive',
          title: 'No Menu Found',
          description: `No menu found on previous day (${yesterdayStr}) to copy from.`,
        });
        return;
      }

      setMenu(prev => ({
        ...prev,
        breakfast: data.menu.breakfast || { ...DEFAULT_MEAL_PLAN },
        lunch: data.menu.lunch || { ...DEFAULT_MEAL_PLAN },
        dinner: data.menu.dinner || { ...DEFAULT_MEAL_PLAN },
      }));

      toast({
        title: 'Copied from Previous Day',
        description: `Loaded menu from ${yesterdayStr}. Click "Save All Day Menus" to apply.`,
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Copy Failed',
        description: err.message || 'Failed to copy menu.',
      });
    } finally {
      setCopying(false);
    }
  };

  // Common popular items suggestions for quick addition
  const quickSuggestions: Record<MealType, string[]> = {
    BREAKFAST: [
      'String Hoppers',
      'Kiri Hodi',
      'Pol Sambol',
      'Egg Curry',
      'Dhal Curry',
      'Bread & Butter',
      'Roast Paan',
      'Seeni Sambol',
      'Fish Curry',
      'Plantains / Banana',
    ],
    LUNCH: [
      'Steamed White Rice',
      'Red Rice',
      'Fried Rice',
      'Dhal Curry',
      'Chicken Curry',
      'Fish Ambul Thiyal',
      'Polos Curry',
      'Gotukola Sambol',
      'Brinjal Moju',
      'Papadam',
    ],
    DINNER: [
      'Egg Fried Rice',
      'Chicken Kottu',
      'Vegetable Kottu',
      'String Hopper Kottu',
      'Chilli Paste',
      'Chicken Curry Gravy',
      'Dhal Curry',
      'Parata',
      'Vegetable Soup',
    ],
  };

  const handleAddSuggestion = (itemName: string) => {
    if (currentMealPlan.items.some(i => i.name.toLowerCase() === itemName.toLowerCase())) {
      toast({
        title: 'Already added',
        description: `"${itemName}" is already in this meal menu.`,
      });
      return;
    }
    const isVeg = itemName.toLowerCase().includes('dhal') || 
                  itemName.toLowerCase().includes('sambol') || 
                  itemName.toLowerCase().includes('vegetable') || 
                  itemName.toLowerCase().includes('polos') || 
                  itemName.toLowerCase().includes('rice');
    const isNonVeg = itemName.toLowerCase().includes('chicken') || 
                     itemName.toLowerCase().includes('fish') || 
                     itemName.toLowerCase().includes('egg') || 
                     itemName.toLowerCase().includes('meat');

    const dietary = isNonVeg ? 'NON_VEG' : isVeg ? 'VEG' : 'ALL';

    setMenu(prev => {
      const currentList = prev[currentMealKey]?.items || [];
      return {
        ...prev,
        [currentMealKey]: {
          ...prev[currentMealKey],
          items: [...currentList, { name: itemName, category: 'Curry', dietary }],
        },
      };
    });
  };

  const formattedDateHeader = format(new Date(selectedDate + 'T00:00:00'), 'EEEE, MMMM dd, yyyy');

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Top Header */}
      <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-100 flex items-center justify-between px-5 shadow-xs">
        <div className="flex items-center gap-3">
          <Link 
            href="/admin/dashboard" 
            className="p-2 -ml-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors"
            title="Back to Dashboard"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Utensils className="h-4.5 w-4.5 stroke-[2.25]" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-slate-800 tracking-tight leading-none">Meal Menu Management</h1>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1 leading-none">Daily Meal Planner</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveFullDay}
            disabled={saving}
            className="h-9 px-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all active:scale-95"
            title="Save all meals for this date"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            <span>Save All</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 p-4 md:p-5 space-y-4 max-w-[540px] mx-auto w-full pb-28">

        {/* Date Selector Card */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-3">
          <div className="flex items-center justify-between">
            <label htmlFor="menuDate" className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <CalendarIcon className="h-3.5 w-3.5 text-blue-600" />
              Select Menu Date
            </label>
            <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
              {formattedDateHeader}
            </span>
          </div>

          <div className="flex gap-2">
            <input
              id="menuDate"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:border-blue-500 focus-visible:outline-none transition-all cursor-pointer shadow-xs"
            />
            <button
              onClick={() => fetchMenuForDate(selectedDate)}
              disabled={loading}
              className="px-3 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold transition-all flex items-center justify-center"
              title="Refresh Menu"
            >
              <RotateCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Quick Date Chips */}
          <div className="flex items-center gap-2 pt-0.5">
            <span className="text-[10px] font-bold text-slate-400">Quick:</span>
            <button
              type="button"
              onClick={() => setSelectedDate(todayStr)}
              className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                selectedDate === todayStr
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(format(addDays(new Date(), 1), 'yyyy-MM-dd'))}
              className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                selectedDate === format(addDays(new Date(), 1), 'yyyy-MM-dd')
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Tomorrow
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(format(addDays(new Date(), 2), 'yyyy-MM-dd'))}
              className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                selectedDate === format(addDays(new Date(), 2), 'yyyy-MM-dd')
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              +2 Days
            </button>

            <button
              type="button"
              onClick={handleCopyFromYesterday}
              disabled={copying}
              className="ml-auto text-[10px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50/70 border border-indigo-100 px-2 py-1 rounded-lg flex items-center gap-1 transition-all active:scale-95"
              title="Copy all menus from yesterday"
            >
              {copying ? <Loader2 className="h-3 w-3 animate-spin" /> : <Copy className="h-3 w-3" />}
              <span>Copy Prev Day</span>
            </button>
          </div>
        </div>

        {/* 3 Meal Selection Buttons (Breakfast, Lunch, Dinner) */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-1">
            Choose Meal Session
          </div>
          <div className="grid grid-cols-3 gap-2">
            {/* Breakfast Button */}
            <button
              type="button"
              onClick={() => setActiveMeal('BREAKFAST')}
              className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all active:scale-[0.98] ${
                activeMeal === 'BREAKFAST'
                  ? 'bg-gradient-to-b from-amber-50 to-amber-100/60 border-amber-400 shadow-md ring-2 ring-amber-400/20 text-amber-900'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              <div className={`h-8 w-8 rounded-xl flex items-center justify-center transition-colors ${
                activeMeal === 'BREAKFAST' ? 'bg-amber-500 text-white shadow-xs' : 'bg-amber-50 text-amber-600'
              }`}>
                <Coffee className="h-4.5 w-4.5 stroke-[2.25]" />
              </div>
              <div className="text-center">
                <span className="text-xs font-black block">Breakfast</span>
                <span className={`text-[9px] font-bold uppercase tracking-wider ${
                  (menu.breakfast?.items?.length || 0) > 0 ? 'text-amber-700 font-extrabold' : 'text-slate-400'
                }`}>
                  {menu.breakfast?.items?.length || 0} items
                </span>
              </div>
            </button>

            {/* Lunch Button */}
            <button
              type="button"
              onClick={() => setActiveMeal('LUNCH')}
              className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all active:scale-[0.98] ${
                activeMeal === 'LUNCH'
                  ? 'bg-gradient-to-b from-blue-50 to-blue-100/60 border-blue-500 shadow-md ring-2 ring-blue-400/20 text-blue-950'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              <div className={`h-8 w-8 rounded-xl flex items-center justify-center transition-colors ${
                activeMeal === 'LUNCH' ? 'bg-blue-600 text-white shadow-xs' : 'bg-blue-50 text-blue-600'
              }`}>
                <Utensils className="h-4.5 w-4.5 stroke-[2.25]" />
              </div>
              <div className="text-center">
                <span className="text-xs font-black block">Lunch</span>
                <span className={`text-[9px] font-bold uppercase tracking-wider ${
                  (menu.lunch?.items?.length || 0) > 0 ? 'text-blue-700 font-extrabold' : 'text-slate-400'
                }`}>
                  {menu.lunch?.items?.length || 0} items
                </span>
              </div>
            </button>

            {/* Dinner Button */}
            <button
              type="button"
              onClick={() => setActiveMeal('DINNER')}
              className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all active:scale-[0.98] ${
                activeMeal === 'DINNER'
                  ? 'bg-gradient-to-b from-indigo-50 to-indigo-100/60 border-indigo-500 shadow-md ring-2 ring-indigo-400/20 text-indigo-950'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              <div className={`h-8 w-8 rounded-xl flex items-center justify-center transition-colors ${
                activeMeal === 'DINNER' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-indigo-50 text-indigo-600'
              }`}>
                <Moon className="h-4.5 w-4.5 stroke-[2.25]" />
              </div>
              <div className="text-center">
                <span className="text-xs font-black block">Dinner</span>
                <span className={`text-[9px] font-bold uppercase tracking-wider ${
                  (menu.dinner?.items?.length || 0) > 0 ? 'text-indigo-700 font-extrabold' : 'text-slate-400'
                }`}>
                  {menu.dinner?.items?.length || 0} items
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Selected Meal Configuration Card */}
        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-4">
          {/* Header of Active Meal */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${
                activeMeal === 'BREAKFAST'
                  ? 'bg-amber-100 text-amber-800'
                  : activeMeal === 'LUNCH'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-indigo-100 text-indigo-800'
              }`}>
                {activeMeal} MENU
              </span>
              <span className="text-[11px] font-bold text-slate-400">
                ({currentMealPlan.items.length} items configured)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClearCurrentMeal}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
                title={`Clear ${activeMeal} items`}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear</span>
              </button>
            </div>
          </div>

          {/* Optional Meal Title & Description */}
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                Meal Special Highlight / Title (Optional)
              </label>
              <input
                type="text"
                placeholder={
                  activeMeal === 'BREAKFAST'
                    ? 'e.g., Traditional Sri Lankan String Hoppers Feast'
                    : activeMeal === 'LUNCH'
                    ? 'e.g., Special Chicken Biryani & Rice and Curry'
                    : 'e.g., Chinese Egg Fried Rice & Chilli Paste'
                }
                value={currentMealPlan.title || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setMenu(prev => ({
                    ...prev,
                    [currentMealKey]: {
                      ...prev[currentMealKey],
                      title: val,
                    },
                  }));
                }}
                className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-500 focus-visible:outline-none transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Quick Add Item Bar */}
          <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80 space-y-2.5">
            <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1">
              <Plus className="h-3 w-3 text-blue-600 stroke-[3]" />
              Add Food Item to {activeMeal}
            </label>

            <form onSubmit={handleAddItem} className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type dish / food item name (e.g. Dhal Curry, Chicken, Sambol)..."
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="flex-1 h-10 px-3.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:border-blue-500 focus-visible:outline-none transition-all placeholder:text-slate-400 shadow-xs"
                />
                <button
                  type="submit"
                  disabled={!newItemName.trim()}
                  className="h-10 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1 shadow-xs transition-all active:scale-95 shrink-0"
                >
                  <Plus className="h-4 w-4 stroke-[2.5]" />
                  <span>Add Item</span>
                </button>
              </div>

              {/* Tag / Category Chips */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[9px] font-bold text-slate-400">Dietary:</span>
                {(['ALL', 'VEG', 'NON_VEG'] as const).map(diet => (
                  <button
                    key={diet}
                    type="button"
                    onClick={() => setNewItemDietary(diet)}
                    className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md border transition-all ${
                      newItemDietary === diet
                        ? diet === 'VEG' 
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-black'
                          : diet === 'NON_VEG'
                          ? 'bg-rose-100 text-rose-800 border-rose-300 font-black'
                          : 'bg-slate-800 text-white border-slate-800'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {diet === 'ALL' ? 'General' : diet === 'VEG' ? '🟢 Vegetarian' : '🔴 Non-Veg'}
                  </button>
                ))}

                <span className="text-[9px] font-bold text-slate-400 ml-1">Type:</span>
                {['Main', 'Curry', 'Side', 'Dessert'].map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setNewItemCategory(cat)}
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-md border transition-all ${
                      newItemCategory === cat
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </form>

            {/* Quick Suggestions Chips */}
            <div className="pt-2 border-t border-slate-200/60">
              <div className="flex items-center gap-1 mb-1.5">
                <Sparkles className="h-3 w-3 text-amber-500" />
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">
                  Quick Add Suggestions for {activeMeal}:
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {quickSuggestions[activeMeal].map(suggest => (
                  <button
                    key={suggest}
                    type="button"
                    onClick={() => handleAddSuggestion(suggest)}
                    className="text-[10px] font-semibold bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-slate-200 text-slate-600 px-2 py-1 rounded-lg transition-colors flex items-center gap-1 active:scale-95"
                  >
                    <Plus className="h-2.5 w-2.5 text-blue-500 stroke-[3]" />
                    {suggest}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* List of Added Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                Current {activeMeal} Items
                <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {currentMealPlan.items.length}
                </span>
              </h3>
            </div>

            {currentMealPlan.items.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <Utensils className="h-8 w-8 text-slate-300 mx-auto mb-2 stroke-[1.5]" />
                <p className="text-xs font-bold text-slate-500">No items added to {activeMeal.toLowerCase()} yet.</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Use the input bar above or click quick suggestions to add items.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {currentMealPlan.items.map((item, index) => {
                  const isEditing = editingItemIndex === index;

                  if (isEditing) {
                    return (
                      <div key={index} className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={editItemName}
                            onChange={(e) => setEditItemName(e.target.value)}
                            className="flex-1 h-9 px-3 bg-white border border-blue-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={handleSaveEditItem}
                            className="h-9 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center gap-1"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingItemIndex(null)}
                            className="h-9 px-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                        <div className="flex gap-1.5 text-[9px]">
                          {(['ALL', 'VEG', 'NON_VEG'] as const).map(diet => (
                            <button
                              key={diet}
                              type="button"
                              onClick={() => setEditItemDietary(diet)}
                              className={`px-2 py-0.5 rounded border font-bold ${
                                editItemDietary === diet
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-white text-slate-600 border-slate-200'
                              }`}
                            >
                              {diet}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-white hover:bg-slate-50/80 border border-slate-100 rounded-xl shadow-xs transition-colors group"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="h-6 w-6 rounded-lg bg-slate-100 text-slate-500 font-black text-[10px] flex items-center justify-center shrink-0">
                          {index + 1}
                        </span>
                        <div>
                          <div className="text-xs font-extrabold text-slate-800 leading-tight">
                            {item.name}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {item.category && (
                              <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                                {item.category}
                              </span>
                            )}
                            {item.dietary === 'VEG' && (
                              <span className="text-[8px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.2 rounded">
                                VEG
                              </span>
                            )}
                            {item.dietary === 'NON_VEG' && (
                              <span className="text-[8px] font-extrabold text-rose-700 bg-rose-50 border border-rose-100 px-1.5 py-0.2 rounded">
                                NON-VEG
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(index)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Item"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action buttons for current meal */}
          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={handleSaveMealMenu}
              disabled={saving}
              className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>Save {activeMeal} Menu</span>
            </button>
          </div>
        </div>

        {/* Full Day Summary Preview Card */}
        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5 text-blue-600" />
              Full Day Menu Overview ({selectedDate})
            </h3>
            <span className="text-[10px] font-bold text-slate-400">
              Live Preview
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {/* Breakfast mini preview */}
            <div 
              onClick={() => setActiveMeal('BREAKFAST')}
              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                activeMeal === 'BREAKFAST'
                  ? 'border-amber-400 bg-amber-50/40'
                  : 'border-slate-100 bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-extrabold text-amber-700 uppercase flex items-center gap-1">
                  <Coffee className="h-3 w-3" /> Breakfast
                </span>
                <span className="text-[9px] font-bold bg-white px-1.5 py-0.2 rounded border border-slate-200 text-slate-500">
                  {menu.breakfast?.items?.length || 0}
                </span>
              </div>
              {menu.breakfast?.title && (
                <p className="text-[11px] font-bold text-slate-800 truncate mb-1">{menu.breakfast.title}</p>
              )}
              <p className="text-[10px] text-slate-500 font-medium line-clamp-2">
                {menu.breakfast?.items?.length 
                  ? menu.breakfast.items.map(i => i.name).join(', ')
                  : 'No items yet'}
              </p>
            </div>

            {/* Lunch mini preview */}
            <div 
              onClick={() => setActiveMeal('LUNCH')}
              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                activeMeal === 'LUNCH'
                  ? 'border-blue-400 bg-blue-50/40'
                  : 'border-slate-100 bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-extrabold text-blue-700 uppercase flex items-center gap-1">
                  <Utensils className="h-3 w-3" /> Lunch
                </span>
                <span className="text-[9px] font-bold bg-white px-1.5 py-0.2 rounded border border-slate-200 text-slate-500">
                  {menu.lunch?.items?.length || 0}
                </span>
              </div>
              {menu.lunch?.title && (
                <p className="text-[11px] font-bold text-slate-800 truncate mb-1">{menu.lunch.title}</p>
              )}
              <p className="text-[10px] text-slate-500 font-medium line-clamp-2">
                {menu.lunch?.items?.length 
                  ? menu.lunch.items.map(i => i.name).join(', ')
                  : 'No items yet'}
              </p>
            </div>

            {/* Dinner mini preview */}
            <div 
              onClick={() => setActiveMeal('DINNER')}
              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                activeMeal === 'DINNER'
                  ? 'border-indigo-400 bg-indigo-50/40'
                  : 'border-slate-100 bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-extrabold text-indigo-700 uppercase flex items-center gap-1">
                  <Moon className="h-3 w-3" /> Dinner
                </span>
                <span className="text-[9px] font-bold bg-white px-1.5 py-0.2 rounded border border-slate-200 text-slate-500">
                  {menu.dinner?.items?.length || 0}
                </span>
              </div>
              {menu.dinner?.title && (
                <p className="text-[11px] font-bold text-slate-800 truncate mb-1">{menu.dinner.title}</p>
              )}
              <p className="text-[10px] text-slate-500 font-medium line-clamp-2">
                {menu.dinner?.items?.length 
                  ? menu.dinner.items.map(i => i.name).join(', ')
                  : 'No items yet'}
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

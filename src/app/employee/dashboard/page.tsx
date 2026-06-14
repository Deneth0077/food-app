'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { format, subDays } from 'date-fns';
import { 
  Coffee, 
  Utensils, 
  Moon, 
  Plus, 
  Check, 
  RefreshCw, 
  Bell, 
  User as UserIcon,
  CircleAlert,
  ChevronRight,
  TrendingUp,
  XCircle,
  LogOut,
  Calendar
} from 'lucide-react';
import InstallAppButton from '@/components/InstallAppButton';

interface UserProfile {
  _id: string;
  fullName: string;
  employeeNo: string;
  phoneNumber: string;
  role: string;
}

interface Order {
  _id: string;
  mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER';
  mealOption?: 'VEGETARIAN' | 'MEAT';
  status: 'ORDERED' | 'COLLECTED';
  requestDate: string;
  requestedAt: string;
  collectedAt?: string;
  notes?: string;
}

export default function EmployeeDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [user, setUser] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingMeal, setSubmittingMeal] = useState<string | null>(null);
  const [activeMealSelection, setActiveMealSelection] = useState<'BREAKFAST' | 'LUNCH' | 'DINNER' | null>(null);
  const [selectedOption, setSelectedOption] = useState<'VEGETARIAN' | 'MEAT' | null>(null);
  const [orderNotes, setOrderNotes] = useState('');
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [isUpdatingNotesOnly, setIsUpdatingNotesOnly] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');

  const [selectedBookingDate, setSelectedBookingDate] = useState<string>(todayStr);
  const [activeTab, setActiveTab] = useState<'ORDER' | 'HISTORY'>('ORDER');
  const [prices, setPrices] = useState({ breakfast: 300, lunch: 350, dinner: 400 });

  const selectedDateObj = new Date(selectedBookingDate + 'T00:00:00');
  const tomorrowOfSelectedObj = new Date(selectedDateObj.getTime());
  tomorrowOfSelectedObj.setDate(tomorrowOfSelectedObj.getDate() + 1);
  const tomorrowOfSelectedStr = format(tomorrowOfSelectedObj, 'yyyy-MM-dd');

  const isMealLocked = useCallback((mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER', bookingDateStr: string) => {
    const now = new Date();
    const targetDate = new Date(bookingDateStr + 'T00:00:00');
    
    let lockTime: Date;
    if (mealType === 'BREAKFAST') {
      const dayBefore = new Date(targetDate.getTime());
      dayBefore.setDate(dayBefore.getDate() - 1);
      dayBefore.setHours(20, 0, 0, 0); // 8:00 PM
      lockTime = dayBefore;
    } else if (mealType === 'LUNCH') {
      const dayOf = new Date(targetDate.getTime());
      dayOf.setHours(9, 0, 0, 0); // 9:00 AM
      lockTime = dayOf;
    } else {
      const dayOf = new Date(targetDate.getTime());
      dayOf.setHours(17, 0, 0, 0); // 5:00 PM
      lockTime = dayOf;
    }
    
    return now.getTime() >= lockTime.getTime();
  }, []);

  const isBreakfastLocked = isMealLocked('BREAKFAST', tomorrowOfSelectedStr);
  const isLunchLocked = isMealLocked('LUNCH', selectedBookingDate);
  const isDinnerLocked = isMealLocked('DINNER', selectedBookingDate);

  const getMealLockedStatus = useCallback((mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER') => {
    if (mealType === 'BREAKFAST') return isBreakfastLocked;
    if (mealType === 'LUNCH') return isLunchLocked;
    return isDinnerLocked;
  }, [isBreakfastLocked, isLunchLocked, isDinnerLocked]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch user profile
      const userRes = await fetch('/api/auth/me');
      if (!userRes.ok) {
        router.push('/auth/login');
        return;
      }
      const userData = await userRes.json();
      setUser(userData.user);

      // Fetch employee orders
      const ordersRes = await fetch('/api/orders');
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setOrders(ordersData.orders || []);
      }

      // Fetch active prices
      const pricesRes = await fetch('/api/canteen/prices');
      if (pricesRes.ok) {
        const pricesData = await pricesRes.json();
        if (pricesData.prices) {
          setPrices({
            breakfast: pricesData.prices.breakfast,
            lunch: pricesData.prices.lunch,
            dinner: pricesData.prices.dinner
          });
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load dashboard data. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  }, [router, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Handle meal request submission
  const handleRequestMeal = async (mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER', mealOption?: 'VEGETARIAN' | 'MEAT', notes?: string) => {
    setSubmittingMeal(mealType);
    try {
      const targetDateStr = mealType === 'BREAKFAST' ? tomorrowOfSelectedStr : selectedBookingDate;
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mealType, mealOption, notes, requestDate: targetDateStr }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit request');
      }

      toast({
        title: 'Request Submitted',
        description: `Successfully requested ${mealType.toLowerCase()} for today.`,
      });

      // Refresh data
      fetchData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Request Failed',
        description: error.message || 'Something went wrong',
      });
    } finally {
      setSubmittingMeal(null);
    }
  };

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (!res.ok) throw new Error('Logout failed');
      
      toast({
        title: 'Logged Out',
        description: 'You have been logged out successfully.',
      });
      router.push('/auth/login');
      router.refresh();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to log out. Please try again.',
      });
    }
  };

  const handleUpdateOrder = async (mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER', mealOption: 'VEGETARIAN' | 'MEAT', notes: string) => {
    try {
      const targetDateStr = mealType === 'BREAKFAST' ? tomorrowOfSelectedStr : selectedBookingDate;
      const res = await fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mealType, mealOption, notes, requestDate: targetDateStr }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update request');
      }

      toast({
        title: 'Request Updated',
        description: `Successfully updated your ${mealType.toLowerCase()} request.`,
      });

      // Refresh data
      fetchData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error.message || 'Something went wrong',
      });
    }
  };

  const handleCancelOrder = async (mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER') => {
    if (!confirm(`Are you sure you want to cancel your ${mealType.toLowerCase()} order?`)) return;
    try {
      const targetDateStr = mealType === 'BREAKFAST' ? tomorrowOfSelectedStr : selectedBookingDate;
      const res = await fetch(`/api/orders?mealType=${mealType}&requestDate=${targetDateStr}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel order');

      toast({
        title: 'Order Cancelled',
        description: `Successfully cancelled your ${mealType.toLowerCase()} meal request.`,
      });

      // Refresh data
      fetchData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Cancellation Failed',
        description: error.message || 'Something went wrong',
      });
    }
  };

  const handleSkipTimer = async (mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER') => {
    if (!confirm(`Are you sure you want to skip the cancellation grace period and finalize your ${mealType.toLowerCase()} order? It cannot be cancelled after this.`)) return;
    try {
      const targetDateStr = mealType === 'BREAKFAST' ? tomorrowOfSelectedStr : selectedBookingDate;
      const res = await fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mealType, skipTimer: true, requestDate: targetDateStr }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to skip timer');

      toast({
        title: 'Order Finalized',
        description: `Successfully finalized your ${mealType.toLowerCase()} order.`,
      });

      // Refresh data
      fetchData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Action Failed',
        description: error.message || 'Something went wrong',
      });
    }
  };

  // isMealLocked is now defined dynamically above

  const handleCardClick = (mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER') => {
    let existingOrder;
    if (mealType === 'BREAKFAST') {
      existingOrder = orders.find(o => o.requestDate === tomorrowOfSelectedStr && o.mealType === 'BREAKFAST');
    } else if (mealType === 'LUNCH') {
      existingOrder = orders.find(o => o.requestDate === selectedBookingDate && o.mealType === 'LUNCH');
    } else {
      existingOrder = orders.find(o => o.requestDate === selectedBookingDate && o.mealType === 'DINNER');
    }

    if (getMealLockedStatus(mealType)) {
      if (existingOrder) {
        toast({
          title: 'Booking Closed',
          description: `Booking for this ${mealType.toLowerCase()} is closed. You cannot modify or cancel this request.`,
        });
      } else {
        const targetDateText = mealType === 'BREAKFAST' 
          ? (tomorrowOfSelectedStr === tomorrowStr ? 'tomorrow\'s' : `scheduled ${tomorrowOfSelectedStr}`)
          : (selectedBookingDate === todayStr ? 'today\'s' : `scheduled ${selectedBookingDate}`);
        const displayTime = mealType === 'BREAKFAST' 
          ? `8:00 PM on ${format(subDays(new Date(tomorrowOfSelectedStr + 'T00:00:00'), 1), 'yyyy-MM-dd')}` 
          : mealType === 'LUNCH' ? `9:00 AM on ${selectedBookingDate}` : `5:00 PM on ${selectedBookingDate}`;
        toast({
          variant: 'destructive',
          title: 'Booking Closed',
          description: `Booking for ${targetDateText} ${mealType.toLowerCase()} closed at ${displayTime}.`,
        });
      }
      return;
    }

    if (existingOrder) {
      if (existingOrder.status === 'COLLECTED') {
        toast({
          title: 'Meal Collected',
          description: `You have already collected this ${mealType.toLowerCase()}.`,
        });
        return;
      }
      setIsUpdatingNotesOnly(true);
      setSelectedOption(existingOrder.mealOption || null);
      setOrderNotes(existingOrder.notes || '');
      setActiveMealSelection(mealType);
    } else {
      setIsUpdatingNotesOnly(false);
      setSelectedOption(null);
      setOrderNotes('');
      setActiveMealSelection(mealType);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm font-semibold text-slate-500">Loading your profile...</p>
        </div>
      </div>
    );
  }

  const activeBreakfastOrder = orders.find(o => o.requestDate === tomorrowOfSelectedStr && o.mealType === 'BREAKFAST');
  const activeLunchOrder = orders.find(o => o.requestDate === selectedBookingDate && o.mealType === 'LUNCH');
  const activeDinnerOrder = orders.find(o => o.requestDate === selectedBookingDate && o.mealType === 'DINNER');
  
  const getMealStatus = (mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER') => {
    let order;
    if (mealType === 'BREAKFAST') {
      order = activeBreakfastOrder;
    } else if (mealType === 'LUNCH') {
      order = activeLunchOrder;
    } else {
      order = activeDinnerOrder;
    }
    if (!order) return 'Not Requested';
    return order.status === 'COLLECTED' ? 'Collected' : 'Pending';
  };

  const breakfastStatus = getMealStatus('BREAKFAST');
  const lunchStatus = getMealStatus('LUNCH');
  const dinnerStatus = getMealStatus('DINNER');

  // Greeting
  const currentHour = new Date().getHours();
  let greeting = 'Good Morning';
  if (currentHour >= 12 && currentHour < 17) {
    greeting = 'Good Afternoon';
  } else if (currentHour >= 17) {
    greeting = 'Good Evening';
  }

  const recentHistory = orders.slice(0, 4);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-100 flex items-center justify-between px-5 shadow-sm">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" className="h-11 object-contain" alt="ZPMC Lanka" />
          <div className="h-6 w-[1px] bg-slate-200" />
          <div>
            <h1 className="text-sm font-bold text-slate-850 tracking-tight leading-none">Meal Logistics</h1>
            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mt-1.5 leading-none">Employee Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 relative">
          <div className="relative p-2 rounded-full hover:bg-slate-100 transition-colors cursor-pointer">
            <Bell className="h-5.5 w-5.5 text-slate-600" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
          </div>
          <div 
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            className="h-9 w-9 rounded-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white flex items-center justify-center font-bold text-sm shadow-sm select-none cursor-pointer transition-all"
          >
            {user?.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
          </div>
          {showProfileDropdown && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowProfileDropdown(false)} 
              />
              <div className="absolute right-0 top-12 w-44 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-1.5 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-800 truncate">{user?.fullName}</p>
                  <p className="text-[10px] text-slate-400 truncate">{user?.employeeNo}</p>
                </div>
                <button
                  onClick={() => {
                    setShowProfileDropdown(false);
                    router.push('/employee/profile');
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                >
                  <UserIcon className="h-4 w-4 text-slate-500" />
                  View Profile
                </button>
                <button
                  onClick={async () => {
                    setShowProfileDropdown(false);
                    await handleLogout();
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors border-t border-slate-100"
                >
                  <LogOut className="h-4 w-4 text-red-500" />
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Content wrapper */}
      <div className="flex-1 p-5 space-y-5 overflow-y-auto pb-24">
        {/* Install App Banner */}
        <InstallAppButton />

        {/* Welcome Card */}
        <div className="bg-gradient-to-br from-blue-800 to-blue-600 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
          <div className="absolute right-[-20px] bottom-[-20px] opacity-10">
            <Utensils className="h-40 w-40" />
          </div>
          <p className="text-[11px] font-bold text-blue-100 uppercase tracking-widest">
            {format(new Date(), 'EEEE, MMMM dd')}
          </p>
          <h2 className="text-2xl font-bold mt-1 tracking-tight">
            {greeting}, {user?.fullName.split(' ')[0]}
          </h2>
          <p className="text-xs text-blue-50 mt-1.5 font-medium leading-relaxed max-w-[280px]">
            Manage your daily meal requests and view upcoming collections.
          </p>
        </div>

        {/* Employee Info Card */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <UserIcon className="h-6 w-6 stroke-[2.25]" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Employee ID</p>
            <p className="text-sm font-bold text-slate-800">{user?.employeeNo}</p>
            <p className="text-[11px] font-medium text-slate-500 mt-0.5">{user?.phoneNumber}</p>
          </div>
          <div className="bg-slate-50 rounded-lg px-2.5 py-1 text-[10px] font-bold text-slate-500 border border-slate-100">
            Active
          </div>
        </div>

        {/* Portal Tabs */}
        <div className="bg-white p-1 rounded-xl border border-slate-200/60 shadow-sm flex gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('ORDER')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'ORDER' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            Order Meals
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('HISTORY')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'HISTORY' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            Collection History
          </button>
        </div>

        {activeTab === 'ORDER' ? (
          <>
            {/* Date Selector Toolbar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Calendar className="h-4.5 w-4.5 text-blue-600" />
              Select Booking Date
            </h3>
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
              Selected: {format(selectedDateObj, 'EEE, MMM dd')}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => setSelectedBookingDate(todayStr)}
              className={`py-2 text-xs font-bold rounded-xl transition-all duration-200 ${
                selectedBookingDate === todayStr
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-100/50'
                  : 'bg-slate-50 text-slate-650 hover:bg-slate-100 hover:text-slate-800 border border-slate-100'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setSelectedBookingDate(tomorrowStr)}
              className={`py-2 text-xs font-bold rounded-xl transition-all duration-200 ${
                selectedBookingDate === tomorrowStr
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-100/50'
                  : 'bg-slate-50 text-slate-650 hover:bg-slate-100 hover:text-slate-800 border border-slate-100'
              }`}
            >
              Tomorrow
            </button>
            <div className="relative">
              <input
                type="date"
                min={todayStr}
                value={selectedBookingDate}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedBookingDate(e.target.value);
                  }
                }}
                className={`w-full py-1.5 px-2 text-xs font-bold rounded-xl bg-slate-50 hover:bg-slate-100 border transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-center ${
                  selectedBookingDate !== todayStr && selectedBookingDate !== tomorrowStr
                    ? 'border-blue-500 text-blue-700 font-extrabold bg-blue-50/20'
                    : 'border-slate-100 text-slate-600'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Request Meals Section */}
        <div className="space-y-3">
          <h3 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
            Request Meals
          </h3>
          
          <div className="space-y-3">
            {/* Breakfast Request Card */}
            <div 
              onClick={() => handleCardClick('BREAKFAST')}
              className={`p-4 rounded-2xl border flex items-center justify-between transition-all duration-300 transform cursor-pointer hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 active:scale-[0.99] ${
                isBreakfastLocked && !activeBreakfastOrder
                  ? 'bg-slate-100/50 border-slate-200 opacity-60' 
                  : 'bg-white border-slate-100 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                  isBreakfastLocked && !activeBreakfastOrder ? 'bg-slate-200 text-slate-400' : 'bg-amber-50 text-amber-500'
                }`}>
                  <Coffee className="h-5.5 w-5.5 stroke-[2.25]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-855">Breakfast <span className="text-xs font-normal text-slate-500">(Rs. {prices.breakfast})</span></h4>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700">
                      {tomorrowOfSelectedStr === tomorrowStr 
                        ? `For Tomorrow (${format(tomorrowOfSelectedObj, 'MMM dd')})` 
                        : `For ${format(tomorrowOfSelectedObj, 'EEE, MMM dd')}`
                      }
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold mt-1">
                    {isBreakfastLocked && !activeBreakfastOrder ? (
                      <span className="text-red-500 font-bold">Booking Closed</span>
                    ) : (
                      `Book before 8:00 PM on ${format(subDays(tomorrowOfSelectedObj, 1), 'MMM dd')}`
                    )}
                  </p>
                </div>
              </div>
              <div>
                {breakfastStatus !== 'Not Requested' ? (
                  <div className="h-9 w-9 rounded-full flex items-center justify-center bg-green-50 text-green-600 border border-green-100">
                    <Check className="h-4.5 w-4.5 stroke-[2.5]" />
                  </div>
                ) : submittingMeal === 'BREAKFAST' ? (
                  <div className="h-9 w-9 rounded-full flex items-center justify-center bg-slate-100 text-slate-500">
                    <RefreshCw className="h-4.5 w-4.5 animate-spin" />
                  </div>
                ) : isBreakfastLocked ? (
                  <span className="text-xs font-bold text-slate-400">Locked</span>
                ) : null}
              </div>
            </div>

            {/* Lunch Request Card */}
            <div 
              onClick={() => handleCardClick('LUNCH')}
              className={`p-4 rounded-2xl border flex items-center justify-between transition-all duration-300 transform cursor-pointer hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 active:scale-[0.99] ${
                isLunchLocked && !activeLunchOrder
                  ? 'bg-slate-100/50 border-slate-200 opacity-60' 
                  : 'bg-white border-slate-100 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                  isLunchLocked && !activeLunchOrder ? 'bg-slate-200 text-slate-400' : 'bg-blue-50 text-blue-600'
                }`}>
                  <Utensils className="h-5.5 w-5.5 stroke-[2.25]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-855">Lunch <span className="text-xs font-normal text-slate-500">(Rs. {prices.lunch})</span></h4>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700">
                      {selectedBookingDate === todayStr 
                        ? `For Today (${format(selectedDateObj, 'MMM dd')})` 
                        : `For ${format(selectedDateObj, 'EEE, MMM dd')}`
                      }
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold mt-1">
                    {isLunchLocked && !activeLunchOrder ? (
                      <span className="text-red-500 font-bold">Booking Closed</span>
                    ) : (
                      `Book before 9:00 AM on ${format(selectedDateObj, 'MMM dd')}`
                    )}
                  </p>
                </div>
              </div>
              <div>
                {lunchStatus !== 'Not Requested' ? (
                  <div className="h-9 w-9 rounded-full flex items-center justify-center bg-green-50 text-green-600 border border-green-100">
                    <Check className="h-4.5 w-4.5 stroke-[2.5]" />
                  </div>
                ) : submittingMeal === 'LUNCH' ? (
                  <div className="h-9 w-9 rounded-full flex items-center justify-center bg-slate-100 text-slate-500">
                    <RefreshCw className="h-4.5 w-4.5 animate-spin" />
                  </div>
                ) : isLunchLocked ? (
                  <span className="text-xs font-bold text-slate-400">Locked</span>
                ) : null}
              </div>
            </div>

            {/* Dinner Request Card */}
            <div 
              onClick={() => handleCardClick('DINNER')}
              className={`p-4 rounded-2xl border flex items-center justify-between transition-all duration-300 transform cursor-pointer hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 active:scale-[0.99] ${
                isDinnerLocked && !activeDinnerOrder
                  ? 'bg-slate-100/50 border-slate-200 opacity-60' 
                  : 'bg-white border-slate-100 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                  isDinnerLocked && !activeDinnerOrder ? 'bg-slate-200 text-slate-400' : 'bg-indigo-50 text-indigo-500'
                }`}>
                  <Moon className="h-5.5 w-5.5 stroke-[2.25]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-855">Dinner <span className="text-xs font-normal text-slate-500">(Rs. {prices.dinner})</span></h4>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700">
                      {selectedBookingDate === todayStr 
                        ? `For Today (${format(selectedDateObj, 'MMM dd')})` 
                        : `For ${format(selectedDateObj, 'EEE, MMM dd')}`
                      }
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold mt-1">
                    {isDinnerLocked && !activeDinnerOrder ? (
                      <span className="text-red-500 font-bold">Booking Closed</span>
                    ) : (
                      `Book before 5:00 PM on ${format(selectedDateObj, 'MMM dd')}`
                    )}
                  </p>
                </div>
              </div>
              <div>
                {dinnerStatus !== 'Not Requested' ? (
                  <div className="h-9 w-9 rounded-full flex items-center justify-center bg-green-50 text-green-600 border border-green-100">
                    <Check className="h-4.5 w-4.5 stroke-[2.5]" />
                  </div>
                ) : submittingMeal === 'DINNER' ? (
                  <div className="h-9 w-9 rounded-full flex items-center justify-center bg-slate-100 text-slate-500">
                    <RefreshCw className="h-4.5 w-4.5 animate-spin" />
                  </div>
                ) : isDinnerLocked ? (
                  <span className="text-xs font-bold text-slate-400">Locked</span>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* Today's Status Widget */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">My Active Orders</h3>
            <button onClick={fetchData} className="p-1 rounded hover:bg-slate-50 text-slate-400 hover:text-slate-600">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {/* Breakfast Status */}
            <div className="py-3 flex flex-col gap-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-650 flex items-center gap-2">
                  <Coffee className="h-4 w-4 text-amber-500" /> Breakfast ({tomorrowOfSelectedStr === tomorrowStr ? 'For Tomorrow' : `For ${format(tomorrowOfSelectedObj, 'MMM dd')}`})
                  {activeBreakfastOrder?.mealOption && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      activeBreakfastOrder.mealOption === 'VEGETARIAN' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                        : 'bg-rose-50 text-rose-700 border border-rose-100'
                    }`}>
                      {activeBreakfastOrder.mealOption === 'VEGETARIAN' ? 'Veg' : 'Non-Veg'}
                    </span>
                  )}
                </span>
                <span className={`px-2 py-0.5 font-bold rounded-full text-[10px] ${
                  breakfastStatus === 'Collected'
                    ? 'bg-green-100 text-green-700'
                    : breakfastStatus === 'Pending'
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  {breakfastStatus}
                </span>
              </div>
              {activeBreakfastOrder?.notes && (
                <div className="text-[10px] bg-slate-50 border border-slate-100 text-slate-500 rounded-lg p-2 font-medium">
                  <span className="font-bold text-slate-700 block text-[9px] uppercase tracking-wider mb-0.5">Special Request</span>
                  &ldquo;{activeBreakfastOrder.notes}&rdquo;
                </div>
              )}
              {(() => {
                const order = activeBreakfastOrder;
                if (order && order.status === 'ORDERED' && !isBreakfastLocked) {
                  const msRemaining = (new Date(order.requestedAt).getTime() + 10 * 60 * 1000) - currentTime.getTime();
                  if (msRemaining > 0) {
                    const mins = Math.floor(msRemaining / (1000 * 60));
                    const secs = Math.floor((msRemaining % (1000 * 60)) / 1000);
                    const formattedTime = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                    
                    return (
                      <div className="mt-2 flex items-center justify-between bg-red-50/40 border border-red-100/50 rounded-xl p-2.5 animate-in fade-in duration-200">
                        <span className="text-[10px] font-bold text-red-650 flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping shrink-0" />
                          Cancel available: {formattedTime}
                        </span>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSkipTimer('BREAKFAST')}
                            className="px-2.5 py-1 text-[9px] font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg active:scale-95 transition-all shadow-sm"
                          >
                            Skip Time
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCancelOrder('BREAKFAST')}
                            className="px-2.5 py-1 text-[9px] font-bold text-red-700 bg-red-100 hover:bg-red-200 rounded-lg active:scale-95 transition-all shadow-sm"
                          >
                            Cancel Order
                          </button>
                        </div>
                      </div>
                    );
                  }
                }
                return null;
              })()}
            </div>

            {/* Lunch Status */}
            <div className="py-3 flex flex-col gap-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-650 flex items-center gap-2">
                  <Utensils className="h-4 w-4 text-blue-500" /> Lunch ({selectedBookingDate === todayStr ? 'For Today' : `For ${format(selectedDateObj, 'MMM dd')}`})
                  {activeLunchOrder?.mealOption && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      activeLunchOrder.mealOption === 'VEGETARIAN' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                        : 'bg-rose-50 text-rose-700 border border-rose-100'
                    }`}>
                      {activeLunchOrder.mealOption === 'VEGETARIAN' ? 'Veg' : 'Non-Veg'}
                    </span>
                  )}
                </span>
                <span className={`px-2 py-0.5 font-bold rounded-full text-[10px] ${
                  lunchStatus === 'Collected'
                    ? 'bg-green-100 text-green-700'
                    : lunchStatus === 'Pending'
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  {lunchStatus}
                </span>
              </div>
              {activeLunchOrder?.notes && (
                <div className="text-[10px] bg-slate-50 border border-slate-100 text-slate-500 rounded-lg p-2 font-medium">
                  <span className="font-bold text-slate-700 block text-[9px] uppercase tracking-wider mb-0.5">Special Request</span>
                  &ldquo;{activeLunchOrder.notes}&rdquo;
                </div>
              )}
              {(() => {
                const order = activeLunchOrder;
                if (order && order.status === 'ORDERED' && !isLunchLocked) {
                  const msRemaining = (new Date(order.requestedAt).getTime() + 10 * 60 * 1000) - currentTime.getTime();
                  if (msRemaining > 0) {
                    const mins = Math.floor(msRemaining / (1000 * 60));
                    const secs = Math.floor((msRemaining % (1000 * 60)) / 1000);
                    const formattedTime = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                    
                    return (
                      <div className="mt-2 flex items-center justify-between bg-red-50/40 border border-red-100/50 rounded-xl p-2.5 animate-in fade-in duration-200">
                        <span className="text-[10px] font-bold text-red-650 flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping shrink-0" />
                          Cancel available: {formattedTime}
                        </span>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSkipTimer('LUNCH')}
                            className="px-2.5 py-1 text-[9px] font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg active:scale-95 transition-all shadow-sm"
                          >
                            Skip Time
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCancelOrder('LUNCH')}
                            className="px-2.5 py-1 text-[9px] font-bold text-red-700 bg-red-100 hover:bg-red-200 rounded-lg active:scale-95 transition-all shadow-sm"
                          >
                            Cancel Order
                          </button>
                        </div>
                      </div>
                    );
                  }
                }
                return null;
              })()}
            </div>

            {/* Dinner Status */}
            <div className="py-3 flex flex-col gap-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-650 flex items-center gap-2">
                  <Moon className="h-4 w-4 text-indigo-500" /> Dinner ({selectedBookingDate === todayStr ? 'For Today' : `For ${format(selectedDateObj, 'MMM dd')}`})
                  {activeDinnerOrder?.mealOption && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      activeDinnerOrder.mealOption === 'VEGETARIAN' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                        : 'bg-rose-50 text-rose-700 border border-rose-100'
                    }`}>
                      {activeDinnerOrder.mealOption === 'VEGETARIAN' ? 'Veg' : 'Non-Veg'}
                    </span>
                  )}
                </span>
                <span className={`px-2 py-0.5 font-bold rounded-full text-[10px] ${
                  dinnerStatus === 'Collected'
                    ? 'bg-green-100 text-green-700'
                    : dinnerStatus === 'Pending'
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  {dinnerStatus}
                </span>
              </div>
              {activeDinnerOrder?.notes && (
                <div className="text-[10px] bg-slate-50 border border-slate-100 text-slate-500 rounded-lg p-2 font-medium">
                  <span className="font-bold text-slate-700 block text-[9px] uppercase tracking-wider mb-0.5">Special Request</span>
                  &ldquo;{activeDinnerOrder.notes}&rdquo;
                </div>
              )}
              {(() => {
                const order = activeDinnerOrder;
                if (order && order.status === 'ORDERED' && !isDinnerLocked) {
                  const msRemaining = (new Date(order.requestedAt).getTime() + 10 * 60 * 1000) - currentTime.getTime();
                  if (msRemaining > 0) {
                    const mins = Math.floor(msRemaining / (1000 * 60));
                    const secs = Math.floor((msRemaining % (1000 * 60)) / 1000);
                    const formattedTime = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                    
                    return (
                      <div className="mt-2 flex items-center justify-between bg-red-50/40 border border-red-100/50 rounded-xl p-2.5 animate-in fade-in duration-200">
                        <span className="text-[10px] font-bold text-red-650 flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping shrink-0" />
                          Cancel available: {formattedTime}
                        </span>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSkipTimer('DINNER')}
                            className="px-2.5 py-1 text-[9px] font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg active:scale-95 transition-all shadow-sm"
                          >
                            Skip Time
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCancelOrder('DINNER')}
                            className="px-2.5 py-1 text-[9px] font-bold text-red-700 bg-red-100 hover:bg-red-200 rounded-lg active:scale-95 transition-all shadow-sm"
                          >
                            Cancel Order
                          </button>
                        </div>
                      </div>
                    );
                  }
                }
                return null;
              })()}
            </div>
          </div>
        </div>

        {/* Recent History */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">Recent Requests</h3>
            <Link href="/employee/history" className="text-xs font-bold text-blue-600 hover:underline flex items-center">
              View All <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {recentHistory.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 text-center border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                <CircleAlert className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-semibold">No recent meal requests found.</p>
              </div>
            ) : (
              recentHistory.map((item) => (
                <div 
                  key={item._id} 
                  className="bg-white rounded-xl p-3.5 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.01)] flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                      item.mealType === 'BREAKFAST' 
                        ? 'bg-amber-50 text-amber-500'
                        : item.mealType === 'LUNCH'
                        ? 'bg-blue-50 text-blue-600'
                        : 'bg-indigo-50 text-indigo-500'
                    }`}>
                      {item.mealType === 'BREAKFAST' ? (
                        <Coffee className="h-4 w-4" />
                      ) : item.mealType === 'LUNCH' ? (
                        <Utensils className="h-4 w-4" />
                      ) : (
                        <Moon className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 capitalize">
                        {item.mealType.toLowerCase()}
                      </h4>
                      <p className="text-[10px] text-slate-405 font-semibold mt-0.5">
                        {(() => {
                          const dateObj = new Date(item.requestedAt);
                          const todayStr = format(new Date(), 'yyyy-MM-dd');
                          if (item.requestDate === todayStr) {
                            return `Today ${item.mealType.charAt(0) + item.mealType.slice(1).toLowerCase()} at ${format(dateObj, 'h:mm a')}`;
                          } else {
                            return `${format(dateObj, 'MMM dd, yyyy')} at ${format(dateObj, 'h:mm a')}`;
                          }
                        })()}
                      </p>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1 ${
                    item.status === 'COLLECTED'
                      ? 'bg-green-50 text-green-700'
                      : 'bg-orange-50 text-orange-700'
                  }`}>
                    {item.status === 'COLLECTED' ? (
                      <>
                        <TrendingUp className="h-3 w-3 stroke-[2.5]" />
                        Collected
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-3 w-3 animate-spin stroke-[2.5]" />
                        Ordered
                      </>
                    )}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </>
    ) : (
      <div className="space-y-4 animate-in fade-in duration-300">
        {/* Statistics Cards */}
        <div className="grid grid-cols-2 gap-3.5">
          {/* Total Collected Card */}
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-500 rounded-2xl p-4 text-white shadow-md relative overflow-hidden">
            <div className="absolute right-[-10px] bottom-[-10px] opacity-15">
              <Check className="h-24 w-24 stroke-[3]" />
            </div>
            <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-widest">
              Total Collected
            </p>
            <h3 className="text-3xl font-extrabold mt-1 tracking-tight">
              {orders.filter(o => o.status === 'COLLECTED').length}
            </h3>
            <p className="text-[9px] text-emerald-50/80 mt-1.5 font-semibold leading-none">
              Meals successfully taken
            </p>
          </div>

          {/* Collection Days Card */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] relative overflow-hidden">
            <div className="absolute right-[-10px] bottom-[-10px] opacity-5 text-slate-900">
              <Calendar className="h-24 w-24 stroke-[2]" />
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Collection Days
            </p>
            <h3 className="text-3xl font-extrabold mt-1 tracking-tight text-slate-800">
              {new Set(orders.filter(o => o.status === 'COLLECTED').map(o => o.requestDate)).size}
            </h3>
            <p className="text-[9px] text-slate-400 mt-1.5 font-semibold leading-none">
              Unique days with meals
            </p>
          </div>
        </div>

        {/* Meal Breakdown Grid */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-3">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Meal Breakdown
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {/* Breakfast Breakdown */}
            <div className="bg-amber-50/60 rounded-xl p-3 border border-amber-100/40 text-center">
              <Coffee className="h-4.5 w-4.5 text-amber-500 mx-auto mb-1 stroke-[2.25]" />
              <p className="text-[10px] font-bold text-slate-500">Breakfast</p>
              <h4 className="text-lg font-black text-slate-800 mt-0.5">
                {orders.filter(o => o.status === 'COLLECTED' && o.mealType === 'BREAKFAST').length}
              </h4>
            </div>

            {/* Lunch Breakdown */}
            <div className="bg-blue-50/60 rounded-xl p-3 border border-blue-100/40 text-center">
              <Utensils className="h-4.5 w-4.5 text-blue-500 mx-auto mb-1 stroke-[2.25]" />
              <p className="text-[10px] font-bold text-slate-500">Lunch</p>
              <h4 className="text-lg font-black text-slate-800 mt-0.5">
                {orders.filter(o => o.status === 'COLLECTED' && o.mealType === 'LUNCH').length}
              </h4>
            </div>

            {/* Dinner Breakdown */}
            <div className="bg-indigo-50/60 rounded-xl p-3 border border-indigo-100/40 text-center">
              <Moon className="h-4.5 w-4.5 text-indigo-500 mx-auto mb-1 stroke-[2.25]" />
              <p className="text-[10px] font-bold text-slate-500">Dinner</p>
              <h4 className="text-lg font-black text-slate-800 mt-0.5">
                {orders.filter(o => o.status === 'COLLECTED' && o.mealType === 'DINNER').length}
              </h4>
            </div>
          </div>
        </div>

        {/* Detailed Collection Log */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-800">Collection Logs</h3>
          <div className="space-y-2.5">
            {orders.filter(o => o.status === 'COLLECTED').length === 0 ? (
              <div className="bg-white rounded-2xl p-6 text-center border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                <CircleAlert className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-semibold">No collected meals history found.</p>
              </div>
            ) : (
              orders
                .filter(o => o.status === 'COLLECTED')
                .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime())
                .map((item) => (
                  <div 
                    key={item._id} 
                    className="bg-white rounded-xl p-3.5 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.01)] flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                          item.mealType === 'BREAKFAST' 
                            ? 'bg-amber-50 text-amber-500'
                            : item.mealType === 'LUNCH'
                            ? 'bg-blue-50 text-blue-600'
                            : 'bg-indigo-50 text-indigo-500'
                        }`}>
                          {item.mealType === 'BREAKFAST' ? (
                            <Coffee className="h-4 w-4" />
                          ) : item.mealType === 'LUNCH' ? (
                            <Utensils className="h-4 w-4" />
                          ) : (
                            <Moon className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-800 capitalize">
                            {item.mealType.toLowerCase()}
                          </h4>
                          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                            For Date: {format(new Date(item.requestDate + 'T00:00:00'), 'EEE, MMM dd, yyyy')}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-green-50 text-green-700 border border-green-100 flex items-center gap-0.5">
                          <Check className="h-2.5 w-2.5 stroke-[3]" /> Collected
                        </span>
                        {item.mealOption && (
                          <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded ${
                            item.mealOption === 'VEGETARIAN' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                              : 'bg-rose-50 text-rose-700 border border-rose-100'
                          }`}>
                            {item.mealOption === 'VEGETARIAN' ? 'Veg' : 'Non-Veg'}
                          </span>
                        )}
                      </div>
                    </div>
                    {item.collectedAt && (
                      <div className="text-[9px] text-slate-400 font-bold bg-slate-50 border border-slate-100/50 rounded-lg p-1.5 flex items-center justify-between">
                        <span>COLLECTION TIME</span>
                        <span className="text-slate-650">{format(new Date(item.collectedAt), 'MMM dd, yyyy @ h:mm a')}</span>
                      </div>
                    )}
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    )}
  </div>

      {/* Meal Preference Selection Modal */}
      {activeMealSelection && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 ease-out animate-in fade-in">
          {/* Click outside to close */}
          <div className="absolute inset-0" onClick={() => { setActiveMealSelection(null); setSelectedOption(null); setOrderNotes(''); }}></div>
          
          <div className="relative bg-white w-full max-w-sm rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl border border-slate-100 transition-all duration-300 ease-out transform animate-in slide-in-from-bottom-8 sm:zoom-in-95">
            {/* Grab handle for mobile aesthetics */}
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-4 sm:hidden" />
            
            <h3 className="text-lg font-bold text-slate-800 tracking-tight">
              {isUpdatingNotesOnly ? `Update ${activeMealSelection.toLowerCase()} Request` : `Select ${activeMealSelection.toLowerCase()} Preference`}
            </h3>
            <p className="text-xs text-slate-500 mt-1 font-semibold">
              {isUpdatingNotesOnly ? 'Modify your meal option or special requests for today\'s order.' : 'Please choose your meal type below before confirming.'}
            </p>
            
            <div className="grid grid-cols-2 gap-4 mt-5">
              {/* Vegetarian Option Card */}
              <button
                type="button"
                onClick={() => setSelectedOption('VEGETARIAN')}
                className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-300 transform shadow-[0_2px_8px_rgba(0,0,0,0.01)] ${
                  selectedOption === 'VEGETARIAN'
                    ? 'border-green-500 bg-green-50/45 text-green-700 shadow-green-100/50 shadow-md -translate-y-0.5 scale-[1.02]'
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] bg-white text-slate-600'
                }`}
              >
                <div className={`h-10 w-10 rounded-full flex items-center justify-center mb-2.5 ${selectedOption === 'VEGETARIAN' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 3.5 1 9.8a7 7 0 0 1-9 8.2Z"/><path d="M9 22v-4h-2.5a2.5 2.5 0 0 1 0-5H9m2-5.5v4"/></svg>
                </div>
                <span className="text-xs font-extrabold uppercase tracking-wider">Vegetarian</span>
              </button>
 
              {/* Meat Option Card */}
              <button
                type="button"
                onClick={() => setSelectedOption('MEAT')}
                className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-300 transform shadow-[0_2px_8px_rgba(0,0,0,0.01)] ${
                  selectedOption === 'MEAT'
                    ? 'border-blue-500 bg-blue-50/45 text-blue-700 shadow-blue-100/50 shadow-md -translate-y-0.5 scale-[1.02]'
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] bg-white text-slate-600'
                }`}
              >
                <div className={`h-10 w-10 rounded-full flex items-center justify-center mb-2.5 ${selectedOption === 'MEAT' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a5 5 0 1 0 10 0V2Z"/><path d="m15.4 7.6-6.1 6.1m-2.1.3a2.5 2.5 0 1 0-3.5 3.5m4.3-1.4a2.5 2.5 0 1 0 3.5-3.5m-3.5 3.5h0Z"/></svg>
                </div>
                <span className="text-xs font-extrabold uppercase tracking-wider">Non vegetarian</span>
              </button>
            </div>

            {/* Cancel countdown timer inside the modal */}
            {isUpdatingNotesOnly && (() => {
              let order;
              if (activeMealSelection === 'BREAKFAST') {
                order = activeBreakfastOrder;
              } else if (activeMealSelection === 'LUNCH') {
                order = activeLunchOrder;
              } else {
                order = activeDinnerOrder;
              }
              if (order && order.status === 'ORDERED' && !getMealLockedStatus(activeMealSelection)) {
                const msRemaining = (new Date(order.requestedAt).getTime() + 10 * 60 * 1000) - currentTime.getTime();
                if (msRemaining > 0) {
                  const mins = Math.floor(msRemaining / (1000 * 60));
                  const secs = Math.floor((msRemaining % (1000 * 60)) / 1000);
                  const formattedTime = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                  
                  return (
                    <div className="mt-4 flex items-center justify-between bg-red-50/40 border border-red-100/50 rounded-xl p-2.5 animate-in fade-in duration-200">
                      <span className="text-[10px] font-bold text-red-600 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping shrink-0" />
                        Cancel available: {formattedTime}
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={async () => {
                            await handleSkipTimer(activeMealSelection);
                            setActiveMealSelection(null);
                            setSelectedOption(null);
                            setOrderNotes('');
                          }}
                          className="px-2.5 py-1 text-[9px] font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg active:scale-95 transition-all shadow-sm"
                        >
                          Skip Time
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await handleCancelOrder(activeMealSelection);
                            setActiveMealSelection(null);
                            setSelectedOption(null);
                            setOrderNotes('');
                          }}
                          className="px-2.5 py-1 text-[9px] font-bold text-red-700 bg-red-100 hover:bg-red-200 rounded-lg active:scale-95 transition-all shadow-sm"
                        >
                          Cancel Order
                        </button>
                      </div>
                    </div>
                  );
                }
              }
              return null;
            })()}
 
            {/* Special Request Text Area */}
            <div className="mt-4 space-y-1.5 text-left">
              <div className="flex justify-between items-center">
                <label htmlFor="orderNotes" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Special Request (Optional)
                </label>
                {/* Tea Request button commented out as requested */}
                {/* 
                <button
                  type="button"
                  onClick={() => {
                    const currentNotes = orderNotes.trim();
                    if (!currentNotes.toLowerCase().includes('tea')) {
                      setOrderNotes(currentNotes ? `${currentNotes}, Tea` : 'Tea');
                    }
                  }}
                  className="px-2 py-0.5 text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 rounded-md hover:bg-blue-100 active:scale-95 transition-all flex items-center gap-1 shadow-sm"
                >
                  🍵 Request Tea
                </button>
                */}
              </div>
              <textarea
                id="orderNotes"
                rows={2}
                placeholder="e.g. No spicy food, vegetarian option details..."
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:bg-white focus-visible:outline-none transition-all placeholder:text-slate-400 font-medium resize-none"
              />
            </div>
 
            <div className="flex gap-3 mt-5">
              <button
                type="button"
                onClick={() => { setActiveMealSelection(null); setSelectedOption(null); setOrderNotes(''); }}
                className="flex-1 h-11 border border-slate-200 text-slate-500 font-bold rounded-xl text-xs hover:bg-slate-50 active:scale-98 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedOption}
                onClick={async () => {
                  if (activeMealSelection && selectedOption) {
                    const mealType = activeMealSelection;
                    const mealOption = selectedOption;
                    const notes = orderNotes;
                    
                    setActiveMealSelection(null);
                    setSelectedOption(null);
                    setOrderNotes('');
                    
                    if (isUpdatingNotesOnly) {
                      await handleUpdateOrder(mealType, mealOption, notes);
                    } else {
                      await handleRequestMeal(mealType, mealOption, notes);
                    }
                  }
                }}
                className={`flex-1 h-11 font-bold rounded-xl text-xs active:scale-98 transition-all flex items-center justify-center gap-1.5 ${
                  selectedOption 
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm' 
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                {isUpdatingNotesOnly ? 'Update Request' : 'Confirm (OK)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

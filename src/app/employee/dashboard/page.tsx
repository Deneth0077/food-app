'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
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
  XCircle
} from 'lucide-react';

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

  const todayStr = format(new Date(), 'yyyy-MM-dd');

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

  // Handle meal request submission
  const handleRequestMeal = async (mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER', mealOption?: 'VEGETARIAN' | 'MEAT') => {
    setSubmittingMeal(mealType);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mealType, mealOption }),
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

  // Filter orders for today
  const todayOrders = orders.filter(o => o.requestDate === todayStr);
  
  const getMealStatus = (mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER') => {
    const order = todayOrders.find(o => o.mealType === mealType);
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
        <div className="flex items-center gap-2.5">
          <div className="relative p-2 rounded-full hover:bg-slate-100 transition-colors cursor-pointer">
            <Bell className="h-5.5 w-5.5 text-slate-600" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
          </div>
          <div className="h-9 w-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-sm select-none">
            {user?.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
          </div>
        </div>
      </header>

      {/* Content wrapper */}
      <div className="flex-1 p-5 space-y-5 overflow-y-auto pb-24">
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

        {/* Request Meals Section */}
        <div className="space-y-3">
          <h3 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
            Request Meals
          </h3>
          
          <div className="space-y-3">
            {/* Breakfast Request Card */}
            <div 
              onClick={() => {
                if (breakfastStatus === 'Not Requested' && submittingMeal !== 'BREAKFAST') {
                  setActiveMealSelection('BREAKFAST');
                }
              }}
              className={`p-4 bg-white rounded-2xl border border-slate-100 flex items-center justify-between transition-all duration-300 transform ${
                breakfastStatus === 'Not Requested' 
                  ? 'cursor-pointer hover:border-blue-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 active:scale-[0.99]' 
                  : 'opacity-85 shadow-[0_2px_8px_rgba(0,0,0,0.02)]'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
                  <Coffee className="h-5.5 w-5.5 stroke-[2.25]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-850">Breakfast</h4>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">7:00 AM - 9:30 AM</p>
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
                ) : null}
              </div>
            </div>

            {/* Lunch Request Card */}
            <div 
              onClick={() => {
                if (lunchStatus === 'Not Requested' && submittingMeal !== 'LUNCH') {
                  setActiveMealSelection('LUNCH');
                }
              }}
              className={`p-4 bg-white rounded-2xl border border-slate-100 flex items-center justify-between transition-all duration-300 transform ${
                lunchStatus === 'Not Requested' 
                  ? 'cursor-pointer hover:border-blue-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 active:scale-[0.99]' 
                  : 'opacity-85 shadow-[0_2px_8px_rgba(0,0,0,0.02)]'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <Utensils className="h-5.5 w-5.5 stroke-[2.25]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-850">Lunch</h4>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">11:30 AM - 2:00 PM</p>
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
                ) : null}
              </div>
            </div>

            {/* Dinner Request Card */}
            <div 
              onClick={() => {
                if (dinnerStatus === 'Not Requested' && submittingMeal !== 'DINNER') {
                  setActiveMealSelection('DINNER');
                }
              }}
              className={`p-4 bg-white rounded-2xl border border-slate-100 flex items-center justify-between transition-all duration-300 transform ${
                dinnerStatus === 'Not Requested' 
                  ? 'cursor-pointer hover:border-blue-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 active:scale-[0.99]' 
                  : 'opacity-85 shadow-[0_2px_8px_rgba(0,0,0,0.02)]'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                  <Moon className="h-5.5 w-5.5 stroke-[2.25]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-850">Dinner</h4>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">6:00 PM - 8:30 PM</p>
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
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* Today's Status Widget */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">Today's Status</h3>
            <button onClick={fetchData} className="p-1 rounded hover:bg-slate-50 text-slate-400 hover:text-slate-600">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {/* Breakfast Status */}
            <div className="py-2.5 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-600 flex items-center gap-2">
                <Coffee className="h-4 w-4 text-amber-500" /> Breakfast
                {todayOrders.find(o => o.mealType === 'BREAKFAST')?.mealOption && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                    todayOrders.find(o => o.mealType === 'BREAKFAST')?.mealOption === 'VEGETARIAN' 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                      : 'bg-rose-50 text-rose-700 border border-rose-100'
                  }`}>
                    {todayOrders.find(o => o.mealType === 'BREAKFAST')?.mealOption === 'VEGETARIAN' ? 'Veg' : 'Meat'}
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

            {/* Lunch Status */}
            <div className="py-2.5 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-600 flex items-center gap-2">
                <Utensils className="h-4 w-4 text-blue-500" /> Lunch
                {todayOrders.find(o => o.mealType === 'LUNCH')?.mealOption && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                    todayOrders.find(o => o.mealType === 'LUNCH')?.mealOption === 'VEGETARIAN' 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                      : 'bg-rose-50 text-rose-700 border border-rose-100'
                  }`}>
                    {todayOrders.find(o => o.mealType === 'LUNCH')?.mealOption === 'VEGETARIAN' ? 'Veg' : 'Meat'}
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

            {/* Dinner Status */}
            <div className="py-2.5 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-600 flex items-center gap-2">
                <Moon className="h-4 w-4 text-indigo-500" /> Dinner
                {todayOrders.find(o => o.mealType === 'DINNER')?.mealOption && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                    todayOrders.find(o => o.mealType === 'DINNER')?.mealOption === 'VEGETARIAN' 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                      : 'bg-rose-50 text-rose-700 border border-rose-100'
                  }`}>
                    {todayOrders.find(o => o.mealType === 'DINNER')?.mealOption === 'VEGETARIAN' ? 'Veg' : 'Meat'}
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
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                        {format(new Date(item.requestedAt), 'MMM dd, yyyy • h:mm a')}
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
      </div>

      {/* Meal Preference Selection Modal */}
      {activeMealSelection && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 ease-out animate-in fade-in">
          {/* Click outside to close */}
          <div className="absolute inset-0" onClick={() => { setActiveMealSelection(null); setSelectedOption(null); }}></div>
          
          <div className="relative bg-white w-full max-w-sm rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl border border-slate-100 transition-all duration-300 ease-out transform animate-in slide-in-from-bottom-8 sm:zoom-in-95">
            {/* Grab handle for mobile aesthetics */}
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-4 sm:hidden" />
            
            <h3 className="text-lg font-bold text-slate-800 tracking-tight">Select {activeMealSelection.toLowerCase()} Preference</h3>
            <p className="text-xs text-slate-500 mt-1 font-semibold">Please choose your meal type below before confirming.</p>
            
            <div className="grid grid-cols-2 gap-4 mt-5">
              {/* Vegetarian Option Card */}
              <button
                type="button"
                onClick={() => setSelectedOption('VEGETARIAN')}
                className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-300 transform shadow-[0_2px_8px_rgba(0,0,0,0.01)] ${
                  selectedOption === 'VEGETARIAN'
                    ? 'border-green-500 bg-green-50/45 text-green-700 shadow-green-100/50 shadow-md -translate-y-0.5 scale-[1.02]'
                    : 'border-slate-150 hover:border-slate-350 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] bg-white text-slate-600'
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
                    : 'border-slate-150 hover:border-slate-350 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] bg-white text-slate-600'
                }`}
              >
                <div className={`h-10 w-10 rounded-full flex items-center justify-center mb-2.5 ${selectedOption === 'MEAT' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a5 5 0 1 0 10 0V2Z"/><path d="m15.4 7.6-6.1 6.1m-2.1.3a2.5 2.5 0 1 0-3.5 3.5m4.3-1.4a2.5 2.5 0 1 0 3.5-3.5m-3.5 3.5h0Z"/></svg>
                </div>
                <span className="text-xs font-extrabold uppercase tracking-wider">Meat</span>
              </button>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => { setActiveMealSelection(null); setSelectedOption(null); }}
                className="flex-1 h-11 border border-slate-200 text-slate-500 font-bold rounded-xl text-xs hover:bg-slate-50 active:scale-98 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedOption}
                onClick={async () => {
                  if (selectedOption) {
                    const mealType = activeMealSelection;
                    setActiveMealSelection(null);
                    await handleRequestMeal(mealType, selectedOption);
                    setSelectedOption(null);
                  }
                }}
                className={`flex-1 h-11 font-bold rounded-xl text-xs active:scale-98 transition-all flex items-center justify-center gap-1.5 ${
                  selectedOption 
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm' 
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                Confirm (OK)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

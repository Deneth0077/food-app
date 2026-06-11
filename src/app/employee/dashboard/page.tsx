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
  const handleRequestMeal = async (mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER') => {
    setSubmittingMeal(mealType);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mealType }),
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
          <div className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shadow-sm">
            {user?.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 tracking-tight">Meal Logistics</h1>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Employee Portal</p>
          </div>
        </div>
        <div className="relative p-2 rounded-full hover:bg-slate-100 transition-colors cursor-pointer">
          <Bell className="h-5.5 w-5.5 text-slate-600" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
        </div>
      </header>

      {/* Content wrapper */}
      <div className="flex-1 p-5 space-y-5 overflow-y-auto pb-24">
        {/* Welcome Card */}
        <div className="bg-gradient-to-br from-blue-650 to-blue-500 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
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
            <div className={`p-4 bg-white rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-center justify-between transition-all ${breakfastStatus !== 'Not Requested' ? 'opacity-85' : ''}`}>
              <div className="flex items-center gap-3.5">
                <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
                  <Coffee className="h-5.5 w-5.5 stroke-[2.25]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-850">Breakfast</h4>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">7:00 AM - 9:30 AM</p>
                </div>
              </div>
              <button
                onClick={() => handleRequestMeal('BREAKFAST')}
                disabled={breakfastStatus !== 'Not Requested' || submittingMeal === 'BREAKFAST'}
                className={`h-9 w-9 rounded-full flex items-center justify-center transition-all ${
                  breakfastStatus !== 'Not Requested'
                    ? 'bg-green-50 text-green-600 border border-green-100'
                    : 'bg-slate-100 text-slate-700 hover:bg-blue-600 hover:text-white'
                }`}
              >
                {breakfastStatus !== 'Not Requested' ? (
                  <Check className="h-4.5 w-4.5 stroke-[2.5]" />
                ) : submittingMeal === 'BREAKFAST' ? (
                  <RefreshCw className="h-4.5 w-4.5 animate-spin" />
                ) : (
                  <Plus className="h-5 w-5 stroke-[2.5]" />
                )}
              </button>
            </div>

            {/* Lunch Request Card */}
            <div className={`p-4 bg-white rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-center justify-between transition-all ${lunchStatus !== 'Not Requested' ? 'opacity-85' : ''}`}>
              <div className="flex items-center gap-3.5">
                <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <Utensils className="h-5.5 w-5.5 stroke-[2.25]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-850">Lunch</h4>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">11:30 AM - 2:00 PM</p>
                </div>
              </div>
              <button
                onClick={() => handleRequestMeal('LUNCH')}
                disabled={lunchStatus !== 'Not Requested' || submittingMeal === 'LUNCH'}
                className={`h-9 w-9 rounded-full flex items-center justify-center transition-all ${
                  lunchStatus !== 'Not Requested'
                    ? 'bg-green-50 text-green-600 border border-green-100'
                    : 'bg-slate-100 text-slate-700 hover:bg-blue-600 hover:text-white'
                }`}
              >
                {lunchStatus !== 'Not Requested' ? (
                  <Check className="h-4.5 w-4.5 stroke-[2.5]" />
                ) : submittingMeal === 'LUNCH' ? (
                  <RefreshCw className="h-4.5 w-4.5 animate-spin" />
                ) : (
                  <Plus className="h-5 w-5 stroke-[2.5]" />
                )}
              </button>
            </div>

            {/* Dinner Request Card */}
            <div className={`p-4 bg-white rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-center justify-between transition-all ${dinnerStatus !== 'Not Requested' ? 'opacity-85' : ''}`}>
              <div className="flex items-center gap-3.5">
                <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                  <Moon className="h-5.5 w-5.5 stroke-[2.25]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-850">Dinner</h4>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">6:00 PM - 8:30 PM</p>
                </div>
              </div>
              <button
                onClick={() => handleRequestMeal('DINNER')}
                disabled={dinnerStatus !== 'Not Requested' || submittingMeal === 'DINNER'}
                className={`h-9 w-9 rounded-full flex items-center justify-center transition-all ${
                  dinnerStatus !== 'Not Requested'
                    ? 'bg-green-50 text-green-600 border border-green-100'
                    : 'bg-slate-100 text-slate-700 hover:bg-blue-600 hover:text-white'
                }`}
              >
                {dinnerStatus !== 'Not Requested' ? (
                  <Check className="h-4.5 w-4.5 stroke-[2.5]" />
                ) : submittingMeal === 'DINNER' ? (
                  <RefreshCw className="h-4.5 w-4.5 animate-spin" />
                ) : (
                  <Plus className="h-5 w-5 stroke-[2.5]" />
                )}
              </button>
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
    </div>
  );
}

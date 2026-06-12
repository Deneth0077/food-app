'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Users, 
  Utensils, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  ChevronRight, 
  FileText, 
  LogOut,
  SlidersHorizontal,
  ChevronDown,
  Bell,
  Clock,
  Check,
  Coffee,
  Moon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';

interface ReportData {
  employeeStats: { total: number; active: number };
  todayStats: {
    total: number;
    breakfast: number;
    breakfastVeg?: number;
    breakfastMeat?: number;
    lunch: number;
    lunchVeg?: number;
    lunchMeat?: number;
    dinner: number;
    dinnerVeg?: number;
    dinnerMeat?: number;
    collected: number;
    pending: number;
  };
  monthlyStats: {
    total: number;
    breakfast: number;
    breakfastVeg?: number;
    breakfastMeat?: number;
    lunch: number;
    lunchVeg?: number;
    lunchMeat?: number;
    dinner: number;
    dinnerVeg?: number;
    dinnerMeat?: number;
    collected: number;
    pending: number;
  };
  chartData: Array<{
    date: string;
    dayName: string;
    breakfast: number;
    lunch: number;
    dinner: number;
  }>;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  // Notification states
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount((data.notifications || []).filter((n: any) => !n.isRead).length);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, []);

  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
        toast({
          title: 'Notifications Updated',
          description: 'All notifications marked as read.',
        });
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id }),
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // Poll every 15 seconds
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/admin/reports');
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            router.push('/auth/login');
            return;
          }
          throw new Error('Failed to load dashboard metrics');
        }
        const stats = await res.json();
        setData(stats);
      } catch (err: any) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: err.message || 'Could not fetch dashboard metrics',
        });
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardStats();
  }, [router, toast]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/auth/login');
      router.refresh();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <RefreshCw className="h-7 w-7 animate-spin text-blue-600" />
      </div>
    );
  }

  // Fallbacks if data is missing
  const totalEmployees = data?.employeeStats.total || 0;
  const requestsToday = data?.todayStats.total || 0;
  const fulfilledToday = data?.todayStats.collected || 0;
  const exceptionsToday = data?.todayStats.pending || 0; // Requests that were not collected yet

  // Get last 5 days from chartData for visual representation
  const weeklyData = data?.chartData.slice(-5) || [];

  // Find max value in weeklyData to scale graph
  const maxVal = Math.max(
    ...weeklyData.map(d => Math.max(d.breakfast, d.lunch, d.dinner)),
    10 // Fallback min height scale
  );

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-100 flex items-center justify-between px-5 shadow-sm">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" className="h-11 object-contain" alt="ZPMC Lanka" />
          <div className="h-6 w-[1px] bg-slate-200" />
          <div>
            <h1 className="text-sm font-bold text-slate-850 tracking-tight leading-none">System Admin</h1>
            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mt-1.5 leading-none">Dashboard Overview</p>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5">
          {/* Notifications Bell Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2.5 text-slate-450 hover:text-blue-600 rounded-full hover:bg-slate-50 transition-colors relative"
              title="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center ring-2 ring-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)}></div>
                <div className="absolute right-0 mt-2.5 w-80 bg-white border border-slate-150 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h3 className="text-xs font-bold text-slate-800">Notifications</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <Check className="h-3 w-3" /> Mark all read
                      </button>
                    )}
                  </div>
                  
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 text-xs font-semibold">
                        No notifications yet
                      </div>
                    ) : (
                      notifications.map(notif => (
                        <div
                          key={notif._id}
                          onClick={() => handleMarkAsRead(notif._id)}
                          className={`p-3.5 text-left transition-colors cursor-pointer flex gap-3 ${
                            notif.isRead ? 'hover:bg-slate-50' : 'bg-blue-50/40 hover:bg-blue-50/70 border-l-[3px] border-l-blue-600 pl-[11px]'
                          }`}
                        >
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                            notif.mealType === 'BREAKFAST'
                              ? 'bg-amber-50 text-amber-500'
                              : notif.mealType === 'LUNCH'
                              ? 'bg-blue-50 text-blue-600'
                              : 'bg-indigo-50 text-indigo-500'
                          }`}>
                            {notif.mealType === 'BREAKFAST' ? (
                              <Coffee className="h-4 w-4" />
                            ) : notif.mealType === 'LUNCH' ? (
                              <Utensils className="h-4 w-4" />
                            ) : (
                              <Moon className="h-4 w-4" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-800 leading-snug">
                              <span className="font-bold">{notif.employeeName}</span> ({notif.employeeNo}) requested <span className="font-bold capitalize">{notif.mealType.toLowerCase()}</span>
                              {notif.mealOption && (
                                <span className={`ml-1.5 px-1 rounded text-[8px] font-bold ${
                                  notif.mealOption === 'VEGETARIAN' 
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                    : 'bg-rose-50 text-rose-700 border border-rose-100'
                                }`}>
                                  {notif.mealOption === 'VEGETARIAN' ? 'VEG' : 'MEAT'}
                                </span>
                              )}
                            </p>
                            <span className="text-[9px] font-semibold text-slate-400 flex items-center gap-1 mt-1">
                              <Clock className="h-2.5 w-2.5" />
                              {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <button 
            onClick={handleLogout}
            className="p-2.5 text-slate-450 hover:text-red-500 rounded-full hover:bg-slate-50 transition-colors"
            title="Logout"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-5 space-y-5 overflow-y-auto pb-24">
        
        {/* Metric Cards */}
        <div className="grid grid-cols-2 gap-4">
          {/* Total Employees */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.015)] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="h-5 w-5 stroke-[2.25]" />
              </div>
              <span className="text-[9px] font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-md">
                ↑ 2%
              </span>
            </div>
            <div className="mt-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Employees</p>
              <p className="text-2xl font-bold text-slate-800 mt-0.5">{totalEmployees}</p>
            </div>
          </div>

          {/* Requests Today */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.015)] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
                <Utensils className="h-5 w-5 stroke-[2.25]" />
              </div>
              <span className="text-[9px] font-bold bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-md">
                ↑ 5%
              </span>
            </div>
            <div className="mt-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Requests Today</p>
              <p className="text-2xl font-bold text-slate-800 mt-0.5">{requestsToday}</p>
              {data?.todayStats.lunchVeg !== undefined && (
                <div className="text-[9px] font-bold text-slate-500 mt-1 space-y-0.5 leading-none">
                  <p>BF • V: {data.todayStats.breakfastVeg} M: {data.todayStats.breakfastMeat}</p>
                  <p>LH • V: {data.todayStats.lunchVeg} M: {data.todayStats.lunchMeat}</p>
                  <p>DN • V: {data.todayStats.dinnerVeg} M: {data.todayStats.dinnerMeat}</p>
                </div>
              )}
            </div>
          </div>

          {/* Fulfilled Today */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.015)] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="h-9 w-9 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 stroke-[2.25]" />
              </div>
              <span className="text-[9px] font-bold bg-green-50 text-green-600 px-1.5 py-0.5 rounded-md">
                ↓ 1%
              </span>
            </div>
            <div className="mt-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fulfilled</p>
              <p className="text-2xl font-bold text-slate-800 mt-0.5">{fulfilledToday}</p>
            </div>
          </div>

          {/* Exceptions/Missed */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.015)] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="h-9 w-9 rounded-xl bg-red-50 text-red-500 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 stroke-[2.25]" />
              </div>
              <span className="text-[9px] font-bold bg-slate-50 text-slate-400 px-1.5 py-0.5 rounded-md">
                -
              </span>
            </div>
            <div className="mt-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Exceptions/Missed</p>
              <p className="text-2xl font-bold text-slate-800 mt-0.5">{exceptionsToday}</p>
            </div>
          </div>
        </div>

        {/* Meal Stats Distribution Chart Card */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800 tracking-tight">Meal Stats</h3>
              <p className="text-[10px] font-semibold text-slate-400 uppercase mt-0.5">Distribution</p>
            </div>
            <Link href="/admin/reports" className="text-xs font-bold text-blue-600 hover:underline flex items-center">
              View Details <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          {/* Custom SVG / div chart */}
          <div className="bg-blue-50/40 rounded-2xl p-4 border border-blue-50/70">
            {/* Chart Legend */}
            <div className="flex items-center justify-center gap-4 text-[10px] font-bold text-slate-500 mb-5">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded bg-blue-600 inline-block"></span>
                <span>Breakfast</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded bg-amber-500 inline-block"></span>
                <span>Lunch</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded bg-slate-400 inline-block"></span>
                <span>Dinner</span>
              </div>
            </div>

            {/* Chart bars representation */}
            <div className="h-36 flex items-end justify-between px-2 pt-2 border-b border-slate-200">
              {weeklyData.map((d, index) => {
                const bHeight = Math.max((d.breakfast / maxVal) * 100, 4);
                const lHeight = Math.max((d.lunch / maxVal) * 100, 4);
                const dHeight = Math.max((d.dinner / maxVal) * 100, 4);

                return (
                  <div key={index} className="flex flex-col items-center flex-1 space-y-1 max-w-[50px]">
                    <div className="w-full flex items-end justify-center gap-1 h-28 px-1">
                      {/* Breakfast Bar */}
                      <div 
                        style={{ height: `${bHeight}%` }}
                        className="w-2 rounded bg-blue-600 transition-all duration-500 hover:opacity-80"
                        title={`Breakfast: ${d.breakfast}`}
                      ></div>
                      {/* Lunch Bar */}
                      <div 
                        style={{ height: `${lHeight}%` }}
                        className="w-2 rounded bg-amber-500 transition-all duration-500 hover:opacity-80"
                        title={`Lunch: ${d.lunch}`}
                      ></div>
                      {/* Dinner Bar */}
                      <div 
                        style={{ height: `${dHeight}%` }}
                        className="w-2 rounded bg-slate-400 transition-all duration-500 hover:opacity-80"
                        title={`Dinner: ${d.dinner}`}
                      ></div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                      {d.dayName}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Management Options */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-3.5">
          <h3 className="text-sm font-bold text-slate-800">Management</h3>
          
          <div className="space-y-2.5">
            <Link 
              href="/admin/employees" 
              className="flex items-center justify-between p-3.5 bg-slate-50/80 rounded-xl hover:bg-slate-50 border border-slate-100 text-slate-700 font-bold text-xs transition-all active:scale-[0.99]"
            >
              <div className="flex items-center gap-2.5">
                <Users className="h-4 w-4 text-blue-600 stroke-[2.25]" />
                Employee Directory
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </Link>

            <Link 
              href="/admin/reports" 
              className="flex items-center justify-between p-3.5 bg-slate-50/80 rounded-xl hover:bg-slate-50 border border-slate-100 text-slate-700 font-bold text-xs transition-all active:scale-[0.99]"
            >
              <div className="flex items-center gap-2.5">
                <FileText className="h-4 w-4 text-blue-600 stroke-[2.25]" />
                Reports &amp; Analytics
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </Link>
          </div>
        </div>

        {/* Action buttons (Reports section in Image 1) */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-3">
          <h3 className="text-sm font-bold text-slate-800">Reports Portal</h3>
          
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/admin/reports?tab=daily')}
              className="flex-1 h-11 bg-blue-50 border border-blue-100 hover:bg-blue-100/50 text-blue-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <FileText className="h-4 w-4" />
              Daily Summary
            </button>
            <button
              onClick={() => router.push('/admin/reports?tab=monthly')}
              className="flex-1 h-11 bg-blue-50 border border-blue-100 hover:bg-blue-100/50 text-blue-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <FileText className="h-4 w-4" />
              Monthly Summary
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
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
  ChevronDown
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface ReportData {
  employeeStats: { total: number; active: number };
  todayStats: {
    total: number;
    breakfast: number;
    lunch: number;
    dinner: number;
    collected: number;
    pending: number;
  };
  monthlyStats: {
    total: number;
    breakfast: number;
    lunch: number;
    dinner: number;
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
          <div className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shadow-sm">
            SA
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 tracking-tight">System Admin</h1>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Dashboard Overview</p>
          </div>
        </div>
        
        <button 
          onClick={handleLogout}
          className="p-2.5 text-slate-450 hover:text-red-500 rounded-full hover:bg-slate-50 transition-colors"
          title="Logout"
        >
          <LogOut className="h-5 w-5" />
        </button>
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
            <div className="mt-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Requests Today</p>
              <p className="text-2xl font-bold text-slate-800 mt-0.5">{requestsToday}</p>
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

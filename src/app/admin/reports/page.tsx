'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ArrowLeft,
  Calendar,
  Coffee,
  Utensils,
  Moon,
  TrendingUp,
  Percent,
  CheckCircle,
  Clock,
  RefreshCw,
  SlidersHorizontal,
  ChevronDown,
  Search,
  Download,
  CircleAlert
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Stats {
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
}

interface ReportResponse {
  employeeStats: { total: number; active: number };
  todayStats: Stats;
  monthlyStats: Stats;
  chartData: Array<{
    date: string;
    dayName: string;
    breakfast: number;
    lunch: number;
    dinner: number;
  }>;
}

function ReportsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const initialTab = searchParams.get('tab') === 'monthly' ? 'monthly' : searchParams.get('tab') === 'spending' ? 'spending' : 'daily';
  
  const [activeTab, setActiveTab] = useState<'daily' | 'monthly' | 'spending'>(initialTab);
  const [reportData, setReportData] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Select Month Filter (YYYY-MM format)
  const currentMonthStr = format(new Date(), 'yyyy-MM');
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);

  interface SpendingItem {
    employeeNo: string;
    employeeName: string;
    breakfastCount: number;
    lunchCount: number;
    dinnerCount: number;
    totalCost: number;
  }
  interface SpendingResponse {
    month: string;
    prices: { breakfast: number; lunch: number; dinner: number };
    spendingList: SpendingItem[];
  }
  const [spendingData, setSpendingData] = useState<SpendingResponse | null>(null);
  const [spendingLoading, setSpendingLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchReportStats = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/reports?month=${selectedMonth}`);
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          router.push('/auth/login');
          return;
        }
        throw new Error('Failed to load report analytics');
      }
      const stats = await res.json();
      setReportData(stats);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Could not fetch reports data',
      });
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, router, toast]);

  const fetchSpendingData = useCallback(async () => {
    try {
      setSpendingLoading(true);
      const res = await fetch(`/api/admin/reports/spending?month=${selectedMonth}`);
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          router.push('/auth/login');
          return;
        }
        throw new Error('Failed to load spending report');
      }
      const data = await res.json();
      setSpendingData(data);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Could not fetch spending data',
      });
    } finally {
      setSpendingLoading(false);
    }
  }, [selectedMonth, router, toast]);

  useEffect(() => {
    if (activeTab === 'spending') {
      fetchSpendingData();
    } else {
      fetchReportStats();
    }
  }, [activeTab, selectedMonth, fetchReportStats, fetchSpendingData]);

  if (loading && activeTab !== 'spending') {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <RefreshCw className="h-7 w-7 animate-spin text-blue-600" />
      </div>
    );
  }

  const filteredSpendingList = (spendingData?.spendingList || []).filter(item => {
    const q = searchQuery.toLowerCase().trim();
    return item.employeeName.toLowerCase().includes(q) || item.employeeNo.toLowerCase().includes(q);
  });

  const handleExportCSV = () => {
    if (!spendingData || spendingData.spendingList.length === 0) return;
    
    // Construct CSV content
    const headers = ['Employee No', 'Name', 'Breakfast Count', 'Lunch Count', 'Dinner Count', 'Total Spending (Rs.)'];
    const rows = filteredSpendingList.map(item => [
      item.employeeNo,
      `"${item.employeeName.replace(/"/g, '""')}"`,
      item.breakfastCount,
      item.lunchCount,
      item.dinnerCount,
      item.totalCost
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Meal_Spending_Report_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: 'Report Exported',
      description: `CSV report for ${selectedMonth} downloaded successfully.`,
    });
  };

  const todayStats = reportData?.todayStats;
  const monthlyStats = reportData?.monthlyStats;

  const activeStats = activeTab === 'daily' ? todayStats : monthlyStats;
  
  const totalRequests = activeStats?.total || 0;
  const collectedCount = activeStats?.collected || 0;
  const pendingCount = activeStats?.pending || 0;
  const fulfillmentRate = totalRequests > 0 ? Math.round((collectedCount / totalRequests) * 100) : 0;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-100 flex items-center px-4 shadow-sm">
        <button 
          onClick={() => router.push('/admin/dashboard')}
          className="p-2 mr-2 rounded-full hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-slate-700" />
        </button>
        <div>
          <h1 className="text-base font-bold text-slate-800 tracking-tight">Reports &amp; Analytics</h1>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Metrics Portal</p>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 p-5 space-y-5 overflow-y-auto pb-24">
        
        {/* Toggle tabs (Daily vs Monthly vs Spending) */}
        <div className="bg-white p-1 rounded-xl border border-slate-200/60 shadow-sm flex gap-1">
          <button
            onClick={() => setActiveTab('daily')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'daily' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            Daily Summary
          </button>
          <button
            onClick={() => setActiveTab('monthly')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'monthly' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            Monthly Summary
          </button>
          <button
            onClick={() => setActiveTab('spending')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'spending' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            Spending Sheet
          </button>
        </div>

        {/* Date / Month Picker Filter */}
        {activeTab !== 'daily' && (
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.015)] flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
              <Calendar className="h-4.5 w-4.5 text-blue-600" />
              Reporting Month
            </span>
            <input 
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500"
            />
          </div>
        )}

        {activeTab !== 'spending' ? (
          <>
            {/* High-level Summary Cards */}
            <div className="grid grid-cols-2 gap-4">
          {/* Fulfillment Rate */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between">
            <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Percent className="h-5 w-5 stroke-[2.25]" />
            </div>
            <div className="mt-3">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Fulfillment Rate</p>
              <p className="text-2xl font-bold text-slate-800 mt-0.5">{fulfillmentRate}%</p>
            </div>
          </div>

          {/* Total Requests */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between">
            <div className="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 stroke-[2.25]" />
            </div>
            <div className="mt-3">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Requests</p>
              <p className="text-2xl font-bold text-slate-800 mt-0.5">{totalRequests}</p>
            </div>
          </div>
        </div>

        {/* Status breakdown list */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-100 overflow-hidden">
          <div className="p-4 bg-slate-50/50 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-800">Fulfillment Breakdown</span>
            <span className="text-[10px] font-semibold text-slate-400 uppercase">
              {activeTab === 'daily' ? 'Today' : selectedMonth}
            </span>
          </div>

          <div className="p-4 flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-600 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" /> Fulfilled (Collected)
            </span>
            <span className="font-bold text-slate-800">{collectedCount}</span>
          </div>

          <div className="p-4 flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-600 flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" /> Pending (Ordered)
            </span>
            <span className="font-bold text-slate-800">{pendingCount}</span>
          </div>
        </div>

        {/* Meal Type Distribution Section */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Meal Distribution</h3>

          <div className="space-y-3">
            {/* Breakfast Stats Card */}
            <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
                  <Coffee className="h-5 w-5 stroke-[2.25]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Breakfast</h4>
                  <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Total Requests</p>
                  {activeStats?.breakfastVeg !== undefined && (
                    <p className="text-[9px] text-slate-400 font-bold mt-0.5 normal-case">
                      Veg: {activeStats.breakfastVeg} • Non-Veg: {activeStats.breakfastMeat}
                    </p>
                  )}
                </div>
              </div>
              <span className="text-sm font-bold text-slate-800">
                {activeStats?.breakfast || 0}
              </span>
            </div>

            {/* Lunch Stats Card */}
            <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Utensils className="h-5 w-5 stroke-[2.25]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Lunch</h4>
                  <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Total Requests</p>
                  {activeStats?.lunchVeg !== undefined && (
                    <p className="text-[9px] text-slate-400 font-bold mt-0.5 normal-case">
                      Veg: {activeStats.lunchVeg} • Non-Veg: {activeStats.lunchMeat}
                    </p>
                  )}
                </div>
              </div>
              <span className="text-sm font-bold text-slate-800">
                {activeStats?.lunch || 0}
              </span>
            </div>

            {/* Dinner Stats Card */}
            <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
                  <Moon className="h-5 w-5 stroke-[2.25]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Dinner</h4>
                  <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Total Requests</p>
                  {activeStats?.dinnerVeg !== undefined && (
                    <p className="text-[9px] text-slate-400 font-bold mt-0.5 normal-case">
                      Veg: {activeStats.dinnerVeg} • Non-Veg: {activeStats.dinnerMeat}
                    </p>
                  )}
                </div>
              </div>
              <span className="text-sm font-bold text-slate-800">
                {activeStats?.dinner || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Aggregated distribution table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50/50 text-xs font-bold text-slate-800">
            {activeTab === 'daily' ? "Today's Distribution Summary" : "Monthly Distribution Summary"}
          </div>
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-left text-xs font-medium text-slate-500 border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] uppercase font-bold text-slate-400">
                  <th className="pb-2">Meal Type</th>
                  <th className="pb-2 text-right">Requested</th>
                  <th className="pb-2 text-right">Ratio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-2.5 font-semibold text-slate-700">Breakfast</td>
                  <td className="py-2.5 text-right font-bold text-slate-800">
                    {activeStats?.breakfast || 0}
                    {activeStats?.breakfastVeg !== undefined && (
                      <span className="text-[10px] text-slate-400 block font-normal mt-0.5">
                        (Veg: {activeStats.breakfastVeg} / Non-Veg: {activeStats.breakfastMeat})
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 text-right text-slate-500">
                    {totalRequests > 0 ? Math.round(((activeStats?.breakfast || 0) / totalRequests) * 100) : 0}%
                  </td>
                </tr>
                 <tr>
                  <td className="py-2.5 font-semibold text-slate-700">Lunch</td>
                  <td className="py-2.5 text-right font-bold text-slate-800">
                    {activeStats?.lunch || 0}
                    {activeStats?.lunchVeg !== undefined && (
                      <span className="text-[10px] text-slate-400 block font-normal mt-0.5">
                        (Veg: {activeStats.lunchVeg} / Non-Veg: {activeStats.lunchMeat})
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 text-right text-slate-500">
                    {totalRequests > 0 ? Math.round(((activeStats?.lunch || 0) / totalRequests) * 100) : 0}%
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 font-semibold text-slate-700">Dinner</td>
                  <td className="py-2.5 text-right font-bold text-slate-800">
                    {activeStats?.dinner || 0}
                    {activeStats?.dinnerVeg !== undefined && (
                      <span className="text-[10px] text-slate-400 block font-normal mt-0.5">
                        (Veg: {activeStats.dinnerVeg} / Non-Veg: {activeStats.dinnerMeat})
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 text-right text-slate-500">
                    {totalRequests > 0 ? Math.round(((activeStats?.dinner || 0) / totalRequests) * 100) : 0}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        </>
        ) : (
          <div className="space-y-4">
            {/* Rates Applied Card */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div>
                <h3 className="text-xs font-bold text-slate-800">Applied Pricing Rates</h3>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">Rates configured by Canteen Staff</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-600 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                <span className="flex items-center gap-1.5"><Coffee className="h-3.5 w-3.5 text-amber-500" /> BF: Rs. {spendingData?.prices.breakfast || 300}</span>
                <span className="h-4 w-[1px] bg-slate-200 self-center" />
                <span className="flex items-center gap-1.5"><Utensils className="h-3.5 w-3.5 text-blue-500" /> LH: Rs. {spendingData?.prices.lunch || 350}</span>
                <span className="h-4 w-[1px] bg-slate-200 self-center" />
                <span className="flex items-center gap-1.5"><Moon className="h-3.5 w-3.5 text-indigo-500" /> DN: Rs. {spendingData?.prices.dinner || 400}</span>
              </div>
            </div>

            {/* Billing policy alert banner */}
            <div className="bg-blue-50/50 border border-blue-100/50 rounded-2xl p-3.5 flex items-start gap-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
              <CircleAlert className="h-4.5 w-4.5 text-blue-600 shrink-0 mt-0.5 stroke-[2.25]" />
              <div className="text-xs text-blue-700 leading-relaxed font-semibold">
                <span className="font-bold">Billing Policy Note:</span> Meal spending counts include all orders (both collected and uncollected/pending status) for the selected month to ensure canteen costs are fully accounted.
              </div>
            </div>

            {/* Filter toolbar */}
            <div className="flex gap-2.5">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Search name or employee ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus-visible:outline-none focus:border-blue-500 shadow-sm"
                />
              </div>
              <button
                onClick={handleExportCSV}
                disabled={!spendingData || spendingData.spendingList.length === 0}
                className="h-10 px-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 text-white rounded-xl text-[10px] font-extrabold tracking-wide flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 shrink-0"
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </button>
            </div>

            {/* Spending Table Card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50/50 flex justify-between items-center text-xs font-bold text-slate-800">
                <span>Employee Meal Spending Sheet</span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase">{selectedMonth}</span>
              </div>
              
              <div className="overflow-x-auto">
                {spendingLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <RefreshCw className="h-7 w-7 animate-spin text-blue-600" />
                    <p className="text-xs text-slate-400 font-bold">Generating billing sheet...</p>
                  </div>
                ) : filteredSpendingList.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs font-semibold">
                    No employee spending records found for this month
                  </div>
                ) : (
                  <table className="w-full text-left text-xs font-medium text-slate-500 border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-[10px] uppercase font-bold text-slate-400 bg-slate-50/40">
                        <th className="py-2.5 px-4 font-bold">Emp ID</th>
                        <th className="py-2.5 px-3 font-bold">Name</th>
                        <th className="py-2.5 px-2 text-center font-bold">Breakfast</th>
                        <th className="py-2.5 px-2 text-center font-bold">Lunch</th>
                        <th className="py-2.5 px-2 text-center font-bold">Dinner</th>
                        <th className="py-2.5 px-4 text-right font-bold">Total Spent</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredSpendingList.map((item, index) => (
                        <tr key={index} className="hover:bg-slate-50/30 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-700">{item.employeeNo}</td>
                          <td className="py-3 px-3 font-semibold text-slate-800 max-w-[150px] truncate" title={item.employeeName}>
                            {item.employeeName}
                          </td>
                          <td className="py-3 px-2 text-center font-bold text-slate-600">{item.breakfastCount}</td>
                          <td className="py-3 px-2 text-center font-bold text-slate-600">{item.lunchCount}</td>
                          <td className="py-3 px-2 text-center font-bold text-slate-600">{item.dinnerCount}</td>
                          <td className="py-3 px-4 text-right font-extrabold text-blue-600 text-[13px]">
                            Rs. {item.totalCost.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default function AdminReportsPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <RefreshCw className="h-7 w-7 animate-spin text-blue-600" />
      </div>
    }>
      <ReportsPageContent />
    </Suspense>
  );
}


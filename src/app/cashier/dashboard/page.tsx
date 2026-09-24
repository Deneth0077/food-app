'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Utensils,
  Coffee,
  Moon,
  Search,
  RefreshCw,
  CheckCircle2,
  Clock,
  LogOut,
  Calendar,
  Building,
  Phone,
  Check,
  RotateCcw,
  ShieldCheck,
  AlertCircle,
  Lock,
  Sparkles,
  User as UserIcon,
  ChevronRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ConfirmDialog } from '@/components/ConfirmDialog';

interface CashierUser {
  _id: string;
  fullName: string;
  employeeNo: string;
  role: string;
}

interface OrderItem {
  _id: string;
  userId: string;
  employeeName: string;
  employeeNo: string;
  phoneNumber: string;
  mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER';
  mealOption?: 'VEGETARIAN' | 'MEAT';
  notes?: string;
  status: 'ORDERED' | 'COLLECTED' | 'CANCELLED';
  paymentConfirmed?: boolean;
  paymentConfirmedAt?: string;
  confirmedByCashier?: boolean;
  requestDate: string;
  requestedAt: string;
  collectedAt?: string;
  department?: 'CWIT' | 'ECT' | 'SAGT' | 'CICT';
}

export default function CashierDashboard() {
  const router = useRouter();
  const { toast } = useToast();

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [user, setUser] = useState<CashierUser | null>(null);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [mealFilter, setMealFilter] = useState<'ALL' | 'BREAKFAST' | 'LUNCH' | 'DINNER'>('ALL');
  const [siteFilter, setSiteFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'WAITING' | 'CONFIRMED'>('ALL');

  // Confirmation dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'primary';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  // Live timer tick for undo countdowns
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);

      // Fetch cashier profile
      const meRes = await fetch('/api/auth/me');
      if (meRes.ok) {
        const meData = await meRes.json();
        if (meData.user) {
          setUser(meData.user);
        }
      }

      // Fetch orders for selected date
      const ordersRes = await fetch(`/api/orders?requestDate=${selectedDate}`);
      if (!ordersRes.ok) {
        if (ordersRes.status === 401 || ordersRes.status === 403) {
          router.push('/auth/login');
          return;
        }
        throw new Error('Failed to load orders');
      }

      const data = await ordersRes.json();
      setOrders(data.orders || []);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Could not fetch cashier data',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDate, router, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      toast({
        title: 'Logged Out',
        description: 'Cashier session ended successfully.',
      });
      router.push('/auth/login');
      router.refresh();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to log out.',
      });
    }
  };

  // Cashier confirms payment & handover
  const handleConfirmPaymentAndOrder = (order: OrderItem) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Confirm Meal Payment & Handover',
      description: `Confirm meal parcel delivery and cash payment for ${order.employeeName} (Emp ID: ${order.employeeNo}) for ${order.mealType}?`,
      confirmText: 'Your Payment and Order Confirmed',
      cancelText: 'Cancel',
      variant: 'primary',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        setProcessingId(order._id);
        try {
          const res = await fetch('/api/orders', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: order._id,
              status: 'COLLECTED',
              confirmPayment: true
            })
          });

          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || 'Failed to confirm payment');
          }

          toast({
            title: 'Payment & Order Confirmed!',
            description: `Order for ${order.employeeName} (${order.employeeNo}) confirmed. You have 10 minutes to undo if clicked by mistake.`,
          });

          // Refresh data locally
          const nowIso = new Date().toISOString();
          setOrders(prev => prev.map(o => o._id === order._id ? {
            ...o,
            status: 'COLLECTED',
            paymentConfirmed: true,
            confirmedByCashier: true,
            collectedAt: nowIso,
            paymentConfirmedAt: nowIso
          } : o));
        } catch (err: any) {
          toast({
            variant: 'destructive',
            title: 'Confirmation Failed',
            description: err.message || 'Something went wrong',
          });
        } finally {
          setProcessingId(null);
        }
      }
    });
  };

  // Cashier reverts/undoes payment confirmation within 10 minutes
  const handleUndoConfirmation = (order: OrderItem) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Undo Payment Confirmation?',
      description: `Are you sure you want to undo payment confirmation for ${order.employeeName} (${order.employeeNo})? This will revert the order back to pending.`,
      confirmText: 'Yes, Undo Confirmation',
      cancelText: 'Keep Confirmed',
      variant: 'warning',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        setProcessingId(order._id);
        try {
          const res = await fetch('/api/orders', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: order._id,
              revertPayment: true
            })
          });

          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || 'Failed to undo confirmation');
          }

          toast({
            title: 'Confirmation Reverted',
            description: `Order for ${order.employeeName} has been reverted to pending collection.`,
          });

          // Refresh data locally
          setOrders(prev => prev.map(o => o._id === order._id ? {
            ...o,
            status: 'ORDERED',
            paymentConfirmed: false,
            confirmedByCashier: false,
            paymentConfirmedAt: undefined,
            collectedAt: undefined
          } : o));
        } catch (err: any) {
          toast({
            variant: 'destructive',
            title: 'Undo Failed',
            description: err.message || 'Something went wrong',
          });
        } finally {
          setProcessingId(null);
        }
      }
    });
  };

  // Filtered orders list
  const filteredOrders = orders.filter((order) => {
    // Exclude cancelled orders
    if (order.status === 'CANCELLED') return false;

    // Search query check (Emp ID, Name, Phone)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = order.employeeName.toLowerCase().includes(q);
      const matchPhone = order.phoneNumber.toLowerCase().includes(q);

      // Smart Emp No matching: matches raw string AND zero-stripped string (e.g. 417 matches 000417)
      const cleanQ = q.replace(/^0+/, '');
      const cleanEmpNo = order.employeeNo.toLowerCase().replace(/^0+/, '');
      const matchEmpNo =
        order.employeeNo.toLowerCase().includes(q) ||
        (cleanQ.length > 0 && cleanEmpNo.includes(cleanQ));

      if (!matchName && !matchEmpNo && !matchPhone) return false;
    }

    // Meal filter
    if (mealFilter !== 'ALL' && order.mealType !== mealFilter) return false;

    // Site filter
    if (siteFilter !== 'ALL' && order.department !== siteFilter) return false;

    // Status filter (WAITING vs CONFIRMED)
    if (statusFilter === 'WAITING' && (order.status === 'COLLECTED' || order.paymentConfirmed)) return false;
    if (statusFilter === 'CONFIRMED' && !(order.paymentConfirmed || order.confirmedByCashier || order.status === 'COLLECTED')) return false;

    return true;
  });

  const totalOrders = orders.filter(o => o.status !== 'CANCELLED').length;
  const waitingOrders = orders.filter(o => o.status === 'ORDERED' && !o.paymentConfirmed).length;
  const confirmedOrders = orders.filter(o => o.status === 'COLLECTED' || o.paymentConfirmed).length;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm font-semibold text-slate-500">Loading Cashier Desk...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans">
      {/* Sticky Header - Minimal, Clean & Uncluttered Layout */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-100 flex items-center justify-between px-3.5 sm:px-6 h-14 shadow-xs">
        {/* Left Brand & Title */}
        <div className="flex items-center gap-2.5 shrink-0">
          <img src="/logo.png" className="h-7 sm:h-8 object-contain shrink-0" alt="ZPMC Lanka" />
          <div className="h-4 w-[1px] bg-slate-200 shrink-0" />
          <div className="flex items-center gap-2">
            <h1 className="text-xs sm:text-sm font-bold text-slate-800 whitespace-nowrap">Cashier Desk</h1>
            <span className="hidden sm:inline-flex text-[9px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded shrink-0">
              Payment Desk
            </span>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all active:scale-95 border border-slate-200 shrink-0 cursor-pointer"
            title="Refresh Queue"
          >
            <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          <div className="relative">
            <div
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-2.5 sm:px-3 py-1.5 rounded-xl shadow-xs cursor-pointer transition-all select-none shrink-0"
            >
              <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-lg bg-blue-700 text-white font-black flex items-center justify-center text-xs shrink-0">
                {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'C'}
              </div>
              <div className="text-left whitespace-nowrap">
                <p className="text-xs font-bold leading-none">{user?.fullName ? user.fullName.split(' ')[0] : 'Cashier'}</p>
                <p className="text-[9.5px] font-semibold text-blue-100 leading-none mt-0.5">{user?.employeeNo || 'CASHIER01'}</p>
              </div>
            </div>

            {showProfileDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowProfileDropdown(false)} />
                <div className="absolute right-0 top-11 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 z-50">
                  <div className="px-3.5 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-800">{user?.fullName || 'Cashier'}</p>
                    <p className="text-[10px] text-slate-400 font-semibold">{user?.employeeNo || 'CASHIER01'}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3.5 py-2 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors mt-1 cursor-pointer"
                  >
                    <LogOut className="h-4 w-4 text-red-500" />
                    Logout Cashier
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 p-3 sm:p-5 space-y-3.5 max-w-7xl w-full mx-auto pb-24">
        {/* Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3.5">
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Today Orders</p>
              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-800 mt-0.5">{totalOrders}</h3>
              <p className="text-[10px] text-slate-400 font-medium">Meal requests registered</p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center">
              <Utensils className="h-4.5 w-4.5 stroke-[2.25]" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-3.5 border border-amber-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Waiting Collection</p>
              <h3 className="text-xl sm:text-2xl font-extrabold text-amber-700 mt-0.5">{waitingOrders}</h3>
              <p className="text-[10px] text-amber-600/80 font-medium">Ready to pay and collect</p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center">
              <Clock className="h-4.5 w-4.5 stroke-[2.25] animate-pulse" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-3.5 border border-emerald-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Confirmed & Paid</p>
              <h3 className="text-xl sm:text-2xl font-extrabold text-emerald-800 mt-0.5">{confirmedOrders}</h3>
              <p className="text-[10px] text-emerald-600/80 font-medium">Payment & order confirmed</p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="h-4.5 w-4.5 stroke-[2.25]" />
            </div>
          </div>
        </div>

        {/* Filter and Search Bar Card */}
        <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs space-y-2.5">
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
            {/* Search Input with Emp ID emphasis */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search Emp ID (e.g. 417, 000632), Name or Phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-14 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
              />
              {searchQuery ? (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 hover:text-slate-600"
                >
                  Clear
                </button>
              ) : (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9.5px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                  Emp ID Search
                </span>
              )}
            </div>

            {/* Date Selector */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700">
                <Calendar className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-slate-800 focus:outline-none cursor-pointer text-xs"
                />
              </div>
              <button
                onClick={() => setSelectedDate(todayStr)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${selectedDate === todayStr ? 'bg-blue-600 text-white border-blue-600 shadow-xs' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
              >
                Today
              </button>
            </div>
          </div>

          {/* Filter Option Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
            {/* Meal Filter */}
            <div className="flex items-center bg-slate-50 rounded-xl p-1 border border-slate-200/80 text-[11px] font-bold">
              {(['ALL', 'BREAKFAST', 'LUNCH', 'DINNER'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMealFilter(m)}
                  className={`px-2 py-0.5 rounded-lg capitalize transition-all ${mealFilter === m ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  {m.toLowerCase()}
                </button>
              ))}
            </div>

            {/* Work Site Filter */}
            <div className="flex items-center bg-slate-50 rounded-xl p-1 border border-slate-200/80 text-[11px] font-bold">
              {(['ALL', 'CWIT', 'ECT', 'SAGT', 'CICT'] as const).map((site) => (
                <button
                  key={site}
                  onClick={() => setSiteFilter(site)}
                  className={`px-2 py-0.5 rounded-lg transition-all ${siteFilter === site ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  {site}
                </button>
              ))}
            </div>

            {/* Status Filter */}
            <div className="flex items-center bg-slate-50 rounded-xl p-1 border border-slate-200/80 text-[11px] font-bold sm:ml-auto">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-2 py-0.5 rounded-lg transition-all ${statusFilter === 'ALL' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-800'}`}
              >
                All Statuses
              </button>
              <button
                onClick={() => setStatusFilter('WAITING')}
                className={`px-2 py-0.5 rounded-lg transition-all ${statusFilter === 'WAITING' ? 'bg-amber-600 text-white' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Waiting
              </button>
              <button
                onClick={() => setStatusFilter('CONFIRMED')}
                className={`px-2 py-0.5 rounded-lg transition-all ${statusFilter === 'CONFIRMED' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Confirmed
              </button>
            </div>
          </div>
        </div>

        {/* Meal Collection Queue List */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              Meal Collection Queue ({filteredOrders.length})
            </h2>
            <span className="text-[11px] font-semibold text-slate-500">
              Orders for {format(new Date(selectedDate + 'T00:00:00'), 'MMM dd, yyyy')}
            </span>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200/80 shadow-xs space-y-1.5">
              <AlertCircle className="h-7 w-7 text-slate-300 mx-auto" />
              <h4 className="text-xs font-bold text-slate-700">No matching meal orders found</h4>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto font-medium">
                No employee orders match your active filter or search keywords for this date.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5">
              {filteredOrders.map((order) => {
                const isConfirmed = order.paymentConfirmed || order.confirmedByCashier || order.status === 'COLLECTED';

                // Calculate 10-minute undo window countdown
                let undoMsRemaining = 0;
                if (isConfirmed && order.paymentConfirmedAt) {
                  const confirmedTime = new Date(order.paymentConfirmedAt).getTime();
                  const expireTime = confirmedTime + 10 * 60 * 1000; // 10 minutes
                  undoMsRemaining = expireTime - currentTime.getTime();
                }

                const canUndo = isConfirmed && undoMsRemaining > 0;
                const undoMins = Math.floor(Math.max(0, undoMsRemaining) / (1000 * 60));
                const undoSecs = Math.floor((Math.max(0, undoMsRemaining) % (1000 * 60)) / 1000);
                const undoTimerText = `${undoMins.toString().padStart(2, '0')}:${undoSecs.toString().padStart(2, '0')}`;

                return (
                  <div
                    key={order._id}
                    className={`bg-white rounded-xl px-3.5 py-2.5 sm:px-4 sm:py-3 border transition-all duration-200 shadow-2xs hover:shadow-xs flex flex-col gap-2 relative overflow-hidden ${
                      isConfirmed
                        ? 'border-emerald-200 bg-emerald-50/15'
                        : 'border-slate-200/80 hover:border-blue-300'
                    }`}
                  >
                    {/* Top Accent Bar */}
                    <div className={`absolute top-0 left-0 right-0 h-1 ${isConfirmed ? 'bg-emerald-500' : 'bg-amber-400'}`} />

                    {/* Compact Main Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-0.5">
                      {/* Left: Avatar + Employee Info in tight horizontal line */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-8 w-8 rounded-lg bg-blue-50 border border-blue-100 text-blue-700 font-extrabold flex items-center justify-center text-xs shrink-0">
                          {order.employeeName.charAt(0).toUpperCase()}
                        </div>

                        <div className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <h3 className="text-xs sm:text-sm font-bold text-slate-850 truncate max-w-[160px] sm:max-w-xs">
                            {order.employeeName}
                          </h3>
                          <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 border border-blue-100 px-1.5 py-0.2 rounded shrink-0">
                            Emp: {order.employeeNo}
                          </span>
                          <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1 shrink-0">
                            <Phone className="h-3 w-3 text-slate-400" />
                            {order.phoneNumber}
                          </span>
                          {order.department && (
                            <span className="text-[9.5px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded shrink-0">
                              {order.department}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Meal Session & Dietary Badges */}
                      <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-center">
                        <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded flex items-center gap-1 border ${
                          order.mealType === 'BREAKFAST'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : order.mealType === 'LUNCH'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        }`}>
                          {order.mealType === 'BREAKFAST' ? (
                            <Coffee className="h-3 w-3" />
                          ) : order.mealType === 'LUNCH' ? (
                            <Utensils className="h-3 w-3" />
                          ) : (
                            <Moon className="h-3 w-3" />
                          )}
                          {order.mealType}
                        </span>

                        {order.mealOption && (
                          <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded border ${
                            order.mealOption === 'VEGETARIAN'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}>
                            {order.mealOption === 'VEGETARIAN' ? '🟢 Veg' : '🔴 Non-Veg'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Special Request Notes */}
                    {order.notes && (
                      <div className="bg-slate-50/80 rounded-lg px-2.5 py-1 border border-slate-100 text-[10.5px] text-slate-600 font-medium">
                        <span className="font-bold text-slate-400">Note:</span> &ldquo;{order.notes}&rdquo;
                      </div>
                    )}

                    {/* Bottom Action Footer */}
                    <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 text-xs">
                      {!isConfirmed ? (
                        <>
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-700">
                            <Clock className="h-3.5 w-3.5 text-amber-500 animate-spin shrink-0" />
                            <span>Pending Collection & Hand Over</span>
                          </div>

                          <button
                            type="button"
                            disabled={processingId === order._id}
                            onClick={() => handleConfirmPaymentAndOrder(order)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-[11px] font-bold rounded-lg shadow-2xs transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                          >
                            {processingId === order._id ? (
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5 stroke-[3]" />
                            )}
                            <span>Confirm Payment & Order</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            <span>Your Payment & Order Confirmed</span>
                          </div>

                          {canUndo ? (
                            <button
                              type="button"
                              disabled={processingId === order._id}
                              onClick={() => handleUndoConfirmation(order)}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[10.5px] font-bold rounded-lg transition-all active:scale-95 flex items-center justify-center gap-1 shrink-0 cursor-pointer"
                              title="Click to revert if clicked by mistake"
                            >
                              {processingId === order._id ? (
                                <RefreshCw className="h-3 w-3 animate-spin" />
                              ) : (
                                <RotateCcw className="h-3 w-3 text-amber-600" />
                              )}
                              <span>Undo ({undoTimerText})</span>
                            </button>
                          ) : (
                            <div className="flex items-center gap-1 text-slate-400 text-[10.5px] font-bold bg-slate-100 border border-slate-200/60 px-2 py-0.5 rounded-lg">
                              <Lock className="h-3 w-3 text-slate-400" />
                              <span>Finalized & Locked</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

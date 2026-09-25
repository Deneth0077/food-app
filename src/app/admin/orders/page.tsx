'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  Search,
  RefreshCw,
  Download,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Utensils,
  Coffee,
  Moon,
  Users,
  ChevronDown,
  Building,
  Check,
  Undo2,
  Trash2,
  X,
  Plus,
  UserPlus,
  Loader2,
  PackageCheck,
  FileText,
  Sparkles,
  UserCheck,
  Phone
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, subDays, addDays, formatDistanceToNow } from 'date-fns';
import * as XLSX from 'xlsx';
import { ConfirmDialog } from '@/components/ConfirmDialog';

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
  cancelledAt?: string;
  cancelledBy?: 'EMPLOYEE' | 'ADMIN';
  department?: 'CWIT' | 'ECT' | 'SAGT' | 'CICT';
}

export default function AdminOrdersPage() {
  const router = useRouter();
  const { toast } = useToast();

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [mealFilter, setMealFilter] = useState<'ALL' | 'BREAKFAST' | 'LUNCH' | 'DINNER'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ORDERED' | 'COLLECTED' | 'CANCELLED'>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [dietaryFilter, setDietaryFilter] = useState<'ALL' | 'VEGETARIAN' | 'MEAT'>('ALL');
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  // Manual Order Modal states
  const [showManualModal, setShowManualModal] = useState(false);
  const [empSearchQuery, setEmpSearchQuery] = useState('');
  const [searchingEmp, setSearchingEmp] = useState(false);
  const [empSearchResults, setEmpSearchResults] = useState<any[]>([]);
  const [selectedEmp, setSelectedEmp] = useState<any | null>(null);

  const [manualMealType, setManualMealType] = useState<'BREAKFAST' | 'LUNCH' | 'DINNER'>('LUNCH');
  const [manualMealOption, setManualMealOption] = useState<'VEGETARIAN' | 'MEAT'>('MEAT');
  const [manualRequestDate, setManualRequestDate] = useState<string>(todayStr);
  const [manualDepartment, setManualDepartment] = useState<string>('CWIT');
  const [manualNotes, setManualNotes] = useState<string>('');
  const [manualOrderMode, setManualOrderMode] = useState<'COLLECTION' | 'REPORT_ONLY'>('COLLECTION');
  const [submittingManual, setSubmittingManual] = useState(false);

  // Action processing
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Confirm dialog state
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

  // Auto open modal if manualOrder=true in query param
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('manualOrder') === 'true') {
        setShowManualModal(true);
      }
    }
  }, []);

  // Sync manualRequestDate when selectedDate changes
  useEffect(() => {
    setManualRequestDate(selectedDate);
  }, [selectedDate]);

  // Employee search logic for manual order modal
  const searchEmployees = useCallback(async (query: string) => {
    if (!query.trim()) {
      setEmpSearchResults([]);
      return;
    }
    try {
      setSearchingEmp(true);
      const res = await fetch(`/api/admin/employees?search=${encodeURIComponent(query.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setEmpSearchResults(data.employees || []);
      }
    } catch (err) {
      console.error('Error searching employees:', err);
    } finally {
      setSearchingEmp(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (empSearchQuery) {
        searchEmployees(empSearchQuery);
      } else {
        setEmpSearchResults([]);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [empSearchQuery, searchEmployees]);

  const handleSelectEmployee = (emp: any) => {
    setSelectedEmp(emp);
    if (emp.department) {
      setManualDepartment(emp.department);
    }
    setEmpSearchQuery('');
    setEmpSearchResults([]);
  };

  const handleCreateManualOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp) {
      toast({
        variant: 'destructive',
        title: 'Employee Required',
        description: 'Please search and select an employee first.',
      });
      return;
    }

    try {
      setSubmittingManual(true);
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: selectedEmp._id,
          employeeNo: selectedEmp.employeeNo,
          mealType: manualMealType,
          mealOption: manualMealOption,
          requestDate: manualRequestDate,
          department: manualDepartment,
          notes: manualNotes,
          orderMode: manualOrderMode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create manual order');
      }

      toast({
        title: 'Manual Order Created!',
        description: data.message || `Order for ${selectedEmp.fullName} (${selectedEmp.employeeNo}) added successfully.`,
      });

      setShowManualModal(false);
      // Reset form
      setSelectedEmp(null);
      setEmpSearchQuery('');
      setManualNotes('');
      // Refresh list
      fetchOrders();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to Add Order',
        description: err.message || 'Could not create manual order.',
      });
    } finally {
      setSubmittingManual(false);
    }
  };

  const fetchOrders = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);

      const res = await fetch(`/api/orders?requestDate=${selectedDate}`);
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          router.push('/auth/login');
          return;
        }
        throw new Error('Failed to load orders');
      }

      const data = await res.json();
      setOrders(data.orders || []);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Could not fetch orders list',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDate, router, toast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Handle Mark Collected / Revert to Pending
  const handleToggleCollected = async (order: OrderItem) => {
    setProcessingId(order._id);
    const newStatus = order.status === 'COLLECTED' ? 'ORDERED' : 'COLLECTED';
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order._id,
          status: newStatus
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update order status');
      }

      toast({
        title: newStatus === 'COLLECTED' ? 'Marked as Collected' : 'Reverted to Ordered',
        description: `Order for ${order.employeeName} (${order.employeeNo}) updated.`,
      });

      // Update state locally
      setOrders(prev => prev.map(o => o._id === order._id ? {
        ...o,
        status: newStatus,
        collectedAt: newStatus === 'COLLECTED' ? new Date().toISOString() : undefined
      } : o));
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: err.message || 'Something went wrong',
      });
    } finally {
      setProcessingId(null);
    }
  };

  // Handle Admin Cancel Order
  const handleAdminCancelOrder = (order: OrderItem) => {
    setConfirmDialog({
      isOpen: true,
      title: `Cancel ${order.mealType.toLowerCase()} Order?`,
      description: `Are you sure you want to cancel the ${order.mealType} order for ${order.employeeName} (${order.employeeNo}) on ${order.requestDate}? This action will record a cancellation timestamp.`,
      confirmText: 'Yes, Cancel Order',
      cancelText: 'Keep Order',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        setProcessingId(order._id);
        try {
          const res = await fetch(`/api/orders?orderId=${order._id}`, {
            method: 'DELETE'
          });

          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Failed to cancel order');
          }

          toast({
            title: 'Order Cancelled',
            description: `Order for ${order.employeeName} has been cancelled by Admin.`,
          });

          setOrders(prev => prev.map(o => o._id === order._id ? {
            ...o,
            status: 'CANCELLED',
            cancelledAt: new Date().toISOString(),
            cancelledBy: 'ADMIN'
          } : o));
        } catch (err: any) {
          toast({
            variant: 'destructive',
            title: 'Cancel Failed',
            description: err.message || 'Could not cancel order',
          });
        } finally {
          setProcessingId(null);
        }
      }
    });
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredOrders.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Data to Export',
        description: 'There are no orders matching your current filter.',
      });
      return;
    }

    const exportRows = filteredOrders.map((o, idx) => ({
      '#': idx + 1,
      'Order Date': o.requestDate,
      'Meal Session': o.mealType,
      'Employee ID': o.employeeNo,
      'Employee Name': o.employeeName,
      'Work Site': o.department || 'N/A',
      'Phone Number': o.phoneNumber,
      'Dietary Option': o.mealOption || 'Standard',
      'Status': o.status,
      'Ordered At': format(new Date(o.requestedAt), 'yyyy-MM-dd hh:mm:ss a'),
      'Collected At': o.collectedAt ? format(new Date(o.collectedAt), 'yyyy-MM-dd hh:mm:ss a') : 'N/A',
      'Cancelled At': o.cancelledAt ? format(new Date(o.cancelledAt), 'yyyy-MM-dd hh:mm:ss a') : 'N/A',
      'Cancelled By': o.cancelledBy || 'N/A',
      'Special Notes': o.notes || 'None',
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Orders');
    XLSX.writeFile(wb, `ZPMC_Meal_Orders_${selectedDate}.xlsx`);

    toast({
      title: 'Report Downloaded',
      description: `Exported ${exportRows.length} order records to Excel.`,
    });
  };

  // Metrics computation for KPI cards
  const totalOrders = orders.length;
  const activeOrders = orders.filter(o => o.status === 'ORDERED').length;
  const collectedOrders = orders.filter(o => o.status === 'COLLECTED').length;
  const cancelledOrders = orders.filter(o => o.status === 'CANCELLED').length;

  const breakfastOrders = orders.filter(o => o.mealType === 'BREAKFAST');
  const lunchOrders = orders.filter(o => o.mealType === 'LUNCH');
  const dinnerOrders = orders.filter(o => o.mealType === 'DINNER');

  // Filtered Orders
  const filteredOrders = orders.filter(order => {
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        order.employeeName.toLowerCase().includes(q) ||
        order.employeeNo.toLowerCase().includes(q) ||
        order.phoneNumber.toLowerCase().includes(q) ||
        (order.notes && order.notes.toLowerCase().includes(q));
      if (!match) return false;
    }

    // Meal Filter
    if (mealFilter !== 'ALL' && order.mealType !== mealFilter) return false;

    // Status Filter
    if (statusFilter !== 'ALL' && order.status !== statusFilter) return false;

    // Department Filter
    if (departmentFilter !== 'ALL' && order.department !== departmentFilter) return false;

    // Dietary Filter
    if (dietaryFilter !== 'ALL' && order.mealOption !== dietaryFilter) return false;

    return true;
  });

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-100 flex items-center justify-between px-4 sm:px-6 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/dashboard"
            className="h-9 w-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-650 hover:bg-slate-50 transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </Link>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-slate-850 tracking-tight leading-none">
              Order Management
            </h1>
            <p className="text-[9.5px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1 leading-none">
              Live Meal Requests &amp; Tracking
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Manual Order Creation Button */}
          <button
            type="button"
            onClick={() => setShowManualModal(true)}
            className="h-9 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
            title="Add Manual Meal Order"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Manual Order</span>
          </button>

          <button
            type="button"
            onClick={() => fetchOrders(true)}
            disabled={refreshing || loading}
            className="h-9 px-3 rounded-xl border border-slate-200 text-slate-650 hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            title="Refresh Orders"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="h-9 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
            title="Export Excel"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export Excel</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-3.5 sm:p-5 space-y-4 max-w-5xl w-full mx-auto pb-24">
        {/* Date Selector Toolbar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.015)] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Calendar className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 leading-tight">
                  Orders For Date
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                  {format(new Date(selectedDate + 'T00:00:00'), 'EEEE, MMMM dd, yyyy')}
                </p>
              </div>
            </div>

            {/* Quick Date Chips & Native Date Picker */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedDate(format(subDays(new Date(), 1), 'yyyy-MM-dd'))}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedDate === format(subDays(new Date(), 1), 'yyyy-MM-dd')
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-650 hover:bg-slate-200/70'
                }`}
              >
                Yesterday
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate(todayStr)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedDate === todayStr
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-650 hover:bg-slate-200/70'
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate(format(addDays(new Date(), 1), 'yyyy-MM-dd'))}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedDate === format(addDays(new Date(), 1), 'yyyy-MM-dd')
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-650 hover:bg-slate-200/70'
                }`}
              >
                Tomorrow
              </button>
              <div className="relative">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                  className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Live Counters (KPI Summary) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Total Orders Card */}
          <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.015)] flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Utensils className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Orders</p>
              <p className="text-xl sm:text-2xl font-black text-slate-800 mt-0.5">{totalOrders}</p>
            </div>
          </div>

          {/* Pending / Ordered */}
          <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.015)] flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending</p>
              <p className="text-xl sm:text-2xl font-black text-amber-600 mt-0.5">{activeOrders}</p>
            </div>
          </div>

          {/* Collected */}
          <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.015)] flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Collected</p>
              <p className="text-xl sm:text-2xl font-black text-green-600 mt-0.5">{collectedOrders}</p>
            </div>
          </div>

          {/* Cancelled */}
          <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.015)] flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <XCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cancelled</p>
              <p className="text-xl sm:text-2xl font-black text-rose-600 mt-0.5">{cancelledOrders}</p>
            </div>
          </div>
        </div>

        {/* Meal Session Breakdown Row */}
        <div className="grid grid-cols-3 gap-2.5">
          {/* Breakfast Mini */}
          <div className="bg-white rounded-xl p-3 border border-slate-100 text-center shadow-2xs">
            <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-amber-700">
              <Coffee className="h-3.5 w-3.5" /> Breakfast
            </div>
            <p className="text-lg font-black text-slate-800 mt-1">{breakfastOrders.length}</p>
            <div className="flex items-center justify-center gap-1.5 mt-1 text-[9px] font-extrabold">
              <span className="text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded">
                V: {breakfastOrders.filter(o => o.mealOption === 'VEGETARIAN').length}
              </span>
              <span className="text-rose-700 bg-rose-50 px-1 py-0.5 rounded">
                NV: {breakfastOrders.filter(o => o.mealOption === 'MEAT').length}
              </span>
            </div>
          </div>

          {/* Lunch Mini */}
          <div className="bg-white rounded-xl p-3 border border-slate-100 text-center shadow-2xs">
            <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-blue-700">
              <Utensils className="h-3.5 w-3.5" /> Lunch
            </div>
            <p className="text-lg font-black text-slate-800 mt-1">{lunchOrders.length}</p>
            <div className="flex items-center justify-center gap-1.5 mt-1 text-[9px] font-extrabold">
              <span className="text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded">
                V: {lunchOrders.filter(o => o.mealOption === 'VEGETARIAN').length}
              </span>
              <span className="text-rose-700 bg-rose-50 px-1 py-0.5 rounded">
                NV: {lunchOrders.filter(o => o.mealOption === 'MEAT').length}
              </span>
            </div>
          </div>

          {/* Dinner Mini */}
          <div className="bg-white rounded-xl p-3 border border-slate-100 text-center shadow-2xs">
            <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-indigo-700">
              <Moon className="h-3.5 w-3.5" /> Dinner
            </div>
            <p className="text-lg font-black text-slate-800 mt-1">{dinnerOrders.length}</p>
            <div className="flex items-center justify-center gap-1.5 mt-1 text-[9px] font-extrabold">
              <span className="text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded">
                V: {dinnerOrders.filter(o => o.mealOption === 'VEGETARIAN').length}
              </span>
              <span className="text-rose-700 bg-rose-50 px-1 py-0.5 rounded">
                NV: {dinnerOrders.filter(o => o.mealOption === 'MEAT').length}
              </span>
            </div>
          </div>
        </div>

        {/* Search & Filters Row */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.015)] space-y-3">
          <div className="flex flex-col sm:flex-row gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by employee name, ID, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-800"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Quick Meal Type Buttons */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0 overflow-x-auto">
              {(['ALL', 'BREAKFAST', 'LUNCH', 'DINNER'] as const).map((meal) => (
                <button
                  key={meal}
                  type="button"
                  onClick={() => setMealFilter(meal)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                    mealFilter === meal
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {meal === 'ALL' ? 'All Meals' : meal.charAt(0) + meal.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            {/* Toggle Filters Drawer */}
            <button
              type="button"
              onClick={() => setShowFilterDrawer(!showFilterDrawer)}
              className={`h-9 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shrink-0 ${
                showFilterDrawer || statusFilter !== 'ALL' || departmentFilter !== 'ALL' || dietaryFilter !== 'ALL'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-slate-200 text-slate-650 hover:bg-slate-50'
              }`}
            >
              <Filter className="h-3.5 w-3.5" />
              <span>Filters</span>
              {(statusFilter !== 'ALL' || departmentFilter !== 'ALL' || dietaryFilter !== 'ALL') && (
                <span className="h-2 w-2 rounded-full bg-blue-600" />
              )}
            </button>
          </div>

          {/* Expandable Advanced Filters */}
          {showFilterDrawer && (
            <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-2.5 animate-in fade-in duration-150">
              {/* Status Filter */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full text-xs font-bold p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 text-slate-700"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ORDERED">Pending (Ordered)</option>
                  <option value="COLLECTED">Collected</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              {/* Department / Site Filter */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Work Site
                </label>
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="w-full text-xs font-bold p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 text-slate-700"
                >
                  <option value="ALL">All Work Sites</option>
                  <option value="CWIT">CWIT</option>
                  <option value="ECT">ECT</option>
                  <option value="SAGT">SAGT</option>
                  <option value="CICT">CICT</option>
                </select>
              </div>

              {/* Dietary Option */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Dietary Preference
                </label>
                <select
                  value={dietaryFilter}
                  onChange={(e) => setDietaryFilter(e.target.value as any)}
                  className="w-full text-xs font-bold p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 text-slate-700"
                >
                  <option value="ALL">All Preferences</option>
                  <option value="VEGETARIAN">Vegetarian Only</option>
                  <option value="MEAT">Non-Vegetarian Only</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Orders Feed List / Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              Orders Feed ({filteredOrders.length})
            </h3>
            {filteredOrders.length !== orders.length && (
              <span className="text-[10px] font-bold text-blue-600">
                Filtered from {orders.length} total
              </span>
            )}
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 flex flex-col items-center gap-3">
              <RefreshCw className="h-7 w-7 animate-spin text-blue-600" />
              <p className="text-xs font-semibold text-slate-500">Loading meal orders for {selectedDate}...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center border border-slate-100 space-y-2">
              <AlertCircle className="h-8 w-8 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700">No Orders Found</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto font-medium">
                {orders.length === 0
                  ? `No meal orders have been recorded for ${selectedDate}.`
                  : 'No orders match your active filter criteria.'}
              </p>
              <button
                type="button"
                onClick={() => setShowManualModal(true)}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Manual Order</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredOrders.map((order) => {
                const isProcessing = processingId === order._id;
                const orderTimeObj = new Date(order.requestedAt);

                return (
                  <div
                    key={order._id}
                    className={`bg-white rounded-2xl p-3.5 sm:p-4 border transition-all duration-200 shadow-[0_2px_8px_rgba(0,0,0,0.015)] ${
                      order.status === 'CANCELLED'
                        ? 'border-rose-100 bg-rose-50/20 opacity-80'
                        : order.status === 'COLLECTED'
                        ? 'border-emerald-100/80 bg-emerald-50/10'
                        : 'border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Left: Employee Details & Meal Session */}
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Meal Session Icon */}
                        <div
                          className={`h-9 w-9 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center shrink-0 ${
                            order.mealType === 'BREAKFAST'
                              ? 'bg-amber-50 text-amber-600 border border-amber-100/60'
                              : order.mealType === 'LUNCH'
                              ? 'bg-blue-50 text-blue-600 border border-blue-100/60'
                              : 'bg-indigo-50 text-indigo-600 border border-indigo-100/60'
                          }`}
                        >
                          {order.mealType === 'BREAKFAST' ? (
                            <Coffee className="h-4.5 w-4.5" />
                          ) : order.mealType === 'LUNCH' ? (
                            <Utensils className="h-4.5 w-4.5" />
                          ) : (
                            <Moon className="h-4.5 w-4.5" />
                          )}
                        </div>

                        {/* Text details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h4 className="text-xs sm:text-sm font-bold text-slate-850 truncate">
                              {order.employeeName}
                            </h4>
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              {order.employeeNo}
                            </span>
                            {order.department && (
                              <span className="text-[9.5px] font-extrabold text-blue-700 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded">
                                {order.department}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] font-semibold text-slate-500">
                            <span className="capitalize font-bold text-slate-700">
                              {order.mealType.toLowerCase()}
                            </span>

                            {order.mealOption && (
                              <span
                                className={`text-[9px] font-black px-1.5 py-0.2 rounded border ${
                                  order.mealOption === 'VEGETARIAN'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-rose-50 text-rose-800 border-rose-200'
                                }`}
                              >
                                {order.mealOption === 'VEGETARIAN' ? '🟢 VEG' : '🔴 NON-VEG'}
                              </span>
                            )}

                            <span className="text-slate-400">•</span>
                            <span className="text-slate-500 text-[10px] font-medium">{order.phoneNumber}</span>
                          </div>

                          {/* Notes */}
                          {order.notes && (
                            <p className="mt-1.5 text-[10.5px] font-medium text-slate-600 bg-slate-50 border border-slate-100 rounded-lg p-1.5 leading-snug">
                              <span className="font-bold text-slate-400 text-[9px] uppercase tracking-wider block">Special Note:</span>
                              &ldquo;{order.notes}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right: Order Time & Status & Actions */}
                      <div className="flex flex-col sm:items-end justify-between gap-2 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                        {/* Status Badge */}
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border ${
                              order.paymentConfirmed || order.confirmedByCashier
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : order.status === 'COLLECTED'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : order.status === 'CANCELLED'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {order.paymentConfirmed || order.confirmedByCashier ? (
                              <>
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Payment & Order Confirmed
                              </>
                            ) : order.status === 'COLLECTED' ? (
                              <>
                                <CheckCircle2 className="h-3 w-3" /> Collected
                              </>
                            ) : order.status === 'CANCELLED' ? (
                              <>
                                <XCircle className="h-3 w-3" /> Cancelled
                              </>
                            ) : (
                              <>
                                <Clock className="h-3 w-3" /> Pending (Ordered)
                              </>
                            )}
                          </span>

                          {/* Action Buttons */}
                          {order.status !== 'CANCELLED' && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => handleToggleCollected(order)}
                                className={`h-7 px-2 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all active:scale-95 ${
                                  order.status === 'COLLECTED'
                                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-650'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                                }`}
                                title={order.status === 'COLLECTED' ? 'Undo Collection' : 'Mark as Collected'}
                              >
                                {isProcessing ? (
                                  <RefreshCw className="h-3 w-3 animate-spin" />
                                ) : order.status === 'COLLECTED' ? (
                                  <>
                                    <Undo2 className="h-3 w-3" /> Undo
                                  </>
                                ) : (
                                  <>
                                    <Check className="h-3 w-3" /> Collect
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => handleAdminCancelOrder(order)}
                                className="h-7 px-2 rounded-lg text-[10px] font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                                title="Admin Cancel Order"
                              >
                                <Trash2 className="h-3 w-3" />
                                <span className="hidden sm:inline">Cancel</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Timestamps Row */}
                        <div className="text-[10px] text-slate-400 font-semibold flex flex-wrap items-center gap-x-2.5 gap-y-1">
                          {/* Order Placement Time */}
                          <span className="flex items-center gap-1 text-slate-600" title="Exact Order Time">
                            <Clock className="h-3 w-3 text-slate-400" />
                            <span>Ordered at <strong className="text-slate-800">{format(orderTimeObj, 'h:mm a')}</strong></span>
                            <span className="text-slate-400">({formatDistanceToNow(orderTimeObj, { addSuffix: true })})</span>
                          </span>

                          {/* Collected Time */}
                          {order.collectedAt && (
                            <span className="text-emerald-700 font-bold">
                              • Collected: {format(new Date(order.collectedAt), 'h:mm a')}
                            </span>
                          )}

                          {/* Cancelled Time */}
                          {order.cancelledAt && (
                            <span className="text-rose-600 font-bold">
                              • Cancelled at {format(new Date(order.cancelledAt), 'h:mm a')} ({order.cancelledBy || 'User'})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Admin Manual Meal Order Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 border border-slate-100 my-auto animate-in zoom-in-95 duration-150 relative">
            <button
              onClick={() => setShowManualModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-100 pb-3.5">
              <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-850">Admin Manual Meal Order</h3>
                <p className="text-xs text-slate-400 font-medium">Add a meal order for an employee manually</p>
              </div>
            </div>

            <form onSubmit={handleCreateManualOrder} className="space-y-4">
              {/* Employee Selection */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Select Employee <span className="text-rose-500">*</span>
                </label>

                {selectedEmp ? (
                  <div className="flex items-center justify-between p-3 bg-blue-50/60 border border-blue-200 rounded-xl">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-blue-600 text-white font-black flex items-center justify-center text-xs">
                        {selectedEmp.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-850">{selectedEmp.fullName}</p>
                        <div className="flex items-center gap-2 text-[10.5px] font-semibold text-slate-500">
                          <span className="text-blue-700 font-bold">Emp ID: {selectedEmp.employeeNo}</span>
                          <span>• {selectedEmp.department || 'CWIT'}</span>
                          <span>• {selectedEmp.phoneNumber}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedEmp(null)}
                      className="text-xs font-bold text-blue-600 hover:underline px-2 py-1 cursor-pointer"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search by Emp ID (e.g. 417), Name or Phone..."
                      value={empSearchQuery}
                      onChange={(e) => setEmpSearchQuery(e.target.value)}
                      className="w-full h-10 pl-9 pr-9 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white text-slate-800"
                    />
                    {searchingEmp && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-blue-600" />
                    )}

                    {/* Results Dropdown */}
                    {empSearchResults.length > 0 && (
                      <div className="absolute top-11 left-0 right-0 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-20 divide-y divide-slate-100">
                        {empSearchResults.map((emp) => (
                          <div
                            key={emp._id}
                            onClick={() => handleSelectEmployee(emp)}
                            className="p-2.5 hover:bg-blue-50 cursor-pointer flex items-center justify-between transition-colors"
                          >
                            <div>
                              <p className="text-xs font-bold text-slate-800">{emp.fullName}</p>
                              <p className="text-[10px] font-semibold text-slate-400">
                                Emp ID: <span className="text-blue-600 font-bold">{emp.employeeNo}</span> • {emp.department || 'N/A'} • {emp.phoneNumber}
                              </p>
                            </div>
                            <UserCheck className="h-4 w-4 text-blue-600" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Meal Date & Session */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Order Date
                  </label>
                  <input
                    type="date"
                    value={manualRequestDate}
                    onChange={(e) => setManualRequestDate(e.target.value)}
                    className="w-full h-10 px-3 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 text-slate-800 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Work Site / Department
                  </label>
                  <select
                    value={manualDepartment}
                    onChange={(e) => setManualDepartment(e.target.value)}
                    className="w-full h-10 px-3 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 text-slate-800 cursor-pointer"
                  >
                    <option value="CWIT">CWIT</option>
                    <option value="ECT">ECT</option>
                    <option value="SAGT">SAGT</option>
                    <option value="CICT">CICT</option>
                  </select>
                </div>
              </div>

              {/* Meal Session Selection */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Meal Session
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['BREAKFAST', 'LUNCH', 'DINNER'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setManualMealType(m)}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                        manualMealType === m
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {m === 'BREAKFAST' ? <Coffee className="h-4 w-4" /> : m === 'LUNCH' ? <Utensils className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                      <span className="capitalize">{m.toLowerCase()}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dietary Option */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Dietary Preference
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setManualMealOption('MEAT')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      manualMealOption === 'MEAT'
                        ? 'bg-rose-500 text-white border-rose-500 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    🔴 Non-Vegetarian
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualMealOption('VEGETARIAN')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      manualMealOption === 'VEGETARIAN'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    🟢 Vegetarian
                  </button>
                </div>
              </div>

              {/* Two Requested Options: Collection vs Report Only */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Order Type / Destination <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div
                    onClick={() => setManualOrderMode('COLLECTION')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all space-y-1 ${
                      manualOrderMode === 'COLLECTION'
                        ? 'bg-blue-50/80 border-blue-600 ring-2 ring-blue-500/20'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                      <PackageCheck className="h-4 w-4 text-blue-600" />
                      <span>Order for Collection</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium leading-snug">
                      Employee will physically collect/receive food at Canteen (enters live queue).
                    </p>
                  </div>

                  <div
                    onClick={() => setManualOrderMode('REPORT_ONLY')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all space-y-1 ${
                      manualOrderMode === 'REPORT_ONLY'
                        ? 'bg-purple-50/80 border-purple-600 ring-2 ring-purple-500/20'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                      <FileText className="h-4 w-4 text-purple-600" />
                      <span>Add to Report Only</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium leading-snug">
                      Record order directly as fulfilled for accounting reports (bypasses live queue).
                    </p>
                  </div>
                </div>
              </div>

              {/* Notes Input */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Special Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Added by Admin for night shift extra..."
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  className="w-full h-10 px-3 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 text-slate-800"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingManual || !selectedEmp}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
                >
                  {submittingManual ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  <span>Add Meal Order</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Styled Confirmation Dialog */}
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

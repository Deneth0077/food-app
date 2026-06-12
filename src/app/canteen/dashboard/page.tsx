'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  SlidersHorizontal, 
  Coffee, 
  Utensils, 
  Moon, 
  CheckCircle, 
  RefreshCw, 
  Phone,
  User as UserIcon,
  CircleAlert,
  Loader2,
  LogOut
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Order {
  _id: string;
  employeeName: string;
  employeeNo: string;
  phoneNumber: string;
  mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER';
  mealOption?: 'VEGETARIAN' | 'MEAT';
  status: 'ORDERED' | 'COLLECTED';
  requestedAt: string;
  collectedAt?: string;
  requestDate: string;
  notes?: string;
}

export default function CanteenDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMealFilter, setSelectedMealFilter] = useState<'ALL' | 'BREAKFAST' | 'LUNCH' | 'DINNER'>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'ALL' | 'ORDERED' | 'COLLECTED'>('ALL');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/orders');
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
        description: err.message || 'Could not fetch orders',
      });
    } finally {
      setLoading(false);
    }
  }, [router, toast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleMarkAsCollected = async (orderId: string) => {
    setUpdatingOrderId(orderId);
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update order');
      }

      toast({
        title: 'Collected',
        description: 'Order successfully marked as collected.',
      });

      // Update the order in local state
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: 'COLLECTED', collectedAt: new Date().toISOString() } : o));
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Action Failed',
        description: err.message || 'Something went wrong',
      });
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/auth/login');
      router.refresh();
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered orders list
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.employeeNo.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesMeal = selectedMealFilter === 'ALL' || order.mealType === selectedMealFilter;
    const matchesStatus = selectedStatusFilter === 'ALL' || order.status === selectedStatusFilter;

    return matchesSearch && matchesMeal && matchesStatus;
  });

  // Expected stats counts for today
  const breakfastExpected = orders.filter(o => o.mealType === 'BREAKFAST').length;
  const breakfastVegExpected = orders.filter(o => o.mealType === 'BREAKFAST' && o.mealOption === 'VEGETARIAN').length;
  const breakfastMeatExpected = orders.filter(o => o.mealType === 'BREAKFAST' && o.mealOption === 'MEAT').length;
  const lunchExpected = orders.filter(o => o.mealType === 'LUNCH').length;
  const lunchVegExpected = orders.filter(o => o.mealType === 'LUNCH' && o.mealOption === 'VEGETARIAN').length;
  const lunchMeatExpected = orders.filter(o => o.mealType === 'LUNCH' && o.mealOption === 'MEAT').length;
  const dinnerExpected = orders.filter(o => o.mealType === 'DINNER').length;
  const dinnerVegExpected = orders.filter(o => o.mealType === 'DINNER' && o.mealOption === 'VEGETARIAN').length;
  const dinnerMeatExpected = orders.filter(o => o.mealType === 'DINNER' && o.mealOption === 'MEAT').length;

  const pendingActiveCount = orders.filter(o => o.status === 'ORDERED').length;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-100 flex items-center justify-between px-5 shadow-sm">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" className="h-11 object-contain" alt="ZPMC Lanka" />
          <div className="h-6 w-[1px] bg-slate-200" />
          <div>
            <h1 className="text-sm font-bold text-slate-850 tracking-tight leading-none">Canteen Operations</h1>
            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mt-1.5 leading-none">Dashboard</p>
          </div>
        </div>
        
        <button 
          onClick={handleLogout}
          className="p-2.5 text-slate-400 hover:text-red-500 rounded-full hover:bg-slate-50 transition-colors"
          title="Logout"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 p-5 space-y-5 overflow-y-auto pb-24">
        {/* Today's Overview scroll cards */}
        <div className="space-y-2.5">
          <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Today's Overview</h2>
          <div className="grid grid-cols-3 gap-3">
            {/* Breakfast Stats */}
            <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between">
              <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center">
                <Coffee className="h-4.5 w-4.5" />
              </div>
              <div className="mt-2">
                <p className="text-xl font-bold text-slate-800 leading-tight">{breakfastExpected}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mt-0.5 leading-none">Breakfast</p>
                <p className="text-[8px] font-bold text-slate-450 mt-1 leading-none">V: {breakfastVegExpected} • M: {breakfastMeatExpected}</p>
              </div>
            </div>

            {/* Lunch Stats */}
            <div className="bg-blue-600 rounded-2xl p-3 text-white shadow-md flex flex-col justify-between">
              <div className="h-8 w-8 rounded-lg bg-white/20 text-white flex items-center justify-center">
                <Utensils className="h-4.5 w-4.5" />
              </div>
              <div className="mt-2">
                <p className="text-xl font-bold leading-tight">{lunchExpected}</p>
                <p className="text-[9px] font-bold text-blue-100 uppercase tracking-wide mt-0.5 leading-none">Lunch</p>
                <p className="text-[8px] font-bold text-blue-100/90 mt-1 leading-none">V: {lunchVegExpected} • M: {lunchMeatExpected}</p>
              </div>
            </div>

            {/* Dinner Stats */}
            <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between">
              <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center">
                <Moon className="h-4.5 w-4.5" />
              </div>
              <div className="mt-2">
                <p className="text-xl font-bold text-slate-800 leading-tight">{dinnerExpected}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mt-0.5 leading-none">Dinner</p>
                <p className="text-[8px] font-bold text-slate-450 mt-1 leading-none">V: {dinnerVegExpected} • M: {dinnerMeatExpected}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Requests List Area */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              Pending Requests
              <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {pendingActiveCount} Active
              </span>
            </h3>
            
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-xl border transition-colors flex items-center justify-center ${
                showFilters ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          </div>

          {/* Search bar & Filter Panel */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
              <input 
                type="text"
                placeholder="Search ID or Name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 pl-11 pr-4 bg-white border border-slate-200 rounded-xl text-xs font-medium focus-visible:outline-none focus:border-blue-500"
              />
            </div>

            {showFilters && (
              <div className="p-3.5 bg-white border border-slate-100 rounded-2xl shadow-inner space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                {/* Meal filters */}
                <div className="space-y-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Meal Type</span>
                  <div className="flex gap-1.5 overflow-x-auto">
                    {['ALL', 'BREAKFAST', 'LUNCH', 'DINNER'].map(meal => (
                      <button
                        key={meal}
                        onClick={() => setSelectedMealFilter(meal as any)}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap border ${
                          selectedMealFilter === meal 
                            ? 'bg-blue-50 border-blue-250 text-blue-600' 
                            : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {meal}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status filters */}
                <div className="space-y-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Status</span>
                  <div className="flex gap-1.5">
                    {['ALL', 'ORDERED', 'COLLECTED'].map(status => (
                      <button
                        key={status}
                        onClick={() => setSelectedStatusFilter(status as any)}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold border ${
                          selectedStatusFilter === status 
                            ? 'bg-blue-50 border-blue-250 text-blue-600' 
                            : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {status === 'ORDERED' ? 'Ordered (Pending)' : status === 'COLLECTED' ? 'Collected' : 'All'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* List items */}
          <div className="space-y-3">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
                <p className="text-xs text-slate-450 font-bold">Refreshing list...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                <CircleAlert className="h-10 w-10 text-slate-350 mx-auto mb-3" />
                <p className="text-sm text-slate-500 font-bold">No meal requests found</p>
                <p className="text-xs text-slate-400 mt-1 max-w-[220px] mx-auto leading-relaxed">
                  Try adjusting filters or searching a different employee name/ID.
                </p>
              </div>
            ) : (
              filteredOrders.map((order) => (
                <div 
                  key={order._id}
                  className={`bg-white rounded-2xl border flex flex-col transition-all overflow-hidden ${
                    order.status === 'COLLECTED' 
                      ? 'border-slate-100 opacity-70 shadow-sm' 
                      : 'border-blue-100 border-l-[3.5px] border-l-blue-600 shadow-sm'
                  }`}
                >
                  <div className="p-4 flex justify-between items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded font-bold text-[9px] tracking-wider ${
                          order.mealType === 'BREAKFAST'
                            ? 'bg-amber-50 text-amber-600'
                            : order.mealType === 'LUNCH'
                            ? 'bg-blue-50 text-blue-600'
                            : 'bg-indigo-50 text-indigo-600'
                        }`}>
                          {order.mealType}
                        </span>
                        {order.mealOption && (
                          <span className={`px-2 py-0.5 rounded font-bold text-[9px] tracking-wider ${
                            order.mealOption === 'VEGETARIAN'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : 'bg-rose-50 text-rose-700 border border-rose-100'
                          }`}>
                            {order.mealOption === 'VEGETARIAN' ? 'VEG' : 'MEAT'}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-450 font-semibold">
                          {format(new Date(order.requestedAt), 'h:mm a')}
                        </span>
                      </div>
                      
                      <h4 className="text-sm font-bold text-slate-800 mt-1.5 leading-snug">
                        {order.employeeName}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-semibold mt-1">
                        {order.employeeNo} • {order.phoneNumber}
                      </p>
                      {order.notes && (
                        <div className="mt-2 text-xs bg-amber-50 border border-amber-100 text-amber-850 rounded-lg p-2 font-medium">
                          <span className="font-bold text-amber-750 block text-[9px] uppercase tracking-wider mb-0.5">Note / Snack Request</span>
                          &ldquo;{order.notes}&rdquo;
                        </div>
                      )}
                    </div>

                    <div className="h-10 w-10 rounded-full bg-slate-100 text-slate-655 flex items-center justify-center font-bold text-xs">
                      {order.employeeName.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase()}
                    </div>
                  </div>

                  {/* Actions area */}
                  {order.status === 'ORDERED' ? (
                    <div className="px-4 pb-4">
                      <button
                        onClick={() => handleMarkAsCollected(order._id)}
                        disabled={updatingOrderId === order._id}
                        className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all active:scale-98 flex items-center justify-center gap-1.5"
                      >
                        {updatingOrderId === order._id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4 stroke-[2.25]" />
                        )}
                        Mark as Collected
                      </button>
                    </div>
                  ) : (
                    <div className="px-4 py-2 bg-slate-50/50 border-t border-slate-100/50 flex items-center justify-between text-[10px] font-bold text-green-600">
                      <span className="flex items-center gap-1">
                        <CheckCircle className="h-3.5 w-3.5 fill-green-50 stroke-green-600" />
                        Collected
                      </span>
                      <span className="text-slate-400">
                        {order.collectedAt ? format(new Date(order.collectedAt), 'h:mm a') : ''}
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft,
  Search, 
  Coffee, 
  Utensils, 
  Moon, 
  CheckCircle2, 
  RefreshCw,
  CircleAlert,
  Loader2
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

export default function CanteenHistoryPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMealFilter, setSelectedMealFilter] = useState<'ALL' | 'BREAKFAST' | 'LUNCH' | 'DINNER'>('ALL');

  const fetchCollectedOrders = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch all collected orders (we query our orders route with status=COLLECTED and requestDate=all to fetch historical logs)
      const res = await fetch('/api/orders?status=COLLECTED&requestDate=all');
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          router.push('/auth/login');
          return;
        }
        throw new Error('Failed to load collection history');
      }
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Could not fetch history',
      });
    } finally {
      setLoading(false);
    }
  }, [router, toast]);

  useEffect(() => {
    fetchCollectedOrders();
  }, [fetchCollectedOrders]);

  // Filter orders by search query and meal type
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.employeeNo.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesMeal = selectedMealFilter === 'ALL' || order.mealType === selectedMealFilter;

    return matchesSearch && matchesMeal;
  });

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-100 flex items-center px-4 shadow-sm">
        <button 
          onClick={() => router.push('/canteen/dashboard')}
          className="p-2 mr-2 rounded-full hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-slate-700" />
        </button>
        <div>
          <h1 className="text-base font-bold text-slate-800 tracking-tight">Collection History</h1>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Historical Logs</p>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 p-5 space-y-4 overflow-y-auto pb-24">
        {/* Search and filter toolbar */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search employee or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-11 pr-4 bg-white border border-slate-200 rounded-xl text-xs font-medium focus-visible:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {['ALL', 'BREAKFAST', 'LUNCH', 'DINNER'].map(meal => (
              <button
                key={meal}
                onClick={() => setSelectedMealFilter(meal as any)}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                  selectedMealFilter === meal 
                    ? 'bg-blue-50 border-blue-200 text-blue-600' 
                    : 'bg-white border-slate-200 text-slate-655 hover:bg-slate-50'
                }`}
              >
                {meal}
              </button>
            ))}
          </div>
        </div>

        {/* List items */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
              <p className="text-xs text-slate-450 font-bold">Loading records...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
              <CircleAlert className="h-10 w-10 text-slate-350 mx-auto mb-3" />
              <p className="text-sm text-slate-500 font-bold">No collections found</p>
              <p className="text-xs text-slate-400 mt-1 max-w-[200px] mx-auto leading-relaxed">
                Ensure meal requests have been submitted and marked collected.
              </p>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <div 
                key={order._id}
                className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex flex-col gap-3"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                      order.mealType === 'BREAKFAST'
                        ? 'bg-amber-50 text-amber-500'
                        : order.mealType === 'LUNCH'
                        ? 'bg-blue-50 text-blue-600'
                        : 'bg-indigo-50 text-indigo-500'
                    }`}>
                      {order.mealType === 'BREAKFAST' ? (
                        <Coffee className="h-4.5 w-4.5" />
                      ) : order.mealType === 'LUNCH' ? (
                        <Utensils className="h-4.5 w-4.5" />
                      ) : (
                        <Moon className="h-4.5 w-4.5" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 capitalize">
                        {order.employeeName}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                        {order.employeeNo} • {format(new Date(order.requestDate + 'T00:00:00'), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>

                  <span className="px-2.5 py-0.5 rounded-full bg-green-50 text-green-700 text-[10px] font-bold flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Collected
                  </span>
                </div>

                <div className={`pt-3 border-t border-slate-100 grid ${order.mealOption ? 'grid-cols-3' : 'grid-cols-2'} gap-4 text-[10px] text-slate-500 font-semibold`}>
                  <div>
                    <span className="block text-slate-400 text-[8px] uppercase tracking-wider font-bold">Ordered At</span>
                    <span className="text-slate-700 block mt-0.5">
                      {format(new Date(order.requestedAt), 'h:mm a')}
                    </span>
                  </div>
                  {order.mealOption && (
                    <div>
                      <span className="block text-slate-400 text-[8px] uppercase tracking-wider font-bold">Meal Choice</span>
                      <span className={`block mt-0.5 font-bold ${order.mealOption === 'VEGETARIAN' ? 'text-green-600' : 'text-rose-600'}`}>
                        {order.mealOption === 'VEGETARIAN' ? 'Vegetarian' : 'Meat'}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="block text-slate-400 text-[8px] uppercase tracking-wider font-bold">Collected At</span>
                    <span className="text-slate-700 block mt-0.5">
                      {order.collectedAt ? format(new Date(order.collectedAt), 'h:mm a') : 'N/A'}
                    </span>
                  </div>
                </div>
                {order.notes && (
                  <div className="mt-2.5 pt-2.5 border-t border-slate-50 text-[10px] text-slate-500 font-medium">
                    <span className="block text-slate-400 text-[8px] uppercase tracking-wider font-bold mb-0.5">Snack / Special Request</span>
                    &ldquo;{order.notes}&rdquo;
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

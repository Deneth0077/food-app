'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { 
  ArrowLeft, 
  Coffee, 
  Utensils, 
  Moon, 
  RefreshCw, 
  TrendingUp, 
  CircleAlert 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Order {
  _id: string;
  mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER';
  status: 'ORDERED' | 'COLLECTED';
  requestDate: string;
  requestedAt: string;
  collectedAt?: string;
}

export default function EmployeeHistoryPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch('/api/orders');
        if (!res.ok) {
          if (res.status === 401) {
            router.push('/auth/login');
            return;
          }
          throw new Error('Failed to load history');
        }
        const data = await res.json();
        setOrders(data.orders || []);
      } catch (err: any) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: err.message || 'Something went wrong',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [router, toast]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-100 flex items-center px-4 shadow-sm">
        <button 
          onClick={() => router.push('/employee/dashboard')}
          className="p-2 mr-2 rounded-full hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-slate-700" />
        </button>
        <div>
          <h1 className="text-base font-bold text-slate-800 tracking-tight">Request History</h1>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Your Historic Requests</p>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 p-5 space-y-4 overflow-y-auto pb-24">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <RefreshCw className="h-7 w-7 animate-spin text-blue-600" />
            <p className="text-xs text-slate-450 font-bold">Loading your history...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
            <CircleAlert className="h-10 w-10 text-slate-350 mx-auto mb-3" />
            <p className="text-sm text-slate-500 font-bold">No history available</p>
            <p className="text-xs text-slate-400 mt-1 max-w-[200px] mx-auto leading-relaxed">
              When you start submitting breakfast, lunch, or dinner requests, they will show up here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((item) => (
              <div 
                key={item._id} 
                className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.015)] flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                      item.mealType === 'BREAKFAST' 
                        ? 'bg-amber-50 text-amber-500'
                        : item.mealType === 'LUNCH'
                        ? 'bg-blue-50 text-blue-600'
                        : 'bg-indigo-50 text-indigo-500'
                    }`}>
                      {item.mealType === 'BREAKFAST' ? (
                        <Coffee className="h-4.5 w-4.5 stroke-[2.25]" />
                      ) : item.mealType === 'LUNCH' ? (
                        <Utensils className="h-4.5 w-4.5 stroke-[2.25]" />
                      ) : (
                        <Moon className="h-4.5 w-4.5 stroke-[2.25]" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 capitalize">
                        {item.mealType.toLowerCase()}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                        {format(new Date(item.requestDate + 'T00:00:00'), 'EEEE, MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    item.status === 'COLLECTED'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-orange-100 text-orange-700'
                  }`}>
                    {item.status === 'COLLECTED' ? 'Collected' : 'Ordered'}
                  </span>
                </div>

                <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-4 text-[11px] text-slate-500 font-semibold">
                  <div>
                    <span className="block text-slate-400 text-[9px] uppercase tracking-wider font-bold">Ordered At</span>
                    <span className="text-slate-700 block mt-0.5">
                      {format(new Date(item.requestedAt), 'h:mm a')}
                    </span>
                  </div>
                  <div>
                    <span className="block text-slate-400 text-[9px] uppercase tracking-wider font-bold">Collected At</span>
                    <span className="text-slate-700 block mt-0.5">
                      {item.collectedAt 
                        ? format(new Date(item.collectedAt), 'h:mm a') 
                        : 'Not yet collected'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

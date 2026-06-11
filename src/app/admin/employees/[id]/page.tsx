'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeft,
  User, 
  FileText, 
  Phone,
  ShieldCheck,
  RefreshCw,
  CircleAlert,
  Loader2,
  Coffee,
  Utensils,
  Moon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Employee {
  _id: string;
  fullName: string;
  employeeNo: string;
  phoneNumber: string;
  role: 'ADMIN' | 'EMPLOYEE' | 'CANTEEN';
  isActive: boolean;
}

interface Order {
  _id: string;
  mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER';
  status: 'ORDERED' | 'COLLECTED';
  requestDate: string;
  requestedAt: string;
  collectedAt?: string;
}

export default function EmployeeDetailsPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const { toast } = useToast();
  
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  const fetchEmployeeDetails = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/employees/${id}`);
      if (!res.ok) {
        throw new Error('Employee profile not found');
      }
      const data = await res.json();
      setEmployee(data.employee);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Profile Error',
        description: err.message || 'Could not load employee details',
      });
      router.push('/admin/employees');
    } finally {
      setLoading(false);
    }
  }, [id, router, toast]);

  const fetchEmployeeHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const res = await fetch(`/api/orders?userId=${id}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error('History fetch error:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchEmployeeDetails();
    fetchEmployeeHistory();
  }, [fetchEmployeeDetails, fetchEmployeeHistory]);

  const handleToggleStatus = async () => {
    if (!employee) return;
    setToggling(true);
    try {
      const res = await fetch('/api/admin/employees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: employee._id, isActive: !employee.isActive }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update employee status');
      }

      toast({
        title: 'Status Updated',
        description: `Employee has been successfully ${!employee.isActive ? 'activated' : 'deactivated'}.`,
      });

      setEmployee(prev => prev ? { ...prev, isActive: !prev.isActive } : null);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Action Failed',
        description: err.message || 'Something went wrong',
      });
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <RefreshCw className="h-7 w-7 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-100 flex items-center px-4 shadow-sm">
        <button 
          onClick={() => router.push('/admin/employees')}
          className="p-2 mr-2 rounded-full hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-slate-700" />
        </button>
        <div>
          <h1 className="text-base font-bold text-slate-800 tracking-tight">Employee Details</h1>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Profile Overview</p>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 p-5 space-y-5 overflow-y-auto pb-24">
        {/* Profile Card */}
        {employee && (
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg border border-blue-100 shadow-sm">
                {employee.fullName.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase()}
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-800 tracking-tight">{employee.fullName}</h3>
                <span className="inline-block bg-slate-100 text-slate-500 rounded px-2 py-0.5 text-[9px] font-bold border border-slate-200 mt-1 uppercase">
                  {employee.role}
                </span>
              </div>
              <div className={`h-3.5 w-3.5 rounded-full ring-4 ring-white shadow-sm ${
                employee.isActive ? 'bg-green-500' : 'bg-slate-300'
              }`}></div>
            </div>

            <div className="divide-y divide-slate-100 pt-2 text-xs text-slate-500">
              <div className="py-2.5 flex items-center justify-between">
                <span className="font-semibold text-slate-400 flex items-center gap-1.5"><FileText className="h-4 w-4" /> Employee ID</span>
                <span className="font-bold text-slate-800">{employee.employeeNo}</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="font-semibold text-slate-400 flex items-center gap-1.5"><Phone className="h-4 w-4" /> Phone Number</span>
                <span className="font-bold text-slate-800">{employee.phoneNumber}</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="font-semibold text-slate-400 flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" /> Status</span>
                <span className={`font-bold uppercase ${employee.isActive ? 'text-green-600' : 'text-slate-400'}`}>
                  {employee.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleToggleStatus}
                disabled={toggling}
                className={`w-full h-11 text-xs font-bold rounded-xl shadow-sm transition-all active:scale-98 flex items-center justify-center gap-1.5 ${
                  employee.isActive
                    ? 'bg-red-50 hover:bg-red-100 text-red-655 border border-red-100'
                    : 'bg-green-50 hover:bg-green-100 text-green-700 border border-green-100'
                }`}
              >
                {toggling ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : employee.isActive ? (
                  'Deactivate Account'
                ) : (
                  'Activate Account'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Requests History */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-850">Request History</h3>

          {historyLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
              <CircleAlert className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-400 font-semibold">No requests recorded yet.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {orders.map((item) => (
                <div 
                  key={item._id} 
                  className="bg-white rounded-xl p-3.5 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.015)] flex items-center justify-between"
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
                      <p className="text-[9px] text-slate-405 font-bold uppercase mt-0.5">
                        {format(new Date(item.requestDate + 'T00:00:00'), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                    item.status === 'COLLECTED'
                      ? 'bg-green-50 text-green-700 border border-green-100'
                      : 'bg-orange-50 text-orange-700 border border-orange-100'
                  }`}>
                    {item.status === 'COLLECTED' ? 'Collected' : 'Ordered'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

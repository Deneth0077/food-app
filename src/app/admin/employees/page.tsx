'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft,
  Search, 
  User, 
  UserCheck, 
  UserX, 
  RefreshCw,
  SlidersHorizontal,
  CircleAlert,
  Loader2,
  ChevronRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Employee {
  _id: string;
  fullName: string;
  employeeNo: string;
  phoneNumber: string;
  role: 'ADMIN' | 'EMPLOYEE' | 'CANTEEN';
  isActive: boolean;
}

export default function AdminEmployeesPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'ALL' | 'ADMIN' | 'EMPLOYEE' | 'CANTEEN'>('ALL');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/employees');
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          router.push('/auth/login');
          return;
        }
        throw new Error('Failed to load employee directory');
      }
      const data = await res.json();
      setEmployees(data.employees || []);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Could not fetch employee directory',
      });
    } finally {
      setLoading(false);
    }
  }, [router, toast]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleToggleActive = async (e: React.MouseEvent, employeeId: string, currentStatus: boolean) => {
    e.stopPropagation(); // Avoid triggering list row redirect
    setTogglingId(employeeId);
    try {
      const res = await fetch('/api/admin/employees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, isActive: !currentStatus }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update employee status');
      }

      toast({
        title: 'Status Updated',
        description: `Employee has been successfully ${!currentStatus ? 'activated' : 'deactivated'}.`,
      });

      // Update employee status in local state
      setEmployees(prev => 
        prev.map(emp => 
          emp._id === employeeId ? { ...emp, isActive: !currentStatus } : emp
        )
      );
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: err.message || 'Something went wrong',
      });
    } finally {
      setTogglingId(null);
    }
  };

  // Filter list
  const filteredEmployees = employees.filter(emp => {
    const fullName = emp.fullName || '';
    const employeeNo = emp.employeeNo || '';
    const phoneNumber = emp.phoneNumber || '';

    const matchesSearch = 
      fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employeeNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      phoneNumber.includes(searchQuery);

    const matchesRole = selectedRoleFilter === 'ALL' || emp.role === selectedRoleFilter;

    return matchesSearch && matchesRole;
  });

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
          <h1 className="text-base font-bold text-slate-800 tracking-tight">Employee Management</h1>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Directory Portal</p>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 p-5 space-y-4 overflow-y-auto pb-24">
        {/* Search & filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search employee, ID or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-11 pr-4 bg-white border border-slate-200 rounded-xl text-xs font-medium focus-visible:outline-none focus:border-blue-500"
            />
          </div>

          {/* Role filter bar */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {['ALL', 'EMPLOYEE', 'CANTEEN', 'ADMIN'].map(role => (
              <button
                key={role}
                onClick={() => setSelectedRoleFilter(role as any)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${
                  selectedRoleFilter === role 
                    ? 'bg-blue-50 border-blue-200 text-blue-600' 
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        {/* Directory List */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
              <p className="text-xs text-slate-400 font-bold">Loading directory...</p>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
              <CircleAlert className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500 font-bold">No employees found</p>
              <p className="text-xs text-slate-400 mt-1 max-w-[200px] mx-auto leading-relaxed">
                Check that spelling matches or register a new employee.
              </p>
            </div>
          ) : (
            filteredEmployees.map((emp) => (
              <div 
                key={emp._id}
                onClick={() => router.push(`/admin/employees/${emp._id}`)}
                className={`bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex items-center justify-between transition-all hover:bg-slate-50 active:scale-[0.99] cursor-pointer`}
              >
                <div className="flex items-center gap-3.5">
                  {/* Avatar or Icon */}
                  <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-500 relative">
                    {(emp.fullName || 'Employee').split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase()}
                    {/* Status dot */}
                    <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-white ${
                      emp.isActive ? 'bg-green-500' : 'bg-slate-300'
                    }`}></span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
                      {emp.fullName || 'No Name'}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                      {emp.employeeNo || 'N/A'} • {emp.phoneNumber || 'N/A'}
                    </p>
                    <span className="inline-block mt-1 bg-slate-50 border border-slate-200/50 rounded px-1.5 py-0.5 text-[8px] font-bold text-slate-500">
                      {emp.role}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleToggleActive(e, emp._id, emp.isActive)}
                    disabled={togglingId === emp._id}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all ${
                      emp.isActive
                        ? 'bg-red-50 text-red-600 hover:bg-red-100/50 border border-red-100'
                        : 'bg-green-50 text-green-700 hover:bg-green-100/50 border border-green-100'
                    }`}
                  >
                    {togglingId === emp._id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : emp.isActive ? (
                      'Deactivate'
                    ) : (
                      'Activate'
                    )}
                  </button>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

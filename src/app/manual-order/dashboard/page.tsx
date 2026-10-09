'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ClipboardList, Search, User, UserCheck, Coffee, Utensils, Moon, X,
  Loader2, LogOut, Plus, PackageCheck, FileText, Check
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const CICT_TEAMS = [
  'Special Team', 'Spreader Team', 'QC – Electrical Team', 'QC – Mechanical Team',
  'On-Duty Team', 'Mobile Team', 'RTG – Electrical Team', 'RTG – Mechanical Team',
  'FAC Team', 'ECT Team', 'CWIT Team', 'Stores', 'Sgs stores', 'General',
];

export default function ManualOrderDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const [checking, setChecking] = useState(true);
  const [adminName, setAdminName] = useState('Manual Order Admin');
  const [submitting, setSubmitting] = useState(false);
  const [successCount, setSuccessCount] = useState(0);
  const [lastOrderName, setLastOrderName] = useState('');

  // Employee search
  const [empSearchQuery, setEmpSearchQuery] = useState('');
  const [searchingEmp, setSearchingEmp] = useState(false);
  const [empSearchResults, setEmpSearchResults] = useState<any[]>([]);
  const [selectedEmp, setSelectedEmp] = useState<any | null>(null);

  // Form states
  const [mealType, setMealType] = useState<'BREAKFAST' | 'LUNCH' | 'DINNER'>('LUNCH');
  const [mealOption, setMealOption] = useState<'VEGETARIAN' | 'MEAT'>('MEAT');
  const [eggPreference, setEggPreference] = useState<'WITH_EGG' | 'WITHOUT_EGG'>('WITH_EGG');
  const [paymentType, setPaymentType] = useState<'FREE' | 'PAID'>('FREE');
  const [requestDate, setRequestDate] = useState(todayStr);
  const [department, setDepartment] = useState('CWIT');
  const [cictTeam, setCictTeam] = useState('General');
  const [orderMode, setOrderMode] = useState<'COLLECTION' | 'REPORT_ONLY'>('COLLECTION');
  const [notes, setNotes] = useState('');

  // Auth check
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch('/api/manual-order/session');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated) {
            setAdminName(data.user?.fullName || 'Manual Order Admin');
            setChecking(false);
            return;
          }
        }
        router.replace('/auth/login');
      } catch {
        router.replace('/auth/login');
      }
    }
    checkSession();
  }, [router]);

  // Employee search debounce
  const searchEmployees = useCallback(async (query: string) => {
    if (!query.trim()) { setEmpSearchResults([]); return; }
    try {
      setSearchingEmp(true);
      const res = await fetch(`/api/manual-order/employees?search=${encodeURIComponent(query.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setEmpSearchResults(data.employees || []);
      }
    } catch {
      // ignore
    } finally {
      setSearchingEmp(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (empSearchQuery) searchEmployees(empSearchQuery);
      else setEmpSearchResults([]);
    }, 250);
    return () => clearTimeout(timer);
  }, [empSearchQuery, searchEmployees]);

  const handleSelectEmployee = (emp: any) => {
    setSelectedEmp(emp);
    if (emp.department) setDepartment(emp.department);
    setEmpSearchQuery('');
    setEmpSearchResults([]);
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/auth/login');
  };

  const resetForm = () => {
    setSelectedEmp(null);
    setEmpSearchQuery('');
    setMealType('LUNCH');
    setMealOption('MEAT');
    setEggPreference('WITH_EGG');
    setPaymentType('FREE');
    setRequestDate(todayStr);
    setDepartment('CWIT');
    setCictTeam('General');
    setOrderMode('COLLECTION');
    setNotes('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp) {
      toast({ variant: 'destructive', title: 'Employee Required', description: 'Please select an employee first.' });
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/manual-order/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: selectedEmp._id,
          mealType,
          mealOption,
          eggPreference: mealOption === 'VEGETARIAN' ? eggPreference : undefined,
          paymentType,
          requestDate,
          department,
          cictTeam: department === 'CICT' ? cictTeam : undefined,
          orderMode,
          notes,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          router.replace('/auth/login');
          return;
        }
        throw new Error(data.error || 'Failed to create order');
      }

      setLastOrderName(selectedEmp.fullName);
      setSuccessCount(prev => prev + 1);
      toast({ title: '✅ Order Added!', description: data.message || `Order for ${selectedEmp.fullName} added.` });
      resetForm();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed', description: err.message || 'Could not create order.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/70 shadow-sm">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <ClipboardList className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-900 leading-none">Manual Order System</p>
              <p className="text-[10px] font-semibold text-slate-400 leading-none mt-0.5">{adminName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {successCount > 0 && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                ✓ {successCount} Orders Added
              </span>
            )}
            <button
              onClick={handleLogout}
              className="h-8 px-3 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-500 text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-4 pb-10">
        {/* Success banner */}
        {lastOrderName && (
          <div className="flex items-center gap-2.5 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
            <div className="h-7 w-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Check className="h-3.5 w-3.5" />
            </div>
            <p className="text-xs font-bold text-emerald-800">
              Last order added for <span className="text-emerald-700">{lastOrderName}</span> ✓
            </p>
          </div>
        )}

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 pt-5 pb-4 border-b border-slate-100 bg-gradient-to-r from-blue-50/60 to-indigo-50/40">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900">Add Manual Meal Order</h2>
                <p className="text-[10.5px] text-slate-400 font-medium">Add a meal order for an employee manually</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Employee Selection */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Select Employee <span className="text-rose-500">*</span>
              </label>
              {selectedEmp ? (
                <div className="flex items-center justify-between p-3 bg-blue-50/60 border border-blue-200 rounded-xl">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-blue-600 text-white font-black flex items-center justify-center text-xs">
                      {selectedEmp.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">{selectedEmp.fullName}</p>
                      <div className="flex items-center gap-1.5 text-[10.5px] font-semibold text-slate-500">
                        <span className="text-blue-700 font-bold">#{selectedEmp.employeeNo}</span>
                        <span>• {selectedEmp.department || 'N/A'}</span>
                        <span>• {selectedEmp.phoneNumber}</span>
                      </div>
                    </div>
                  </div>
                  <button type="button" onClick={() => setSelectedEmp(null)} className="text-xs font-bold text-blue-600 hover:underline px-2 py-1 cursor-pointer">Change</button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by Name, Emp ID or Phone..."
                    value={empSearchQuery}
                    onChange={(e) => setEmpSearchQuery(e.target.value)}
                    className="w-full h-10 pl-9 pr-9 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800 transition-colors"
                  />
                  {searchingEmp && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-blue-600" />}
                  {empSearchResults.length > 0 && (
                    <div className="absolute top-11 left-0 right-0 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-20 divide-y divide-slate-100">
                      {empSearchResults.map((emp) => (
                        <div key={emp._id} onClick={() => handleSelectEmployee(emp)} className="p-2.5 hover:bg-blue-50 cursor-pointer flex items-center justify-between transition-colors">
                          <div>
                            <p className="text-xs font-bold text-slate-800">{emp.fullName}</p>
                            <p className="text-[10px] font-semibold text-slate-400">Emp ID: <span className="text-blue-600 font-bold">{emp.employeeNo}</span> • {emp.department || 'N/A'} • {emp.phoneNumber}</p>
                          </div>
                          <UserCheck className="h-4 w-4 text-blue-600" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Date & Department */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Order Date</label>
                <input
                  type="date"
                  value={requestDate}
                  onChange={(e) => setRequestDate(e.target.value)}
                  className="w-full h-10 px-3 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 text-slate-800 cursor-pointer"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Work Site</label>
                <select value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full h-10 px-3 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 text-slate-800 cursor-pointer">
                  <option value="CWIT">CWIT</option>
                  <option value="ECT">ECT</option>
                  <option value="SAGT">SAGT</option>
                  <option value="CICT">CICT</option>
                </select>
              </div>
            </div>

            {/* CICT Team */}
            {department === 'CICT' && (
              <div>
                <label className="text-xs font-bold text-purple-900 block mb-1">CICT Team <span className="text-rose-500">*</span></label>
                <select value={cictTeam} onChange={(e) => setCictTeam(e.target.value)} className="w-full h-10 px-3 text-xs font-bold bg-purple-50/60 border border-purple-200 rounded-xl focus:outline-none focus:border-purple-600 text-purple-950 cursor-pointer">
                  {CICT_TEAMS.map(team => <option key={team} value={team}>{team}</option>)}
                </select>
              </div>
            )}

            {/* Meal Session */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Meal Session</label>
              <div className="grid grid-cols-3 gap-2">
                {(['BREAKFAST', 'LUNCH', 'DINNER'] as const).map((m) => (
                  <button key={m} type="button" onClick={() => setMealType(m)}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${mealType === m ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                  >
                    {m === 'BREAKFAST' ? <Coffee className="h-4 w-4" /> : m === 'LUNCH' ? <Utensils className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    <span className="capitalize">{m.toLowerCase()}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Dietary */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Dietary Preference</label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setMealOption('MEAT')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${mealOption === 'MEAT' ? 'bg-rose-500 text-white border-rose-500 shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                >🔴 Non-Vegetarian</button>
                <button type="button" onClick={() => setMealOption('VEGETARIAN')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${mealOption === 'VEGETARIAN' ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                >🟢 Vegetarian</button>
              </div>
            </div>

            {/* Egg Preference (if Vegetarian) */}
            {mealOption === 'VEGETARIAN' && (
              <div>
                <label className="text-xs font-bold text-emerald-800 block mb-1">Egg Preference</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setEggPreference('WITH_EGG')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${eggPreference === 'WITH_EGG' ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                  >🥚 With Egg</button>
                  <button type="button" onClick={() => setEggPreference('WITHOUT_EGG')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${eggPreference === 'WITHOUT_EGG' ? 'bg-slate-700 text-white border-slate-700 shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                  >🚫 Without Egg</button>
                </div>
              </div>
            )}

            {/* Payment Type */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Meal Payment Type <span className="text-rose-500">*</span></label>
              <div className="grid grid-cols-2 gap-2.5">
                <button type="button" onClick={() => setPaymentType('FREE')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${paymentType === 'FREE' ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                >🎁 Company Free</button>
                <button type="button" onClick={() => setPaymentType('PAID')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${paymentType === 'PAID' ? 'bg-amber-600 text-white border-amber-600 shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                >💳 Paid Order</button>
              </div>
              <p className="text-[10px] text-slate-400 font-medium mt-1">
                {paymentType === 'FREE' ? '• Company eken free dena meal order ekak' : '• Employee pay karala ganna meal order ekak'}
              </p>
            </div>

            {/* Order Mode */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Order Destination <span className="text-rose-500">*</span></label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div onClick={() => setOrderMode('COLLECTION')} className={`p-3 rounded-xl border cursor-pointer transition-all space-y-0.5 ${orderMode === 'COLLECTION' ? 'bg-blue-50/80 border-blue-600 ring-2 ring-blue-500/20' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                  <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                    <PackageCheck className="h-4 w-4 text-blue-600" />
                    <span>Order for Collection</span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium leading-snug">Enters live canteen queue.</p>
                </div>
                <div onClick={() => setOrderMode('REPORT_ONLY')} className={`p-3 rounded-xl border cursor-pointer transition-all space-y-0.5 ${orderMode === 'REPORT_ONLY' ? 'bg-purple-50/80 border-purple-600 ring-2 ring-purple-500/20' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                  <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                    <FileText className="h-4 w-4 text-purple-600" />
                    <span>Report Only</span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium leading-snug">Mark as fulfilled directly.</p>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Special Notes (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Added manually — employee forgot to order..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full h-10 px-3 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 text-slate-800 transition-colors"
              />
            </div>

            {/* Submit */}
            <div className="pt-2 border-t border-slate-100">
              <button
                type="submit"
                disabled={submitting || !selectedEmp}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 transition-all active:scale-[0.98] cursor-pointer"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                <span>Add Meal Order</span>
              </button>
            </div>
          </form>
        </div>

        {/* Info note */}
        <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 flex items-start gap-2.5">
          <span className="text-amber-500 text-base leading-none mt-0.5">⚠️</span>
          <p className="text-[10.5px] font-semibold text-amber-800 leading-relaxed">
            This system provides <strong>Manual Order Entry only</strong>. No other admin features are accessible from this session. All orders are recorded in the main system.
          </p>
        </div>
      </main>
    </div>
  );
}

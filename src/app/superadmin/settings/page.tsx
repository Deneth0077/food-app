'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ShieldAlert, 
  ArrowLeft, 
  SlidersHorizontal, 
  Utensils, 
  Clock, 
  Coffee, 
  Moon,
  CheckCircle2, 
  FileText, 
  Users, 
  ClipboardList,
  UserPlus,
  Save, 
  Loader2, 
  AlertTriangle,
  RefreshCw,
  Power
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SystemSettingsState {
  mealPricesManagement: boolean;
  menuManagement: boolean;
  orderCancellation: boolean;
  cancellationWindowMinutes: number;
  mealOrdering: boolean;
  selfCollection: boolean;
  reportsExport: boolean;
  employeeDirectory: boolean;
  liveOrderManagement: boolean;
  manualEmployeeOrder: boolean;
  manualOrderAdminUsername: string;
  manualOrderAdminPin?: string;
  maintenanceMessage: string;
  breakfastCutoffTime: string;
  lunchCutoffTime: string;
  dinnerCutoffTime: string;
}

export default function SuperadminSettingsPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const [settings, setSettings] = useState<SystemSettingsState>({
    mealPricesManagement: false,
    menuManagement: true,
    orderCancellation: true,
    cancellationWindowMinutes: 60,
    mealOrdering: true,
    selfCollection: true,
    reportsExport: true,
    employeeDirectory: true,
    liveOrderManagement: true,
    manualEmployeeOrder: true,
    manualOrderAdminUsername: 'ORDERADMIN',
    manualOrderAdminPin: '',
    maintenanceMessage: 'This service is temporarily deactivated',
    breakfastCutoffTime: '22:00',
    lunchCutoffTime: '10:00',
    dinnerCutoffTime: '17:00',
  });

  const formatCutoffTimeDisplay = (timeStr: string = '20:00') => {
    if (!timeStr) return '';
    const [hStr, mStr] = timeStr.split(':');
    let h = parseInt(hStr || '20', 10);
    const m = parseInt(mStr || '0', 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    const mFormatted = m < 10 ? `0${m}` : `${m}`;
    return `${h}:${mFormatted} ${ampm}`;
  };

  useEffect(() => {
    async function verifyAndLoad() {
      try {
        setLoading(true);
        // 1. Verify Admin / Superadmin role
        const meRes = await fetch('/api/auth/me');
        const meData = await meRes.json();
        if (!meRes.ok || !meData.user) {
          router.push('/auth/login');
          return;
        }
        if (meData.user.role !== 'SUPERADMIN' && meData.user.role !== 'ADMIN') {
          toast({
            variant: 'destructive',
            title: 'Access Restricted',
            description: 'Only Admin or Superadmin can access system feature controls.',
          });
          router.replace('/admin/dashboard');
          return;
        }

        setIsSuperAdmin(true);

        // 2. Load system settings
        const settingsRes = await fetch('/api/system/settings');
        if (settingsRes.ok) {
          const sData = await settingsRes.json();
          if (sData.settings) {
            setSettings({
              mealPricesManagement: sData.settings.mealPricesManagement ?? false,
              menuManagement: sData.settings.menuManagement ?? true,
              orderCancellation: sData.settings.orderCancellation ?? true,
              cancellationWindowMinutes: sData.settings.cancellationWindowMinutes ?? 60,
              mealOrdering: sData.settings.mealOrdering ?? true,
              selfCollection: sData.settings.selfCollection ?? true,
              reportsExport: sData.settings.reportsExport ?? true,
              employeeDirectory: sData.settings.employeeDirectory ?? true,
              liveOrderManagement: sData.settings.liveOrderManagement ?? true,
              manualEmployeeOrder: sData.settings.manualEmployeeOrder ?? true,
              manualOrderAdminUsername: sData.settings.manualOrderAdminUsername || 'ORDERADMIN',
              manualOrderAdminPin: '', // Don't pre-fill pin for security, only send if changing
              maintenanceMessage: sData.settings.maintenanceMessage || 'This service is temporarily deactivated',
              breakfastCutoffTime: sData.settings.breakfastCutoffTime || '22:00',
              lunchCutoffTime: sData.settings.lunchCutoffTime || '10:00',
              dinnerCutoffTime: sData.settings.dinnerCutoffTime || '17:00',
            });
          }
        }
      } catch (err: any) {
        console.error('Failed to load superadmin settings:', err);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load system settings',
        });
      } finally {
        setLoading(false);
      }
    }

    verifyAndLoad();
  }, [router, toast]);

  const handleToggle = (field: keyof SystemSettingsState) => {
    setSettings((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      const res = await fetch('/api/system/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update system settings');

      toast({
        title: 'Settings Saved',
        description: 'System feature toggles updated successfully across the platform.',
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: err.message || 'Something went wrong',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          <p className="text-xs font-bold text-slate-500">Checking Superadmin Privileges...</p>
        </div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return null;
  }

  const featuresList = [
    {
      key: 'mealPricesManagement' as keyof SystemSettingsState,
      title: 'Meal Price Configuration',
      description: 'Allows Admins to change meal pricing (Breakfast, Lunch, Dinner). When disabled, admins see a deactivated notice.',
      icon: SlidersHorizontal,
      color: 'purple',
    },
    {
      key: 'menuManagement' as keyof SystemSettingsState,
      title: 'Daily Menu Management',
      description: 'Allows Admins to create and publish daily dish items for Breakfast, Lunch, and Dinner.',
      icon: Utensils,
      color: 'blue',
    },
    {
      key: 'orderCancellation' as keyof SystemSettingsState,
      title: `${settings.cancellationWindowMinutes || 60}-Minute Order Cancellation`,
      description: `Enables live countdown and self-service cancellation window (${settings.cancellationWindowMinutes || 60} minutes) for employees after placing orders.`,
      icon: Clock,
      color: 'rose',
    },
    {
      key: 'mealOrdering' as keyof SystemSettingsState,
      title: 'Employee Meal Booking',
      description: 'Allows employees to place new meal requests for upcoming shifts.',
      icon: Coffee,
      color: 'emerald',
    },
    {
      key: 'selfCollection' as keyof SystemSettingsState,
      title: 'Self-Collect Action',
      description: 'Allows employees to self-mark meal collection at the canteen counter.',
      icon: CheckCircle2,
      color: 'amber',
    },
    {
      key: 'reportsExport' as keyof SystemSettingsState,
      title: 'Reports & Data Export',
      description: 'Enables download of Excel spreadsheets and PDF audit summaries.',
      icon: FileText,
      color: 'indigo',
    },
    {
      key: 'employeeDirectory' as keyof SystemSettingsState,
      title: 'Employee Directory & Roles',
      description: 'Allows managing employee profiles and role classifications.',
      icon: Users,
      color: 'sky',
    },
    {
      key: 'liveOrderManagement' as keyof SystemSettingsState,
      title: 'Live Order Management',
      description: 'Allows Admins to track live orders, timestamps, cancellations, and mark collection status.',
      icon: ClipboardList,
      color: 'emerald',
    },
    {
      key: 'manualEmployeeOrder' as keyof SystemSettingsState,
      title: 'Manual Employee Order Creation',
      description: 'Allows Admins to manually place meal requests on behalf of employees.',
      icon: UserPlus,
      color: 'blue',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between max-w-[480px] mx-auto border-x border-slate-200/60 shadow-sm">
      {/* Header */}
      <header className="bg-white border-b border-slate-200/80 px-4 py-3.5 sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Link
              href="/admin/dashboard"
              className="h-9 w-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-50 active:scale-95 transition-all shadow-2xs"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-extrabold text-slate-900 tracking-tight">Superadmin Controls</h1>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                  Superadmin
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-semibold">Enable or disable system features platform-wide</p>
            </div>
          </div>

          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            <span>Save</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-3.5 sm:p-5 space-y-4 overflow-y-auto pb-24">
        {/* Banner */}
        <div className="bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 rounded-3xl p-5 text-white shadow-md relative overflow-hidden">
          <div className="flex items-start gap-3.5 relative z-10">
            <div className="h-10 w-10 rounded-2xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center shrink-0 text-purple-300">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold tracking-tight">System Feature Governance</h2>
              <p className="text-xs text-purple-200/80 mt-1 leading-relaxed font-medium">
                Services toggled OFF here are immediately deactivated for normal Admins and Employees with a friendly notification.
              </p>
            </div>
          </div>
        </div>

        {/* Feature Toggles List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Service Feature Flags</h3>
            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
              {Object.values(settings).filter(v => v === true).length} of 7 Active
            </span>
          </div>

          <div className="space-y-2.5">
            {featuresList.map((feat) => {
              const isEnabled = Boolean(settings[feat.key]);
              const Icon = feat.icon;

              return (
                <div
                  key={feat.key}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 ${
                    isEnabled
                      ? 'bg-white border-slate-200/80 shadow-xs'
                      : 'bg-slate-50/80 border-slate-200 opacity-80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isEnabled
                          ? 'bg-purple-50 text-purple-600 border border-purple-100'
                          : 'bg-slate-200 text-slate-400'
                      }`}>
                        <Icon className="h-4.5 w-4.5 stroke-[2.25]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-850">{feat.title}</h4>
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            isEnabled
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {isEnabled ? 'Active' : 'Deactivated'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium mt-1 leading-snug">
                          {feat.description}
                        </p>

                        {/* Interactive Time Selector for Order Cancellation */}
                        {feat.key === 'orderCancellation' && isEnabled && (
                          <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-slate-700">Cancellation Time Window:</span>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min={1}
                                  max={720}
                                  value={settings.cancellationWindowMinutes || 60}
                                  onChange={(e) => {
                                    const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                                    setSettings((prev) => ({ ...prev, cancellationWindowMinutes: val }));
                                  }}
                                  className="w-16 h-8 text-center text-xs font-bold text-purple-800 bg-purple-50 border border-purple-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
                                />
                                <span className="text-xs font-semibold text-slate-500">mins</span>
                              </div>
                            </div>

                            {/* Preset Buttons */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {[5, 10, 15, 30, 60, 120].map((mins) => (
                                <button
                                  key={mins}
                                  type="button"
                                  onClick={() => setSettings((prev) => ({ ...prev, cancellationWindowMinutes: mins }))}
                                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all border cursor-pointer ${
                                    settings.cancellationWindowMinutes === mins
                                      ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                  }`}
                                >
                                  {mins >= 60 ? `${mins / 60} hour${mins > 60 ? 's' : ''}` : `${mins} min`}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Toggle Button */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isEnabled}
                      onClick={() => handleToggle(feat.key)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isEnabled ? 'bg-purple-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          isEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Meal Order Cutoff Times Section */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <Clock className="h-4 w-4 stroke-[2.25]" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-850">Meal Order Cutoff Times</h3>
                <p className="text-[10px] text-slate-500 font-medium">Set when employee order booking locks for each meal</p>
              </div>
            </div>
            <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
              Cutoff Config
            </span>
          </div>

          <div className="space-y-3">
            {/* Breakfast Cutoff Card */}
            <div className="p-3.5 rounded-xl border border-amber-200/80 bg-gradient-to-r from-amber-50/70 via-orange-50/40 to-amber-50/50 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-xs">
                    <Coffee className="h-4 w-4 stroke-[2.25]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-850">Breakfast Cutoff</h4>
                    <p className="text-[10px] text-amber-800 font-medium">Orders close night before target date</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-amber-900 bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200">
                    {formatCutoffTimeDisplay(settings.breakfastCutoffTime)}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <input
                  type="time"
                  value={settings.breakfastCutoffTime}
                  onChange={(e) => setSettings((prev) => ({ ...prev, breakfastCutoffTime: e.target.value }))}
                  className="h-8 px-2.5 text-xs font-bold bg-white border border-amber-300 rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 outline-none"
                />
                <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-[200px]">
                  {['20:00', '21:00', '22:00', '23:00'].map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setSettings((prev) => ({ ...prev, breakfastCutoffTime: time }))}
                      className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                        settings.breakfastCutoffTime === time
                          ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                          : 'bg-white text-slate-600 border-amber-200 hover:bg-amber-100/60'
                      }`}
                    >
                      {formatCutoffTimeDisplay(time)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Lunch Cutoff Card */}
            <div className="p-3.5 rounded-xl border border-sky-200/80 bg-gradient-to-r from-sky-50/70 via-blue-50/40 to-sky-50/50 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-sky-500 text-white flex items-center justify-center shadow-xs">
                    <Utensils className="h-4 w-4 stroke-[2.25]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-850">Lunch Cutoff</h4>
                    <p className="text-[10px] text-sky-800 font-medium">Orders close morning of target date</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-sky-900 bg-sky-100 px-2.5 py-1 rounded-lg border border-sky-200">
                    {formatCutoffTimeDisplay(settings.lunchCutoffTime)}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <input
                  type="time"
                  value={settings.lunchCutoffTime}
                  onChange={(e) => setSettings((prev) => ({ ...prev, lunchCutoffTime: e.target.value }))}
                  className="h-8 px-2.5 text-xs font-bold bg-white border border-sky-300 rounded-lg text-slate-800 focus:ring-1 focus:ring-sky-500 outline-none"
                />
                <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-[200px]">
                  {['08:00', '09:00', '10:00', '11:00'].map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setSettings((prev) => ({ ...prev, lunchCutoffTime: time }))}
                      className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                        settings.lunchCutoffTime === time
                          ? 'bg-sky-600 text-white border-sky-600 shadow-2xs'
                          : 'bg-white text-slate-600 border-sky-200 hover:bg-sky-100/60'
                      }`}
                    >
                      {formatCutoffTimeDisplay(time)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Dinner Cutoff Card */}
            <div className="p-3.5 rounded-xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50/70 via-purple-50/40 to-indigo-50/50 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                    <Moon className="h-4 w-4 stroke-[2.25]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-850">Dinner Cutoff</h4>
                    <p className="text-[10px] text-indigo-800 font-medium">Orders close evening of target date</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-indigo-900 bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200">
                    {formatCutoffTimeDisplay(settings.dinnerCutoffTime)}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <input
                  type="time"
                  value={settings.dinnerCutoffTime}
                  onChange={(e) => setSettings((prev) => ({ ...prev, dinnerCutoffTime: e.target.value }))}
                  className="h-8 px-2.5 text-xs font-bold bg-white border border-indigo-300 rounded-lg text-slate-800 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
                <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-[200px]">
                  {['16:00', '17:00', '18:00', '19:00'].map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setSettings((prev) => ({ ...prev, dinnerCutoffTime: time }))}
                      className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                        settings.dinnerCutoffTime === time
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                          : 'bg-white text-slate-600 border-indigo-200 hover:bg-indigo-100/60'
                      }`}
                    >
                      {formatCutoffTimeDisplay(time)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Manual Order Admin Credentials Customizer */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <UserPlus className="h-4 w-4 stroke-[2.25]" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-850">Manual Order Admin Login</h3>
              <p className="text-[10px] text-slate-500 font-medium">Configure credentials for the dedicated manual order terminal</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">
                Username
              </label>
              <input
                type="text"
                value={settings.manualOrderAdminUsername}
                onChange={(e) => setSettings(prev => ({ ...prev, manualOrderAdminUsername: e.target.value.toUpperCase() }))}
                placeholder="ORDERADMIN"
                className="w-full h-11 px-3.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all uppercase"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">
                New PIN (Optional)
              </label>
              <input
                type="password"
                value={settings.manualOrderAdminPin || ''}
                onChange={(e) => setSettings(prev => ({ ...prev, manualOrderAdminPin: e.target.value }))}
                placeholder="Leave blank to keep current"
                maxLength={6}
                inputMode="numeric"
                className="w-full h-11 px-3.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all tracking-widest"
              />
            </div>
          </div>
          <p className="text-[10px] text-blue-600/80 font-semibold bg-blue-50 p-2 rounded-lg border border-blue-100">
            ℹ️ Login URL: <strong>/manual-order/login</strong> (Only accesses Manual Order entry)
          </p>
        </div>

        {/* Maintenance Message Customizer */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-2.5">
          <label className="text-xs font-bold text-slate-800 block">
            Deactivation Notice Message
          </label>
          <input
            type="text"
            value={settings.maintenanceMessage}
            onChange={(e) => setSettings(prev => ({ ...prev, maintenanceMessage: e.target.value }))}
            placeholder="e.g. This service is temporarily deactivated"
            className="w-full h-11 px-3.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all"
          />
          <p className="text-[10px] text-slate-400 font-medium">
            This message is shown to users or regular admins when they attempt to use a deactivated feature.
          </p>
        </div>

        {/* Quick Save Bar */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={saving}
            className="w-full h-12 bg-purple-600 hover:bg-purple-700 active:scale-98 text-white font-extrabold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-md shadow-purple-200 transition-all disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Applying Changes...</span>
              </>
            ) : (
              <>
                <Power className="h-4 w-4 stroke-[2.5]" />
                <span>Apply System Feature Flags</span>
              </>
            )}
          </button>
        </div>
      </main>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  User as UserIcon, 
  Phone, 
  FileText, 
  LogOut, 
  RefreshCw, 
  ShieldAlert,
  Lock,
  Edit3,
  Save,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

interface UserProfile {
  fullName: string;
  employeeNo: string;
  phoneNumber: string;
  role: string;
  department?: 'CWIT' | 'ECT' | 'SAGT';
  deptChangeCount: number;
}

export default function EmployeeProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPin, setEditPin] = useState('');
  const [editDept, setEditDept] = useState<'CWIT' | 'ECT' | 'SAGT' | ''>('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/auth/login');
          return;
        }
        const data = await res.json();
        setUser(data.user);
        setEditName(data.user.fullName);
        setEditDept(data.user.department || '');
      } catch (err) {
        console.error('Profile Load Error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [router]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (!res.ok) throw new Error('Logout failed');
      
      toast({
        title: 'Logged Out',
        description: 'You have been logged out successfully.',
      });
      router.push('/auth/login');
      router.refresh();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to log out. Please try again.',
      });
      setLoggingOut(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Name cannot be empty.',
      });
      return;
    }
    if (editPin && !/^\d{4}$/.test(editPin.trim())) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'PIN must be exactly 4 digits.',
      });
      return;
    }

    setUpdating(true);
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: editName,
          pin: editPin ? editPin : undefined,
          department: editDept || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');

      toast({
        title: 'Profile Updated',
        description: 'Your changes have been saved successfully.',
      });
      setUser(data.user);
      setEditDept(data.user.department || '');
      setEditPin('');
      setIsEditing(false);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: err.message || 'Something went wrong',
      });
    } finally {
      setUpdating(false);
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
      {/* Header */}
      <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-100 flex items-center justify-between px-5 shadow-sm">
        <div>
          <h1 className="text-base font-bold text-slate-800 tracking-tight">Your Profile</h1>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Account Details</p>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 p-5 space-y-6 overflow-y-auto pb-24">
        {/* Avatar Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col items-center text-center">
          <div className="h-20 w-20 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-2xl font-bold border border-blue-100 shadow-inner">
            {user?.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
          </div>
          <h2 className="text-lg font-bold text-slate-850 mt-3.5 tracking-tight">{user?.fullName}</h2>
          <span className="mt-1 px-3 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold border border-slate-200/50">
            {user?.role} Portal Access
          </span>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          {/* Active Work Site Card */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                  SITE
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Active Work Site</p>
                  {!isEditing ? (
                    <p className="text-sm font-bold text-slate-800">{user?.department || 'Not Selected'}</p>
                  ) : (
                    <span className="block text-xs font-semibold text-slate-400">Select new site</span>
                  )}
                </div>
              </div>
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="text-xs font-bold text-blue-600 hover:underline bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100"
                >
                  Wrong site? Change
                </button>
              )}
            </div>

            {isEditing && (
              <div className="border-t border-slate-100 pt-3 animate-in fade-in duration-200">
                {(user?.deptChangeCount || 0) < 2 ? (
                  <div className="flex gap-2">
                    {['CWIT', 'ECT', 'SAGT'].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setEditDept(d as any)}
                        className={`flex-1 py-2.5 text-xs font-bold border rounded-xl transition-all duration-200 active:scale-95 ${
                          editDept === d
                            ? 'bg-blue-600 border-blue-600 text-white shadow-sm font-extrabold'
                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-red-500 font-bold leading-normal">
                    Site changes limit reached (2 changes allowed). Please contact an Admin to change your site.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Employee ID & Info Card */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
              <UserIcon className="h-6 w-6 stroke-[2.25]" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Employee ID</p>
              <p className="text-sm font-bold text-slate-800">{user?.employeeNo}</p>
              <p className="text-[11px] font-medium text-slate-500 mt-0.5">{user?.phoneNumber}</p>
            </div>
            <div className="bg-slate-50 rounded-lg px-2.5 py-1 text-[10px] font-bold text-slate-500 border border-slate-100 flex-shrink-0">
              Active
            </div>
          </div>

          {/* Editable Personal Info Details (Name & PIN) */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.025)] divide-y divide-slate-100">
            {/* Full Name Edit/View */}
            <div className="p-4 flex items-center gap-4">
              <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                <UserIcon className="h-5 w-5 stroke-[2.25]" />
              </div>
              <div className="flex-1">
                <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold">Full Name</span>
                {isEditing ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full text-sm font-bold text-slate-800 border-b border-blue-500 bg-transparent py-0.5 focus:outline-none"
                    required
                  />
                ) : (
                  <span className="text-sm font-bold text-slate-800">{user?.fullName}</span>
                )}
              </div>
            </div>

            {/* PIN Edit/View (Only shows when editing) */}
            {isEditing && (
              <div className="p-4 flex items-center gap-4 animate-in fade-in duration-200">
                <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <Lock className="h-5 w-5 stroke-[2.25]" />
                </div>
                <div className="flex-1">
                  <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold">Change 4-Digit PIN (Optional)</span>
                  <input
                    type="password"
                    maxLength={4}
                    placeholder="Enter new 4-digit PIN"
                    value={editPin}
                    onChange={(e) => setEditPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full text-sm font-bold text-slate-800 border-b border-blue-500 bg-transparent py-0.5 focus:outline-none placeholder:text-slate-300"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Edit Actions buttons */}
          <div className="space-y-2.5">
            {isEditing ? (
              <div className="flex gap-3">
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setEditName(user?.fullName || '');
                    setEditPin('');
                  }}
                  className="flex-1 h-12 border border-slate-200 text-slate-500 font-bold rounded-xl text-sm transition-all hover:bg-slate-50 flex items-center justify-center gap-1.5"
                >
                  <X className="h-4.5 w-4.5" />
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={updating}
                  className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-1.5 shadow-md"
                >
                  {updating ? (
                    <RefreshCw className="h-4.5 w-4.5 animate-spin" />
                  ) : (
                    <Save className="h-4.5 w-4.5" />
                  )}
                  Save
                </Button>
              </div>
            ) : (
              <Button 
                type="button"
                onClick={() => setIsEditing(true)}
                className="w-full h-12 text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-100 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Edit3 className="h-4.5 w-4.5" />
                Edit Profile
              </Button>
            )}
          </div>
        </form>

        {/* Logout Section */}
        <div className="pt-2">
          <Button 
            onClick={handleLogout}
            disabled={loggingOut || isEditing}
            className="w-full h-12 bg-red-50 hover:bg-red-100 text-red-655 font-bold rounded-xl text-sm transition-all border border-red-100 shadow-sm flex items-center justify-center gap-2"
          >
            {loggingOut ? (
              <RefreshCw className="h-4.5 w-4.5 animate-spin" />
            ) : (
              <LogOut className="h-4.5 w-4.5 stroke-[2.25]" />
            )}
            Log Out Account
          </Button>
        </div>
      </div>
    </div>
  );
}

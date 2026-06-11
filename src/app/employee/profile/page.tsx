'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  User as UserIcon, 
  Phone, 
  FileText, 
  LogOut, 
  RefreshCw, 
  ShieldAlert 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

interface UserProfile {
  fullName: string;
  employeeNo: string;
  phoneNumber: string;
  role: string;
}

export default function EmployeeProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

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

        {/* Details List */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.025)] divide-y divide-slate-100">
          <div className="p-4 flex items-center gap-4">
            <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <UserIcon className="h-5 w-5 stroke-[2.25]" />
            </div>
            <div>
              <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold">Full Name</span>
              <span className="text-sm font-bold text-slate-800">{user?.fullName}</span>
            </div>
          </div>

          <div className="p-4 flex items-center gap-4">
            <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <FileText className="h-5 w-5 stroke-[2.25]" />
            </div>
            <div>
              <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold">Employee ID</span>
              <span className="text-sm font-bold text-slate-800">{user?.employeeNo}</span>
            </div>
          </div>

          <div className="p-4 flex items-center gap-4">
            <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <Phone className="h-5 w-5 stroke-[2.25]" />
            </div>
            <div>
              <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold">Phone Number</span>
              <span className="text-sm font-bold text-slate-800">{user?.phoneNumber}</span>
            </div>
          </div>
        </div>

        {/* Logout Section */}
        <div className="pt-2">
          <Button 
            onClick={handleLogout}
            disabled={loggingOut}
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

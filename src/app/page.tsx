'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            let redirectUrl = '/employee/dashboard';
            if (data.user.role === 'ADMIN') {
              redirectUrl = '/admin/dashboard';
            } else if (data.user.role === 'CANTEEN') {
              redirectUrl = '/canteen/dashboard';
            }
            router.replace(redirectUrl);
            return;
          }
        }
      } catch (err) {
        console.error('Session check failed:', err);
      }
      router.replace('/auth/login');
    }
    checkSession();
  }, [router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <p className="text-sm font-semibold text-slate-500">Redirecting to portal...</p>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Utensils, Loader2 } from 'lucide-react';

const loginSchema = z.object({
  employeeNo: z.string().min(1, 'Employee number is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      employeeNo: '',
      password: '',
    }
  });

  // Check if session is already active on this device
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
      } finally {
        setCheckingSession(false);
      }
    }
    checkSession();
  }, [router]);

  const onSubmit = async (data: LoginFormValues) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeNo: data.employeeNo.trim(),
          password: data.password,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Authentication failed');
      }

      toast({
        title: 'Welcome back!',
        description: 'Successfully authenticated.',
      });

      router.push(result.redirectUrl);
      router.refresh();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: err.message || 'Something went wrong',
      });
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
          <p className="text-sm font-semibold text-slate-500">Checking session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6 bg-slate-50">
      <Card className="w-full max-w-sm border-slate-200/80 shadow-md rounded-2xl bg-white">
        <CardHeader className="space-y-2 text-center pb-6">
          <div className="flex justify-center mb-3">
            <div className="h-14 w-14 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100">
              <Utensils className="h-7 w-7 text-blue-600 animate-pulse" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-slate-800 tracking-tight">Meal Portal Login</CardTitle>
          <CardDescription className="text-sm text-slate-500">
            Enter your credentials to access the portal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2.5">
              <Label htmlFor="employeeNo" className="text-slate-700 font-medium">Employee Number</Label>
              <Input
                id="employeeNo"
                type="text"
                placeholder="EMP-XXXXX"
                className="h-12 border-slate-200 rounded-xl px-4 text-slate-850 placeholder:text-slate-400 focus-visible:ring-blue-600 focus-visible:border-blue-600 font-semibold"
                disabled={loading}
                {...register('employeeNo')}
              />
              {errors.employeeNo && (
                <p className="text-xs text-red-500 font-medium mt-1">{errors.employeeNo.message}</p>
              )}
            </div>
            
            <div className="space-y-2.5">
              <Label htmlFor="password" className="text-slate-700 font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                className="h-12 border-slate-200 rounded-xl px-4 text-slate-850 placeholder:text-slate-400 focus-visible:ring-blue-600 focus-visible:border-blue-600 font-semibold"
                disabled={loading}
                {...register('password')}
              />
              {errors.password && (
                <p className="text-xs text-red-500 font-medium mt-1">{errors.password.message}</p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-base shadow-sm mt-2 transition-all active:scale-98 flex items-center justify-center gap-2" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Logging in...
                </>
              ) : (
                'Log In'
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center text-sm border-t border-slate-100 pt-5 pb-6">
          <span className="text-slate-500 mr-1.5">Don&apos;t have an account?</span>
          <Link href="/auth/register" className="text-blue-600 font-bold hover:underline">
            Register
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

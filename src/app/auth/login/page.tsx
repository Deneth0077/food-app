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
  password: z.string().regex(/^\d{4}$/, 'PIN must be exactly 4 digits'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);

  // Forgot PIN recovery states
  const [showForgotPinModal, setShowForgotPinModal] = useState(false);
  const [forgotEmployeeNo, setForgotEmployeeNo] = useState('');
  const [forgotPhoneNumber, setForgotPhoneNumber] = useState('');
  const [forgotNewPin, setForgotNewPin] = useState('');
  const [forgotConfirmPin, setForgotConfirmPin] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [resetting, setResetting] = useState(false);

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

  const handleVerifyForgotDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmployeeNo.trim() || !forgotPhoneNumber.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Both fields are required.',
      });
      return;
    }
    setResetting(true);
    try {
      const res = await fetch('/api/auth/reset-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeNo: forgotEmployeeNo.trim(),
          phoneNumber: forgotPhoneNumber.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');

      if (data.verified) {
        setIsVerified(true);
        toast({
          title: 'Details Verified',
          description: 'Please enter your new 4-digit PIN.',
        });
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to verify',
        description: err.message || 'Something went wrong',
      });
    } finally {
      setResetting(false);
    }
  };

  const handleResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(forgotNewPin.trim())) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'PIN must be exactly 4 digits.',
      });
      return;
    }
    if (forgotNewPin.trim() !== forgotConfirmPin.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'PINs do not match.',
      });
      return;
    }

    setResetting(true);
    try {
      const res = await fetch('/api/auth/reset-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeNo: forgotEmployeeNo.trim(),
          phoneNumber: forgotPhoneNumber.trim(),
          newPin: forgotNewPin.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reset failed');

      toast({
        title: 'PIN Reset Success',
        description: 'Your new PIN has been saved. Please log in.',
      });
      
      // Close modal and clear states
      setShowForgotPinModal(false);
      setForgotEmployeeNo('');
      setForgotPhoneNumber('');
      setForgotNewPin('');
      setForgotConfirmPin('');
      setIsVerified(false);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to reset',
        description: err.message || 'Something went wrong',
      });
    } finally {
      setResetting(false);
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
              <div className="flex justify-between items-center">
                <Label htmlFor="password" className="text-slate-700 font-medium">4-Digit PIN</Label>
                <button
                  type="button"
                  onClick={() => setShowForgotPinModal(true)}
                  className="text-xs font-bold text-blue-600 hover:underline"
                >
                  Forgot PIN?
                </button>
              </div>
              <Input
                id="password"
                type="password"
                maxLength={4}
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="••••"
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

      {/* Forgot PIN Modal */}
      {showForgotPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 ease-out animate-in fade-in">
          <div className="absolute inset-0" onClick={() => {
            setShowForgotPinModal(false);
            setForgotEmployeeNo('');
            setForgotPhoneNumber('');
            setForgotNewPin('');
            setForgotConfirmPin('');
            setIsVerified(false);
          }}></div>
          
          <div className="relative bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-slate-100 transition-all duration-300 ease-out transform animate-in zoom-in-95">
            <h3 className="text-lg font-bold text-slate-800 tracking-tight">Recover 4-Digit PIN</h3>
            <p className="text-xs text-slate-500 mt-1 font-semibold">
              {isVerified ? 'Enter your new 4-digit PIN below.' : 'Verify your employee details to reset your PIN.'}
            </p>
            
            {!isVerified ? (
              <form onSubmit={handleVerifyForgotDetails} className="space-y-4 mt-4 text-left">
                <div className="space-y-1.5">
                  <Label htmlFor="forgotEmpNo" className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Employee Number</Label>
                  <Input
                    id="forgotEmpNo"
                    type="text"
                    placeholder="EMP-XXXXX"
                    value={forgotEmployeeNo}
                    onChange={(e) => setForgotEmployeeNo(e.target.value)}
                    className="h-11 border-slate-200 rounded-xl px-3 text-slate-850 font-semibold"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="forgotPhone" className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Phone Number</Label>
                  <Input
                    id="forgotPhone"
                    type="text"
                    placeholder="+94 77 123 4567"
                    value={forgotPhoneNumber}
                    onChange={(e) => setForgotPhoneNumber(e.target.value)}
                    className="h-11 border-slate-200 rounded-xl px-3 text-slate-850 font-semibold"
                    required
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPinModal(false);
                      setForgotEmployeeNo('');
                      setForgotPhoneNumber('');
                      setForgotNewPin('');
                      setForgotConfirmPin('');
                      setIsVerified(false);
                    }}
                    className="flex-1 h-11 border border-slate-200 text-slate-500 font-bold rounded-xl text-xs hover:bg-slate-50 active:scale-98 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetting}
                    className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs active:scale-98 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetPin} className="space-y-4 mt-4 text-left">
                <div className="space-y-1.5">
                  <Label htmlFor="newPin" className="text-xs font-bold text-slate-400 uppercase tracking-wider block">New 4-Digit PIN</Label>
                  <Input
                    id="newPin"
                    type="password"
                    maxLength={4}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="••••"
                    value={forgotNewPin}
                    onChange={(e) => setForgotNewPin(e.target.value.replace(/\D/g, ''))}
                    className="h-11 border-slate-200 rounded-xl px-3 text-slate-850 font-semibold"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPin" className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Confirm New PIN</Label>
                  <Input
                    id="confirmPin"
                    type="password"
                    maxLength={4}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="••••"
                    value={forgotConfirmPin}
                    onChange={(e) => setForgotConfirmPin(e.target.value.replace(/\D/g, ''))}
                    className="h-11 border-slate-200 rounded-xl px-3 text-slate-850 font-semibold"
                    required
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsVerified(false);
                      setForgotNewPin('');
                      setForgotConfirmPin('');
                    }}
                    className="flex-1 h-11 border border-slate-200 text-slate-500 font-bold rounded-xl text-xs hover:bg-slate-50 active:scale-98 transition-all"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={resetting}
                    className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs active:scale-98 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reset PIN'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

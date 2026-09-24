'use client';

import { useState } from 'react';
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

const registerSchema = z.object({
  fullName: z.string()
    .min(2, 'Full name must be at least 2 characters')
    .max(20, 'Full name cannot exceed 20 characters'),
  employeeNo: z.string()
    .min(1, 'Employee number is required')
    .refine((val) => {
      const clean = val.trim().toUpperCase();
      if (clean.startsWith('ADMIN') || clean.startsWith('CANTEEN') || clean.startsWith('CASHIER') || clean.startsWith('SUPERADMIN')) {
        return true;
      }
      return /^\d{4}$/.test(clean);
    }, { message: 'Format must be 4 digits with zero padding (e.g. 0234, 0023, 0001). English characters are not allowed.' })
    .refine((val) => {
      const clean = val.trim().toUpperCase();
      if (clean.startsWith('ADMIN') || clean.startsWith('CANTEEN') || clean.startsWith('CASHIER') || clean.startsWith('SUPERADMIN')) {
        return true;
      }
      const num = parseInt(clean, 10);
      return !isNaN(num) && num < 2000 && num >= 1;
    }, { message: 'Wrong Emp ID! Employee number must be a number less than 2000.' }),
  phoneNumber: z.string()
    .refine((val) => /^\d{10}$/.test(val.trim().replace(/\s+/g, '')), {
      message: 'Phone number must be exactly 10 digits (e.g. 0771234567)',
    }),
  password: z.string().regex(/^\d{4}$/, 'PIN must be exactly 4 digits'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "PINs do not match",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      employeeNo: '',
      phoneNumber: '',
      password: '',
      confirmPassword: '',
    }
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: data.fullName.trim(),
          employeeNo: data.employeeNo.trim(),
          phoneNumber: data.phoneNumber.trim(),
          password: data.password,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Registration failed');
      }

      toast({
        title: 'Registration successful!',
        description: 'Your account has been created.',
      });

      // Redirect depending on user prefix (ADMIN or CANTEEN will be redirected based on middleware or register routing)
      // Since registration API sets the JWT cookie, we can navigate to root "/" and let the middleware redirect the user to their dashboard automatically!
      router.push('/');
      router.refresh();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Registration Failed',
        description: err.message || 'Something went wrong',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6 bg-slate-50">
      <Card className="w-full max-w-sm border-slate-200/80 shadow-md rounded-2xl bg-white my-6">
        <CardHeader className="space-y-2 text-center pb-6">
          <div className="flex justify-center mb-3">
            <div className="h-14 w-14 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100">
              <Utensils className="h-7 w-7 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-slate-800 tracking-tight">Create Account</CardTitle>
          <CardDescription className="text-sm text-slate-500">
            Register to request daily company meals
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-slate-700 font-medium">Full Name (Max 20 chars)</Label>
              <Input
                id="fullName"
                type="text"
                maxLength={20}
                placeholder="Chaminda Silva"
                className="h-11 border-slate-200 rounded-xl px-4 text-slate-850 focus-visible:ring-blue-600 focus-visible:border-blue-600"
                disabled={loading}
                {...register('fullName')}
              />
              {errors.fullName && (
                <p className="text-xs text-red-500 font-medium mt-1">{errors.fullName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="employeeNo" className="text-slate-700 font-medium">Employee Number</Label>
              <Input
                id="employeeNo"
                type="text"
                placeholder="0234, 0023, 0001"
                className="h-11 border-slate-200 rounded-xl px-4 text-slate-850 focus-visible:ring-blue-600 focus-visible:border-blue-600 font-semibold"
                disabled={loading}
                {...register('employeeNo')}
              />
              <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                Must be 4 digits zero-padded (e.g. 0234, 0023, 0001) less than 2000. (Demo roles: ADMIN01, CASHIER01, CANTEEN01)
              </p>
              {errors.employeeNo && (
                <p className="text-xs text-red-500 font-medium mt-1">{errors.employeeNo.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber" className="text-slate-700 font-medium">Phone Number (10 Digits)</Label>
              <Input
                id="phoneNumber"
                type="tel"
                maxLength={10}
                placeholder="0771234567"
                className="h-11 border-slate-200 rounded-xl px-4 text-slate-850 focus-visible:ring-blue-600 focus-visible:border-blue-600"
                disabled={loading}
                {...register('phoneNumber')}
              />
              {errors.phoneNumber && (
                <p className="text-xs text-red-500 font-medium mt-1">{errors.phoneNumber.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700 font-medium">4-Digit PIN</Label>
              <Input
                id="password"
                type="password"
                maxLength={4}
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Enter 4-digit PIN"
                className="h-11 border-slate-200 rounded-xl px-4 text-slate-850 focus-visible:ring-blue-600 focus-visible:border-blue-600"
                disabled={loading}
                {...register('password')}
              />
              {errors.password && (
                <p className="text-xs text-red-500 font-medium mt-1">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-slate-700 font-medium">Confirm PIN</Label>
              <Input
                id="confirmPassword"
                type="password"
                maxLength={4}
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Confirm your 4-digit PIN"
                className="h-11 border-slate-200 rounded-xl px-4 text-slate-850 focus-visible:ring-blue-600 focus-visible:border-blue-600"
                disabled={loading}
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-red-500 font-medium mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-base shadow-sm mt-3 transition-all active:scale-98 flex items-center justify-center gap-2" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Registering...
                </>
              ) : (
                'Register'
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center text-sm border-t border-slate-100 pt-5 pb-6">
          <span className="text-slate-500 mr-1.5">Already have an account?</span>
          <Link href="/auth/login" className="text-blue-600 font-bold hover:underline">
            Log In
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';
import { BottomNav } from '@/components/BottomNav';
import { Toaster } from '@/components/ui/toaster';
import { MobileFrame } from '@/components/MobileFrame';
import { cn } from '@/lib/utils';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Meal Logistics Manager',
  description: 'Corporate meal request and collection portal',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={cn(inter.className, "min-h-screen bg-slate-100 antialiased")}>
        <Providers>
          <MobileFrame>
            <main className="flex-1 w-full">
              {children}
            </main>
            <BottomNav />
            <Toaster />
          </MobileFrame>
        </Providers>
      </body>
    </html>
  );
}

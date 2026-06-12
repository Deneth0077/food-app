import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';
import { BottomNav } from '@/components/BottomNav';
import { Toaster } from '@/components/ui/toaster';
import { MobileFrame } from '@/components/MobileFrame';
import { cn } from '@/lib/utils';

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  themeColor: '#2563eb',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'Meal Logistics Manager',
  description: 'Corporate meal request and collection portal',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ZPMC Food',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    apple: '/apple-touch-icon.png',
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(inter.className, "min-h-screen bg-slate-100 antialiased")} suppressHydrationWarning>
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

'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, ClipboardList, User, Users, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const pathname = usePathname();

  // If path starts with /auth, or is root, do not render navigation
  if (pathname.startsWith('/auth') || pathname === '/') return null;

  let role: 'employee' | 'canteen' | 'admin' = 'employee';
  if (pathname.startsWith('/admin')) {
    role = 'admin';
  } else if (pathname.startsWith('/canteen')) {
    role = 'canteen';
  } else if (pathname.startsWith('/employee')) {
    role = 'employee';
  } else {
    // Default fallback - don't show if not matched
    return null;
  }

  const employeeNavItems = [
    { name: 'Home', href: '/employee/dashboard', icon: Home },
    { name: 'History', href: '/employee/history', icon: ClipboardList },
    { name: 'Profile', href: '/employee/profile', icon: User },
  ];

  const canteenNavItems = [
    { name: 'Home', href: '/canteen/dashboard', icon: Home },
    { name: 'History', href: '/canteen/history', icon: ClipboardList },
  ];

  const adminNavItems = [
    { name: 'Home', href: '/admin/dashboard', icon: Home },
    { name: 'Employees', href: '/admin/employees', icon: Users },
    { name: 'Reports', href: '/admin/reports', icon: BarChart3 },
  ];

  const navItems = role === 'admin' 
    ? adminNavItems 
    : role === 'canteen' 
    ? canteenNavItems 
    : employeeNavItems;

  return (
    <div className="absolute bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 shadow-[0_-4px_12px_rgba(0,0,0,0.03)] flex items-center justify-around px-4 z-40">
      {navItems.map((item) => {
        // Active if exact match or path starts with href (and is not dashboard base path matching other subpaths)
        const isActive = pathname === item.href || (item.href.endsWith('/dashboard') ? pathname === item.href : pathname.startsWith(item.href));
        
        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center w-20 h-full space-y-1 transition-all duration-200 active:scale-95",
              isActive ? "text-blue-600 scale-105" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <item.icon className={cn("h-5.5 w-5.5 stroke-[2.25]", isActive ? "stroke-blue-600" : "stroke-slate-400")} />
            <span className={cn("text-[10px] font-semibold tracking-wide", isActive ? "text-blue-600 font-bold" : "text-slate-400")}>
              {item.name}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

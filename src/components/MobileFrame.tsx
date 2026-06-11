'use client';

import React from 'react';

export function MobileFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-slate-100 flex justify-center items-start">
      <div className="w-full max-w-[480px] min-h-screen bg-slate-50 shadow-2xl flex flex-col relative pb-20 border-x border-slate-200">
        {children}
      </div>
    </div>
  );
}

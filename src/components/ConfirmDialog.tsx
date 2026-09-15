'use client';

import React from 'react';
import { AlertTriangle, HelpCircle, AlertCircle, Trash2, X } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm transition-all duration-200 animate-in fade-in">
      {/* Backdrop overlay click */}
      <div className="absolute inset-0" onClick={onCancel} />

      {/* Modal Box */}
      <div 
        role="dialog"
        aria-modal="true"
        className="relative bg-white w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-3xl p-4.5 sm:p-6 shadow-2xl border border-slate-100 transition-all duration-200 ease-out transform animate-in zoom-in-95 space-y-4 sm:space-y-5"
      >
        <button
          onClick={onCancel}
          className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3 sm:gap-4 pr-5 sm:pr-6">
          <div className={`h-11 w-11 sm:h-12 sm:w-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
            variant === 'danger'
              ? 'bg-rose-50 text-rose-600 border border-rose-100/80 ring-4 ring-rose-50/50'
              : variant === 'warning'
              ? 'bg-amber-50 text-amber-600 border border-amber-100/80 ring-4 ring-amber-50/50'
              : 'bg-blue-50 text-blue-600 border border-blue-100/80 ring-4 ring-blue-50/50'
          }`}>
            {variant === 'danger' ? (
              <Trash2 className="h-5 w-5 stroke-[2.2]" />
            ) : variant === 'warning' ? (
              <AlertTriangle className="h-5 w-5 stroke-[2.2]" />
            ) : (
              <AlertCircle className="h-5 w-5 stroke-[2.2]" />
            )}
          </div>

          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-snug">
              {title}
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-1 sm:mt-1.5 font-medium leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        <div className="flex gap-2 sm:gap-2.5 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 h-10 sm:h-11 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs active:scale-95 transition-all shadow-xs"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 h-10 sm:h-11 text-white font-bold rounded-xl text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 ${
              variant === 'danger'
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
                : variant === 'warning'
                ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200'
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

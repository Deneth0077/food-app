'use client';

import { useState, useEffect } from 'react';
import { Download, X, Share } from 'lucide-react';

export default function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showAndroidPrompt, setShowAndroidPrompt] = useState(false);
  const [showIosPrompt, setShowIosPrompt] = useState(false);

  useEffect(() => {
    // Check if app is already running in standalone mode (installed)
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone;

    if (isStandalone) {
      return;
    }

    // Check if user previously dismissed prompt
    const isDismissed = localStorage.getItem('pwa-install-dismissed');
    if (isDismissed) {
      return;
    }

    // Detect iOS Device
    const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    // Check if Safari
    const isSafari = /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|OPiOS|mercury/i.test(navigator.userAgent);

    if (isIos && isSafari) {
      setShowIosPrompt(true);
      return;
    }

    // Standard PWA listener (Android, Chrome, Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowAndroidPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the PWA install prompt');
    } else {
      console.log('User dismissed the PWA install prompt');
    }
    setDeferredPrompt(null);
    setShowAndroidPrompt(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa-install-dismissed', 'true');
    setShowAndroidPrompt(false);
    setShowIosPrompt(false);
  };

  if (!showAndroidPrompt && !showIosPrompt) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-blue-700 to-blue-600 rounded-2xl p-4 text-white shadow-md relative border border-blue-500/20 overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-3 animate-in slide-in-from-top-4 duration-300">
      {/* Background decoration */}
      <div className="absolute right-[-10px] top-[-10px] opacity-10 pointer-events-none">
        <Download className="h-24 w-24" />
      </div>

      <div className="flex items-start gap-3 flex-1">
        <div className="h-10 w-10 rounded-xl bg-blue-500/35 border border-blue-400/20 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-inner">
          {showIosPrompt ? <Share className="h-5 w-5" /> : <Download className="h-5 w-5" />}
        </div>
        <div className="space-y-0.5">
          <h4 className="text-sm font-bold tracking-tight text-white">Install ZPMC Food App</h4>
          <p className="text-xs text-blue-100 font-medium leading-relaxed max-w-[340px]">
            {showIosPrompt 
              ? "Tap the share button below and select 'Add to Home Screen' to install this app on your iPhone." 
              : "Install our app for a faster, full-screen experience and quick offline access to your meal portal."}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-1 md:mt-0 z-10 shrink-0">
        {showAndroidPrompt && (
          <button
            onClick={handleInstallClick}
            className="bg-white text-blue-700 hover:bg-blue-50 active:scale-95 text-xs font-bold px-4 py-2 rounded-xl shadow-sm transition-all duration-200"
          >
            Install Now
          </button>
        )}
        <button
          onClick={handleDismiss}
          className="text-blue-100 hover:text-white hover:bg-blue-800/40 p-2 rounded-xl transition-colors"
          aria-label="Dismiss prompt"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

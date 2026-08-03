'use client';

import { Loader2 } from 'lucide-react';

interface FullScreenLoaderProps {
  isVisible: boolean;
  message?: string;
}

export function FullScreenLoader({ isVisible, message = 'Processing...' }: FullScreenLoaderProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-900/20 dark:bg-slate-900/60 backdrop-blur-xl transition-all duration-300">
      <div className="flex flex-col items-center gap-6">
        <Loader2 className="h-16 w-16 text-indigo-600 dark:text-indigo-400 animate-spin drop-shadow-lg" />
        {message && (
          <p className="text-slate-800 dark:text-white font-semibold text-lg tracking-wide drop-shadow-md">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

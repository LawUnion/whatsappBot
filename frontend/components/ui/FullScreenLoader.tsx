'use client';

import { Loader2 } from 'lucide-react';

interface FullScreenLoaderProps {
  isVisible: boolean;
  message?: string;
}

export function FullScreenLoader({ isVisible, message = 'Processing...' }: FullScreenLoaderProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/40 dark:bg-slate-900/40 backdrop-blur-md transition-all duration-300">
      <div className="bg-white/80 dark:bg-slate-800/80 p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4 border border-slate-200/50 dark:border-slate-700/50">
        <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
        {message && (
          <p className="text-slate-800 dark:text-slate-200 font-medium tracking-wide">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

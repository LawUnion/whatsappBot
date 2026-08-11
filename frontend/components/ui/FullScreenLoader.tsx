'use client';

import { Loader2 } from 'lucide-react';

interface FullScreenLoaderProps {
  isVisible: boolean;
  message?: string;
}

export function FullScreenLoader({ isVisible, message = 'Processing...' }: FullScreenLoaderProps) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-[9999] flex items-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl px-5 py-4 transition-all duration-300 ${
        isVisible
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
    >
      <Loader2 className="h-5 w-5 text-indigo-500 animate-spin flex-shrink-0" />
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
        {message}
      </p>
    </div>
  );
}

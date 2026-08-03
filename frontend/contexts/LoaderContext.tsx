'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { FullScreenLoader } from '@/components/ui/FullScreenLoader';

interface LoaderContextType {
  showLoader: (message?: string) => void;
  hideLoader: () => void;
}

const LoaderContext = createContext<LoaderContextType | undefined>(undefined);

export function LoaderProvider({ children }: { children: ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);
  const [message, setMessage] = useState<string | undefined>('Processing...');
  const pathname = usePathname();

  useEffect(() => {
    // Automatically hide loader when the route changes
    setIsVisible(false);
  }, [pathname]);

  const showLoader = (newMessage?: string) => {
    setMessage(newMessage || 'Processing...');
    setIsVisible(true);
  };

  const hideLoader = () => {
    setIsVisible(false);
  };

  return (
    <LoaderContext.Provider value={{ showLoader, hideLoader }}>
      {children}
      <FullScreenLoader isVisible={isVisible} message={message} />
    </LoaderContext.Provider>
  );
}

export function useLoader() {
  const context = useContext(LoaderContext);
  if (context === undefined) {
    throw new Error('useLoader must be used within a LoaderProvider');
  }
  return context;
}

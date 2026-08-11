'use client';

interface FullScreenLoaderProps {
  isVisible: boolean;
  message?: string;
}

// Loading state is now handled inline on each button via isSubmitting.
// This component is kept for backward compatibility but renders nothing.
export function FullScreenLoader({ isVisible, message }: FullScreenLoaderProps) {
  return null;
}


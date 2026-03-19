import { useState, useEffect, useRef } from 'react';

/**
 * Hook that defers showing loading state to avoid flash for fast loads.
 * Only shows loading if the actual loading takes longer than the delay.
 *
 * @param isLoading - The actual loading state
 * @param delay - Delay in ms before showing loading (default: 150ms)
 * @returns Whether to show the loading UI
 */
export function useDeferredLoading(isLoading: boolean, delay: number = 150): boolean {
  const [showLoading, setShowLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isLoading) {
      // Start timer to show loading after delay
      timerRef.current = setTimeout(() => {
        setShowLoading(true);
      }, delay);
    } else {
      // Clear timer and hide loading immediately when done
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setShowLoading(false);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isLoading, delay]);

  return showLoading;
}

export default useDeferredLoading;

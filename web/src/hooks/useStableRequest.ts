import { useRef, useCallback, useEffect } from "react";

// Module-level cache to track requests across StrictMode remounts
const requestCache = new Map<string, { timestamp: number; promise?: Promise<unknown> }>();

/**
 * Creates a stable request function that prevents duplicate calls.
 * Useful for preventing double fetches caused by React StrictMode.
 *
 * @param requestFn - The async function to call
 * @param debounceMs - Minimum time between calls (default: 100ms)
 * @returns A stable callback that won't fire duplicates
 *
 * @example
 * const loadData = useStableRequest(async () => {
 *   const response = await fetch('/api/data');
 *   setData(await response.json());
 * });
 *
 * useEffect(() => {
 *   loadData();
 * }, [loadData]);
 */
export function useStableRequest<T extends (...args: unknown[]) => Promise<unknown>>(
  requestFn: T,
  debounceMs: number = 100
): T {
  const lastCallTime = useRef<number>(0);
  const pendingPromise = useRef<Promise<unknown> | null>(null);

  const stableRequest = useCallback(
    async (...args: Parameters<T>): Promise<ReturnType<T>> => {
      const now = Date.now();

      // If called within debounce window, return existing promise or skip
      if (now - lastCallTime.current < debounceMs) {
        if (pendingPromise.current) {
          return pendingPromise.current as Promise<ReturnType<T>>;
        }
        // Skip if no pending promise (already completed)
        return Promise.resolve(undefined as ReturnType<T>);
      }

      lastCallTime.current = now;

      // Execute and track the promise
      pendingPromise.current = requestFn(...args);

      try {
        const result = await pendingPromise.current;
        return result as ReturnType<T>;
      } finally {
        pendingPromise.current = null;
      }
    },
    [requestFn, debounceMs]
  ) as T;

  return stableRequest;
}

/**
 * Hook that runs a fetch function once on mount, preventing StrictMode duplicates.
 * Uses a module-level cache to survive component remounts.
 *
 * @param fetchFn - The async function to call on mount (should be wrapped in useCallback)
 * @param key - Unique key to identify this request
 * @param debounceMs - Minimum time between calls (default: 200ms)
 *
 * @example
 * const loadData = useCallback(async () => {
 *   const response = await fetch('/api/connections');
 *   setConnections(await response.json());
 * }, []);
 *
 * useFetchOnce(loadData, 'connections-page');
 */
export function useFetchOnce(
  fetchFn: () => Promise<void>,
  key: string = "default",
  debounceMs: number = 200
): void {
  // Store fetchFn in a ref to avoid re-running effect when it changes
  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;

  useEffect(() => {
    const now = Date.now();
    const cached = requestCache.get(key);

    // If request was made recently, skip (handles StrictMode double-mount)
    if (cached && now - cached.timestamp < debounceMs) {
      return;
    }

    // Mark as called and execute
    requestCache.set(key, { timestamp: now });
    const promise = fetchFnRef.current();
    requestCache.set(key, { timestamp: now, promise });

    // Cleanup cache entry after a delay
    const cleanupTimer = setTimeout(() => {
      requestCache.delete(key);
    }, 5000);

    return () => {
      clearTimeout(cleanupTimer);
    };
    // Only depend on key - fetchFn changes shouldn't re-trigger
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, debounceMs]);
}

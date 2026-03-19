import { useState, useCallback, useEffect, useRef } from 'react';

// =============================================================================
// Types
// =============================================================================

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
  status: AsyncStatus;
  data: T | null;
  error: Error | null;
  isIdle: boolean;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export interface UseAsyncReturn<T, Args extends unknown[]> extends AsyncState<T> {
  execute: (...args: Args) => Promise<T | null>;
  reset: () => void;
  setData: (data: T | null) => void;
}

export interface UseAsyncOptions<T> {
  /** Initial data value */
  initialData?: T | null;
  /** Whether to execute immediately on mount */
  immediate?: boolean;
  /** Callback when execution succeeds */
  onSuccess?: (data: T) => void;
  /** Callback when execution fails */
  onError?: (error: Error) => void;
  /** Callback when execution settles (success or error) */
  onSettled?: () => void;
}

// =============================================================================
// useAsync Hook
// =============================================================================

/**
 * A hook for handling async operations with loading, error, and success states.
 *
 * @param asyncFn - The async function to execute
 * @param options - Configuration options
 * @returns Object with state and execute function
 *
 * @example
 * // Basic usage
 * function UserProfile({ userId }: { userId: string }) {
 *   const { data, isLoading, isError, error, execute } = useAsync(
 *     (id: string) => fetchUser(id),
 *     { immediate: true }
 *   );
 *
 *   if (isLoading) return <Spinner />;
 *   if (isError) return <Error message={error?.message} />;
 *   return <Profile user={data} />;
 * }
 *
 * @example
 * // Manual execution
 * function SubmitForm() {
 *   const { execute, isLoading } = useAsync(submitFormData);
 *
 *   const handleSubmit = async (data: FormData) => {
 *     const result = await execute(data);
 *     if (result) {
 *       toast.success('Form submitted!');
 *     }
 *   };
 *
 *   return <form onSubmit={handleSubmit}>...</form>;
 * }
 */
export function useAsync<T, Args extends unknown[] = []>(
  asyncFn: (...args: Args) => Promise<T>,
  options: UseAsyncOptions<T> = {}
): UseAsyncReturn<T, Args> {
  const {
    initialData = null,
    immediate = false,
    onSuccess,
    onError,
    onSettled,
  } = options;

  const [status, setStatus] = useState<AsyncStatus>('idle');
  const [data, setData] = useState<T | null>(initialData);
  const [error, setError] = useState<Error | null>(null);

  // Track mounted state to avoid state updates after unmount
  const mountedRef = useRef(true);
  // Track the latest async function
  const asyncFnRef = useRef(asyncFn);
  asyncFnRef.current = asyncFn;
  // Track the latest callbacks to avoid stale closures
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const onSettledRef = useRef(onSettled);
  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;
  onSettledRef.current = onSettled;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const execute = useCallback(
    async (...args: Args): Promise<T | null> => {
      setStatus('loading');
      setError(null);

      try {
        const result = await asyncFnRef.current(...args);

        if (mountedRef.current) {
          setData(result);
          setStatus('success');
          onSuccessRef.current?.(result);
        }

        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));

        if (mountedRef.current) {
          setError(error);
          setStatus('error');
          onErrorRef.current?.(error);
        }

        return null;
      } finally {
        if (mountedRef.current) {
          onSettledRef.current?.();
        }
      }
    },
    [] // No dependencies needed - all values accessed via refs
  );

  const reset = useCallback(() => {
    setStatus('idle');
    setData(initialData);
    setError(null);
  }, [initialData]);

  const setDataManually = useCallback((newData: T | null) => {
    setData(newData);
    if (newData !== null) {
      setStatus('success');
    }
  }, []);

  // Execute immediately if option is set
  useEffect(() => {
    if (immediate) {
      execute(...([] as unknown as Args));
    }
  }, [immediate, execute]);

  return {
    status,
    data,
    error,
    isIdle: status === 'idle',
    isLoading: status === 'loading',
    isSuccess: status === 'success',
    isError: status === 'error',
    execute,
    reset,
    setData: setDataManually,
  };
}

// =============================================================================
// useAsyncEffect Hook
// =============================================================================

/**
 * Like useEffect, but for async functions.
 * Automatically handles cleanup and prevents state updates after unmount.
 *
 * @example
 * useAsyncEffect(async (signal) => {
 *   const data = await fetchData({ signal });
 *   setData(data);
 * }, [dependency]);
 */
export function useAsyncEffect(
  effect: (signal: AbortSignal) => Promise<void>,
  deps: React.DependencyList = []
): void {
  useEffect(() => {
    const abortController = new AbortController();

    effect(abortController.signal).catch((error) => {
      // Ignore abort errors
      if (error.name !== 'AbortError') {
        console.error('useAsyncEffect error:', error);
      }
    });

    return () => {
      abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

// =============================================================================
// useAsyncRetry Hook
// =============================================================================

export interface UseAsyncRetryOptions<T> extends UseAsyncOptions<T> {
  /** Maximum number of retry attempts */
  maxRetries?: number;
  /** Delay between retries in milliseconds */
  retryDelay?: number;
  /** Whether to use exponential backoff */
  exponentialBackoff?: boolean;
}

/**
 * Like useAsync but with built-in retry logic.
 *
 * @example
 * const { data, retry, retryCount } = useAsyncRetry(
 *   () => fetchUnreliableApi(),
 *   { maxRetries: 3, retryDelay: 1000, exponentialBackoff: true }
 * );
 */
export function useAsyncRetry<T, Args extends unknown[] = []>(
  asyncFn: (...args: Args) => Promise<T>,
  options: UseAsyncRetryOptions<T> = {}
): UseAsyncReturn<T, Args> & { retry: () => Promise<T | null>; retryCount: number } {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    exponentialBackoff = true,
    ...asyncOptions
  } = options;

  const [retryCount, setRetryCount] = useState(0);
  const lastArgsRef = useRef<Args | null>(null);

  const wrappedFn = useCallback(
    async (...args: Args): Promise<T> => {
      lastArgsRef.current = args;
      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await asyncFn(...args);
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));

          if (attempt < maxRetries) {
            const delay = exponentialBackoff
              ? retryDelay * Math.pow(2, attempt)
              : retryDelay;
            await new Promise((resolve) => setTimeout(resolve, delay));
            setRetryCount(attempt + 1);
          }
        }
      }

      throw lastError;
    },
    [asyncFn, maxRetries, retryDelay, exponentialBackoff]
  );

  const asyncResult = useAsync(wrappedFn, asyncOptions);

  const retry = useCallback(async (): Promise<T | null> => {
    setRetryCount(0);
    if (lastArgsRef.current) {
      return asyncResult.execute(...lastArgsRef.current);
    }
    return asyncResult.execute(...([] as unknown as Args));
  }, [asyncResult]);

  return {
    ...asyncResult,
    retry,
    retryCount,
  };
}

export default useAsync;

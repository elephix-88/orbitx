import { useCallback, useRef } from 'react';

/**
 * Returns a stable callback that always calls the latest version of the provided function.
 * Unlike useCallback, this doesn't require a dependency array and the returned function
 * reference never changes.
 *
 * This is useful for:
 * - Event handlers passed to child components that shouldn't cause re-renders
 * - Callbacks used in useEffect that shouldn't trigger the effect to re-run
 * - Any callback where you need a stable reference but always want the latest closure
 *
 * @example
 * // Instead of:
 * const handleClick = useCallback(() => {
 *   console.log(count); // Stale if count changes
 * }, [count]);
 *
 * // Use:
 * const handleClick = useStableCallback(() => {
 *   console.log(count); // Always fresh
 * });
 *
 * @example
 * // Pass to child without causing re-renders
 * function Parent() {
 *   const [value, setValue] = useState('');
 *
 *   const handleChange = useStableCallback((newValue: string) => {
 *     setValue(newValue);
 *     // Can safely use other state/props here
 *   });
 *
 *   return <MemoizedChild onChange={handleChange} />;
 * }
 */
export function useStableCallback<T extends (...args: unknown[]) => unknown>(
  callback: T
): T {
  const callbackRef = useRef(callback);

  // Update the ref on every render so it always has the latest callback
  callbackRef.current = callback;

  // Return a stable function that calls the latest callback
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(
    ((...args: Parameters<T>) => callbackRef.current(...args)) as T,
    []
  );
}

/**
 * Similar to useStableCallback but for async functions.
 * Provides the same stability guarantees for async operations.
 *
 * @example
 * const fetchData = useStableAsyncCallback(async (id: string) => {
 *   const response = await api.get(`/items/${id}`);
 *   setData(response.data);
 * });
 */
export function useStableAsyncCallback<
  T extends (...args: unknown[]) => Promise<unknown>
>(callback: T): T {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(
    (async (...args: Parameters<T>) => callbackRef.current(...args)) as T,
    []
  );
}

export default useStableCallback;

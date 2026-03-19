/**
 * PageLoader component for Suspense fallback and loading states.
 * For skeleton components, use @/components/shared/Skeleton instead.
 */

interface PageLoaderProps {
  /** Optional message to display */
  message?: string;
  /** Size of the spinner */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show full screen overlay */
  fullScreen?: boolean;
}

/**
 * PageLoader - Loading spinner for page transitions and lazy loading.
 *
 * @example
 * // Basic usage as Suspense fallback
 * <Suspense fallback={<PageLoader />}>
 *   <LazyPage />
 * </Suspense>
 *
 * @example
 * // With custom message
 * <PageLoader message="Loading dashboard..." size="lg" />
 */
export function PageLoader({
  message,
  size = 'md',
  fullScreen = true,
}: PageLoaderProps) {
  const sizeClasses = {
    sm: 'h-6 w-6 border-2',
    md: 'h-10 w-10 border-[3px]',
    lg: 'h-14 w-14 border-4',
  };

  const containerClasses = fullScreen
    ? 'fixed inset-0 flex items-center justify-center bg-[#F1FAEE]/90 dark:bg-slate-900/90 z-50'
    : 'flex items-center justify-center p-8';

  return (
    <div className={containerClasses} role="status" aria-label="Loading">
      <div className="flex flex-col items-center gap-4">
        {/* Spinner */}
        <div
          className={`
            ${sizeClasses[size]}
            animate-spin
            rounded-none
            border-[#A8DADC]
            border-t-[#E63946]
            dark:border-slate-700
            dark:border-t-[#E63946]
          `}
        />

        {/* Message */}
        {message && (
          <p className="text-sm text-slate-600 dark:text-slate-400 animate-pulse">
            {message}
          </p>
        )}

        {/* Screen reader text */}
        <span className="sr-only">Loading{message ? `: ${message}` : '...'}</span>
      </div>
    </div>
  );
}

/**
 * Inline loader for smaller sections.
 */
export function InlineLoader({ message }: { message?: string }) {
  return (
    <div className="flex items-center justify-center p-4 gap-2">
      <div className="h-4 w-4 animate-spin rounded-none border-2 border-[#A8DADC] border-t-[#E63946] dark:border-slate-700 dark:border-t-[#E63946]" />
      {message && (
        <span className="text-sm text-slate-500 dark:text-slate-400">{message}</span>
      )}
    </div>
  );
}

export default PageLoader;

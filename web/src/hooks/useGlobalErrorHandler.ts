import { useEffect } from 'react';

/**
 * Hook to catch unhandled promise rejections and runtime errors globally.
 * Logs errors to console. Can be extended to report to error tracking service.
 */
export const useGlobalErrorHandler = () => {
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);

      // TODO: Add error tracking service in production
      // if (import.meta.env.PROD) {
      //   errorTracker.captureException(event.reason, { type: 'unhandled_rejection' });
      // }
    };

    const handleError = (event: ErrorEvent) => {
      console.error('Unhandled error:', event.error);

      // TODO: Add error tracking service in production
      // if (import.meta.env.PROD) {
      //   errorTracker.captureException(event.error, { type: 'unhandled_error' });
      // }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);
};

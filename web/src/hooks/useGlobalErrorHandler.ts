import * as Sentry from '@sentry/react';
import { useEffect } from 'react';

/**
 * Hook to catch unhandled promise rejections and runtime errors globally.
 * Logs errors to console. Can be extended to report to error tracking service.
 */
export const useGlobalErrorHandler = () => {
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);

      Sentry.captureException(event.reason);
    };

    const handleError = (event: ErrorEvent) => {
      console.error('Unhandled error:', event.error);

      Sentry.captureException(event.error);
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);
};

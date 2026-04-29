/**
 * Extracts a user-friendly error message from an unknown error.
 * Handles Error instances, strings, and falls back to a default message.
 */
export function getErrorMessage(err: unknown, fallback: string): string {
 if (err instanceof Error) {
 return err.message;
 }
 if (typeof err === 'string') {
 return err;
 }
 return fallback;
}

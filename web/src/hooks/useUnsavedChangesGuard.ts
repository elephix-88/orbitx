import { useEffect } from 'react';

/**
 * Shows the browser's native "Leave site?" prompt when the user tries to
 * close the tab or navigate away while `isDirty` is true.
 */
export function useUnsavedChangesGuard(isDirty: boolean): void {
	useEffect(() => {
		if (!isDirty) return;

		const handler = (event: BeforeUnloadEvent) => {
			event.preventDefault();
			// Required for older browsers; modern ones ignore the string and show a generic prompt.
			event.returnValue = '';
		};

		window.addEventListener('beforeunload', handler);
		return () => window.removeEventListener('beforeunload', handler);
	}, [isDirty]);
}

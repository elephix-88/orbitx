import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useNotification } from './useNotification';

/**
 * Listens for the `orbitx:auth-expired` event dispatched by `fetchClient` when
 * a 401 cannot be recovered by token refresh. Performs a soft router redirect
 * to `/login` and shows a toast — avoiding `window.location.href` so React
 * in-memory state (unsaved edits, open panels) isn't torn down.
 */
export function useAuthExpiredListener(): void {
	const navigate = useNavigate();
	const location = useLocation();
	const { notify } = useNotification();

	useEffect(() => {
		const handler = () => {
			if (location.pathname === '/login') return;
			notify.error('Session expired', 'Please sign in again to continue.');
			navigate('/login', { replace: true });
		};
		window.addEventListener('orbitx:auth-expired', handler);
		return () => window.removeEventListener('orbitx:auth-expired', handler);
	}, [navigate, location.pathname, notify]);
}

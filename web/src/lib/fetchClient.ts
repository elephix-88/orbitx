import { API_CONFIG } from '@/config/env';
import { authService } from '@/services/authService';

// Lightweight global fetch wrapper.
// NOTE: Global loading state removed - use component-level loading states instead.
// This prevents full-page loaders from appearing during background API calls.

type FetchOptions = globalThis.RequestInit & { baseUrl?: string; skipRefresh?: boolean };

// Track if we're currently refreshing to prevent multiple refresh attempts
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const result = await authService.refreshToken();
      return !!result;
    } catch {
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function fetchClient(path: string, options: FetchOptions = {}) {
  const { skipRefresh = false, ...fetchOptions } = options;
  const base = fetchOptions.baseUrl ?? API_CONFIG.BASE_URL;
  const url = path.startsWith('http') ? path : `${base}${path}`;

  let resp = await fetch(url, {
    credentials: 'include',
    ...fetchOptions,
    headers: {
      ...authService.getAuthHeader(),
      ...fetchOptions.headers,
    },
  });

  // Handle 401 — attempt silent token refresh, then retry
  if (resp.status === 401 && !skipRefresh) {
    const refreshed = await tryRefreshToken();

    if (refreshed) {
      // Retry the original request with the new token
      resp = await fetch(url, {
        credentials: 'include',
        ...fetchOptions,
        headers: {
          ...authService.getAuthHeader(),
          ...fetchOptions.headers,
        },
      });
    }

    // If still 401 after refresh (or refresh itself failed), force re-login.
    // Use clearLocalAuth — no server call needed since the session is already invalid.
    if (resp.status === 401) {
      authService.clearLocalAuth();
      window.location.href = '/login';
    }
  }

  return resp;
}



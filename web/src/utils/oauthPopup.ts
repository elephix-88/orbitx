/**
 * Unified OAuth popup utility
 * Handles popup window management, message listening, and cleanup
 */

export interface OAuthPopupOptions {
  /** Popup window title */
  title?: string;
  /** Popup window width */
  width?: number;
  /** Popup window height */
  height?: number;
  /** Interval in ms to check if popup is closed (default: 500) */
  pollInterval?: number;
  /** Whether to enable scrollbars and resizing */
  scrollable?: boolean;
}

export interface OAuthPopupResult<T = void> {
  /** Data returned on success */
  data?: T;
}

type OAuthSuccessBehavior<T> =
  | { type: 'reload' }
  | { type: 'resolve'; data?: T }
  | { type: 'callback'; onSuccess: () => void; onError?: (error: string) => void };

interface InternalOptions<T> extends OAuthPopupOptions {
  successBehavior: OAuthSuccessBehavior<T>;
}

/**
 * Opens an OAuth popup and handles the authentication flow
 */
export function openOAuthPopup<T = void>(
  url: string,
  options: InternalOptions<T>
): Promise<OAuthPopupResult<T>> {
  const {
    title = 'OAuthPopup',
    width = 500,
    height = 600,
    pollInterval = 500,
    scrollable = false,
    successBehavior,
  } = options;

  return new Promise((resolve, reject) => {
    const features = scrollable
      ? `width=${width},height=${height},scrollbars=yes,resizable=yes`
      : `width=${width},height=${height}`;

    const popup = window.open(url, title, features);

    if (!popup) {
      reject(new Error('Failed to open popup window. Please allow popups for this site.'));
      return;
    }

    let isResolved = false;

    const cleanup = () => {
      window.removeEventListener('message', messageHandler);
      if (timer) clearInterval(timer);
    };

    const handleSuccess = () => {
      if (isResolved) return;
      isResolved = true;
      cleanup();
      if (popup && !popup.closed) popup.close();

      switch (successBehavior.type) {
        case 'reload':
          window.location.reload();
          break;
        case 'resolve':
          resolve({ data: successBehavior.data });
          break;
        case 'callback':
          successBehavior.onSuccess();
          resolve({});
          break;
      }
    };

    const handleError = (error: string) => {
      if (isResolved) return;
      isResolved = true;
      cleanup();
      if (popup && !popup.closed) popup.close();

      if (successBehavior.type === 'callback' && successBehavior.onError) {
        successBehavior.onError(error);
      }
      reject(new Error(error || 'OAuth authentication failed'));
    };

    const messageHandler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      if (event.data.type === 'oauth_success') {
        handleSuccess();
      } else if (event.data.type === 'oauth_error') {
        handleError(event.data.error);
      }
    };

    window.addEventListener('message', messageHandler);

    // Fallback: check if popup is closed manually
    const timer = setInterval(() => {
      if (popup.closed) {
        // User closed popup manually - treat as success (they may have completed auth)
        handleSuccess();
      }
    }, pollInterval);
  });
}

/**
 * Opens an OAuth popup that reloads the page on success
 * Use for simple OAuth flows where you just need to refresh after auth
 */
export function openOAuthPopupWithReload(
  url: string,
  options: OAuthPopupOptions = {}
): Promise<void> {
  return openOAuthPopup(url, {
    ...options,
    successBehavior: { type: 'reload' },
  }).then(() => {});
}

/**
 * Opens an OAuth popup that resolves with data on success
 * Use when you need to get data back from the OAuth flow (like connection_id)
 */
export function openOAuthPopupWithData<T>(
  url: string,
  data: T,
  options: OAuthPopupOptions = {}
): Promise<T> {
  return openOAuthPopup<T>(url, {
    ...options,
    scrollable: true,
    successBehavior: { type: 'resolve', data },
  }).then((result) => result.data as T);
}

/**
 * Opens an OAuth popup with custom callbacks
 * Use for TikTok-style flows where you need resolve/reject control
 */
export function openOAuthPopupWithCallbacks(
  url: string,
  onSuccess: () => void,
  onError?: (error: string) => void,
  options: OAuthPopupOptions = {}
): Promise<void> {
  return openOAuthPopup(url, {
    ...options,
    successBehavior: { type: 'callback', onSuccess, onError },
  }).then(() => {});
}

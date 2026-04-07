import { API_CONFIG } from '@/config/env';
import type { AuthResponse, User } from '@/types/auth';

const TOKEN_KEY = 'orbitx_token';
const USER_KEY = 'orbitx_user';
const CSRF_COOKIE_NAME = 'orbitx_csrf';

class AuthService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_CONFIG.BASE_URL;
  }

  // CSRF token management
  private getCsrfToken(): string | null {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === CSRF_COOKIE_NAME) {
        return decodeURIComponent(value);
      }
    }
    return null;
  }

  // Token management (for backwards compatibility)
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  }

  removeToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  }

  // User management
  getStoredUser(): User | null {
    const userStr = localStorage.getItem(USER_KEY);
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  setStoredUser(user: User): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  removeStoredUser(): void {
    localStorage.removeItem(USER_KEY);
  }

  // Auth check - check both localStorage token and cookie-based auth
  isAuthenticated(): boolean {
    // Check localStorage token (backwards compatibility)
    if (this.getToken()) return true;
    // Check if we have a stored user (cookie-based auth)
    return !!this.getStoredUser();
  }

  // Google OAuth
  async googleAuth(credential: string): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/api/auth/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies
      body: JSON.stringify({ credential }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Google authentication failed' }));
      throw new Error(error.detail || 'Google authentication failed');
    }

    const result = await response.json();
    // Store token in localStorage for backwards compatibility
    this.setToken(result.access_token);
    this.setStoredUser(result.user);
    return result;
  }

  // Refresh access token using refresh token cookie
  async refreshToken(): Promise<AuthResponse | null> {
    try {
      const csrfToken = this.getCsrfToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      }

      const response = await fetch(`${this.baseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        // Refresh failed — only clear local state.
        // The caller (fetchClient) handles redirect to /login.
        this.clearLocalAuth();
        return null;
      }

      const result = await response.json();
      this.setToken(result.access_token);
      this.setStoredUser(result.user);
      return result;
    } catch {
      this.clearLocalAuth();
      return null;
    }
  }

  // Get current user
  async getCurrentUser(): Promise<User> {
    // First try with cookie-based auth
    let response = await fetch(`${this.baseUrl}/api/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies
    });

    // If cookie auth fails, try with localStorage token
    if (response.status === 401) {
      const token = this.getToken();
      if (token) {
        response = await fetch(`${this.baseUrl}/api/auth/me`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    }

    if (!response.ok) {
      if (response.status === 401) {
        // Try to refresh the token
        const refreshResult = await this.refreshToken();
        if (refreshResult) {
          return refreshResult.user;
        }
        throw new Error('Session expired');
      }
      throw new Error('Failed to get user');
    }

    const user = await response.json();
    this.setStoredUser(user);
    return user;
  }

  // Clear only local auth state (no server call).
  // Used when refresh fails — avoids triggering another network request.
  clearLocalAuth(): void {
    this.removeToken();
    this.removeStoredUser();
  }

  // Logout — clears server-side cookies + local state
  async logout(): Promise<void> {
    try {
      const csrfToken = this.getCsrfToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      }

      // Call logout endpoint to clear server-side cookies
      await fetch(`${this.baseUrl}/api/auth/logout`, {
        method: 'POST',
        headers,
        credentials: 'include',
      });
    } catch {
      // Ignore errors during logout
    }

    // Clear local storage
    this.removeToken();
    this.removeStoredUser();
  }

  // Get auth header for API calls (backwards compatibility + CSRF)
  getAuthHeader(): Record<string, string> {
    const headers: Record<string, string> = {};

    // Add token if available (backwards compatibility)
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Add CSRF token for state-changing requests
    const csrfToken = this.getCsrfToken();
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }

    return headers;
  }
}

export const authService = new AuthService();

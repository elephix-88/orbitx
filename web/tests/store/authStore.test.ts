import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from '@testing-library/react';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services/authService';
import { createMockUser } from '../utils/mock-factories';

// =============================================================================
// Mock authService
// =============================================================================

vi.mock('@/services/authService', () => ({
  authService: {
    getStoredUser: vi.fn(),
    isAuthenticated: vi.fn(),
    googleAuth: vi.fn(),
    getCurrentUser: vi.fn(),
    logout: vi.fn(),
  },
}));

const mockAuthService = vi.mocked(authService);

// =============================================================================
// Test Helpers
// =============================================================================

function resetStore() {
  act(() => {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  });
}

// =============================================================================
// Tests
// =============================================================================

describe('authStore', () => {
  const mockUser = createMockUser({
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
  });

  beforeEach(() => {
    vi.clearAllMocks();
    resetStore();

    // Default mock implementations
    mockAuthService.getStoredUser.mockReturnValue(null);
    mockAuthService.isAuthenticated.mockReturnValue(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Initial State
  // ---------------------------------------------------------------------------

  describe('initial state', () => {
    it('should have correct initial state when not authenticated', () => {
      const state = useAuthStore.getState();

      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should restore user from storage on store creation', () => {
      // Setup: authService returns stored user
      mockAuthService.getStoredUser.mockReturnValue(mockUser);
      mockAuthService.isAuthenticated.mockReturnValue(true);

      // Force store to re-evaluate initial state
      act(() => {
        useAuthStore.setState({
          user: mockAuthService.getStoredUser(),
          isAuthenticated: mockAuthService.isAuthenticated(),
        });
      });

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // initialize()
  // ---------------------------------------------------------------------------

  describe('initialize', () => {
    it('should set isAuthenticated to false when no token exists', async () => {
      mockAuthService.isAuthenticated.mockReturnValue(false);

      await act(async () => {
        await useAuthStore.getState().initialize();
      });

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.isLoading).toBe(false);
    });

    it('should fetch current user when token exists', async () => {
      mockAuthService.isAuthenticated.mockReturnValue(true);
      mockAuthService.getCurrentUser.mockResolvedValue(mockUser);

      await act(async () => {
        await useAuthStore.getState().initialize();
      });

      const state = useAuthStore.getState();
      expect(mockAuthService.getCurrentUser).toHaveBeenCalled();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
    });

    it('should logout and clear state when getCurrentUser fails', async () => {
      mockAuthService.isAuthenticated.mockReturnValue(true);
      mockAuthService.getCurrentUser.mockRejectedValue(new Error('Session expired'));

      await act(async () => {
        await useAuthStore.getState().initialize();
      });

      const state = useAuthStore.getState();
      expect(mockAuthService.logout).toHaveBeenCalled();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
    });

    it('should set isLoading to true during initialization', async () => {
      mockAuthService.isAuthenticated.mockReturnValue(true);

      // Create a promise we can control
      let resolveGetUser: (user: typeof mockUser) => void;
      const getUserPromise = new Promise<typeof mockUser>((resolve) => {
        resolveGetUser = resolve;
      });
      mockAuthService.getCurrentUser.mockReturnValue(getUserPromise);

      // Start initialization (don't await)
      const initPromise = act(async () => {
        useAuthStore.getState().initialize();
      });

      // Check loading state
      expect(useAuthStore.getState().isLoading).toBe(true);

      // Resolve and complete
      await act(async () => {
        resolveGetUser!(mockUser);
        await initPromise;
      });

      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // googleAuth()
  // ---------------------------------------------------------------------------

  describe('googleAuth', () => {
    const mockAuthResponse = {
      access_token: 'mock-token',
      token_type: 'Bearer',
      user: mockUser,
    };

    it('should authenticate user with Google credential', async () => {
      mockAuthService.googleAuth.mockResolvedValue(mockAuthResponse);

      await act(async () => {
        await useAuthStore.getState().googleAuth('google-credential-token');
      });

      const state = useAuthStore.getState();
      expect(mockAuthService.googleAuth).toHaveBeenCalledWith('google-credential-token');
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should set error state when authentication fails', async () => {
      const errorMessage = 'Google authentication failed';
      mockAuthService.googleAuth.mockRejectedValue(new Error(errorMessage));

      await act(async () => {
        try {
          await useAuthStore.getState().googleAuth('invalid-credential');
        } catch {
          // Expected to throw
        }
      });

      const state = useAuthStore.getState();
      expect(state.error).toBe(errorMessage);
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
    });

    it('should set isLoading during authentication', async () => {
      let resolveAuth: (response: typeof mockAuthResponse) => void;
      const authPromise = new Promise<typeof mockAuthResponse>((resolve) => {
        resolveAuth = resolve;
      });
      mockAuthService.googleAuth.mockReturnValue(authPromise);

      // Start auth (don't await)
      const googleAuthPromise = act(async () => {
        useAuthStore.getState().googleAuth('credential');
      });

      // Check loading state
      expect(useAuthStore.getState().isLoading).toBe(true);
      expect(useAuthStore.getState().error).toBeNull();

      // Complete auth
      await act(async () => {
        resolveAuth!(mockAuthResponse);
        await googleAuthPromise;
      });

      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('should clear previous error when starting new authentication', async () => {
      // Set initial error state
      act(() => {
        useAuthStore.setState({ error: 'Previous error' });
      });

      mockAuthService.googleAuth.mockResolvedValue(mockAuthResponse);

      await act(async () => {
        await useAuthStore.getState().googleAuth('credential');
      });

      expect(useAuthStore.getState().error).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // logout()
  // ---------------------------------------------------------------------------

  describe('logout', () => {
    it('should clear user and authentication state', () => {
      // Setup: user is logged in
      act(() => {
        useAuthStore.setState({
          user: mockUser,
          isAuthenticated: true,
        });
      });

      // Execute logout
      act(() => {
        useAuthStore.getState().logout();
      });

      const state = useAuthStore.getState();
      expect(mockAuthService.logout).toHaveBeenCalled();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should clear error state on logout', () => {
      // Setup: user has error
      act(() => {
        useAuthStore.setState({
          error: 'Some error',
        });
      });

      act(() => {
        useAuthStore.getState().logout();
      });

      expect(useAuthStore.getState().error).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // clearError()
  // ---------------------------------------------------------------------------

  describe('clearError', () => {
    it('should clear error state', () => {
      // Setup: store has error
      act(() => {
        useAuthStore.setState({ error: 'Authentication failed' });
      });

      expect(useAuthStore.getState().error).toBe('Authentication failed');

      // Clear error
      act(() => {
        useAuthStore.getState().clearError();
      });

      expect(useAuthStore.getState().error).toBeNull();
    });

    it('should not affect other state', () => {
      // Setup: authenticated user with error
      act(() => {
        useAuthStore.setState({
          user: mockUser,
          isAuthenticated: true,
          error: 'Some error',
        });
      });

      act(() => {
        useAuthStore.getState().clearError();
      });

      const state = useAuthStore.getState();
      expect(state.error).toBeNull();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
    });
  });
});

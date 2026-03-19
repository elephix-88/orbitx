import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { googleOAuthService } from '@/services/googleOAuthService';

vi.mock('@/config/env', () => ({
  API_CONFIG: {
    BASE_URL: 'http://localhost:8080',
    TIMEOUT: 1000,
    RETRY_ATTEMPTS: 0,
    RETRY_DELAY: 0,
    MAX_RETRY_DELAY: 0,
  },
}));

describe('GoogleOAuthService', () => {
  const mockFetch = vi.fn();
  const mockWindowOpen = vi.fn();
  const mockWindowReload = vi.fn();
  const mockPopup = {
    close: vi.fn(),
    closed: false,
  };

  beforeEach(() => {
    global.fetch = mockFetch;
    vi.spyOn(window, 'open').mockImplementation(mockWindowOpen);
    mockWindowOpen.mockReturnValue(mockPopup);
    
    Object.defineProperty(window, 'location', {
      value: {
        ...window.location,
        reload: mockWindowReload,
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should open popup and reload when closed', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({
        data: {
          oauth_url: 'http://google.com/oauth',
        },
      }),
    });

    const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

    googleOAuthService.connectWithPopup('google_ads', { connection_name: 'test' });
    
    await flushPromises();

    expect(mockWindowOpen).toHaveBeenCalledWith(
      'http://google.com/oauth',
      'GoogleOAuthPopup',
      expect.stringContaining('width=500')
    );

    // Simulate popup closed
    mockPopup.closed = true;
    
    // Wait for interval (500ms) + buffer
    await new Promise(resolve => setTimeout(resolve, 600));

    expect(mockWindowReload).toHaveBeenCalled();
  });
});

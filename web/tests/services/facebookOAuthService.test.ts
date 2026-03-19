import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { facebookOAuthService } from '@/services/facebookOAuthService';

vi.mock('@/config/env', () => ({
  API_CONFIG: {
    BASE_URL: 'http://localhost:8080',
    TIMEOUT: 1000,
    RETRY_ATTEMPTS: 0,
    RETRY_DELAY: 0,
    MAX_RETRY_DELAY: 0,
  },
}));

describe('FacebookOAuthService', () => {
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
    
    // Mock window.location.reload
    Object.defineProperty(window, 'location', {
      value: {
        ...window.location,
        reload: mockWindowReload,
        origin: 'http://localhost:3000',
      },
      writable: true,
    });

    mockWindowOpen.mockReturnValue(mockPopup);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should open popup after getting oauth url', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ data: { oauth_url: 'http://facebook.com/oauth' } }),
    });

    await facebookOAuthService.connectWithPopup('test_conn');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/facebook/login'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ connection_name: 'test_conn' }),
      })
    );

    expect(mockWindowOpen).toHaveBeenCalledWith(
      'http://facebook.com/oauth',
      'FacebookOAuthPopup',
      expect.stringContaining('width=600')
    );
  });

  it('should handle oauth_success message', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ data: { oauth_url: 'http://facebook.com/oauth' } }),
    });

    await facebookOAuthService.connectWithPopup('test_conn');

    // Simulate message event
    const messageEvent = new MessageEvent('message', {
      data: { type: 'oauth_success' },
      origin: 'http://localhost:3000',
    });
    window.dispatchEvent(messageEvent);

    expect(mockPopup.close).toHaveBeenCalled();
    expect(mockWindowReload).toHaveBeenCalled();
  });

  it('should handle popup closed manually', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ data: { oauth_url: 'http://facebook.com/oauth' } }),
    });

    await facebookOAuthService.connectWithPopup('test_conn');

    // Simulate popup closed
    mockPopup.closed = true;
    
    // Advance timer
    vi.advanceTimersByTime(1000);

    expect(mockWindowReload).toHaveBeenCalled();
  });
});

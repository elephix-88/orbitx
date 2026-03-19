import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { googleAdsService } from '@/services/googleAdsService';

vi.mock('@/config/env', () => ({
  API_CONFIG: {
    BASE_URL: 'http://localhost:8080',
    TIMEOUT: 1000,
    RETRY_ATTEMPTS: 0,
    RETRY_DELAY: 0,
    MAX_RETRY_DELAY: 0,
  },
}));

describe('GoogleAdsService', () => {
  const mockFetch = vi.fn();
  const mockWindowOpen = vi.fn();
  const mockPopup = {
    close: vi.fn(),
    closed: false,
  };

  beforeEach(() => {
    global.fetch = mockFetch;
    vi.spyOn(window, 'open').mockImplementation(mockWindowOpen);
    mockWindowOpen.mockReturnValue(mockPopup);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('connectWithPopup', () => {
    const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

    it('should resolve with connection_id on oauth_success', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({
          data: {
            oauth_url: 'http://google.com/oauth',
            connection_id: 'conn_123',
          },
        }),
      });

      const promise = googleAdsService.connectWithPopup('My Connection');

      await flushPromises();

      // Simulate message event
      const messageEvent = new MessageEvent('message', {
        data: { type: 'oauth_success' },
        origin: 'http://localhost:3000',
      });
      window.dispatchEvent(messageEvent);

      const result = await promise;

      expect(result).toEqual({ connection_id: 'conn_123' });
      expect(mockPopup.close).toHaveBeenCalled();
    });

    it('should reject on oauth_error', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({
          data: {
            oauth_url: 'http://google.com/oauth',
            connection_id: 'conn_123',
          },
        }),
      });

      const promise = googleAdsService.connectWithPopup('My Connection');

      await flushPromises();

      // Simulate error message
      const messageEvent = new MessageEvent('message', {
        data: { type: 'oauth_error', error: 'Access denied' },
        origin: 'http://localhost:3000',
      });
      window.dispatchEvent(messageEvent);

      await expect(promise).rejects.toThrow('Access denied');
      expect(mockPopup.close).toHaveBeenCalled();
    });

    it('should resolve when popup is closed manually', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({
          data: {
            oauth_url: 'http://google.com/oauth',
            connection_id: 'conn_123',
          },
        }),
      });

      const promise = googleAdsService.connectWithPopup('My Connection');

      await flushPromises();

      // Simulate popup closed
      mockPopup.closed = true;
      
      // Wait for interval (1000ms) + buffer
      await new Promise(resolve => setTimeout(resolve, 1100));

      const result = await promise;
      expect(result).toEqual({ connection_id: 'conn_123' });
    });
  });

  describe('getAccounts', () => {
    it('should fetch accounts', async () => {
      const mockAccounts = [{ id: '123', name: 'Account 1' }];
      mockFetch.mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: mockAccounts }),
      });

      const accounts = await googleAdsService.getAccounts('conn_123');
      expect(accounts).toEqual(mockAccounts);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/google/google_ads/accounts'),
        expect.any(Object)
      );
    });
  });

  describe('getFields', () => {
    it('should fetch fields', async () => {
      const mockFields = [{ field: 'campaign.id', display_name: 'Campaign ID' }];
      mockFetch.mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: mockFields }),
      });

      const fields = await googleAdsService.getFields();
      expect(fields).toEqual(mockFields);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/google/google_ads/fields'),
        expect.any(Object)
      );
    });
  });
});

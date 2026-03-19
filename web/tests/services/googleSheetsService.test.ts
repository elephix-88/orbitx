import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { googleSheetsService } from '@/services/googleSheetsService';

vi.mock('@/config/env', () => ({
  API_CONFIG: {
    BASE_URL: 'http://localhost:8080',
    TIMEOUT: 1000,
    RETRY_ATTEMPTS: 0,
    RETRY_DELAY: 0,
    MAX_RETRY_DELAY: 0,
  },
}));

describe('GoogleSheetsService', () => {
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

      const promise = googleSheetsService.connectWithPopup('My Connection');

      await flushPromises();

      const messageEvent = new MessageEvent('message', {
        data: { type: 'oauth_success' },
        origin: 'http://localhost:3000',
      });
      window.dispatchEvent(messageEvent);

      const result = await promise;
      expect(result).toEqual({ connection_id: 'conn_123' });
      expect(mockPopup.close).toHaveBeenCalled();
    });
  });

  describe('getSpreadsheets', () => {
    it('should fetch spreadsheets', async () => {
      const mockSpreadsheets = [{ id: '123', name: 'Sheet 1' }];
      mockFetch.mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: mockSpreadsheets }),
      });

      const result = await googleSheetsService.getSpreadsheets('conn_123');
      expect(result).toEqual(mockSpreadsheets);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/google/sheets/spreadsheets'),
        expect.any(Object)
      );
    });
  });

  describe('validateConnection', () => {
    it('should validate connection', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: { is_valid: true, message: 'Valid' } }),
      });

      const result = await googleSheetsService.validateConnection('conn_123');
      expect(result).toEqual({ is_valid: true, message: 'Valid' });
    });
  });
});

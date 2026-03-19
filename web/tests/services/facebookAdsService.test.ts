import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { facebookAdsService } from '@/services/facebookAdsService';

vi.mock('@/config/env', () => ({
  API_CONFIG: {
    BASE_URL: 'http://localhost:8080',
    TIMEOUT: 1000,
    RETRY_ATTEMPTS: 0,
    RETRY_DELAY: 0,
    MAX_RETRY_DELAY: 0,
  },
}));

describe('FacebookAdsService', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    global.fetch = mockFetch;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch Facebook Ads accounts successfully', async () => {
    const mockAccounts = [
      {
        id: 'act_123',
        name: 'Test Account',
        account_id: '123',
        account_status: 1,
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: {
        get: () => 'application/json',
      },
      json: async () => ({ data: mockAccounts }),
    });

    const accounts = await facebookAdsService.getAccounts('conn_123');

    expect(accounts).toEqual(mockAccounts);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/facebook/ads/accounts?connection_id=conn_123'),
      expect.any(Object)
    );
  });

  it('should handle API errors', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      headers: {
        get: () => 'application/json',
      },
      json: async () => ({ message: 'Internal Server Error' }),
    });

    await expect(facebookAdsService.getAccounts('conn_123')).rejects.toEqual(
      expect.objectContaining({
        message: 'Internal Server Error',
        status: 500,
      })
    );
  });
});

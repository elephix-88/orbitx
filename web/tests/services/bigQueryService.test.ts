import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { bigQueryService } from '@/services/bigQueryService';

vi.mock('@/config/env', () => ({
  API_CONFIG: {
    BASE_URL: 'http://localhost:8080',
    TIMEOUT: 1000,
    RETRY_ATTEMPTS: 0,
    RETRY_DELAY: 0,
    MAX_RETRY_DELAY: 0,
  },
}));

describe('BigQueryService', () => {
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

      const promise = bigQueryService.connectWithPopup('My Connection');

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

  describe('getProjects', () => {
    it('should fetch projects', async () => {
      const mockProjects = [{ project_id: 'p1', project_name: 'Project 1' }];
      mockFetch.mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: mockProjects }),
      });

      const result = await bigQueryService.getProjects('conn_123');
      expect(result).toEqual(mockProjects);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/google/bigquery/projects'),
        expect.any(Object)
      );
    });
  });

  describe('getDatasets', () => {
    it('should fetch datasets', async () => {
      const mockDatasets = [{ dataset_id: 'd1', location: 'US' }];
      mockFetch.mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: mockDatasets }),
      });

      const result = await bigQueryService.getDatasets('conn_123', 'p1');
      expect(result).toEqual(mockDatasets);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/google/bigquery/projects/p1/datasets'),
        expect.any(Object)
      );
    });
  });
});

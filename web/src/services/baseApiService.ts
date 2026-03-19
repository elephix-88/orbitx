/**
 * Base API Service with common error handling and retry logic
 * Uses fetchClient as the single source of truth for auth headers and 401 handling
 */
import { API_CONFIG } from '@/config/env';
import { fetchClient } from '@/lib/fetchClient';

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: unknown;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: ApiError;
  success?: boolean;
}

export interface RequestOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
}

export class BaseApiService {
  protected baseUrl: string;
  protected defaultTimeout: number;
  protected defaultRetries: number;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || API_CONFIG.BASE_URL;
    this.defaultTimeout = API_CONFIG.TIMEOUT || 30000;
    this.defaultRetries = API_CONFIG.RETRY_ATTEMPTS || 2;
  }

  /**
   * Make an API request with automatic retry and timeout
   * Auth headers and 401 handling are managed by fetchClient
   */
  protected async request<T>(
    endpoint: string,
    options: RequestOptions & RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const {
      timeout = this.defaultTimeout,
      retries = this.defaultRetries,
      retryDelay = API_CONFIG.RETRY_DELAY || 1000,
      ...fetchOptions
    } = options;

    let lastError: ApiError | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        // Use fetchClient - it handles auth headers and 401 redirects
        const response = await fetchClient(endpoint, {
          ...fetchOptions,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...fetchOptions.headers,
          },
          baseUrl: this.baseUrl,
        });

        clearTimeout(timeoutId);

        // Handle non-OK responses (401 already handled by fetchClient)
        if (!response.ok) {
          const errorData = await this.parseErrorResponse(response);
          
          // Don't retry client errors (4xx)
          if (response.status >= 400 && response.status < 500) {
            throw {
              message: errorData.message || `Request failed with status ${response.status}`,
              status: response.status,
              code: errorData.code,
              details: errorData.details,
            };
          }

          // Retry server errors (5xx)
          lastError = {
            message: errorData.message || `Server error: ${response.status}`,
            status: response.status,
            code: errorData.code,
            details: errorData.details,
          };
          
          if (attempt < retries) {
            await this.sleep(retryDelay * Math.pow(2, attempt));
            continue;
          }
          
          throw lastError;
        }

        const data = await this.parseSuccessResponse<T>(response);
        return { data, success: true };

      } catch (error) {
        if (error && typeof error === 'object' && 'status' in error) {
          lastError = error as ApiError;
        } else if (error instanceof Error) {
          if (error.name === 'AbortError') {
            lastError = { message: 'Request timeout', code: 'TIMEOUT' };
          } else {
            lastError = { message: error.message, code: 'NETWORK_ERROR' };
          }
        } else {
          lastError = { message: 'Unknown error occurred', code: 'UNKNOWN' };
        }

        if (error instanceof Error && error.name === 'AbortError') {
          throw lastError;
        }
        
        if (attempt < retries) {
          await this.sleep(retryDelay * Math.pow(2, attempt));
          continue;
        }

        throw lastError;
      }
    }

    throw lastError || { message: 'Request failed after retries', code: 'MAX_RETRIES' };
  }

  private async parseErrorResponse(response: Response): Promise<ApiError> {
    try {
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const json = await response.json();
        return {
          message: json.detail || json.message || json.error || 'Request failed',
          code: json.code,
          details: json,
        };
      }
      const text = await response.text();
      return { message: text || `HTTP ${response.status}` };
    } catch {
      return { message: `HTTP ${response.status}` };
    }
  }

  private async parseSuccessResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const json = await response.json();
      if (json.data !== undefined) return json.data as T;
      return json as T;
    }
    return (await response.text()) as unknown as T;
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  protected async get<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  protected async post<T>(
    endpoint: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  protected async put<T>(
    endpoint: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  protected async patch<T>(
    endpoint: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  protected async delete<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}


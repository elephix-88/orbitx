/**
 * Common API types and interfaces
 */

/**
 * Standard API error structure
 */
export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: unknown;
}

/**
 * Standard API response structure
 */
export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: ApiError;
  success?: boolean;
  total?: number;
  page?: number;
  limit?: number;
}

/**
 * Google OAuth response types
 */
export interface OAuthLoginResponse {
  oauth_url: string;
  connection_id: string;
  message: string;
}

export interface GoogleAccount {
  customer_id: string;
  name: string;
}

export interface GoogleSpreadsheet {
  id: string;
  name: string;
  url?: string;
}

/**
 * Connection types
 */
export interface Connection {
  id: string;
  connection_name: string;
  connection_type: string;
  status: 'active' | 'inactive' | 'error' | 'connected';
  created_at: string;
  updated_at: string;
  params: ConnectionParams;
}

export interface ConnectionParams {
  connection_id?: string;
  token_id?: string;
  ad_account_id?: string[];
  login_customer_id?: string;
  [key: string]: unknown;
}

/**
 * Request options
 */
export interface RequestOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
}

/**
 * Error codes
 */
// eslint-disable-next-line no-unused-vars
export enum ApiErrorCode {
  // eslint-disable-next-line no-unused-vars
  TIMEOUT = 'TIMEOUT',
  // eslint-disable-next-line no-unused-vars
  NETWORK_ERROR = 'NETWORK_ERROR',
  // eslint-disable-next-line no-unused-vars
  UNAUTHORIZED = 'UNAUTHORIZED',
  // eslint-disable-next-line no-unused-vars
  FORBIDDEN = 'FORBIDDEN',
  // eslint-disable-next-line no-unused-vars
  NOT_FOUND = 'NOT_FOUND',
  // eslint-disable-next-line no-unused-vars
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  // eslint-disable-next-line no-unused-vars
  SERVER_ERROR = 'SERVER_ERROR',
  // eslint-disable-next-line no-unused-vars
  UNKNOWN = 'UNKNOWN',
  // eslint-disable-next-line no-unused-vars
  MAX_RETRIES = 'MAX_RETRIES',
}


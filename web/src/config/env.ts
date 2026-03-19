// src/config/env.ts
const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = import.meta.env[key] || defaultValue;
  if (value === undefined) {
    throw new Error(`Environment variable ${key} is not defined`);
  }
  return value;
};

// API Configuration
export const API_CONFIG = {
  // Direct to FastAPI dev server (no /api prefix)
  BASE_URL: getEnvVar('VITE_API_BASE_URL', 'http://localhost:8080'),
  TIMEOUT: parseInt(getEnvVar('VITE_API_TIMEOUT', '30000')),
  RETRY_ATTEMPTS: parseInt(getEnvVar('VITE_API_RETRY_ATTEMPTS', '3')),
  RETRY_DELAY: parseInt(getEnvVar('VITE_API_RETRY_DELAY', '1000')), // ms
  MAX_RETRY_DELAY: parseInt(getEnvVar('VITE_API_MAX_RETRY_DELAY', '10000')), // ms
};

// Authentication Configuration
export const AUTH_CONFIG = {
  AUTH_URL: getEnvVar('VITE_AUTH_URL', 'http://localhost:8000/auth'),
  CLIENT_ID: getEnvVar('VITE_CLIENT_ID', 'development_client_id'),
  REDIRECT_URI: getEnvVar('VITE_REDIRECT_URI', 'http://localhost:5173/oauth/success'),
};

// Feature Flags
export const FEATURES = {
  ENABLE_TEMPLATES: getEnvVar('VITE_ENABLE_TEMPLATES', 'true') === 'true',
  ENABLE_VERSIONING: getEnvVar('VITE_ENABLE_VERSIONING', 'true') === 'true',
  ENABLE_MONITORING: getEnvVar('VITE_ENABLE_MONITORING', 'true') === 'true',
};

// Resource Limits
export const RESOURCE_LIMITS = {
  MAX_MEMORY: parseInt(getEnvVar('VITE_MAX_MEMORY', '4096')), // MB
  MAX_CPU_CORES: parseInt(getEnvVar('VITE_MAX_CPU_CORES', '4')),
  MAX_TIMEOUT: parseInt(getEnvVar('VITE_MAX_TIMEOUT', '3600')), // seconds
};

// Monitoring Configuration
export const MONITORING_CONFIG = {
  METRICS_INTERVAL: parseInt(getEnvVar('VITE_METRICS_INTERVAL', '60000')), // ms
  LOG_LEVEL: getEnvVar('VITE_LOG_LEVEL', 'info'),
};

// UI Configuration
export const UI_CONFIG = {
  THEME: getEnvVar('VITE_THEME', 'light'),
  DATE_FORMAT: getEnvVar('VITE_DATE_FORMAT', 'YYYY-MM-DD HH:mm:ss'),
  ITEMS_PER_PAGE: parseInt(getEnvVar('VITE_ITEMS_PER_PAGE', '10')),
};

// Validation Rules
export const VALIDATION_RULES = {
  MIN_NAME_LENGTH: parseInt(getEnvVar('VITE_MIN_NAME_LENGTH', '3')),
  MAX_NAME_LENGTH: parseInt(getEnvVar('VITE_MAX_NAME_LENGTH', '50')),
  MAX_NODES: parseInt(getEnvVar('VITE_MAX_NODES', '100')),
};

// Environment Information
export const ENV_INFO = {
  NODE_ENV: getEnvVar('NODE_ENV', 'development'),
  APP_VERSION: getEnvVar('VITE_APP_VERSION', '0.1.0'),
  BUILD_TIME: getEnvVar('VITE_BUILD_TIME', new Date().toISOString()),
};

// Export legacy API_BASE_URL for backward compatibility
export const API_BASE_URL = API_CONFIG.BASE_URL;
const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = import.meta.env[key] || defaultValue;
  if (value === undefined) {
    throw new Error(`Environment variable ${key} is not defined`);
  }
  return value;
};

export const API_CONFIG = {
  BASE_URL: getEnvVar('VITE_API_BASE_URL', 'http://localhost:8080'),
  TIMEOUT: 10_000,
  RETRY_ATTEMPTS: 1,
  RETRY_DELAY: 500,
  MAX_RETRY_DELAY: 2_000,
};

export const AUTH_CONFIG = {
  GOOGLE_CLIENT_ID: getEnvVar('VITE_GOOGLE_CLIENT_ID', ''),
};

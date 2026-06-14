import { Platform } from 'react-native';

// Valet runs locally on port 80 (HTTP) and 443 (HTTPS)
export const API_BASE_URL =
  Platform.OS === 'android' ? 'https://10.0.2.2/api' : 'https://notify-me.au/api';

/**
 * Returns request headers with correct Host header for Android emulator matching Valet domain.
 */
export const getApiHeaders = (extraHeaders: Record<string, string> = {}) => {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(Platform.OS === 'android' && API_BASE_URL.includes('10.0.2.2')
      ? { Host: 'notify-me.au' }
      : {}),
    ...extraHeaders,
  };
};

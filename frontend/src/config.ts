import Constants from 'expo-constants';
import { Platform } from 'react-native';

const fromExtra = Constants.expoConfig?.extra?.apiBaseUrl as string | undefined;

// On web, derive the gateway URL from whatever host the page itself was
// loaded from (localhost on a dev machine, a LAN IP when opened from a
// phone) rather than hardcoding one — the same build then works from
// either without editing config per-device.
function deriveWebApiBaseUrl(): string | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  return `${window.location.protocol}//${window.location.hostname}:8080`;
}

export const API_BASE_URL = deriveWebApiBaseUrl() ?? fromExtra ?? 'http://localhost:8080';

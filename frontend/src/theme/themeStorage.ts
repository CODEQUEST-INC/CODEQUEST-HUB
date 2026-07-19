import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const MODE_KEY = 'codequesthub.theme.mode';

// Mirrors src/auth/tokenStorage.ts — expo-secure-store has no web support,
// so fall back to localStorage there.
const webStorage = {
  get: async () => window.localStorage.getItem(MODE_KEY),
  set: async (mode: string) => window.localStorage.setItem(MODE_KEY, mode),
};

const nativeStorage = {
  get: () => SecureStore.getItemAsync(MODE_KEY),
  set: (mode: string) => SecureStore.setItemAsync(MODE_KEY, mode),
};

export const themeStorage = Platform.OS === 'web' ? webStorage : nativeStorage;

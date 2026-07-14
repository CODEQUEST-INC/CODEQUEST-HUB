import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'codequesthub.auth.token';

// expo-secure-store only supports iOS/Android; fall back to localStorage on
// web so `expo start --web` is usable for dev/testing.
const webStorage = {
  get: async () => window.localStorage.getItem(TOKEN_KEY),
  set: async (token: string) => window.localStorage.setItem(TOKEN_KEY, token),
  clear: async () => window.localStorage.removeItem(TOKEN_KEY),
};

const nativeStorage = {
  get: () => SecureStore.getItemAsync(TOKEN_KEY),
  set: (token: string) => SecureStore.setItemAsync(TOKEN_KEY, token),
  clear: () => SecureStore.deleteItemAsync(TOKEN_KEY),
};

export const tokenStorage = Platform.OS === 'web' ? webStorage : nativeStorage;

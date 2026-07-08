import Constants from 'expo-constants';

const fromExtra = Constants.expoConfig?.extra?.apiBaseUrl as string | undefined;

export const API_BASE_URL = fromExtra ?? 'http://localhost:8080';

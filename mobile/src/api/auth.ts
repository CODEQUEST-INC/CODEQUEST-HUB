import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// In Expo Go on a physical device, 10.0.2.2 won't work. You'll need to use your machine's local IP address.
// e.g., 'http://192.168.1.100'
// You can set this via an EXPO_PUBLIC_API_URL env variable in the future.
const getBaseUrl = (port: number) => {
  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${port}`; // Android Emulator
  }
  return `http://localhost:${port}`; // iOS Simulator
};

const authApi = axios.create({
  baseURL: `${getBaseUrl(4001)}/api/auth`,
});

// Interceptor to add JWT token to requests if needed
authApi.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('jwt_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default authApi;

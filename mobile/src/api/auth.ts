import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Hardcoded IP for Expo Go on physical device
const API_URL = 'http://10.132.1.216:4001/api/auth';

const authApi = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

authApi.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('jwt_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default authApi;

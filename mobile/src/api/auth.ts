import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Hardcoded IP for Expo Go on physical device
const API_URL = 'http://172.20.10.14:4001/api/auth';

const authApi = axios.create({
  baseURL: API_URL,
});

authApi.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('jwt_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default authApi;

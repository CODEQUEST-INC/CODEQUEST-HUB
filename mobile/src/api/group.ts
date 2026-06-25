import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Hardcoded IP for Expo Go on physical device
const API_URL = 'http://10.132.1.216:4002/api/groups';

const groupApi = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

groupApi.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('jwt_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default groupApi;

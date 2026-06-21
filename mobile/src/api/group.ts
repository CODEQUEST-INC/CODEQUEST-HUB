import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const getBaseUrl = (port: number) => {
  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${port}`; // Android Emulator
  }
  return `http://localhost:${port}`; // iOS Simulator
};

const groupApi = axios.create({
  baseURL: `${getBaseUrl(4002)}/api/group`,
});

// Interceptor to add JWT token to every request
groupApi.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('jwt_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default groupApi;

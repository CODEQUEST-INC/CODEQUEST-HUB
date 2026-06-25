import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Hardcoded IP for Expo Go on physical device (matches auth and group APIs)
const API_URL = 'http://10.132.1.216:4003/api/projects';

const projectApi = axios.create({
  baseURL: API_URL
});

projectApi.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default projectApi;

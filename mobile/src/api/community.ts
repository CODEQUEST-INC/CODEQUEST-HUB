import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 4003 is the project-service which handles community endpoints
const API_URL = 'http://10.132.1.216:4003/api/community';

const communityApi = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

communityApi.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('jwt_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default communityApi;

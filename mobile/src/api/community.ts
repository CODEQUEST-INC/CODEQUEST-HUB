import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 4003 is the project-service which handles community endpoints
const API_URL = 'http://172.20.10.14:4003/api/community';

const communityApi = axios.create({
  baseURL: API_URL,
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

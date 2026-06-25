import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// In Expo Go, physical device IP must be used instead of localhost
// 4003 is the project-service which now handles tasks
const API_URL = 'http://10.132.1.216:4003/api/tasks';

const taskApi = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

taskApi.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('jwt_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default taskApi;

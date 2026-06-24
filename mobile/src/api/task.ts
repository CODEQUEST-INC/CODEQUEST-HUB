import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// In Expo Go, physical device IP must be used instead of localhost
// 4003 is the project-service which now handles tasks
const API_URL = 'http://172.20.10.14:4003/api/tasks';

const taskApi = axios.create({
  baseURL: API_URL,
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

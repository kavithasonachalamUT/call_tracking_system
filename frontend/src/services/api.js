import axios from 'axios';
import { storage } from '../utils/storage';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request Interceptor: Attach JWT Bearer Token if available
apiClient.interceptors.request.use(
  (config) => {
    const token = storage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle 401s and format error messages
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // 401 Unauthorized: Session expired or invalid token
      if (error.response.status === 401) {
        // Clear stored token
        storage.clearAuth();
        // Dispatch custom event for app-level state handling
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      }

      // Extract user-friendly error message from backend
      const data = error.response.data;
      let message = 'An unexpected error occurred. Please try again.';

      if (data && typeof data === 'object') {
        if (typeof data.detail === 'string') {
          message = data.detail;
        } else if (Array.isArray(data.detail)) {
          // Pydantic validation error format
          message = data.detail.map((err) => `${err.loc ? err.loc.join('.') + ': ' : ''}${err.msg}`).join(', ');
        } else if (data.message) {
          message = data.message;
        }
      }

      return Promise.reject({
        status: error.response.status,
        message,
        data: error.response.data,
      });
    } else if (error.request) {
      // Network error or backend unreachable
      return Promise.reject({
        status: 0,
        message: 'Unable to connect to the backend server. Please ensure the API is running.',
      });
    } else {
      return Promise.reject({
        status: -1,
        message: error.message || 'An unknown error occurred.',
      });
    }
  }
);

export default apiClient;

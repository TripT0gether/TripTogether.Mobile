/**
 * apiConfig.ts
 * 
 * Centralized Axios HTTP client configuration with JWT authentication and automatic token refresh.
 * Implements request/response interceptors for seamless authentication and error handling.
 * 
 * Key Features:
 * - Platform-aware API base URL configuration (Android emulator, iOS simulator, physical device)
 * - Automatic JWT token injection into request headers
 * - Automatic token refresh on 401 (Unauthorized) responses
 * - Request queueing during token refresh to prevent race conditions
 * - Type-safe HTTP methods (GET, POST, PUT, PATCH, DELETE)
 * - Configurable base URL for dev/production environments
 * 
 * Architecture:
 * - Singleton ApiService class exported as `apiService`
 * - Request interceptor: Adds Bearer token to Authorization header
 * - Response interceptor: Handles 401 errors with automatic token refresh
 * - Failed requests queued and retried after successful token refresh
 * 
 * Token Refresh Flow:
 * 1. API returns 401 → Check if refresh is already in progress
 * 2. If yes → Queue request for retry after refresh completes
 * 3. If no → Mark refresh as in-progress, call /auth/refresh-token
 * 4. On success → Save new tokens, process queued requests
 * 5. On failure → Clear tokens, reject all queued requests
 * 
 * Platform URLs:
 * - Android Emulator: http://10.0.2.2:5000/api (routes to host machine)
 * - iOS Simulator/Physical Device: http://192.168.1.16:5000/api (local network IP)
 * - Production: https://your-api-domain.com/api
 * 
 * Used by: All service files for API communication
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { tokenStorage } from './tokenStorage';
import { Platform } from 'react-native';

const getDevApiUrl = () => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000/api';
  }
  return 'http://192.168.1.16:5000/api';
};

const API_BASE_URL = __DEV__
  ? getDevApiUrl()
  : 'https://your-api-domain.com/api';

console.log('API Configuration:', {
  platform: Platform.OS,
  isDev: __DEV__,
  baseUrl: API_BASE_URL,
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        const token = await tokenStorage.getAccessToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error: AxiosError) => {
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & {
          _retry?: boolean;
        };

        if (error.response?.status === 401 && !originalRequest._retry) {
          if (isRefreshing) {
            return new Promise((resolve, reject) => {
              failedQueue.push({ resolve, reject });
            })
              .then((token) => {
                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${token}`;
                }
                return this.client(originalRequest);
              })
              .catch((err) => {
                return Promise.reject(err);
              });
          }

          originalRequest._retry = true;
          isRefreshing = true;

          try {
            const refreshToken = await tokenStorage.getRefreshToken();

            if (!refreshToken) {
              throw new Error('No refresh token available');
            }

            const { data } = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
              refreshToken,
            });

            if (!data.isSuccess || !data.value?.data) {
              throw new Error(data.error || 'Token refresh failed');
            }

            const { accessToken, refreshToken: newRefreshToken } = data.value.data;

            await tokenStorage.saveTokens(accessToken, newRefreshToken);

            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            }

            processQueue(null, accessToken);

            return this.client(originalRequest);
          } catch (refreshError) {
            processQueue(refreshError as AxiosError, null);

            await tokenStorage.clearTokens();

            return Promise.reject(refreshError);
          } finally {
            isRefreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.get(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.post(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.put(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.patch(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.delete(url, config);
    return response.data;
  }

  setBaseURL(url: string): void {
    this.client.defaults.baseURL = url;
  }

  getBaseURL(): string {
    return this.client.defaults.baseURL || API_BASE_URL;
  }
}

export const apiService = new ApiService();

import { apiService } from './apiConfig';
import { tokenStorage } from './tokenStorage';

/**
 * Authentication Service - call API auth
 */

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

export const authService = {
  /**
   * Login user with email and password
   */
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await apiService.post<AuthResponse>(
      '/auth/login',
      credentials
    );

    await tokenStorage.saveTokens(response.accessToken, response.refreshToken);
    return response;
  },

  /**
   * Register new user
   */
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await apiService.post<AuthResponse>(
      '/auth/register',
      data
    );

    await tokenStorage.saveTokens(response.accessToken, response.refreshToken);
    return response;
  },

  /**
   * Logout user - clear tokens and notify backend
   */
  async logout(): Promise<void> {
    try {
      await apiService.post('/auth/logout');
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      await tokenStorage.clearTokens();
    }
  },

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<AuthResponse['user']> {
    return await apiService.get<AuthResponse['user']>('/auth/me');
  },

  /**
   * Check if user is authenticated (has valid tokens)
   */
  async isAuthenticated(): Promise<boolean> {
    return await tokenStorage.hasTokens();
  },
};


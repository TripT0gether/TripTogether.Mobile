import { apiService } from './apiConfig';
import { tokenStorage } from './tokenStorage';
import { ApiResponse } from '../types/api.types';
import {
  User,
  AuthTokens,
  RegisterRequest,
  VerifyOtpRequest,
  LoginRequest,
} from '../types/auth.types';

export const authService = {
  /**
   * Register a new user
   * POST /api/auth/register
   */
  async register(data: RegisterRequest): Promise<User> {
    const response = await apiService.post<ApiResponse<User>>(
      '/auth/register',
      data
    );

    if (!response.isSuccess || !response.value?.data) {
      throw new Error(response.error || 'Registration failed');
    }

    return response.value.data;
  },

  /**
   * Verify OTP for email confirmation
   * POST /api/auth/verify-otp
   */
  async verifyOtp(data: VerifyOtpRequest): Promise<string> {
    const response = await apiService.post<ApiResponse<void>>(
      '/auth/verify-otp',
      data
    );

    if (!response.isSuccess || !response.value) {
      throw new Error(response.error || 'OTP verification failed');
    }

    return response.value.message;
  },

  /**
   * Login user with email and password
   * POST /api/auth/login
   */
  async login(credentials: LoginRequest): Promise<AuthTokens> {
    const response = await apiService.post<ApiResponse<AuthTokens>>(
      '/auth/login',
      credentials
    );

    if (!response.isSuccess || !response.value?.data) {
      throw new Error(response.error || 'Login failed');
    }

    const tokens = response.value.data;

    // Store tokens securely
    await tokenStorage.saveTokens(tokens.accessToken, tokens.refreshToken);

    return tokens;
  },

  /**
   * Logout user - clear tokens and notify backend
   * POST /api/auth/logout
   */
  async logout(): Promise<void> {
    try {
      const response = await apiService.post<ApiResponse<boolean>>('/auth/logout');

      if (!response.isSuccess) {
        console.error('Logout API call failed:', response.error);
      }
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      await tokenStorage.clearTokens();
    }
  },

  /**
   * Get current authenticated user
   * GET /api/auth/me
   */
  async getCurrentUser(): Promise<User> {
    const response = await apiService.get<ApiResponse<User>>('/auth/me');

    if (!response.isSuccess || !response.value?.data) {
      throw new Error(response.error || 'Failed to get user');
    }

    return response.value.data;
  },

  /**
   * Check if user is authenticated (has valid tokens)
   */
  async isAuthenticated(): Promise<boolean> {
    return await tokenStorage.hasTokens();
  },

  /**
   * Re-send OTP for email verification
   * POST /api/auth/resend-otp
   */
  async resendOtp(email: string): Promise<string> {
    const response = await apiService.post<ApiResponse<void>>(
      '/auth/resend-otp',
      { email }
    );

    if (!response.isSuccess || !response.value) {
      throw new Error(response.error || 'Failed to resend OTP');
    }

    return response.value.message;
  },
};



/**
 * authService.ts
 * 
 * Handles authentication workflows including registration, login, and session management.
 * Implements JWT-based authentication with automatic token storage and refresh capability.
 * 
 * Key Features:
 * - User registration with email/password and OTP verification flow
 * - Email-based login with JWT token issuance
 * - Automatic secure token storage using expo-secure-store
 * - Logout with backend notification and local token cleanup
 * - User authentication status checking
 * - OTP resend functionality for email verification
 * 
 * API Endpoints:
 * - POST /api/auth/register - Register new user account
 * - POST /api/auth/verify-otp - Verify email with OTP code
 * - POST /api/auth/login - Authenticate and receive tokens
 * - POST /api/auth/logout - Invalidate session and clear tokens
 * - GET /api/auth/me - Get current authenticated user
 * - POST /api/auth/resend-otp - Resend verification OTP
 * 
 * Authentication Flow:
 * 1. Register → Receive OTP via email
 * 2. Verify OTP → Email confirmed
 * 3. Login → Receive access + refresh tokens (auto-stored)
 * 4. Use access token for API calls (handled by apiConfig)
 * 5. Logout → Clear tokens and notify backend
 * 
 * Token Management:
 * - Tokens automatically stored in secure storage on login
 * - Access token added to requests via apiConfig interceptor
 * - Refresh handled automatically by apiConfig on 401 responses
 * 
 * Used by: Authentication screens, AuthContext, protected route guards
 */

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

  async login(credentials: LoginRequest): Promise<AuthTokens> {
    const response = await apiService.post<ApiResponse<AuthTokens>>(
      '/auth/login',
      credentials
    );

    if (!response.isSuccess || !response.value?.data) {
      throw new Error(response.error || 'Login failed');
    }

    const tokens = response.value.data;

    await tokenStorage.saveTokens(tokens.accessToken, tokens.refreshToken);

    return tokens;
  },

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

  async getCurrentUser(): Promise<User> {
    const response = await apiService.get<ApiResponse<User>>('/auth/me');

    if (!response.isSuccess || !response.value?.data) {
      throw new Error(response.error || 'Failed to get user');
    }

    return response.value.data;
  },

  async isAuthenticated(): Promise<boolean> {
    return await tokenStorage.hasTokens();
  },

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

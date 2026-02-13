/**
 * auth.types.ts
 * 
 * Type definitions for authentication and user registration workflows.
 * Covers the complete authentication lifecycle from registration through token refresh.
 * 
 * Purpose:
 * - Define request payloads for all authentication endpoints
 * - Re-export User and AuthTokens from user.types for convenience
 * - Support email-based registration with OTP verification
 * - Enable JWT token-based authentication with refresh capability
 * 
 * Key Exports:
 * - RegisterRequest: New user registration payload (email, password, username, gender)
 * - VerifyOtpRequest: Email verification payload after registration
 * - LoginRequest: User login credentials (email, password)
 * - RefreshTokenRequest: Token refresh payload
 * - User: Complete user profile (re-exported from user.types)
 * - AuthTokens: JWT access and refresh tokens (re-exported from user.types)
 * 
 * Authentication Flow:
 * 1. Register → VerifyOtp → Login → Receive tokens
 * 2. Use accessToken for authenticated requests
 * 3. Refresh accessToken using refreshToken when expired
 * 
 * Used by: authService, authentication screens, AuthContext
 */

import { User, AuthTokens } from './user.types';
export { User, AuthTokens };

export interface RegisterRequest {
    email: string;
    password: string;
    username: string;
    gender: boolean;
}

export interface VerifyOtpRequest {
    email: string;
    otp: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RefreshTokenRequest {
    refreshToken: string;
}

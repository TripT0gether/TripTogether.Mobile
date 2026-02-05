import { User, AuthTokens } from './user.types';
export { User, AuthTokens };
// ============= Request Types =============

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

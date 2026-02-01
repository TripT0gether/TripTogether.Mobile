/**
 * User related types
 */

export interface User {
    id: string;
    username: string;
    email: string;
    avatarUrl: string | null;
    gender: boolean;
    paymentQrCodeUrl: string | null;
    isEmailVerified: boolean;
    createdAt: string;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

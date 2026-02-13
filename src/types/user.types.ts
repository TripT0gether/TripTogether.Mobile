/**
 * user.types.ts
 * 
 * Core user data structures for identity and authentication state.
 * Represents the authenticated user profile and JWT token pair.
 * 
 * Purpose:
 * - Define the complete user profile structure returned from backend
 * - Provide JWT authentication token pair structure
 * - Support user identity across the entire application
 * 
 * Key Exports:
 * - User: Complete user profile with verification status and payment info
 * - AuthTokens: JWT access and refresh token pair for authentication
 * 
 * User Fields:
 * - id: Unique user identifier (UUID)
 * - username: Display name
 * - email: User's email address
 * - avatarUrl: Profile picture URL (nullable)
 * - gender: Boolean gender field (true/false)
 * - paymentQrCodeUrl: QR code for expense settlement (nullable)
 * - isEmailVerified: Email verification status
 * - createdAt: Account creation timestamp (ISO 8601)
 * 
 * Token Management:
 * - accessToken: Short-lived token for API authentication
 * - refreshToken: Long-lived token for obtaining new access tokens
 * 
 * Used by: AuthContext, authService, all authenticated screens and components
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

/**
 * tokenStorage.ts
 * 
 * Secure JWT token storage using Expo SecureStore for encrypted persistence.
 * Provides abstraction layer for storing, retrieving, and managing authentication tokens.
 * 
 * Purpose:
 * - Securely store JWT access and refresh tokens in device's secure storage
 * - Abstract away SecureStore implementation details from services
 * - Enable token-based authentication state management
 * - Support logout and token cleanup operations
 * 
 * Key Exports:
 * - saveTokens: Store access and refresh token pair
 * - getAccessToken: Retrieve current access token
 * - getRefreshToken: Retrieve current refresh token
 * - clearTokens: Remove all tokens (logout)
 * - hasTokens: Check if user has stored tokens (authentication check)
 * 
 * Security:
 * - Uses expo-secure-store for encrypted storage on device
 * - Tokens encrypted at rest on both iOS (Keychain) and Android (Keystore)
 * - No tokens exposed in plaintext in app memory
 * 
 * Token Lifecycle:
 * - Saved on successful login (authService.login)
 * - Accessed by apiConfig interceptor for request authentication
 * - Refreshed automatically by apiConfig on 401 responses
 * - Cleared on logout or refresh failure
 * 
 * Used by: authService, apiConfig interceptors, authentication guards
 */

import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

export const tokenStorage = {
    async saveTokens(accessToken: string, refreshToken: string): Promise<void> {
        await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    },

    async getAccessToken(): Promise<string | null> {
        return await SecureStore.getItemAsync(TOKEN_KEY);
    },

    async getRefreshToken(): Promise<string | null> {
        return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    },

    async clearTokens(): Promise<void> {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    },

    async hasTokens(): Promise<boolean> {
        const accessToken = await SecureStore.getItemAsync(TOKEN_KEY);
        return !!accessToken;
    },
};

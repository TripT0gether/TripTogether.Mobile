import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

/**
 * Using expo-secure-store to store jwt tokens
 * Tokens được encrypt và lưu trữ an toàn trên thiết bị
 */
export const tokenStorage = {
    /**
     * Save both access and refresh tokens
     */
    async saveTokens(accessToken: string, refreshToken: string): Promise<void> {
        await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    },

    /**
     * Get the access token
     */
    async getAccessToken(): Promise<string | null> {
        return await SecureStore.getItemAsync(TOKEN_KEY);
    },

    /**
     * Get the refresh token
     */
    async getRefreshToken(): Promise<string | null> {
        return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    },

    /**
     * Clear all tokens (used on logout)
     */
    async clearTokens(): Promise<void> {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    },

    /**
     * Check if user has tokens (is potentially authenticated)
     */
    async hasTokens(): Promise<boolean> {
        const accessToken = await SecureStore.getItemAsync(TOKEN_KEY);
        return !!accessToken;
    },
};

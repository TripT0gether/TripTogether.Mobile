/**
 * userService.ts
 * 
 * Manages user profile operations and account management.
 * Provides access to current user data and profile update functionality.
 * 
 * Key Features:
 * - Fetch current authenticated user's profile
 * - Update user profile information (username, avatar, payment QR, etc.)
 * - Delete user account (soft delete)
 * 
 * API Endpoints:
 * - GET /api/account/me - Retrieve current user profile
 * - PUT /api/account/me - Update profile information
 * - DELETE /api/account/me - Soft delete user account
 * 
 * Data Management:
 * - User profile includes identity, verification status, and payment info
 * - Partial updates supported (only send changed fields)
 * - Account deletion is soft delete (data retained for recovery)
 * 
 * Used by: Profile screen, settings, account management, user context
 */

import { apiService } from './apiConfig';
import { ApiResponse } from '../types/api.types';
import { User } from '../types/user.types';

export const userService = {
    async getCurrentUser(): Promise<User> {
        const response = await apiService.get<ApiResponse<User>>('/account/me');

        if (!response.isSuccess || !response.value?.data) {
            throw new Error(response.error || 'Failed to fetch user profile');
        }

        return response.value.data;
    },

    async updateProfile(data: Partial<User>): Promise<User> {
        const response = await apiService.put<ApiResponse<User>>('/account/me', data);

        if (!response.isSuccess || !response.value?.data) {
            throw new Error(response.error || 'Failed to update profile');
        }

        return response.value.data;
    },

    async deleteAccount(): Promise<boolean> {
        const response = await apiService.delete<ApiResponse<boolean>>('/account/me');

        if (!response.isSuccess || !response.value?.data) {
            throw new Error(response.error || 'Failed to delete account');
        }

        return response.value.data;
    },
};

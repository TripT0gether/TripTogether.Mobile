import { apiService } from './apiConfig';
import { ApiResponse } from '../types/api.types';
import { User } from '../types/user.types';

export const userService = {
    /**
     * Get current user profile
     * GET /api/account/me
     */
    async getCurrentUser(): Promise<User> {
        const response = await apiService.get<ApiResponse<User>>('/account/me');

        if (!response.isSuccess || !response.value?.data) {
            throw new Error(response.error || 'Failed to fetch user profile');
        }

        return response.value.data;
    },

    /**
     * Update user profile
     * PUT /api/account/me
     */
    async updateProfile(data: Partial<User>): Promise<User> {
        const response = await apiService.put<ApiResponse<User>>('/account/me', data);

        if (!response.isSuccess || !response.value?.data) {
            throw new Error(response.error || 'Failed to update profile');
        }

        return response.value.data;
    },
};

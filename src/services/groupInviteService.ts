/**
 * groupInviteService.ts
 *
 * Handles group invite link operations for the TripTogether platform.
 * Enables sharing group invite links and joining groups via token.
 *
 * Key Features:
 * - Retrieve the currently active invite link for a group
 * - Join a group using a shared invite token
 *
 * API Endpoints:
 * - GET  /api/group-invites/group/{groupId}/active - Get active group invite
 * - POST /api/group-invites/join                   - Join group by token
 *
 * Used by: Group dashboard invite flow, deep link join handling
 */

import { apiService } from './apiConfig';
import { ApiResponse } from '../types/api.types';
import { Group } from '../types/group.types';
import { GroupInvite } from '../types/groupInvite.types';

export const groupInviteService = {
    async getActiveInvite(groupId: string): Promise<GroupInvite> {
        const response = await apiService.get<ApiResponse<GroupInvite>>(
            `/group-invites/group/${groupId}/active`
        );

        if (!response.isSuccess || !response.value?.data) {
            throw new Error(response.error || 'Failed to get active invite');
        }

        return response.value.data;
    },

    async joinGroupByToken(token: string): Promise<Group> {
        const queryParams = new URLSearchParams({ token });
        const url = `/group-invites/join?${queryParams.toString()}`;

        const response = await apiService.post<ApiResponse<Group>>(url);

        if (!response.isSuccess || !response.value?.data) {
            throw new Error(response.error || 'Failed to join group');
        }

        return response.value.data;
    },
};

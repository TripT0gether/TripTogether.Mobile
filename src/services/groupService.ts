/**
 * groupService.ts
 * 
 * Handles all group management operations for collaborative trip planning.
 * Enables users to create, update, delete, and discover groups with full CRUD functionality.
 * 
 * Key Features:
 * - Create new travel groups with custom names and cover photos
 * - Fetch detailed group information including all members
 * - Update group metadata (leader-only operation)
 * - Delete groups (leader-only operation)
 * - Retrieve user's groups with pagination, search, and sorting
 * 
 * API Endpoints:
 * - POST /api/groups - Create a new group
 * - GET /api/groups/{groupId} - Get group details with members
 * - PUT /api/groups/{groupId} - Update group information
 * - DELETE /api/groups/{groupId} - Delete a group
 * - GET /api/groups/my-groups - Get current user's groups (paginated)
 * 
 * Permission Model:
 * - Leader: Full permissions (create, update, delete, manage members)
 * - Member: Read-only for group settings, can leave group
 * 
 * Used by: Group screens, group discovery, dashboard, trip management
 */

import { apiService } from './apiConfig';
import { ApiResponse } from '../types/api.types';
import {
    CreateGroupRequest,
    UpdateGroupRequest,
    GetMyGroupsParams,
    Group,
    GroupDetail,
    PaginatedGroupsResponse,
} from '../types/group.types';

export const groupService = {
    async createGroup(data: CreateGroupRequest): Promise<Group> {
        const response = await apiService.post<ApiResponse<Group>>(
            '/groups',
            data
        );

        if (!response.isSuccess || !response.value?.data) {
            throw new Error(response.error || 'Failed to create group');
        }

        return response.value.data;
    },

    async getGroupDetail(groupId: string): Promise<GroupDetail> {
        const response = await apiService.get<ApiResponse<GroupDetail>>(
            `/groups/${groupId}`
        );

        if (!response.isSuccess || !response.value?.data) {
            throw new Error(response.error || 'Failed to get group details');
        }

        return response.value.data;
    },

    async updateGroup(groupId: string, data: UpdateGroupRequest): Promise<Group> {
        const response = await apiService.put<ApiResponse<Group>>(
            `/groups/${groupId}`,
            data
        );

        if (!response.isSuccess || !response.value?.data) {
            throw new Error(response.error || 'Failed to update group');
        }

        return response.value.data;
    },

    async deleteGroup(groupId: string): Promise<boolean> {
        const response = await apiService.delete<ApiResponse<boolean>>(
            `/groups/${groupId}`
        );

        if (!response.isSuccess || !response.value?.data) {
            throw new Error(response.error || 'Failed to delete group');
        }

        return response.value.data;
    },

    async getMyGroups(params?: GetMyGroupsParams): Promise<PaginatedGroupsResponse> {
        const queryParams = new URLSearchParams();

        if (params?.pageNumber !== undefined) {
            queryParams.append('pageNumber', params.pageNumber.toString());
        }

        if (params?.pageSize !== undefined) {
            queryParams.append('pageSize', params.pageSize.toString());
        }

        if (params?.searchTerm) {
            queryParams.append('searchTerm', params.searchTerm);
        }

        if (params?.sortBy) {
            queryParams.append('sortBy', params.sortBy);
        }

        if (params?.ascending !== undefined) {
            queryParams.append('ascending', params.ascending.toString());
        }

        const queryString = queryParams.toString();
        const url = `/groups/my-groups${queryString ? `?${queryString}` : ''}`;

        const response = await apiService.get<ApiResponse<PaginatedGroupsResponse>>(url);

        if (!response.isSuccess || !response.value?.data) {
            throw new Error(response.error || 'Failed to get groups');
        }

        return response.value.data;
    },
};

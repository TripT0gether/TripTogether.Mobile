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
    /**
     * Create a new group
     * POST /api/groups
     */
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

    /**
     * Get group details including all members
     * GET /api/groups/{groupId}
     */
    async getGroupDetail(groupId: string): Promise<GroupDetail> {
        const response = await apiService.get<ApiResponse<GroupDetail>>(
            `/groups/${groupId}`
        );

        if (!response.isSuccess || !response.value?.data) {
            throw new Error(response.error || 'Failed to get group details');
        }

        return response.value.data;
    },

    /**
     * Update group information (only leader can update)
     * PUT /api/groups/{groupId}
     */
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

    /**
     * Delete a group (only leader can delete)
     * DELETE /api/groups/{groupId}
     */
    async deleteGroup(groupId: string): Promise<boolean> {
        const response = await apiService.delete<ApiResponse<boolean>>(
            `/groups/${groupId}`
        );

        if (!response.isSuccess || !response.value?.data) {
            throw new Error(response.error || 'Failed to delete group');
        }

        return response.value.data;
    },

    /**
     * Get all groups that the current user is a member of
     * GET /api/groups/my-groups
     * Supports pagination, search, and sorting
     */
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

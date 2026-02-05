import { apiService } from './apiConfig';
import { ApiResponse } from '../types/api.types';
import { GroupMember, InviteMemberRequest } from '../types/group.types';

export const groupMemberService = {
    /**
     * Invite a member to join a group
     * POST /api/groups/{groupId}/members/invite
     * Only group leaders can invite members
     */
    async inviteMember(groupId: string, data: InviteMemberRequest): Promise<GroupMember> {
        const response = await apiService.post<ApiResponse<GroupMember>>(
            `/groups/${groupId}/members/invite`,
            data
        );

        if (!response.isSuccess || !response.value?.data) {
            throw new Error(response.error || 'Failed to invite member');
        }

        return response.value.data;
    },

    /**
     * Accept a pending group invitation
     * POST /api/groups/{groupId}/members/accept-invitation
     */
    async acceptInvitation(groupId: string): Promise<GroupMember> {
        const response = await apiService.post<ApiResponse<GroupMember>>(
            `/groups/${groupId}/members/accept-invitation`
        );

        if (!response.isSuccess || !response.value?.data) {
            throw new Error(response.error || 'Failed to accept invitation');
        }

        return response.value.data;
    },

    /**
     * Reject a pending group invitation
     * DELETE /api/groups/{groupId}/members/reject-invitation
     */
    async rejectInvitation(groupId: string): Promise<boolean> {
        const response = await apiService.delete<ApiResponse<boolean>>(
            `/groups/${groupId}/members/reject-invitation`
        );

        if (!response.isSuccess || !response.value?.data) {
            throw new Error(response.error || 'Failed to reject invitation');
        }

        return response.value.data;
    },

    /**
     * Remove a member from the group
     * DELETE /api/groups/{groupId}/members/{userId}
     * Only group leaders can remove members
     */
    async removeMember(groupId: string, userId: string): Promise<boolean> {
        const response = await apiService.delete<ApiResponse<boolean>>(
            `/groups/${groupId}/members/${userId}`
        );

        if (!response.isSuccess || !response.value?.data) {
            throw new Error(response.error || 'Failed to remove member');
        }

        return response.value.data;
    },

    /**
     * Leave a group
     * DELETE /api/groups/{groupId}/members/leave
     * Leaders must transfer leadership before leaving if there are other members
     */
    async leaveGroup(groupId: string): Promise<boolean> {
        const response = await apiService.delete<ApiResponse<boolean>>(
            `/groups/${groupId}/members/leave`
        );

        if (!response.isSuccess || !response.value?.data) {
            throw new Error(response.error || 'Failed to leave group');
        }

        return response.value.data;
    },
};

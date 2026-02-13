/**
 * groupMemberService.ts
 * 
 * Manages group membership operations including invitations, acceptances, and removals.
 * Handles the lifecycle of group member relationships with role-based permissions.
 * 
 * Key Features:
 * - Invite users to join groups (leader-only)
 * - Accept or reject group invitations (invited user)
 * - Remove members from groups (leader-only)
 * - Leave groups (any member, with leader restrictions)
 * 
 * API Endpoints:
 * - POST /api/groups/{groupId}/members/invite - Invite user to group
 * - POST /api/groups/{groupId}/members/accept-invitation - Accept pending invitation
 * - DELETE /api/groups/{groupId}/members/reject-invitation - Reject invitation
 * - DELETE /api/groups/{groupId}/members/{userId} - Remove member from group
 * - DELETE /api/groups/{groupId}/members/leave - Leave a group
 * 
 * Permission Model:
 * - Leader can invite and remove members
 * - Invited users can accept/reject their own invitations
 * - Leaders must transfer leadership before leaving (if other members exist)
 * - Members can leave freely
 * 
 * Member Status Flow:
 * Invite → Pending → Accept (Active) or Reject (Deleted)
 * Active → Leave/Remove (Inactive)
 * 
 * Used by: Group management screens, member lists, invitation notifications
 */

import { apiService } from './apiConfig';
import { ApiResponse } from '../types/api.types';
import { GroupMember, InviteMemberRequest } from '../types/group.types';

export const groupMemberService = {
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

    async acceptInvitation(groupId: string): Promise<GroupMember> {
        const response = await apiService.post<ApiResponse<GroupMember>>(
            `/groups/${groupId}/members/accept-invitation`
        );

        if (!response.isSuccess || !response.value?.data) {
            throw new Error(response.error || 'Failed to accept invitation');
        }

        return response.value.data;
    },

    async rejectInvitation(groupId: string): Promise<boolean> {
        const response = await apiService.delete<ApiResponse<boolean>>(
            `/groups/${groupId}/members/reject-invitation`
        );

        if (!response.isSuccess || !response.value?.data) {
            throw new Error(response.error || 'Failed to reject invitation');
        }

        return response.value.data;
    },

    async removeMember(groupId: string, userId: string): Promise<boolean> {
        const response = await apiService.delete<ApiResponse<boolean>>(
            `/groups/${groupId}/members/${userId}`
        );

        if (!response.isSuccess || !response.value?.data) {
            throw new Error(response.error || 'Failed to remove member');
        }

        return response.value.data;
    },

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

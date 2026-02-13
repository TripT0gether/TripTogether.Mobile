/**
 * group.types.ts
 * 
 * Type definitions for group management and collaborative trip planning.
 * Supports group creation, member management, and group discovery with pagination.
 * 
 * Purpose:
 * - Define request payloads for group CRUD operations
 * - Structure group and member data with role-based permissions
 * - Enable paginated group lists with search and sorting
 * - Support member invitation and status tracking
 * 
 * Key Exports:
 * - CreateGroupRequest: Payload for creating new groups
 * - UpdateGroupRequest: Payload for updating group details
 * - GetMyGroupsParams: Query parameters for fetching user's groups
 * - InviteMemberRequest: Payload for inviting users to groups
 * - Group: Basic group information (used in lists)
 * - GroupDetail: Complete group data with all members
 * - GroupMember: Member info with role and status
 * - PaginatedGroupsResponse: Paginated group list with metadata
 * 
 * Member Roles:
 * - Leader: Group creator with full permissions (update, delete, manage members)
 * - Member: Regular participant with limited permissions
 * 
 * Member Status:
 * - Active: Accepted and participating
 * - Inactive: Left or removed from group
 * - Pending: Invitation not yet accepted
 * 
 * Used by: groupService, group screens, member management components
 */

export interface CreateGroupRequest {
    name: string;
    coverPhotoUrl?: string | null;
}

export interface UpdateGroupRequest {
    name?: string;
    coverPhotoUrl?: string | null;
}

export interface GetMyGroupsParams {
    pageNumber?: number;
    pageSize?: number;
    searchTerm?: string;
    sortBy?: string;
    ascending?: boolean;
}

export interface InviteMemberRequest {
    userId: string;
}

export interface GroupMember {
    userId: string;
    username: string;
    email: string;
    avatarUrl: string | null;
    role: 'Leader' | 'Member';
    status: 'Active' | 'Inactive' | 'Pending';
}

export interface Group {
    id: string;
    name: string;
    coverPhotoUrl: string | null;
    createdBy: string;
    createdAt: string;
    memberCount: number;
}

export interface GroupDetail {
    id: string;
    name: string;
    coverPhotoUrl: string | null;
    createdBy: string;
    createdAt: string;
    members: GroupMember[];
}

export interface PaginatedGroupsResponse {
    items: Group[];
    currentPage: number;
    totalPages: number;
    pageSize: number;
    totalCount: number;
    hasPrevious: boolean;
    hasNext: boolean;
}

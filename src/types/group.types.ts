// ============= Request Types =============

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

// ============= Response Types =============

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

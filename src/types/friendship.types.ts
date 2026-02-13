/**
 * friendship.types.ts
 * 
 * Type definitions for friendship and friend request functionality.
 * Encompasses user search, friend request workflows, and friendship status management.
 * 
 * Key Types:
 * - SearchUsersParams: Query parameters for user search (excludes friends and pending requests)
 * - FriendRequest: Complete friend request with requester/addressee details
 * - FriendRequestListItem: Simplified request item for list views
 * - UserSearchResult: User data returned from search (verified users only)
 * - SendFriendRequestPayload: Request body for sending friend requests
 * - Paginated responses for search and request list endpoints
 * 
 * Status Flow:
 * Pending → Accepted (friendship created) or Rejected (request deleted)
 */

export interface UserSearchResult {
    id: string;
    username: string;
    email: string;
    avatarUrl: string | null;
    gender: boolean;
    isEmailVerified: boolean;
}

export interface SearchUsersParams {
    searchTerm: string;
    pageNumber?: number;
    pageSize?: number;
}

export interface PaginatedUserSearchResponse {
    items: UserSearchResult[];
    currentPage: number;
    totalPages: number;
    pageSize: number;
    totalCount: number;
    hasPrevious: boolean;
    hasNext: boolean;
}

export interface UserBasicInfo {
    id: string;
    username: string;
    email: string;
    avatarUrl: string | null;
}

export interface FriendRequest {
    id: string;
    addresseeId: string;
    status: 'Pending' | 'Accepted' | 'Rejected';
    createdAt: string;
    requester: UserBasicInfo;
    addressee: UserBasicInfo;
}

export interface SendFriendRequestPayload {
    addresseeId: string;
}

export interface FriendRequestListItem {
    friendshipId: string;
    userId: string;
    username: string;
    avatarUrl: string | null;
    requestDate: string;
}

export interface GetFriendRequestsParams {
    type: 'Received' | 'Sent';
    pageNumber?: number;
    pageSize?: number;
    searchTerm?: string;
}

export interface PaginatedFriendRequestsResponse {
    items: FriendRequestListItem[];
    currentPage: number;
    totalPages: number;
    pageSize: number;
    totalCount: number;
    hasPrevious: boolean;
    hasNext: boolean;
}

export interface Friend {
    friendId: string;
    username: string;
    email: string;
    avatarUrl: string | null;
    friendsSince: string;
}

export interface PaginatedFriendsResponse {
    items: Friend[];
    currentPage: number;
    totalPages: number;
    pageSize: number;
    totalCount: number;
    hasPrevious: boolean;
    hasNext: boolean;
}

export interface GetFriendsParams {
    pageNumber?: number;
    pageSize?: number;
    searchTerm?: string;
    sortBy?: string;
    ascending?: boolean;
}

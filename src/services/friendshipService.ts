/**
 * friendshipService.ts
 * 
 * Handles all friendship-related API operations including user discovery and friend request management.
 * Implements social features for connecting users within the TripTogether platform.
 * 
 * Key Features:
 * - User search with exclusion of current user, existing friends, and pending requests
 * - Send friend requests to other verified users
 * - Retrieve friend requests (received/sent) with pagination and search
 * - Accept or reject pending friend requests
 * 
 * API Endpoints:
 * - GET /api/friendships/search-users - Search for users to add as friends
 * - POST /api/friendships/send-request - Send a friend request
 * - GET /api/friendships/requests - Get friend requests (received or sent)
 * - POST /api/friendships/accept/{friendshipId} - Accept a friend request
 * - DELETE /api/friendships/reject/{friendshipId} - Reject a friend request
 */

import { apiService } from './apiConfig';
import { ApiResponse } from '../types/api.types';
import {
    SearchUsersParams,
    PaginatedUserSearchResponse,
    SendFriendRequestPayload,
    FriendRequest,
    GetFriendRequestsParams,
    PaginatedFriendRequestsResponse,
    Friend,
    PaginatedFriendsResponse,
    GetFriendsParams,
} from '../types/friendship.types';

export const friendshipService = {
    async searchUsers(params: SearchUsersParams): Promise<PaginatedUserSearchResponse> {
        const queryParams = new URLSearchParams();

        queryParams.append('searchTerm', params.searchTerm);

        if (params.pageNumber !== undefined) {
            queryParams.append('pageNumber', params.pageNumber.toString());
        }

        if (params.pageSize !== undefined) {
            queryParams.append('pageSize', params.pageSize.toString());
        }

        const url = `/friendships/search-users?${queryParams.toString()}`;

        const response = await apiService.get<ApiResponse<PaginatedUserSearchResponse>>(url);

        if (!response.isSuccess || !response.value?.data) {
            throw new Error(response.error || 'Failed to search users');
        }

        return response.value.data;
    },

    async sendFriendRequest(addresseeId: string): Promise<FriendRequest> {
        const payload: SendFriendRequestPayload = { addresseeId };

        const response = await apiService.post<ApiResponse<FriendRequest>>(
            '/friendships/send-request',
            payload
        );

        if (!response.isSuccess || !response.value?.data) {
            throw new Error(response.error || 'Failed to send friend request');
        }

        return response.value.data;
    },

    async getFriendRequests(params: GetFriendRequestsParams): Promise<PaginatedFriendRequestsResponse> {
        const queryParams = new URLSearchParams();

        queryParams.append('type', params.type);

        if (params.pageNumber !== undefined) {
            queryParams.append('pageNumber', params.pageNumber.toString());
        }

        if (params.pageSize !== undefined) {
            queryParams.append('pageSize', params.pageSize.toString());
        }

        if (params.searchTerm) {
            queryParams.append('searchTerm', params.searchTerm);
        }

        const url = `/friendships/requests?${queryParams.toString()}`;

        const response = await apiService.get<ApiResponse<PaginatedFriendRequestsResponse>>(url);

        if (!response.isSuccess || !response.value?.data) {
            throw new Error(response.error || 'Failed to get friend requests');
        }

        return response.value.data;
    },

    async acceptFriendRequest(friendshipId: string): Promise<FriendRequest> {
        const response = await apiService.post<ApiResponse<FriendRequest>>(
            `/friendships/accept/${friendshipId}`
        );

        if (!response.isSuccess || !response.value?.data) {
            throw new Error(response.error || 'Failed to accept friend request');
        }

        return response.value.data;
    },

    async rejectFriendRequest(friendshipId: string): Promise<boolean> {
        const response = await apiService.delete<ApiResponse<boolean>>(
            `/friendships/reject/${friendshipId}`
        );

        if (!response.isSuccess || !response.value?.data) {
            throw new Error(response.error || 'Failed to reject friend request');
        }

        return response.value.data;
    },

    async getFriends(params?: GetFriendsParams): Promise<PaginatedFriendsResponse> {
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
        const url = `/friendships/my-friends${queryString ? `?${queryString}` : ''}`;

        const response = await apiService.get<ApiResponse<PaginatedFriendsResponse>>(url);

        if (!response.isSuccess || !response.value?.data) {
            throw new Error(response.error || 'Failed to get friends list');
        }

        return response.value.data;
    },
};

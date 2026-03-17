/**
 * voteService.ts
 *
 * Handles all vote-related API operations for democratic in-trip decision-making.
 * Allows group members to cast and remove votes on poll options.
 *
 * Key Features:
 * - Cast a vote on a specific poll option
 * - Change an existing vote to a different option
 * - Remove an existing vote
 * - Fetch all votes for a specific poll
 * - Fetch the current user's votes for a specific poll
 *
 * API Endpoints:
 * - POST   /api/votes                       - Cast a new vote
 * - DELETE /api/votes/{voteId}              - Remove a vote
 * - PUT    /api/votes/poll/{pollId}         - Change vote
 * - GET    /api/votes/poll/{pollId}         - Get all votes for a poll
 * - GET    /api/votes/poll/{pollId}/my-votes - Get current user's votes
 *
 * Used by: Poll UI components (Phase 2 setup, Group dashboard)
 */

import { apiService } from './apiConfig';
import { ApiResponse } from '../types/api.types';
import { Vote, CastVotePayload } from '../types/vote.types';

export const voteService = {
    async castVote(payload: CastVotePayload): Promise<Vote> {
        const response = await apiService.post<ApiResponse<Vote>>(
            '/votes',
            payload
        );

        if (!response.isSuccess || !response.value?.data) {
            throw new Error(response.error || 'Failed to cast vote');
        }

        return response.value.data;
    },

    async removeVote(voteId: string): Promise<boolean> {
        const response = await apiService.delete<ApiResponse<boolean>>(
            `/votes/${voteId}`
        );

        if (!response.isSuccess) {
            throw new Error(response.error || 'Failed to remove vote');
        }

        return true;
    },

    async changeVote(pollId: string, newOptionId: string): Promise<Vote> {
        const response = await apiService.put<ApiResponse<Vote>>(
            `/votes/poll/${pollId}?newOptionId=${newOptionId}`
        );

        if (!response.isSuccess || !response.value?.data) {
            throw new Error(response.error || 'Failed to change vote');
        }

        return response.value.data;
    },

    async getPollVotes(pollId: string): Promise<Vote[]> {
        const response = await apiService.get<ApiResponse<Vote[]>>(
            `/votes/poll/${pollId}`
        );

        if (!response.isSuccess || !response.value?.data) {
            throw new Error(response.error || 'Failed to get poll votes');
        }

        return response.value.data;
    },

    async getMyVotes(pollId: string): Promise<Vote[]> {
        const response = await apiService.get<ApiResponse<Vote[]>>(
            `/votes/poll/${pollId}/my-votes`
        );

        if (!response.isSuccess || !response.value?.data) {
            throw new Error(response.error || 'Failed to get my votes');
        }

        return response.value.data;
    },
};

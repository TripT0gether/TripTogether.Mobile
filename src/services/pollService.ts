/**
 * pollService.ts
 *
 * Handles all poll-related API operations for democratic in-trip decision-making.
 * Allows group members to create polls, propose options, and settle on dates,
 * times, destinations, and budgets collectively.
 *
 * Key Features:
 * - Create polls with four supported types: Date, Time, Destination, Budget
 * - Add new options to open polls (any active group member)
 * - Update poll title or status (Open → Closed → Confirmed)
 * - Delete polls (creator or group leader only)
 * - Fetch full poll detail including all options and vote counts
 *
 * API Endpoints:
 * - POST   /api/polls                       - Create a new poll
 * - PUT    /api/polls/{pollId}              - Update poll title or status
 * - DELETE /api/polls/{pollId}              - Delete a poll
 * - POST   /api/polls/{pollId}/options      - Add an option to a poll
 * - GET    /api/polls/{pollId}              - Get poll detail with options
 * - GET    /api/polls/trip/{tripId}         - Get paginated polls for a trip
 * - DELETE /api/polls/options/{optionId}    - Remove a poll option
 * - PATCH  /api/polls/{pollId}/close        - Close a poll
 * - PATCH  /api/polls/finalize              - Finalize a poll
 *
 * Used by: Trip setup wizard (Phase 2), group dashboard poll widgets
 */

import { apiService } from './apiConfig';
import { ApiResponse } from '../types/api.types';
import {
    Poll,
    PollDetail,
    PollOption,
    CreatePollPayload,
    UpdatePollPayload,
    AddPollOptionPayload,
    GetTripPollsParams,
    PaginatedPollsResponse,
    FinalizePollPayload,
} from '../types/poll.types';

export const pollService = {
    async createPoll(payload: CreatePollPayload): Promise<Poll> {
        const response = await apiService.post<ApiResponse<Poll>>(
            '/polls',
            payload
        );

        if (!response.isSuccess || !response.value?.data) {
            throw new Error(response.error || 'Failed to create poll');
        }

        return response.value.data;
    },

    async updatePoll(pollId: string, payload: UpdatePollPayload): Promise<Poll> {
        const response = await apiService.put<ApiResponse<Poll>>(
            `/polls/${pollId}`,
            payload
        );

        if (!response.isSuccess || !response.value?.data) {
            throw new Error(response.error || 'Failed to update poll');
        }

        return response.value.data;
    },

    async deletePoll(pollId: string): Promise<boolean> {
        const response = await apiService.delete<ApiResponse<boolean>>(
            `/polls/${pollId}`
        );

        if (!response.isSuccess) {
            throw new Error(response.error || 'Failed to delete poll');
        }

        return true;
    },

    async addPollOption(
        pollId: string,
        payload: AddPollOptionPayload
    ): Promise<PollOption> {
        const response = await apiService.post<ApiResponse<PollOption>>(
            `/polls/${pollId}/options`,
            payload
        );

        if (!response.isSuccess || !response.value?.data) {
            throw new Error(response.error || 'Failed to add poll option');
        }

        return response.value.data;
    },

    async getPollDetail(pollId: string): Promise<PollDetail> {
        const response = await apiService.get<ApiResponse<PollDetail>>(
            `/polls/${pollId}`
        );

        if (!response.isSuccess || !response.value?.data) {
            throw new Error(response.error || 'Failed to get poll details');
        }

        return response.value.data;
    },

    async getTripPolls(
        tripId: string,
        params?: GetTripPollsParams
    ): Promise<PaginatedPollsResponse> {
        const queryParams = new URLSearchParams();

        if (params?.scope) {
            queryParams.append('scope', params.scope);
        }
        if (params?.pageNumber !== undefined) {
            queryParams.append('pageNumber', params.pageNumber.toString());
        }
        if (params?.pageSize !== undefined) {
            queryParams.append('pageSize', params.pageSize.toString());
        }

        const queryString = queryParams.toString();
        const url = `/polls/trip/${tripId}${queryString ? '?' + queryString : ''}`;

        const response = await apiService.get<ApiResponse<PaginatedPollsResponse>>(url);

        if (!response.isSuccess || !response.value?.data) {
            throw new Error(response.error || 'Failed to get trip polls');
        }

        return response.value.data;
    },

    async removePollOption(optionId: string): Promise<boolean> {
        const response = await apiService.delete<ApiResponse<boolean>>(
            `/polls/options/${optionId}`
        );

        if (!response.isSuccess) {
            throw new Error(response.error || 'Failed to remove poll option');
        }

        return true;
    },

    async closePoll(pollId: string): Promise<Poll> {
        const response = await apiService.patch<ApiResponse<Poll>>(
            `/polls/${pollId}/close`
        );

        if (!response.isSuccess || !response.value?.data) {
            throw new Error(response.error || 'Failed to close poll');
        }

        return response.value.data;
    },

    async finalizePoll(payload: FinalizePollPayload): Promise<Poll> {
        const response = await apiService.patch<ApiResponse<Poll>>(
            '/polls/finalize',
            payload
        );

        if (!response.isSuccess || !response.value?.data) {
            throw new Error(response.error || 'Failed to finalize poll');
        }

        return response.value.data;
    },
};

/**
 * poll.types.ts
 *
 * Type definitions for polls, poll options, and related request payloads.
 * Matches the backend API response shapes for all /api/polls endpoints.
 *
 * Purpose:
 * - Define request payloads for poll CRUD operations
 * - Structure poll and poll option data for democratic decision-making
 * - Enable paginated poll lists filtered by trip or activity scope
 * - Map Enum types for poll status and time-of-day selection
 *
 * Key Exports:
 * - CreatePollPayload: Payload for creating new polls
 * - AddPollOptionPayload: Payload for proposing new voting options
 * - GetTripPollsParams: Query parameters for fetching paginated polls
 * - FinalizePollPayload: Payload to close and finalize a poll decision
 * - Poll: Basic poll summary (used in lists)
 * - PollDetail: Complete poll data including all options
 * - PaginatedPollsResponse: Paginated poll list with metadata
 *
 * Used by: pollService, trip setup wizard (Phase 2), poll UI components
 */

export type PollType = 'Date' | 'Time' | 'Destination' | 'Budget';
export type PollStatus = 'Open' | 'Closed' | 'Finalized';
export type TimeOfDay = 'Morning' | 'Lunch' | 'Afternoon' | 'Dinner' | 'Evening' | 'LateNight';
export type PollScope = 'All' | 'TripOnly' | 'ActivityOnly';

// ── Core Entities ────────────────────────────────────────────────────────────

export interface Poll {
    id: string;
    tripId: string;
    tripTitle: string;
    activityId: string | null;
    type: PollType;
    title: string;
    status: PollStatus;
    createdBy: string;
    creatorName: string;
    createdAt: string;
    optionCount: number;
    totalVotes: number;
}

export interface PollOption {
    id: string;
    pollId: string;
    textValue: string | null;
    budget: number | null;
    startDate: string | null;
    endDate: string | null;
    startTime: string | null;
    endTime: string | null;
    timeOfDay: TimeOfDay | null;
    voteCount: number;
    createdAt: string;
}

export interface PollDetail extends Poll {
    options: PollOption[];
}

export interface PaginatedPollsResponse {
    items: Poll[];
    currentPage: number;
    totalPages: number;
    pageSize: number;
    totalCount: number;
    hasPrevious: boolean;
    hasNext: boolean;
}

// ── Request Payloads ─────────────────────────────────────────────────────────

export interface PollOptionInput {
    textValue?: string | null;
    budget?: number | null;
    startDate?: string | null;
    endDate?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    timeOfDay?: TimeOfDay | null;
}

export interface CreatePollPayload {
    tripId: string;
    activityId?: string | null;
    type: PollType;
    title: string;
    options?: PollOptionInput[];
}

export interface UpdatePollPayload {
    title?: string;
    status?: PollStatus;
}

export interface AddPollOptionPayload {
    textValue?: string | null;
    budget?: number | null;
    startDate?: string | null;
    endDate?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    timeOfDay?: TimeOfDay | null;
}

export interface GetTripPollsParams {
    scope?: PollScope;
    pageNumber?: number;
    pageSize?: number;
}

export interface FinalizePollPayload {
    pollId: string;
    selectedOptionId: string;
}

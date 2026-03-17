/**
 * vote.types.ts
 *
 * Type definitions for poll votes and request payloads.
 * Matches the backend API response shapes for all /api/votes endpoints.
 *
 * Purpose:
 * - Define request payloads for casting votes
 * - Structure vote data to track user selections on poll options
 * - Support retrieving poll votes and changing votes
 *
 * Key Exports:
 * - CastVotePayload: Request body for POST /api/votes
 * - Vote: Structure representing a user's vote on an option (used in lists and singles)
 *
 * Used by: voteService, poll UI components
 */

export interface Vote {
    id: string;
    pollOptionId: string;
    userId: string;
    username: string;
    createdAt: string;
}

export interface CastVotePayload {
    pollOptionId: string;
}

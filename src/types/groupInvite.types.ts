/**
 * groupInvite.types.ts
 *
 * Type definitions for group invite link management.
 * Covers invite creation, retrieval, and the join-by-token flow.
 *
 * Key Exports:
 * - GroupInvite: Active invite object with token, URL and expiry info
 *
 * Used by: groupInviteService, invite screens, share/join flows
 */

export interface GroupInvite {
    id: string;
    groupId: string;
    groupName: string;
    token: string;
    inviteUrl: string;
    expiresAt: string;
    isExpired: boolean;
    createdAt: string;
}

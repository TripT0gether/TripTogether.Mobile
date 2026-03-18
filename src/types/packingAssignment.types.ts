/**
 * packingAssignment.types.ts
 *
 * TypeScript types for the Packing Assignment domain.
 * An assignment links a packing item to a specific user with a quantity and checked status.
 * If userId is omitted on creation, the API assigns it to the current user.
 *
 * Used by: packingAssignmentService, trip setup Phase 4 (packing list screen)
 */

export interface PackingAssignment {
    id: string;
    packingItemId: string;
    packingItemName: string;
    userId: string;
    userName: string;
    userAvatarUrl: string | null;
    quantity: number;
    isChecked: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreatePackingAssignmentPayload {
    packingItemId: string;
    userId?: string | null;
    quantity?: number;
}

export interface UpdatePackingAssignmentPayload {
    quantity?: number;
    isChecked?: boolean;
}

export interface PackingAssignmentSummary {
    packingItemId: string;
    packingItemName: string;
    category: string;
    isShared: boolean;
    quantityNeeded: number;
    totalAssigned: number;
    remaining: number;
    isFullyAssigned: boolean;
    assignmentCount: number;
    assignments: PackingAssignment[];
}

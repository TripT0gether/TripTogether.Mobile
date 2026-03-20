/**
 * packingItem.types.ts
 *
 * TypeScript types for the Packing Item domain.
 * Packing items can be personal (isShared: false) or shared across the group (isShared: true).
 * Items are ordered by category and name when retrieved from the API.
 *
 * Used by: packingItemService, trip setup Phase 4 (packing list screen)
 */

export interface PackingItem {
    id: string;
    tripId: string;
    name: string;
    category: string;
    isShared: boolean;
    isChecked: boolean;
    quantityNeeded: number;
    createdAt: string;
    updatedAt: string;
}

export interface CreatePackingItemPayload {
    tripId: string;
    name: string;
    category?: string;
    isShared?: boolean;
    quantityNeeded?: number;
}

export interface UpdatePackingItemPayload {
    name?: string;
    category?: string;
    isShared?: boolean;
    isChecked?: boolean;
    quantityNeeded?: number;
}

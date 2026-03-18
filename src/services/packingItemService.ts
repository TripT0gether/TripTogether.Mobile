/**
 * packingItemService.ts
 *
 * Handles all packing-item API operations for trip preparation management.
 * Items can be personal or shared. The list is ordered by category and name.
 *
 * API Endpoints:
 * - POST   /api/packing-items                          - Create a new packing item
 * - GET    /api/packing-items/trip/{tripId}            - Get all packing items for a trip
 * - GET    /api/packing-items/{packingItemId}          - Get a single packing item by ID
 * - PUT    /api/packing-items/{packingItemId}          - Update a packing item
 * - DELETE /api/packing-items/{packingItemId}          - Delete a packing item
 *
 * Used by: Trip setup Phase 4 (packing list screen), trip dashboard packing widget
 */

import { apiService } from './apiConfig';
import { ApiResponse } from '../types/api.types';
import {
    PackingItem,
    CreatePackingItemPayload,
    UpdatePackingItemPayload,
} from '../types/packingItem.types';

export const packingItemService = {
    async createPackingItem(payload: CreatePackingItemPayload): Promise<PackingItem> {
        const response = await apiService.post<ApiResponse<PackingItem>>(
            '/packing-items',
            payload
        );

        if (!response.isSuccess || !response.value?.data) {
            throw new Error(response.error || 'Failed to create packing item');
        }

        return response.value.data;
    },

    async getTripPackingItems(tripId: string): Promise<PackingItem[]> {
        const response = await apiService.get<ApiResponse<PackingItem[]>>(
            `/packing-items/trip/${tripId}`
        );

        if (!response.isSuccess || !response.value?.data) {
            throw new Error(response.error || 'Failed to fetch packing items');
        }

        return response.value.data;
    },

    async getPackingItemById(packingItemId: string): Promise<PackingItem> {
        const response = await apiService.get<ApiResponse<PackingItem>>(
            `/packing-items/${packingItemId}`
        );

        if (!response.isSuccess || !response.value?.data) {
            throw new Error(response.error || 'Failed to fetch packing item');
        }

        return response.value.data;
    },

    async updatePackingItem(packingItemId: string, payload: UpdatePackingItemPayload): Promise<PackingItem> {
        const response = await apiService.put<ApiResponse<PackingItem>>(
            `/packing-items/${packingItemId}`,
            payload
        );

        if (!response.isSuccess || !response.value?.data) {
            throw new Error(response.error || 'Failed to update packing item');
        }

        return response.value.data;
    },

    async deletePackingItem(packingItemId: string): Promise<void> {
        const response = await apiService.delete<ApiResponse<boolean>>(
            `/packing-items/${packingItemId}`
        );

        if (!response.isSuccess) {
            throw new Error(response.error || 'Failed to delete packing item');
        }
    },
};

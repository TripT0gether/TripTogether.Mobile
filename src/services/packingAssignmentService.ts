/**
 * packingAssignmentService.ts
 *
 * Handles all packing-assignment API operations — linking packing items to users.
 * If userId is omitted on creation, the API assigns the item to the current user.
 * The update endpoint supports changing quantity and toggling the checked status.
 *
 * API Endpoints:
 * - POST   /api/packing-assignments                        - Assign a packing item to a user
 * - PUT    /api/packing-assignments/{assignmentId}         - Update quantity or checked status
 * - DELETE /api/packing-assignments/{assignmentId}         - Remove an assignment
 *
 * Used by: Trip setup Phase 4 (packing list screen), trip dashboard packing widget
 */

import { apiService } from './apiConfig';
import { ApiResponse } from '../types/api.types';
import {
    PackingAssignment,
    CreatePackingAssignmentPayload,
    UpdatePackingAssignmentPayload,
} from '../types/packingAssignment.types';

export const packingAssignmentService = {
    async createAssignment(payload: CreatePackingAssignmentPayload): Promise<PackingAssignment> {
        const response = await apiService.post<ApiResponse<PackingAssignment>>(
            '/packing-assignments',
            payload
        );

        if (!response.isSuccess || !response.value?.data) {
            throw new Error(response.error || 'Failed to create packing assignment');
        }

        return response.value.data;
    },

    async updateAssignment(assignmentId: string, payload: UpdatePackingAssignmentPayload): Promise<PackingAssignment> {
        const response = await apiService.put<ApiResponse<PackingAssignment>>(
            `/packing-assignments/${assignmentId}`,
            payload
        );

        if (!response.isSuccess || !response.value?.data) {
            throw new Error(response.error || 'Failed to update packing assignment');
        }

        return response.value.data;
    },

    async deleteAssignment(assignmentId: string): Promise<void> {
        const response = await apiService.delete<ApiResponse<boolean>>(
            `/packing-assignments/${assignmentId}`
        );

        if (!response.isSuccess) {
            throw new Error(response.error || 'Failed to delete packing assignment');
        }
    },
};

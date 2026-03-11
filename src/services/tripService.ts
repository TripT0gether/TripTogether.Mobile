/**
 * tripService.ts
 *
 * Handles all trip-related API operations for the TripTogether platform.
 * Implements CRUD and status management for trips within a group.
 *
 * Key Features:
 * - Create a new trip for a group
 * - Retrieve a single trip's full details
 * - Retrieve all trips for a group (paginated, filterable, sortable)
 * - Update trip info (title, dates, budget, settings)
 * - Update trip status (Planning → Confirmed, etc.)
 *
 * API Endpoints:
 * - POST   /api/trips                          - Create trip
 * - PUT    /api/trips/{tripId}                 - Update trip
 * - GET    /api/trips/{tripId}                 - Get trip detail
 * - GET    /api/trips/group/{groupId}          - Get group trips
 * - PATCH  /api/trips/{tripId}/status          - Update trip status
 * - DELETE /api/trips/{tripId}                 - Delete trip
 */

import { apiService } from './apiConfig';
import { ApiResponse } from '../types/api.types';
import {
    Trip,
    TripDetail,
    TripStatus,
    PaginatedTripsResponse,
    CreateTripPayload,
    UpdateTripPayload,
    GetGroupTripsParams,
} from '../types/trip.types';

export const tripService = {
    async createTrip(payload: CreateTripPayload): Promise<Trip> {
        const response = await apiService.post<ApiResponse<Trip>>(
            '/trips',
            payload
        );

        if (!response.isSuccess || !response.value?.data) {
            throw new Error(response.error || 'Failed to create trip');
        }

        return response.value.data;
    },

    async updateTrip(tripId: string, payload: UpdateTripPayload): Promise<Trip> {
        const response = await apiService.put<ApiResponse<Trip>>(
            `/trips/${tripId}`,
            payload
        );

        if (!response.isSuccess || !response.value?.data) {
            throw new Error(response.error || 'Failed to update trip');
        }

        return response.value.data;
    },

    async getTripDetail(tripId: string): Promise<TripDetail> {
        const response = await apiService.get<ApiResponse<TripDetail>>(
            `/trips/${tripId}`
        );

        if (!response.isSuccess || !response.value?.data) {
            throw new Error(response.error || 'Failed to get trip details');
        }

        return response.value.data;
    },

    async getGroupTrips(
        groupId: string,
        params?: GetGroupTripsParams
    ): Promise<PaginatedTripsResponse> {
        const queryParams = new URLSearchParams();

        if (params?.searchTerm) {
            queryParams.append('searchTerm', params.searchTerm);
        }

        if (params?.status) {
            queryParams.append('status', params.status);
        }

        if (params?.sortBy) {
            queryParams.append('sortBy', params.sortBy);
        }

        if (params?.sortDescending !== undefined) {
            queryParams.append('sortDescending', params.sortDescending.toString());
        }

        if (params?.pageNumber !== undefined) {
            queryParams.append('pageNumber', params.pageNumber.toString());
        }

        if (params?.pageSize !== undefined) {
            queryParams.append('pageSize', params.pageSize.toString());
        }

        const queryString = queryParams.toString();
        const url = `/trips/group/${groupId}${queryString ? `?${queryString}` : ''}`;

        const response = await apiService.get<ApiResponse<PaginatedTripsResponse>>(url);

        if (!response.isSuccess || !response.value?.data) {
            throw new Error(response.error || 'Failed to get group trips');
        }

        return response.value.data;
    },

    async updateTripStatus(tripId: string, status: TripStatus): Promise<Trip> {
        const queryParams = new URLSearchParams({ status });
        const url = `/trips/${tripId}/status?${queryParams.toString()}`;

        const response = await apiService.patch<ApiResponse<Trip>>(url);

        if (!response.isSuccess || !response.value?.data) {
            throw new Error(response.error || 'Failed to update trip status');
        }

        return response.value.data;
    },

    async deleteTrip(tripId: string): Promise<boolean> {
        const response = await apiService.delete<ApiResponse<boolean>>(
            `/trips/${tripId}`
        );

        if (!response.isSuccess || !response.value?.data) {
            throw new Error(response.error || 'Failed to delete trip');
        }

        return response.value.data;
    },
};

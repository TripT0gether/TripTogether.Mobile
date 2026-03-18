/**
 * activityService.ts
 *
 * Handles all activity-related API operations for trip itinerary management.
 * Activities can live in the "Idea Bucket" (unscheduled) or be assigned to a
 * specific date and day-index slot in the trip schedule.
 *
 * API Endpoints:
 * - POST   /api/activities                     - Create a new activity
 * - GET    /api/activities/trip/{tripId}        - Get all activities for a trip, grouped by date
 * - GET    /api/activities/{activityId}         - Get a single activity by ID
 * - PUT    /api/activities/{activityId}         - Update an activity
 * - DELETE /api/activities/{activityId}         - Delete an activity
 *
 * Used by: Trip setup Phase 3 (idea bucket & scheduling screen), trip dashboard itinerary
 */

import { apiService } from './apiConfig';
import { ApiResponse } from '../types/api.types';
import {
    Activity,
    ActivityGroup,
    CreateActivityPayload,
    UpdateActivityPayload,
} from '../types/activity.types';

export const activityService = {
    async createActivity(payload: CreateActivityPayload): Promise<Activity> {
        const response = await apiService.post<ApiResponse<Activity>>(
            '/activities',
            payload
        );

        if (!response.isSuccess || !response.value?.data) {
            throw new Error(response.error || 'Failed to create activity');
        }

        return response.value.data;
    },

    async getTripActivities(tripId: string): Promise<ActivityGroup[]> {
        const response = await apiService.get<ApiResponse<ActivityGroup[]>>(
            `/activities/trip/${tripId}`
        );

        if (!response.isSuccess || !response.value?.data) {
            throw new Error(response.error || 'Failed to fetch activities');
        }

        return response.value.data;
    },

    async getActivityById(activityId: string): Promise<Activity> {
        const response = await apiService.get<ApiResponse<Activity>>(
            `/activities/${activityId}`
        );

        if (!response.isSuccess || !response.value?.data) {
            throw new Error(response.error || 'Failed to fetch activity');
        }

        return response.value.data;
    },

    async updateActivity(activityId: string, payload: UpdateActivityPayload): Promise<Activity> {
        const response = await apiService.put<ApiResponse<Activity>>(
            `/activities/${activityId}`,
            payload
        );

        if (!response.isSuccess || !response.value?.data) {
            throw new Error(response.error || 'Failed to update activity');
        }

        return response.value.data;
    },

    async deleteActivity(activityId: string): Promise<void> {
        const response = await apiService.delete<ApiResponse<boolean>>(
            `/activities/${activityId}`
        );

        if (!response.isSuccess) {
            throw new Error(response.error || 'Failed to delete activity');
        }
    },
};

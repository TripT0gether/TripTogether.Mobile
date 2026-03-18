/**
 * activity.types.ts
 *
 * TypeScript types for the Activity domain.
 * Activities represent planned or unscheduled items for a trip — from raw ideas
 * in the "Idea Bucket" through to fully scheduled day/time slots.
 *
 * Key Types:
 * - Activity         — full activity entity returned by the API
 * - ActivityGroup    — activities grouped by date (from GET /api/activities/trip/{tripId})
 * - CreateActivityPayload — request body for creating an activity
 * - UpdateActivityPayload — request body for updating an activity
 *
 * Used by: activityService, trip setup Phase 3 (idea & scheduling screen)
 */

export type ActivityStatus = 'Idea' | 'Scheduled' | 'Done' | 'Cancelled';

export type ActivityCategory =
    | 'Food'
    | 'Attraction'
    | 'Transport'
    | 'Accommodation'
    | 'Flight'
    | 'Shopping'
    | 'Entertainment'
    | 'Other';

export interface Activity {
    id: string;
    tripId: string;
    status: ActivityStatus;
    title: string;
    category: ActivityCategory;
    date: string;
    startTime: string | null;
    endTime: string | null;
    scheduleDayIndex: number | null;
    locationName: string | null;
    latitude: number | null;
    longitude: number | null;
    linkUrl: string | null;
    imageUrl: string | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface ActivityGroup {
    date: string;
    activities: Activity[];
    totalActivities: number;
}

export interface CreateActivityPayload {
    tripId: string;
    title: string;
    status?: ActivityStatus;
    category?: ActivityCategory;
    date?: string;
    startTime?: string | null;
    endTime?: string | null;
    locationName?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    linkUrl?: string | null;
    notes?: string | null;
}

export interface UpdateActivityPayload {
    title?: string;
    status?: ActivityStatus;
    category?: ActivityCategory;
    date?: string;
    startTime?: string | null;
    endTime?: string | null;
    scheduleDayIndex?: number | null;
    locationName?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    linkUrl?: string | null;
    imageUrl?: string | null;
    notes?: string | null;
}

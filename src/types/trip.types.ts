/**
 * trip.types.ts
 *
 * Type definitions for trip creation, retrieval, update, and status management.
 * Matches the TripTogether backend API response shapes for all /api/trips endpoints.
 *
 * Key Types:
 * - Trip: Standard trip object returned by create / update / status endpoints
 * - TripDetail: Extended trip object with settings, poll/activity/expense counts
 * - PaginatedTripsResponse: Paginated list returned by get-group-trips
 * - CreateTripPayload: Request body for POST /api/trips
 * - UpdateTripPayload: Request body for PUT /api/trips/{tripId}
 * - GetGroupTripsParams: Query parameters for GET /api/trips/group/{groupId}
 *
 * Status Flow:
 * Planning → Confirmed (via PATCH /api/trips/{tripId}/status)
 */

export type TripStatus = 'Planning' | 'Confirmed' | 'Ongoing' | 'Completed' | 'Cancelled';

export interface EmergencyContact {
    name: string;
    number: string;
}

export interface TripSettings {
    emergencyContacts: EmergencyContact[];
}

export interface Trip {
    id: string;
    groupId: string;
    groupName: string;
    title: string;
    status: TripStatus;
    planningRangeStart: string | null;
    planningRangeEnd: string | null;
    startDate: string | null;
    endDate: string | null;
    budget: number;
    createdAt: string;
    inviteToken: string | null;
}

export interface TripDetail extends Trip {
    settings: TripSettings;
    pollCount: number;
    activityCount: number;
    expenseCount: number;
}

export interface PaginatedTripsResponse {
    items: Trip[];
    currentPage: number;
    totalPages: number;
    pageSize: number;
    totalCount: number;
    hasPrevious: boolean;
    hasNext: boolean;
}

export interface CreateTripPayload {
    groupId: string;
    title: string;
    planningRangeStart?: string | null;
    planningRangeEnd?: string | null;
    budget?: number;
}

export interface UpdateTripPayload {
    title?: string;
    status?: TripStatus;
    planningRangeStart?: string | null;
    planningRangeEnd?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    settings?: Partial<TripSettings>;
    budget?: number;
}

export interface GetGroupTripsParams {
    searchTerm?: string;
    status?: TripStatus | '';
    sortBy?: string;
    sortDescending?: boolean;
    pageNumber?: number;
    pageSize?: number;
}

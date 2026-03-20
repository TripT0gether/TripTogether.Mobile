/**
 * trip.types.ts
 *
 * Type definitions for trip creation, retrieval, update, and status management.
 * Matches the TripTogether backend API response shapes for all /api/trips endpoints.
 *
 * Key Types:
 * - Trip: Standard trip object returned by create / update / status endpoints
 * - TripDetail: Extended trip object with settings, poll/activity/expense counts
 *   and embedded arrays of activities, polls, and packingItems
 * - PaginatedTripsResponse: Paginated list returned by get-group-trips
 * - CreateTripPayload: Request body for POST /api/trips
 * - UpdateTripPayload: Request body for PUT /api/trips/{tripId}
 * - GetGroupTripsParams: Query parameters for GET /api/trips/group/{groupId}
 *
 * Status Flow:
 * Setup → Planning → Confirmed → Active → Completed
 */

/**
 * TripStatus enum — matches backend values:
 * - Setup:     Newly created trip, not yet in planning
 * - Planning:  Polls being voted on and activities being planned
 * - Confirmed: All votes finalized by group leader
 * - Active:    Trip has started
 * - Completed: Trip is finished
 */
export type TripStatus = 'Setup' | 'Planning' | 'Confirmed' | 'Active' | 'Completed';

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
    location: string | null;
    budget: number | null;
    createdAt: string;
    inviteToken: string | null;
}

// Lightweight types embedded in TripDetail (avoid circular imports by inlining shapes)
export interface TripDetailActivity {
    id: string;
    tripId: string;
    status: string;
    title: string;
    category: string;
    date: string | null;
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

export interface TripDetailPoll {
    id: string;
    tripId: string;
    tripTitle: string;
    activityId: string | null;
    type: string;
    title: string;
    status: string;
    createdBy: string;
    creatorName: string;
    createdAt: string;
    optionCount: number;
    totalVotes: number;
}

export interface TripDetailPackingItem {
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

export interface TripDetail extends Trip {
    settings: TripSettings;
    pollCount: number;
    activityCount: number;
    expenseCount: number;
    activities: TripDetailActivity[];
    polls: TripDetailPoll[];
    packingItems: TripDetailPackingItem[];
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

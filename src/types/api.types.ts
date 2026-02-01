/**
 * API Response Types
 * Generic types for API responses and errors
 */

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
    data: T;
    message?: string;
    success: boolean;
}

/**
 * API Error response
 */
export interface ApiError {
    message: string;
    errors?: Record<string, string[]>;
    statusCode: number;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

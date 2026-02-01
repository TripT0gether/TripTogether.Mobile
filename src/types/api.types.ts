/**
 * Generic types for API responses and errors
 */

/**
 * Backend API wrapper response format
 */
export interface ApiWrapper<T> {
    isSuccess: boolean;
    value: T | null;
    error: string | null;
}

/**
 * Standard API response value
 */
export interface ApiResponseValue<T> {
    code: string;
    message: string;
    data?: T;
}

/**
 * Complete API response (wrapper + value)
 */
export type ApiResponse<T> = ApiWrapper<ApiResponseValue<T>>;

/**
 * API Error response
 */
export interface ApiError {
    message: string;
    errors?: Record<string, string[]>;
    statusCode: number;
}

/**
 * Paginated response data
 */
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

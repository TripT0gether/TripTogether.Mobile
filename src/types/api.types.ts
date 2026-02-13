/**
 * api.types.ts
 * 
 * Core type definitions for API communication and response handling.
 * Establishes the standard response wrapper pattern used across all backend endpoints.
 * 
 * Purpose:
 * - Define the backend API response wrapper structure (ApiWrapper)
 * - Provide generic types for API responses with type-safe data payloads
 * - Standardize error handling structures
 * - Support pagination across all list endpoints
 * 
 * Key Exports:
 * - ApiWrapper<T>: Root wrapper with isSuccess, value, error fields
 * - ApiResponseValue<T>: Inner value structure with code, message, data
 * - ApiResponse<T>: Combined type (most commonly used in services)
 * - ApiError: Structured error response with validation errors
 * - PaginatedResponse<T>: Generic pagination metadata and data
 * 
 * Response Pattern:
 * All backend endpoints return: { isSuccess, value: { code, message, data }, error }
 * Services unwrap this and return the inner 'data' field for cleaner consumption
 * 
 * Used by: All service files (authService, groupService, friendshipService, etc.)
 */

export interface ApiWrapper<T> {
    isSuccess: boolean;
    value: T | null;
    error: string | null;
}

export interface ApiResponseValue<T> {
    code: string;
    message: string;
    data?: T;
}

export type ApiResponse<T> = ApiWrapper<ApiResponseValue<T>>;

export interface ApiError {
    message: string;
    errors?: Record<string, string[]>;
    statusCode: number;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}


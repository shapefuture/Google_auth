/**
 * Error utilities for the Gemini Gateway application
 * Provides standardized error handling and reporting
 */
import { logger } from './logger';

// Different categories of errors
export enum ErrorCategory {
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  API = 'API',
  DATABASE = 'DATABASE',
  NETWORK = 'NETWORK',
  UNKNOWN = 'UNKNOWN',
}

// Custom application error class
export class AppError extends Error {
  category: ErrorCategory;
  statusCode?: number;
  details?: any;
  
  constructor(
    message: string, 
    category: ErrorCategory = ErrorCategory.UNKNOWN, 
    statusCode?: number,
    details?: any
  ) {
    super(message);
    this.name = 'AppError';
    this.category = category;
    this.statusCode = statusCode;
    this.details = details;
    
    // Captures the proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
  
  // Create a user-friendly message suitable for displaying to users
  public getUserMessage(): string {
    switch (this.category) {
      case ErrorCategory.AUTHENTICATION:
        return 'Authentication error. Please sign in again.';
      case ErrorCategory.AUTHORIZATION:
        return 'You do not have permission to perform this action.';
      case ErrorCategory.VALIDATION:
        return this.message; // Validation errors are usually already user-friendly
      case ErrorCategory.API:
        return 'Service is temporarily unavailable. Please try again later.';
      case ErrorCategory.DATABASE:
        return 'Database operation failed. Please try again later.';
      case ErrorCategory.NETWORK:
        return 'Network error occurred. Please check your connection and try again.';
      default:
        return 'An unexpected error occurred. Please try again later.';
    }
  }
  
  // Log this error with appropriate details
  public log(module?: string, method?: string): void {
    logger.error(this.message, this, {
      module,
      method,
      data: this.details,
    });
  }
}

// Factory functions for common error types
export const createAuthenticationError = (message: string, details?: any) => 
  new AppError(message, ErrorCategory.AUTHENTICATION, 401, details);

export const createAuthorizationError = (message: string, details?: any) => 
  new AppError(message, ErrorCategory.AUTHORIZATION, 403, details);

export const createValidationError = (message: string, details?: any) => 
  new AppError(message, ErrorCategory.VALIDATION, 400, details);

export const createApiError = (message: string, statusCode = 500, details?: any) => 
  new AppError(message, ErrorCategory.API, statusCode, details);

export const createDatabaseError = (message: string, details?: any) => 
  new AppError(message, ErrorCategory.DATABASE, 500, details);

export const createNetworkError = (message: string, details?: any) => 
  new AppError(message, ErrorCategory.NETWORK, 503, details);

// Handle errors in async functions and log them appropriately
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  module: string,
  method: string,
  defaultErrorMessage: string = 'Operation failed'
): Promise<T> {
  try {
    logger.debug(`Starting ${method}`, { module, method });
    const result = await fn();
    logger.debug(`Completed ${method}`, { module, method });
    return result;
  } catch (error) {
    if (error instanceof AppError) {
      error.log(module, method);
      throw error;
    } else {
      const appError = new AppError(
        error instanceof Error ? error.message : defaultErrorMessage,
        ErrorCategory.UNKNOWN,
        500,
        error
      );
      appError.log(module, method);
      throw appError;
    }
  }
}

// Extract useful information from a fetch Response object for error logging
export function extractResponseInfo(response: Response): { 
  status: number; 
  statusText: string; 
  url: string;
  headers: Record<string, string>;
} {
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    // Don't log sensitive headers
    if (!['authorization', 'cookie', 'set-cookie'].includes(key.toLowerCase())) {
      headers[key] = value;
    }
  });
  
  return {
    status: response.status,
    statusText: response.statusText,
    url: response.url,
    headers,
  };
}

// Handle API errors from fetch responses
export async function handleApiResponse<T>(
  response: Response, 
  module: string, 
  method: string
): Promise<T> {
  if (!response.ok) {
    const responseInfo = extractResponseInfo(response);
    
    try {
      const errorData = await response.json();
      throw createApiError(
        errorData.message || `API error: ${response.status} ${response.statusText}`,
        response.status,
        { ...responseInfo, errorData }
      );
    } catch (error) {
      // If we can't parse the error response as JSON
      if (error instanceof AppError) throw error;
      
      throw createApiError(
        `API error: ${response.status} ${response.statusText}`,
        response.status,
        responseInfo
      );
    }
  }
  
  try {
    return await response.json() as T;
  } catch (error) {
    throw createApiError(
      'Failed to parse API response',
      500,
      { error, responseInfo: extractResponseInfo(response) }
    );
  }
}
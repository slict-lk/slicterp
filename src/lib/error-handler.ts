/**
 * Centralized Error Handling
 * Consistent error handling across the application
 */

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Validation Error
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

// Not Found Error
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id 
      ? `${resource} with id '${id}' not found`
      : `${resource} not found`;
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

// Unauthorized Error
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

// Forbidden Error
export class ForbiddenError extends AppError {
  constructor(message: string = 'Access forbidden') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

// Conflict Error
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

// Database Error
export class DatabaseError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 500, 'DATABASE_ERROR', details);
    this.name = 'DatabaseError';
  }
}

// Error response formatter
export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    statusCode: number;
    details?: any;
    timestamp: string;
  };
}

export function formatErrorResponse(error: Error | AppError): ErrorResponse {
  const isAppError = error instanceof AppError;
  
  return {
    success: false,
    error: {
      message: error.message,
      code: isAppError ? error.code : 'INTERNAL_ERROR',
      statusCode: isAppError ? error.statusCode : 500,
      details: isAppError ? error.details : undefined,
      timestamp: new Date().toISOString(),
    },
  };
}

// Error logger
export function logError(error: Error, context?: any) {
  const errorLog = {
    message: error.message,
    name: error.name,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
  };

  // In production, this would send to logging service (Sentry, LogRocket, etc.)
  console.error('Error occurred:', errorLog);
  
  // TODO: Integrate with logging service
  // Example with Sentry:
  // Sentry.captureException(error, { extra: context });
}

// API error handler middleware
export function handleApiError(error: Error) {
  logError(error);
  
  if (error instanceof AppError) {
    return new Response(
      JSON.stringify(formatErrorResponse(error)),
      {
        status: error.statusCode,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Handle Prisma errors
  if (error.name === 'PrismaClientKnownRequestError') {
    const prismaError = error as any;
    
    if (prismaError.code === 'P2002') {
      return new Response(
        JSON.stringify(formatErrorResponse(
          new ConflictError('A record with this value already exists')
        )),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    if (prismaError.code === 'P2025') {
      return new Response(
        JSON.stringify(formatErrorResponse(
          new NotFoundError('Record')
        )),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // Unknown error
  return new Response(
    JSON.stringify(formatErrorResponse(error)),
    { status: 500, headers: { 'Content-Type': 'application/json' } }
  );
}

// Try-catch wrapper for async functions
export async function tryCatch<T>(
  fn: () => Promise<T>,
  errorMessage?: string
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    logError(error as Error);
    
    if (errorMessage) {
      throw new AppError(errorMessage);
    }
    
    throw error;
  }
}

// Client-side error handler
export function handleClientError(error: any): string {
  if (error.response) {
    // API error response
    return error.response.data?.error?.message || 'An error occurred';
  }
  
  if (error.request) {
    // Network error
    return 'Network error. Please check your connection.';
  }
  
  // Other errors
  return error.message || 'An unexpected error occurred';
}

// Form validation error handler
export function getFieldError(errors: any, fieldName: string): string | undefined {
  return errors[fieldName]?.message;
}

// Batch error handler for multiple operations
export async function batchOperation<T>(
  operations: Array<() => Promise<T>>,
  onError?: (error: Error, index: number) => void
): Promise<Array<T | null>> {
  const results: Array<T | null> = [];
  
  for (let i = 0; i < operations.length; i++) {
    try {
      results.push(await operations[i]());
    } catch (error) {
      results.push(null);
      logError(error as Error, { operationIndex: i });
      
      if (onError) {
        onError(error as Error, i);
      }
    }
  }
  
  return results;
}

// Retry logic for failed operations
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      logError(lastError, { attempt, maxRetries });
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
  }
  
  throw new AppError(
    `Operation failed after ${maxRetries} attempts: ${lastError?.message}`,
    500,
    'MAX_RETRIES_EXCEEDED'
  );
}

// Success response formatter
export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
}

export function formatSuccessResponse<T>(
  data: T,
  message?: string
): SuccessResponse<T> {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  };
}

// Paginated response formatter
export interface PaginatedResponse<T> extends SuccessResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function formatPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): PaginatedResponse<T> {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

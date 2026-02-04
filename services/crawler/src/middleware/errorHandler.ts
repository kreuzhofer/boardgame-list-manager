import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

/**
 * Error types that can occur in the crawler service
 */
export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  TIMEOUT = 'TIMEOUT',
  NAVIGATION_ERROR = 'NAVIGATION_ERROR',
  INVALID_URL = 'INVALID_URL',
  BROWSER_ERROR = 'BROWSER_ERROR',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Custom error class for crawler service errors
 */
export class CrawlerError extends Error {
  public readonly errorType: ErrorType;
  public readonly statusCode: number;
  public readonly url?: string;

  constructor(
    message: string,
    errorType: ErrorType = ErrorType.UNKNOWN,
    statusCode: number = 500,
    url?: string
  ) {
    super(message);
    this.name = 'CrawlerError';
    this.errorType = errorType;
    this.statusCode = statusCode;
    this.url = url;
    
    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error response format
 */
interface ErrorResponse {
  success: false;
  error: string;
  errorType: string;
  url?: string;
  message?: string; // Only in development mode
  stack?: string;   // Only in development mode
}

/**
 * Determine HTTP status code based on error type
 */
function getStatusCodeForError(error: any): number {
  // If error has explicit status code, use it
  if (error.statusCode) {
    return error.statusCode;
  }
  
  // If it's a CrawlerError, determine from error type
  if (error instanceof CrawlerError) {
    switch (error.errorType) {
      case ErrorType.VALIDATION_ERROR:
      case ErrorType.INVALID_URL:
        return 400; // Bad Request
      case ErrorType.BROWSER_ERROR:
        return 503; // Service Unavailable
      case ErrorType.TIMEOUT:
      case ErrorType.NAVIGATION_ERROR:
      case ErrorType.UNKNOWN:
      default:
        return 500; // Internal Server Error
    }
  }
  
  // Default to 500 for unknown errors
  return 500;
}

/**
 * Determine error type from error object
 */
function getErrorType(error: any): ErrorType {
  if (error instanceof CrawlerError) {
    return error.errorType;
  }
  
  // Try to infer error type from error message
  const message = error.message?.toLowerCase() || '';
  
  if (message.includes('timeout') || message.includes('timed out')) {
    return ErrorType.TIMEOUT;
  }
  
  if (message.includes('navigation') || message.includes('navigate')) {
    return ErrorType.NAVIGATION_ERROR;
  }
  
  if (message.includes('invalid url') || message.includes('malformed')) {
    return ErrorType.INVALID_URL;
  }
  
  if (message.includes('browser') || message.includes('chromium')) {
    return ErrorType.BROWSER_ERROR;
  }
  
  return ErrorType.UNKNOWN;
}

/**
 * Error handling middleware
 * 
 * Catches all unhandled errors in the application and returns
 * a consistent error response format.
 * 
 * Requirements:
 * - Catch unhandled errors (12.1)
 * - Return consistent error response format (12.2)
 * - Log errors with stack traces (12.3, 12.5)
 * - Prevent service crashes (12.4)
 */
export function errorHandler(
  err: Error | CrawlerError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const NODE_ENV = process.env.NODE_ENV || 'development';
  
  // Extract error details
  const statusCode = getStatusCodeForError(err);
  const errorType = getErrorType(err);
  const url = (err as CrawlerError).url || req.body?.url || req.query?.url;
  
  // Log error with full context and stack trace
  logger.error('Unhandled error in crawler service', {
    error: err.message,
    errorType,
    statusCode,
    stack: err.stack,
    url,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
    headers: {
      'user-agent': req.headers['user-agent'],
      'content-type': req.headers['content-type']
    }
  });
  
  // Build error response
  const errorResponse: ErrorResponse = {
    success: false,
    error: err.message || 'Internal server error',
    errorType: errorType.toString()
  };
  
  // Add URL if available
  if (url) {
    errorResponse.url = url;
  }
  
  // In development mode, include additional debug information
  if (NODE_ENV === 'development') {
    errorResponse.message = err.message;
    errorResponse.stack = err.stack;
  }
  
  // Send error response
  res.status(statusCode).json(errorResponse);
}

/**
 * Async error wrapper
 * 
 * Wraps async route handlers to catch errors and pass them to error middleware
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 Not Found handler
 * 
 * Handles requests to unknown routes
 */
export function notFoundHandler(req: Request, res: Response): void {
  logger.warn('Route not found', {
    path: req.path,
    method: req.method
  });
  
  res.status(404).json({
    success: false,
    error: 'Not found',
    errorType: 'NOT_FOUND',
    path: req.path
  });
}

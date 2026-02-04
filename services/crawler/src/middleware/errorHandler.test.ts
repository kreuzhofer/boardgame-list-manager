import { Request, Response, NextFunction } from 'express';
import { errorHandler, CrawlerError, ErrorType, notFoundHandler } from './errorHandler';
import logger from '../utils/logger';

// Mock logger
jest.mock('../utils/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
}));

describe('Error Handler Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mock request
    mockRequest = {
      path: '/test',
      method: 'POST',
      body: { url: 'https://example.com' },
      query: {},
      headers: {
        'user-agent': 'test-agent',
        'content-type': 'application/json'
      }
    };
    
    // Setup mock response
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockResponse = {
      status: statusMock,
      json: jsonMock
    };
    
    // Setup mock next
    mockNext = jest.fn();
  });

  describe('errorHandler', () => {
    it('should handle CrawlerError with correct status code', () => {
      const error = new CrawlerError(
        'Test error',
        ErrorType.INVALID_URL,
        400,
        'https://example.com'
      );
      
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Test error',
          errorType: 'INVALID_URL',
          url: 'https://example.com'
        })
      );
    });

    it('should handle generic Error and infer error type', () => {
      const error = new Error('Navigation timeout');
      
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Navigation timeout',
          errorType: 'TIMEOUT'
        })
      );
    });

    it('should log error with full context and stack trace', () => {
      const error = new Error('Test error');
      
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(logger.error).toHaveBeenCalledWith(
        'Unhandled error in crawler service',
        expect.objectContaining({
          error: 'Test error',
          stack: expect.any(String),
          path: '/test',
          method: 'POST',
          body: { url: 'https://example.com' }
        })
      );
    });

    it('should return 503 for browser errors', () => {
      const error = new CrawlerError(
        'Browser crashed',
        ErrorType.BROWSER_ERROR,
        503
      );
      
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(statusMock).toHaveBeenCalledWith(503);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          errorType: 'BROWSER_ERROR'
        })
      );
    });

    it('should include debug info in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const error = new Error('Test error');
      
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Test error',
          stack: expect.any(String)
        })
      );
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should not include debug info in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const error = new Error('Test error');
      
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      const callArgs = jsonMock.mock.calls[0][0];
      expect(callArgs.message).toBeUndefined();
      expect(callArgs.stack).toBeUndefined();
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('notFoundHandler', () => {
    it('should return 404 for unknown routes', () => {
      mockRequest = {
        ...mockRequest,
        path: '/unknown',
        method: 'GET'
      };
      
      notFoundHandler(mockRequest as Request, mockResponse as Response);
      
      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Not found',
        errorType: 'NOT_FOUND',
        path: '/unknown'
      });
    });

    it('should log route not found warning', () => {
      mockRequest = {
        ...mockRequest,
        path: '/unknown',
        method: 'GET'
      };
      
      notFoundHandler(mockRequest as Request, mockResponse as Response);
      
      expect(logger.warn).toHaveBeenCalledWith(
        'Route not found',
        expect.objectContaining({
          path: '/unknown',
          method: 'GET'
        })
      );
    });
  });

  describe('CrawlerError', () => {
    it('should create error with all properties', () => {
      const error = new CrawlerError(
        'Test message',
        ErrorType.TIMEOUT,
        408,
        'https://example.com'
      );
      
      expect(error.message).toBe('Test message');
      expect(error.errorType).toBe(ErrorType.TIMEOUT);
      expect(error.statusCode).toBe(408);
      expect(error.url).toBe('https://example.com');
      expect(error.name).toBe('CrawlerError');
    });

    it('should use default values when not provided', () => {
      const error = new CrawlerError('Test message');
      
      expect(error.errorType).toBe(ErrorType.UNKNOWN);
      expect(error.statusCode).toBe(500);
      expect(error.url).toBeUndefined();
    });

    it('should maintain proper stack trace', () => {
      const error = new CrawlerError('Test message');
      
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('CrawlerError');
    });
  });
});

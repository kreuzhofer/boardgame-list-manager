import request from 'supertest';
import express, { Express } from 'express';
import fetchRouter from './fetch';
import pageFetcher from '../services/pageFetcher';
import { FetchResult, FetchError } from '../services/pageFetcher';
import { errorHandler, notFoundHandler } from '../middleware/errorHandler';

// Mock the pageFetcher
jest.mock('../services/pageFetcher', () => ({
  __esModule: true,
  default: {
    fetchPage: jest.fn()
  }
}));

const mockedPageFetcher = pageFetcher as jest.Mocked<typeof pageFetcher>;

describe('POST /fetch endpoint', () => {
  let app: Express;
  
  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/', fetchRouter);
    app.use(notFoundHandler);
    app.use(errorHandler);
    jest.clearAllMocks();
  });
  
  describe('Successful fetch', () => {
    it('should return 200 with HTML content for valid URL', async () => {
      const mockResult: FetchResult = {
        success: true,
        statusCode: 200,
        html: '<html><body>Test</body></html>',
        headers: { 'content-type': 'text/html' },
        url: 'https://example.com',
        loadTime: 100
      };
      
      mockedPageFetcher.fetchPage.mockResolvedValue(mockResult);
      
      const response = await request(app)
        .post('/')
        .send({ url: 'https://example.com' })
        .expect(200);
      
      expect(response.body).toEqual(mockResult);
      expect(mockedPageFetcher.fetchPage).toHaveBeenCalledWith('https://example.com', undefined);
    });

    it('should pass options to pageFetcher', async () => {
      const mockResult: FetchResult = {
        success: true,
        statusCode: 200,
        html: '<html><body>Test</body></html>',
        headers: {},
        url: 'https://example.com',
        loadTime: 100
      };
      
      mockedPageFetcher.fetchPage.mockResolvedValue(mockResult);
      
      const options = {
        timeout: 5000,
        waitForSelector: '.content',
        waitForNavigation: true
      };
      
      await request(app)
        .post('/')
        .send({ url: 'https://example.com', options })
        .expect(200);
      
      expect(mockedPageFetcher.fetchPage).toHaveBeenCalledWith('https://example.com', options);
    });
  });
  
  describe('Validation errors', () => {
    it('should return 400 when URL is missing', async () => {
      const response = await request(app)
        .post('/')
        .send({})
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.errorType).toBe('INVALID_URL');
      expect(response.body.error).toContain('URL is required');
      expect(mockedPageFetcher.fetchPage).not.toHaveBeenCalled();
    });

    it('should return 400 when URL is invalid', async () => {
      const response = await request(app)
        .post('/')
        .send({ url: 'not-a-valid-url' })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.errorType).toBe('INVALID_URL');
      expect(mockedPageFetcher.fetchPage).not.toHaveBeenCalled();
    });
    
    it('should return 400 when timeout is out of range', async () => {
      const response = await request(app)
        .post('/')
        .send({ 
          url: 'https://example.com',
          options: { timeout: 100 } // Too low
        })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.errorType).toBe('INVALID_URL');
      expect(response.body.error).toContain('Timeout must be between 1000 and 60000');
      expect(mockedPageFetcher.fetchPage).not.toHaveBeenCalled();
    });
  });
  
  describe('Fetch errors', () => {
    it('should return 500 for timeout errors', async () => {
      const mockError: FetchError = {
        success: false,
        error: 'Page load timeout',
        errorType: 'TIMEOUT',
        url: 'https://example.com'
      };
      
      mockedPageFetcher.fetchPage.mockResolvedValue(mockError);
      
      const response = await request(app)
        .post('/')
        .send({ url: 'https://example.com' })
        .expect(500);
      
      expect(response.body).toEqual(mockError);
    });

    it('should return 500 for navigation errors', async () => {
      const mockError: FetchError = {
        success: false,
        error: 'Navigation failed',
        errorType: 'NAVIGATION_ERROR',
        url: 'https://example.com'
      };
      
      mockedPageFetcher.fetchPage.mockResolvedValue(mockError);
      
      const response = await request(app)
        .post('/')
        .send({ url: 'https://example.com' })
        .expect(500);
      
      expect(response.body).toEqual(mockError);
    });
    
    it('should return 503 for browser errors', async () => {
      const mockError: FetchError = {
        success: false,
        error: 'Browser crashed',
        errorType: 'BROWSER_ERROR',
        url: 'https://example.com'
      };
      
      mockedPageFetcher.fetchPage.mockResolvedValue(mockError);
      
      const response = await request(app)
        .post('/')
        .send({ url: 'https://example.com' })
        .expect(503);
      
      expect(response.body).toEqual(mockError);
    });
  });
  
  describe('Unexpected errors', () => {
    it('should handle unexpected errors gracefully', async () => {
      mockedPageFetcher.fetchPage.mockRejectedValue(new Error('Unexpected error'));
      
      const response = await request(app)
        .post('/')
        .send({ url: 'https://example.com' })
        .expect(500);
      
      expect(response.body.success).toBe(false);
      expect(response.body.errorType).toBe('UNKNOWN');
      expect(response.body.error).toContain('Unexpected error');
    });
  });
});

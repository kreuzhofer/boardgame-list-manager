import * as fc from 'fast-check';
import request from 'supertest';
import express, { Express } from 'express';
import fetchRouter from './fetch';
import pageFetcher from '../services/pageFetcher';
import { FetchResult } from '../services/pageFetcher';

/**
 * **Feature: browser-crawler-service, Property 6: No business logic in crawler**
 * **Validates: Requirements 1.4, 1.5**
 * 
 * Property: For any HTML content returned by the crawler service, the content should be
 * unmodified raw HTML with no parsing, extraction, or transformation applied.
 * 
 * This test verifies that the crawler service acts as a "dumb fetcher" that returns
 * raw HTML without any business logic or content manipulation.
 */

// Mock the pageFetcher to control responses
jest.mock('../services/pageFetcher', () => ({
  __esModule: true,
  default: {
    fetchPage: jest.fn()
  }
}));

const mockedPageFetcher = pageFetcher as jest.Mocked<typeof pageFetcher>;

describe('Property 6: No business logic in crawler', () => {
  let app: Express;
  
  beforeEach(() => {
    // Set up Express app with the fetch router
    app = express();
    app.use(express.json());
    app.use('/', fetchRouter);
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  it('should return unmodified HTML content without parsing or transformation', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary HTML content
        fc.string({ minLength: 10, maxLength: 5000 }),
        async (htmlContent) => {
          // Mock the pageFetcher to return the generated HTML
          const mockResult: FetchResult = {
            success: true,
            statusCode: 200,
            html: htmlContent,
            headers: { 'content-type': 'text/html' },
            url: 'https://example.com',
            loadTime: 100
          };
          
          mockedPageFetcher.fetchPage.mockResolvedValue(mockResult);
          
          // Make request to the /fetch endpoint
          const response = await request(app)
            .post('/')
            .send({ url: 'https://example.com' })
            .expect(200);
          
          // Verify the HTML is returned exactly as received from pageFetcher
          expect(response.body.success).toBe(true);
          expect(response.body.html).toBe(htmlContent);
          
          // Verify the HTML has not been modified in any way
          // The length should be exactly the same
          expect(response.body.html.length).toBe(htmlContent.length);
          
          // Verify no parsing or extraction occurred
          // The response should contain the raw HTML, not extracted data
          expect(typeof response.body.html).toBe('string');
          
          // Verify no business logic fields were added
          const responseKeys = Object.keys(response.body);
          const expectedKeys = ['success', 'statusCode', 'html', 'headers', 'url', 'loadTime'];
          expect(responseKeys.sort()).toEqual(expectedKeys.sort());
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not extract or parse specific data from HTML', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate HTML with various patterns that might tempt parsing
        fc.record({
          title: fc.string(),
          price: fc.float(),
          productName: fc.string(),
          description: fc.string()
        }),
        async (data) => {
          // Create HTML with structured data
          const htmlContent = `
            <html>
              <head><title>${data.title}</title></head>
              <body>
                <h1>${data.productName}</h1>
                <p class="price">$${data.price}</p>
                <p class="description">${data.description}</p>
              </body>
            </html>
          `;
          
          const mockResult: FetchResult = {
            success: true,
            statusCode: 200,
            html: htmlContent,
            headers: { 'content-type': 'text/html' },
            url: 'https://example.com/product',
            loadTime: 150
          };
          
          mockedPageFetcher.fetchPage.mockResolvedValue(mockResult);
          
          const response = await request(app)
            .post('/')
            .send({ url: 'https://example.com/product' })
            .expect(200);
          
          // Verify the response contains raw HTML, not extracted data
          expect(response.body.html).toBe(htmlContent);
          
          // Verify no extracted fields like "title", "price", "productName" exist
          expect(response.body.title).toBeUndefined();
          expect(response.body.price).toBeUndefined();
          expect(response.body.productName).toBeUndefined();
          expect(response.body.description).toBeUndefined();
          
          // Only the standard fetch response fields should exist
          expect(Object.keys(response.body)).toEqual(
            expect.arrayContaining(['success', 'statusCode', 'html', 'headers', 'url', 'loadTime'])
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

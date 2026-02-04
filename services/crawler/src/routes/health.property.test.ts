import request from 'supertest';
import express from 'express';
import * as fc from 'fast-check';
import healthRouter from './health';
import browserManager from '../services/browserManager';

/**
 * Property-Based Tests for Health Endpoint
 * 
 * **Feature: browser-crawler-service, Property 7: Health check accuracy**
 * **Validates: Requirements 11.1, 11.2**
 * 
 * Property: For any time when the browser is operational, the /health endpoint 
 * should return status 'healthy' with browser.connected true
 */

describe('Health Endpoint - Property Tests', () => {
  let app: express.Application;
  
  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/', healthRouter);
  });
  
  afterAll(async () => {
    // Clean up browser if it was launched
    await browserManager.close();
  });
  
  /**
   * Property 7: Health check accuracy
   * 
   * When the browser is operational (connected), the health endpoint should:
   * 1. Return status 'healthy'
   * 2. Return browser.connected as true
   * 3. Return HTTP status code 200
   * 4. Include uptime and timestamp
   */
  test('Property 7: Health check returns healthy status when browser is operational', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null), // We don't need random input, just need to run the test multiple times
        async () => {
          // Ensure browser is launched and operational
          await browserManager.launchBrowser();
          
          // Verify browser is connected
          const isConnected = browserManager.isConnected();
          
          // Make health check request
          const response = await request(app)
            .get('/')
            .expect('Content-Type', /json/);
          
          // If browser is operational, health check should reflect that
          if (isConnected) {
            // Should return 200 OK
            expect(response.status).toBe(200);
            
            // Should return healthy status
            expect(response.body.status).toBe('healthy');
            
            // Should report browser as connected
            expect(response.body.browser.connected).toBe(true);
            
            // Should include browser version
            expect(response.body.browser.version).toBeTruthy();
            expect(typeof response.body.browser.version).toBe('string');
            
            // Should include uptime (non-negative number)
            expect(response.body.uptime).toBeGreaterThanOrEqual(0);
            expect(typeof response.body.uptime).toBe('number');
            
            // Should include timestamp
            expect(response.body.timestamp).toBeTruthy();
            expect(typeof response.body.timestamp).toBe('string');
            
            // Timestamp should be valid ISO string
            const timestamp = new Date(response.body.timestamp);
            expect(timestamp.toString()).not.toBe('Invalid Date');
          }
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified in design
    );
  });
  
  /**
   * Additional property: Health check responds within timeout
   * 
   * The health endpoint should always respond within 1 second
   */
  test('Property: Health check responds within 1 second', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null),
        async () => {
          const startTime = Date.now();
          
          await request(app)
            .get('/');
          
          const duration = Date.now() - startTime;
          
          // Should respond within 1000ms (1 second)
          expect(duration).toBeLessThan(1000);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Property: Health check returns unhealthy when browser is not operational
   * 
   * When browser is not connected, health check should return unhealthy status
   */
  test('Property: Health check returns unhealthy status when browser is not operational', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null),
        async () => {
          // Close browser to make it non-operational
          await browserManager.close();
          
          // Verify browser is not connected
          const isConnected = browserManager.isConnected();
          
          // Make health check request
          const response = await request(app)
            .get('/')
            .expect('Content-Type', /json/);
          
          // If browser is not operational, health check should reflect that
          if (!isConnected) {
            // Should return 503 Service Unavailable
            expect(response.status).toBe(503);
            
            // Should return unhealthy status
            expect(response.body.status).toBe('unhealthy');
            
            // Should report browser as not connected
            expect(response.body.browser.connected).toBe(false);
            
            // Should not have browser version
            expect(response.body.browser.version).toBeNull();
            
            // Should still include uptime
            expect(response.body.uptime).toBeGreaterThanOrEqual(0);
            
            // Should still include timestamp
            expect(response.body.timestamp).toBeTruthy();
          }
          
          // Re-launch browser for next iteration
          await browserManager.launchBrowser();
        }
      ),
      { numRuns: 10 } // Fewer runs since we're launching/closing browser
    );
  });
});

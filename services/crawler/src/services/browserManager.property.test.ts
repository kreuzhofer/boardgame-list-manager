import * as fc from 'fast-check';
import browserManager from './browserManager';

/**
 * Feature: browser-crawler-service, Property 4: Browser instance reuse
 * Validates: Requirements 8.1, 8.2
 * 
 * Property: For any sequence of fetch requests, the crawler service should reuse 
 * the same browser instance across all requests (not launch a new browser per request)
 */
describe('Property 4: Browser instance reuse', () => {
  // Clean up after all tests
  afterAll(async () => {
    await browserManager.close();
  });

  it('should reuse the same browser instance across multiple getBrowser calls', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 10 }), // Number of sequential calls
        async (numCalls) => {
          // Get browser instance multiple times
          const browsers = [];
          for (let i = 0; i < numCalls; i++) {
            const browser = await browserManager.getBrowser();
            browsers.push(browser);
          }

          // All browser instances should be the same object (reference equality)
          const firstBrowser = browsers[0];
          const allSame = browsers.every(browser => browser === firstBrowser);

          // Clean up
          await browserManager.close();

          return allSame;
        }
      ),
      { numRuns: 100 }
    );
  }, 60000); // 60 second timeout for browser operations

  it('should reuse browser instance even after waiting between calls', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 5 }), // Number of calls
        fc.integer({ min: 10, max: 100 }), // Wait time in ms
        async (numCalls, waitTime) => {
          const browsers = [];
          
          for (let i = 0; i < numCalls; i++) {
            const browser = await browserManager.getBrowser();
            browsers.push(browser);
            
            // Wait between calls
            if (i < numCalls - 1) {
              await new Promise(resolve => setTimeout(resolve, waitTime));
            }
          }

          // All browser instances should be the same
          const firstBrowser = browsers[0];
          const allSame = browsers.every(browser => browser === firstBrowser);

          // Clean up
          await browserManager.close();

          return allSame;
        }
      ),
      { numRuns: 100 }
    );
  }, 60000);

  it('should launch a new browser only after the previous one is closed', async () => {
    // Get first browser
    const browser1 = await browserManager.getBrowser();
    const version1 = await browser1.version();

    // Close it
    await browserManager.close();

    // Get second browser - should be a new instance
    const browser2 = await browserManager.getBrowser();
    const version2 = await browser2.version();

    // They should not be the same object reference
    const isDifferentInstance = browser1 !== browser2;
    
    // But they should have the same version (same browser type)
    const isSameVersion = version1 === version2;

    // Clean up
    await browserManager.close();

    expect(isDifferentInstance).toBe(true);
    expect(isSameVersion).toBe(true);
  }, 30000);

  it('should handle concurrent getBrowser calls without launching multiple browsers', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 10 }), // Number of concurrent calls
        async (numCalls) => {
          // Make concurrent calls to getBrowser
          const browserPromises = Array.from({ length: numCalls }, () => 
            browserManager.getBrowser()
          );

          const browsers = await Promise.all(browserPromises);

          // All should be the same instance
          const firstBrowser = browsers[0];
          const allSame = browsers.every(browser => browser === firstBrowser);

          // Clean up
          await browserManager.close();

          return allSame;
        }
      ),
      { numRuns: 100 }
    );
  }, 60000);
});

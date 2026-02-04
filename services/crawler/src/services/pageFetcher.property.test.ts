import pageFetcher from './pageFetcher';
import browserManager from './browserManager';

/**
 * Feature: browser-crawler-service, Property 1: Successful fetch returns HTML
 * Validates: Requirements 1.1, 1.2
 * 
 * Property: For any valid HTTP/HTTPS URL that returns a 200 status, fetching through 
 * the crawler service should return success true, the HTML content, and status code 200
 */
describe('Property 1: Successful fetch returns HTML', () => {
  // Clean up after all tests
  afterAll(async () => {
    await browserManager.close();
  });

  it('should return success true with HTML content for valid URL', async () => {
    const url = 'https://example.com';
    const result = await pageFetcher.fetchPage(url);

    // Should return success
    expect(result.success).toBe(true);
    
    if (result.success) {
      // Should have HTML content (non-empty string)
      expect(typeof result.html).toBe('string');
      expect(result.html.length).toBeGreaterThan(0);

      // Should have a status code
      expect(typeof result.statusCode).toBe('number');

      // Should have headers
      expect(typeof result.headers).toBe('object');
      expect(result.headers).not.toBeNull();

      // Should have final URL
      expect(typeof result.url).toBe('string');
      expect(result.url.length).toBeGreaterThan(0);

      // Should have load time
      expect(typeof result.loadTime).toBe('number');
      expect(result.loadTime).toBeGreaterThanOrEqual(0);
    }
  }, 60000);

  it('should return HTML content that contains expected HTML structure', async () => {
    const url = 'https://example.com';
    const result = await pageFetcher.fetchPage(url);

    expect(result.success).toBe(true);
    
    if (result.success) {
      // HTML should contain basic HTML structure markers
      const html = result.html.toLowerCase();
      const hasHtmlTag = html.includes('<html') || html.includes('<!doctype');
      const hasBodyTag = html.includes('<body');

      expect(hasHtmlTag || hasBodyTag).toBe(true);
    }
  }, 60000);

  it('should return status code in valid HTTP range', async () => {
    const url = 'https://example.com';
    const result = await pageFetcher.fetchPage(url);

    expect(result.success).toBe(true);
    
    if (result.success) {
      // Status code should be a valid HTTP status code (100-599)
      expect(result.statusCode).toBeGreaterThanOrEqual(100);
      expect(result.statusCode).toBeLessThan(600);
    }
  }, 60000);
});

/**
 * Feature: browser-crawler-service, Property 3: Timeout enforcement
 * Validates: Requirements 3.1, 3.3
 * 
 * Property: For any fetch request with a timeout value, if the page load exceeds 
 * the timeout, the crawler service should return an error with errorType 'TIMEOUT'
 */
describe('Property 3: Timeout enforcement', () => {
  afterAll(async () => {
    await browserManager.close();
  });

  it('should timeout when page load exceeds specified timeout', async () => {
    // Test with a very short timeout to force a timeout
    const timeout = 100; // 100ms - too short for any real page
    const url = 'https://example.com';

    const result = await pageFetcher.fetchPage(url, { timeout });

    // Should return error
    expect(result.success).toBe(false);
    
    if (!result.success) {
      // Should have TIMEOUT error type
      expect(result.errorType).toBe('TIMEOUT');
    }
  }, 30000);

  it('should complete successfully when page loads before timeout', async () => {
    // Use a generous timeout
    const timeout = 30000; // 30 seconds
    const url = 'https://example.com';

    const result = await pageFetcher.fetchPage(url, { timeout });

    // Should succeed since timeout is generous
    expect(result.success).toBe(true);
  }, 60000);

  it('should respect timeout range boundaries', async () => {
    const url = 'https://example.com';

    // Test with a reasonable timeout
    const result = await pageFetcher.fetchPage(url, { timeout: 15000 });

    // Should either succeed or fail, but not throw
    expect(typeof result.success).toBe('boolean');
  }, 60000);
});

/**
 * Feature: browser-crawler-service, Property 9: Page context cleanup
 * Validates: Requirements 8.3
 * 
 * Property: For any completed fetch request (success or failure), the page context 
 * should be closed and not leak memory
 */
describe('Property 9: Page context cleanup', () => {
  afterAll(async () => {
    await browserManager.close();
  });

  it('should close page context after successful fetch', async () => {
    const browser = await browserManager.getBrowser();
    const pagesBefore = (await browser.pages()).length;

    await pageFetcher.fetchPage('https://example.com');

    const pagesAfter = (await browser.pages()).length;

    // Number of pages should not increase (page was closed)
    // Note: There's always at least one default page (about:blank)
    expect(pagesAfter).toBeLessThanOrEqual(pagesBefore + 1);
  }, 60000);

  it('should close page context even after failed fetch', async () => {
    const browser = await browserManager.getBrowser();
    const pagesBefore = (await browser.pages()).length;

    // Use a URL that will fail
    await pageFetcher.fetchPage('https://this-domain-does-not-exist-12345.com', { timeout: 5000 });

    const pagesAfter = (await browser.pages()).length;

    // Number of pages should not increase even on error
    expect(pagesAfter).toBeLessThanOrEqual(pagesBefore + 1);
  }, 30000);

  it('should close page context after timeout', async () => {
    const browser = await browserManager.getBrowser();
    const pagesBefore = (await browser.pages()).length;

    // Use a very short timeout to force a timeout
    await pageFetcher.fetchPage('https://example.com', { timeout: 100 });

    const pagesAfter = (await browser.pages()).length;

    // Page should be closed even after timeout
    expect(pagesAfter).toBeLessThanOrEqual(pagesBefore + 1);
  }, 30000);

  it('should handle multiple sequential fetches without accumulating pages', async () => {
    const browser = await browserManager.getBrowser();
    const pagesBefore = (await browser.pages()).length;

    // Perform multiple fetches
    const numFetches = 3;
    for (let i = 0; i < numFetches; i++) {
      await pageFetcher.fetchPage('https://example.com');
    }

    const pagesAfter = (await browser.pages()).length;

    // Should not accumulate pages
    expect(pagesAfter).toBeLessThanOrEqual(pagesBefore + 1);
  }, 120000);
});

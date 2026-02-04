import { Browser, Page } from 'puppeteer';
import browserManager from './browserManager';
import { getNextProfile } from './browserProfiles';
import { disableProxyForSession, getProxyConfig } from '../utils/proxyConfig';
import logger from '../utils/logger';

/**
 * Options for fetching a page
 */
export interface FetchOptions {
  timeout?: number;              // Timeout in ms (1000-60000)
  waitForSelector?: string;      // CSS selector to wait for
  waitForNavigation?: boolean;   // Wait for navigation (default: true)
}

/**
 * Result of a successful page fetch
 */
export interface FetchResult {
  success: true;
  statusCode: number;
  html: string;
  headers: Record<string, string>;
  url: string;
  loadTime: number;
}

/**
 * Result of a failed page fetch
 */
export interface FetchError {
  success: false;
  error: string;
  errorType: 'TIMEOUT' | 'NAVIGATION_ERROR' | 'INVALID_URL' | 'BROWSER_ERROR' | 'UNKNOWN';
  url: string;
}

/**
 * PageFetcher - Fetches web pages using Puppeteer
 * 
 * Responsibilities:
 * - Create new page context for each request
 * - Navigate to URL with timeout handling
 * - Wait for page load or specific selector
 * - Extract HTML content and metadata
 * - Close page context after completion
 * - Handle navigation errors and timeouts
 */
class PageFetcher {
  private readonly DEFAULT_TIMEOUT = 30000; // 30 seconds
  
  /**
   * Fetch a page and return its HTML content
   * @param url The URL to fetch
   * @param options Fetch options
   * @returns Fetch result or error
   */
  async fetchPage(url: string, options: FetchOptions = {}): Promise<FetchResult | FetchError> {
    let attemptedProxyFallback = false;

    logger.info('Fetching page', { url, options });

    while (true) {
      const startTime = Date.now();
      let page: Page | null = null;

      try {
        // Get browser instance
        const browser: Browser = await browserManager.getBrowser();

        // Create new page context
        page = await browser.newPage();
        logger.debug('Created new page context', { url });

        const profile = getNextProfile();
        const proxyConfig = getProxyConfig();

        logger.debug('Applying browser profile', { url, profile: profile.id });

        // Set timeout
        const timeout = options.timeout || this.DEFAULT_TIMEOUT;
        page.setDefaultTimeout(timeout);

        if (proxyConfig) {
          await page.authenticate({
            username: proxyConfig.username,
            password: proxyConfig.password,
          });
        }

        // Enhanced anti-detection: Set realistic browser properties
        await page.evaluateOnNewDocument((profileData) => {
          const windowRef = globalThis as any;
          const navigatorRef = windowRef.navigator;
          const navigatorProto = Object.getPrototypeOf(navigatorRef);

          Object.defineProperty(navigatorProto, 'webdriver', {
            get: () => false,
          });

          Object.defineProperty(navigatorProto, 'plugins', {
            get: () => [1, 2, 3, 4, 5],
          });

          Object.defineProperty(navigatorProto, 'languages', {
            get: () => profileData.languages,
          });

          Object.defineProperty(navigatorProto, 'platform', {
            get: () => profileData.platform,
          });

          Object.defineProperty(navigatorProto, 'vendor', {
            get: () => profileData.vendor,
          });

          Object.defineProperty(navigatorProto, 'hardwareConcurrency', {
            get: () => profileData.hardwareConcurrency,
          });

          Object.defineProperty(navigatorProto, 'deviceMemory', {
            get: () => profileData.deviceMemory,
          });

          windowRef.chrome = {
            runtime: {},
          } as any;

          const originalQuery = navigatorRef.permissions.query;
          navigatorRef.permissions.query = (parameters: any) => (
            parameters.name === 'notifications'
              ? Promise.resolve({ state: 'default' })
              : originalQuery(parameters)
          );
        }, profile);

        await page.setViewport({
          width: profile.viewport.width,
          height: profile.viewport.height,
          deviceScaleFactor: profile.viewport.deviceScaleFactor,
        });

        try {
          await page.emulateTimezone(profile.timezone);
        } catch (error) {
          logger.debug('Timezone emulation failed, continuing', { url, error });
        }

        // Set realistic headers
        await page.setExtraHTTPHeaders({
          'Accept-Language': profile.acceptLanguage,
          'Accept-Encoding': 'gzip, deflate, br',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-User': '?1',
          'Sec-Fetch-Dest': 'document',
          'Upgrade-Insecure-Requests': '1',
        });

        // Set a realistic user agent
        await page.setUserAgent(profile.userAgent);

        // Navigate to URL
        const navigationOptions: any = {
          timeout,
          waitUntil: options.waitForNavigation !== false ? 'networkidle2' : 'domcontentloaded'
        };

        const response = await page.goto(url, navigationOptions);

        if (!response) {
          throw new Error('Navigation failed: no response received');
        }

        // Add a small random delay to mimic human behavior (100-500ms)
        const randomDelay = Math.floor(Math.random() * 400) + 100;
        await new Promise(resolve => setTimeout(resolve, randomDelay));
        logger.debug('Added human-like delay', { url, delay: randomDelay });

        // Wait for selector if specified
        if (options.waitForSelector) {
          try {
            await page.waitForSelector(options.waitForSelector, { timeout });
            logger.debug('Selector found', { url, selector: options.waitForSelector });
          } catch (error) {
            // Log warning but continue - return HTML anyway as per requirements
            logger.warn(`Selector not found within timeout, returning HTML anyway`, { 
              url, 
              selector: options.waitForSelector 
            });
          }
        }

        // Extract HTML content
        const html = await page.content();

        // Extract status code
        const statusCode = response.status();

        // Extract headers
        const responseHeaders = response.headers();
        const headers: Record<string, string> = {};
        for (const [key, value] of Object.entries(responseHeaders)) {
          headers[key] = value;
        }

        // Get final URL (after redirects)
        const finalUrl = page.url();

        // Calculate load time
        const loadTime = Date.now() - startTime;

        // Close page context
        await page.close();
        page = null;

        logger.info('Successfully fetched page', { 
          url, 
          statusCode, 
          loadTime,
          htmlLength: html.length,
          finalUrl: finalUrl !== url ? finalUrl : undefined
        });

        return {
          success: true,
          statusCode,
          html,
          headers,
          url: finalUrl,
          loadTime
        };

      } catch (error: any) {
        // Ensure page is closed even on error
        if (page) {
          try {
            await page.close();
          } catch (closeError) {
            logger.error('Error closing page after failure', { 
              url,
              error: closeError instanceof Error ? closeError.message : closeError 
            });
          }
        }

        if (!attemptedProxyFallback && this.isProxyTunnelError(error) && getProxyConfig()) {
          attemptedProxyFallback = true;
          logger.warn('Proxy tunnel failed, disabling proxy for session and retrying', { url });
          disableProxyForSession();
          await browserManager.close();
          continue;
        }

        // Determine error type
        let errorType: FetchError['errorType'] = 'UNKNOWN';
        let errorMessage = error.message || 'Unknown error occurred';

        if (error.message?.includes('Timeout') || error.message?.includes('timeout')) {
          errorType = 'TIMEOUT';
          errorMessage = `Page load timeout after ${options.timeout || this.DEFAULT_TIMEOUT}ms`;
        } else if (error.message?.includes('Navigation') || error.message?.includes('net::')) {
          errorType = 'NAVIGATION_ERROR';
        } else if (error.message?.includes('Browser') || error.message?.includes('Target closed')) {
          errorType = 'BROWSER_ERROR';
        }

        const duration = Date.now() - startTime;
        logger.error('Failed to fetch page', { 
          url, 
          errorType,
          errorMessage,
          duration,
          stack: error.stack
        });

        return {
          success: false,
          error: errorMessage,
          errorType,
          url
        };
      }
    }
  }

  private isProxyTunnelError(error: any): boolean {
    const message = error?.message || '';
    return (
      message.includes('ERR_TUNNEL_CONNECTION_FAILED') ||
      message.includes('ERR_PROXY_CONNECTION_FAILED') ||
      message.includes('Proxy tunneling failed')
    );
  }
}

// Export singleton instance
export default new PageFetcher();

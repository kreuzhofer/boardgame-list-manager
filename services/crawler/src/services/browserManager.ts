import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser } from 'puppeteer';
import { getProxyConfig, isProxyDisabledForSession } from '../utils/proxyConfig';
import logger from '../utils/logger';

// Add stealth plugin to avoid bot detection
puppeteer.use(StealthPlugin());

/**
 * Browser configuration interface
 */
interface BrowserConfig {
  headless: boolean;
  args: string[];
  defaultViewport: {
    width: number;
    height: number;
  };
}

/**
 * BrowserManager - Manages a singleton Puppeteer browser instance
 * 
 * Responsibilities:
 * - Launch browser with stealth configuration on startup
 * - Maintain single browser instance for all requests
 * - Detect and recover from browser crashes
 * - Gracefully close browser on shutdown
 */
class BrowserManager {
  private browser: Browser | null = null;
  private isLaunching: boolean = false;
  private launchPromise: Promise<Browser> | null = null;
  private baseArgs: string[];
  private defaultViewport: BrowserConfig['defaultViewport'];
  
  constructor() {
    // Browser configuration with enhanced anti-detection
    this.baseArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920,1080',
      // Additional anti-detection flags
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor'
    ];

    this.defaultViewport = {
      width: 1920,
      height: 1080
    };
    
    // Set up graceful shutdown handlers
    this.setupShutdownHandlers();
  }
  
  /**
   * Launch the browser with stealth plugin configuration
   * @returns The launched browser instance
   */
  async launchBrowser(): Promise<Browser> {
    // If already launching, wait for that to complete
    if (this.isLaunching && this.launchPromise) {
      logger.debug('Browser launch already in progress, waiting...');
      return this.launchPromise;
    }
    
    // If browser already exists and is connected, return it
    if (this.browser && this.browser.isConnected()) {
      logger.debug('Browser already running, reusing instance');
      return this.browser;
    }
    
    const config = this.buildConfig();
    this.isLaunching = true;
    logger.info('Launching browser...', { config });
    
    try {
      this.launchPromise = puppeteer.launch(config);
      this.browser = await this.launchPromise;
      
      const version = await this.browser.version();
      logger.info('Browser launched successfully', { version });
      
      // Set up crash detection
      this.browser.on('disconnected', () => {
        logger.warn('Browser disconnected unexpectedly, will relaunch on next request');
        this.browser = null;
      });
      
      return this.browser;
    } catch (error) {
      logger.error('Failed to launch browser', { error: error instanceof Error ? error.message : error });
      this.browser = null;
      throw error;
    } finally {
      this.isLaunching = false;
      this.launchPromise = null;
    }
  }

  private buildConfig(): BrowserConfig {
    const proxyConfig = getProxyConfig();
    const args = [...this.baseArgs];

    if (proxyConfig) {
      args.push(`--proxy-server=${proxyConfig.server}`);
      logger.info('Proxy configuration enabled', {
        server: proxyConfig.server,
        username: proxyConfig.username,
      });
    } else if (isProxyDisabledForSession()) {
      logger.warn('Proxy configuration disabled for session');
    }

    return {
      headless: true,
      args,
      defaultViewport: this.defaultViewport,
    };
  }
  
  /**
   * Get the browser instance, launching it if necessary
   * @returns The browser instance
   */
  async getBrowser(): Promise<Browser> {
    // If browser exists and is connected, return it
    if (this.browser && this.browser.isConnected()) {
      return this.browser;
    }
    
    // Otherwise, launch a new browser
    return this.launchBrowser();
  }
  
  /**
   * Check if browser is currently operational
   * @returns True if browser is connected
   */
  isConnected(): boolean {
    return this.browser !== null && this.browser.isConnected();
  }
  
  /**
   * Get browser version information
   * @returns Browser version or null if not connected
   */
  async getVersion(): Promise<string | null> {
    if (!this.isConnected()) {
      return null;
    }
    
    try {
      return await this.browser!.version();
    } catch (error) {
      logger.error('Failed to get browser version', { error: error instanceof Error ? error.message : error });
      return null;
    }
  }
  
  /**
   * Gracefully close the browser
   */
  async close(): Promise<void> {
    if (this.browser) {
      try {
        logger.info('Closing browser...');
        await this.browser.close();
        logger.info('Browser closed successfully');
      } catch (error) {
        logger.error('Error closing browser', { error: error instanceof Error ? error.message : error });
      } finally {
        this.browser = null;
      }
    }
  }
  
  /**
   * Set up handlers for graceful shutdown on SIGTERM/SIGINT
   */
  private setupShutdownHandlers(): void {
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      await this.close();
      process.exit(0);
    };
    
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }
}

// Export singleton instance
export default new BrowserManager();

import { config } from '../config';

export type FetchProvider = 'scraperapi' | 'crawler' | 'direct';

export interface FetchResult {
  html: string;
  bytes: number;
  provider: FetchProvider;
  statusCode: number;
  url: string;
}

/**
 * Custom error class for ScraperAPI-specific errors
 */
export class ScraperApiError extends Error {
  constructor(
    public statusCode: number,
    public isFatal: boolean,
    public shouldRetry: boolean,
    message: string
  ) {
    super(message);
    this.name = 'ScraperApiError';
  }
}

class PageFetchService {
  private readonly scraperApiKey: string;
  private readonly crawlerUrl: string;
  private scraperApiDisabledUntil: number | null = null;

  constructor() {
    this.scraperApiKey = config.bggImages.scraperApiKey;
    this.crawlerUrl = config.bggImages.crawlerUrl.trim();
  }

  async fetchBggPage(bggId: number): Promise<FetchResult> {
    const bggUrl = `https://boardgamegeek.com/boardgame/${bggId}`;
    const scraperAvailable = this.scraperApiKey.length > 0 && !this.isScraperApiDisabled();
    const crawlerAvailable = this.crawlerUrl.length > 0;

    if (scraperAvailable && crawlerAvailable) {
      try {
        return await this.fetchViaScraperApi(bggUrl);
      } catch (error) {
        if (error instanceof ScraperApiError && error.statusCode === 403) {
          return await this.fetchViaCrawler(bggUrl);
        }
        throw error;
      }
    }

    if (scraperAvailable) {
      return await this.fetchViaScraperApi(bggUrl);
    }

    if (crawlerAvailable) {
      return await this.fetchViaCrawler(bggUrl);
    }

    return await this.fetchDirect(bggUrl);
  }

  private async fetchViaScraperApi(bggUrl: string): Promise<FetchResult> {
    const fetchUrl = `http://api.scraperapi.com?api_key=${this.scraperApiKey}&url=${encodeURIComponent(bggUrl)}`;
    const response = await fetch(fetchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    if (!response.ok) {
      const statusCode = response.status;

      // 403: Credits exhausted or unauthorized - fatal, stop immediately
      if (statusCode === 403) {
        this.disableScraperApiForToday();
        throw new ScraperApiError(
          statusCode,
          true, // fatal
          false, // don't retry
          'ScraperAPI credits exhausted or API key invalid'
        );
      }

      // 429: Too many concurrent requests - retry after delay
      if (statusCode === 429) {
        throw new ScraperApiError(
          statusCode,
          false, // not fatal
          true, // should retry
          'ScraperAPI rate limit exceeded'
        );
      }

      // 500: Failed after retries - not fatal, but don't retry (ScraperAPI already retried)
      if (statusCode === 500) {
        throw new ScraperApiError(
          statusCode,
          false, // not fatal
          false, // don't retry (ScraperAPI already retried for 70s)
          'ScraperAPI failed to fetch page after retries'
        );
      }

      // 400: Malformed request - not fatal, don't retry
      if (statusCode === 400) {
        throw new ScraperApiError(
          statusCode,
          false,
          false,
          'Malformed request to ScraperAPI'
        );
      }

      // Other errors
      throw new Error(`Failed to fetch BGG page via ScraperAPI: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    return {
      html,
      bytes: Buffer.byteLength(html, 'utf8'),
      provider: 'scraperapi',
      statusCode: response.status,
      url: response.url || bggUrl,
    };
  }

  private async fetchViaCrawler(bggUrl: string): Promise<FetchResult> {
    const baseUrl = this.crawlerUrl.replace(/\/+$/, '');
    const response = await fetch(`${baseUrl}/fetch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: bggUrl }),
    });

    let payload: any = null;
    try {
      payload = await response.json();
    } catch (error) {
      throw new Error(`Crawler returned non-JSON response (${response.status})`);
    }

    if (!response.ok || !payload?.success) {
      const errorMessage = payload?.error || response.statusText || 'Crawler request failed';
      throw new Error(`Crawler fetch failed: ${response.status} ${errorMessage}`);
    }

    const html = payload.html as string;
    return {
      html,
      bytes: Buffer.byteLength(html, 'utf8'),
      provider: 'crawler',
      statusCode: payload.statusCode,
      url: payload.url || bggUrl,
    };
  }

  private async fetchDirect(bggUrl: string): Promise<FetchResult> {
    const response = await fetch(bggUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch BGG page: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    return {
      html,
      bytes: Buffer.byteLength(html, 'utf8'),
      provider: 'direct',
      statusCode: response.status,
      url: response.url || bggUrl,
    };
  }

  private disableScraperApiForToday(): void {
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    this.scraperApiDisabledUntil = endOfDay.getTime();
  }

  private isScraperApiDisabled(): boolean {
    if (!this.scraperApiDisabledUntil) {
      return false;
    }

    if (Date.now() > this.scraperApiDisabledUntil) {
      this.scraperApiDisabledUntil = null;
      return false;
    }

    return true;
  }
}

export default new PageFetchService();

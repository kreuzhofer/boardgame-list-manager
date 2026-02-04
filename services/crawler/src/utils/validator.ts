/**
 * Request Validator
 * 
 * Validates incoming fetch requests to ensure they meet the required criteria
 * before attempting to fetch pages with the browser.
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export class RequestValidator {
  /**
   * Validate a URL to ensure it's a valid HTTP or HTTPS URL
   * 
   * @param url - The URL to validate
   * @returns ValidationResult indicating if the URL is valid
   */
  validateUrl(url: string | undefined): ValidationResult {
    // Check if URL is provided
    if (!url) {
      return {
        valid: false,
        error: 'URL is required'
      };
    }

    // Check if URL is a string
    if (typeof url !== 'string') {
      return {
        valid: false,
        error: 'URL must be a string'
      };
    }

    // Check if URL is empty or only whitespace
    if (url.trim().length === 0) {
      return {
        valid: false,
        error: 'URL cannot be empty'
      };
    }

    // Try to parse the URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch (error) {
      return {
        valid: false,
        error: 'Invalid URL format'
      };
    }

    // Check if protocol is HTTP or HTTPS
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return {
        valid: false,
        error: 'URL must use HTTP or HTTPS protocol'
      };
    }

    return { valid: true };
  }

  /**
   * Validate a timeout value to ensure it's within the acceptable range
   * 
   * @param timeout - The timeout value in milliseconds
   * @returns ValidationResult indicating if the timeout is valid
   */
  validateTimeout(timeout: number | undefined): ValidationResult {
    // Timeout is optional, so undefined is valid
    if (timeout === undefined) {
      return { valid: true };
    }

    // Check if timeout is a number
    if (typeof timeout !== 'number') {
      return {
        valid: false,
        error: 'Timeout must be a number'
      };
    }

    // Check if timeout is NaN
    if (isNaN(timeout)) {
      return {
        valid: false,
        error: 'Timeout must be a valid number'
      };
    }

    // Check if timeout is within the valid range (1000-60000 ms)
    if (timeout < 1000 || timeout > 60000) {
      return {
        valid: false,
        error: 'Timeout must be between 1000 and 60000 milliseconds'
      };
    }

    return { valid: true };
  }

  /**
   * Validate a CSS selector to ensure it's a valid selector string
   * 
   * @param selector - The CSS selector to validate
   * @returns ValidationResult indicating if the selector is valid
   */
  validateSelector(selector: string | undefined): ValidationResult {
    // Selector is optional, so undefined is valid
    if (selector === undefined) {
      return { valid: true };
    }

    // Check if selector is a string
    if (typeof selector !== 'string') {
      return {
        valid: false,
        error: 'Selector must be a string'
      };
    }

    // Check if selector is empty or only whitespace
    if (selector.trim().length === 0) {
      return {
        valid: false,
        error: 'Selector cannot be empty'
      };
    }

    // Basic CSS selector validation using browser's querySelector
    // We'll try to validate the selector syntax by checking for common invalid patterns
    try {
      // Check for obviously invalid selectors
      if (selector.includes('  ')) {
        // Multiple consecutive spaces are usually a mistake
        return {
          valid: false,
          error: 'Invalid CSS selector syntax: multiple consecutive spaces'
        };
      }

      // Try to validate using document.querySelector in a safe way
      // Since we're in Node.js, we'll do basic syntax checks
      
      // Check for unmatched brackets
      const openBrackets = (selector.match(/\[/g) || []).length;
      const closeBrackets = (selector.match(/\]/g) || []).length;
      if (openBrackets !== closeBrackets) {
        return {
          valid: false,
          error: 'Invalid CSS selector syntax: unmatched brackets'
        };
      }

      // Check for unmatched parentheses
      const openParens = (selector.match(/\(/g) || []).length;
      const closeParens = (selector.match(/\)/g) || []).length;
      if (openParens !== closeParens) {
        return {
          valid: false,
          error: 'Invalid CSS selector syntax: unmatched parentheses'
        };
      }

      // Check for invalid starting characters
      if (/^[0-9]/.test(selector.trim())) {
        return {
          valid: false,
          error: 'Invalid CSS selector syntax: cannot start with a number'
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: 'Invalid CSS selector syntax'
      };
    }
  }

  /**
   * Validate a complete fetch request
   * 
   * @param url - The URL to fetch
   * @param options - Optional fetch options
   * @returns ValidationResult indicating if the request is valid
   */
  validateRequest(
    url: string | undefined,
    options?: {
      timeout?: number;
      waitForSelector?: string;
    }
  ): ValidationResult {
    // Validate URL (required)
    const urlResult = this.validateUrl(url);
    if (!urlResult.valid) {
      return urlResult;
    }

    // Validate timeout (optional)
    if (options?.timeout !== undefined) {
      const timeoutResult = this.validateTimeout(options.timeout);
      if (!timeoutResult.valid) {
        return timeoutResult;
      }
    }

    // Validate selector (optional)
    if (options?.waitForSelector !== undefined) {
      const selectorResult = this.validateSelector(options.waitForSelector);
      if (!selectorResult.valid) {
        return selectorResult;
      }
    }

    return { valid: true };
  }
}

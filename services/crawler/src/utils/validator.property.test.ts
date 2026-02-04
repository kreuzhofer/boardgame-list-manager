import * as fc from 'fast-check';
import { RequestValidator } from './validator';

describe('RequestValidator Property Tests', () => {
  let validator: RequestValidator;

  beforeEach(() => {
    validator = new RequestValidator();
  });

  /**
   * Feature: browser-crawler-service, Property 2: Invalid URLs are rejected
   * Validates: Requirements 9.2
   * 
   * Property: For any string that is not a valid HTTP/HTTPS URL, the crawler service 
   * should return a 400 error with success false
   */
  describe('Property 2: Invalid URLs are rejected', () => {
    it('should reject non-HTTP/HTTPS protocols', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant('ftp://example.com'),
            fc.constant('file:///path/to/file'),
            fc.constant('ws://example.com'),
            fc.constant('wss://example.com'),
            fc.constant('mailto:test@example.com'),
            fc.constant('data:text/plain,hello'),
            fc.constant('javascript:alert(1)'),
            fc.constant('about:blank')
          ),
          (invalidUrl) => {
            const result = validator.validateUrl(invalidUrl);
            
            // Should be invalid
            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error).toContain('HTTP or HTTPS');
            
            return !result.valid;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject malformed URLs', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant('not a url'),
            fc.constant('htp://missing-t.com'),
            fc.constant('http//missing-colon.com'),
            fc.constant('://missing-protocol.com'),
            fc.constant(''),
            fc.constant('   '),
            fc.constant('just some text'),
            fc.constant('example.com'), // Missing protocol
            fc.string().filter(s => !s.includes('://') && s.length > 0)
          ),
          (invalidUrl) => {
            const result = validator.validateUrl(invalidUrl);
            
            // Should be invalid
            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
            
            return !result.valid;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject undefined and null URLs', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(undefined, null as any),
          (invalidUrl) => {
            const result = validator.validateUrl(invalidUrl);
            
            // Should be invalid
            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
            
            return !result.valid;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject non-string URL values', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.integer(),
            fc.boolean(),
            fc.object(),
            fc.array(fc.string())
          ),
          (invalidUrl) => {
            const result = validator.validateUrl(invalidUrl as any);
            
            // Should be invalid
            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
            
            return !result.valid;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept valid HTTP URLs', () => {
      fc.assert(
        fc.property(
          fc.webUrl({ validSchemes: ['http'] }),
          (validUrl) => {
            const result = validator.validateUrl(validUrl);
            
            // Should be valid
            return result.valid === true && result.error === undefined;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept valid HTTPS URLs', () => {
      fc.assert(
        fc.property(
          fc.webUrl({ validSchemes: ['https'] }),
          (validUrl) => {
            const result = validator.validateUrl(validUrl);
            
            // Should be valid
            return result.valid === true && result.error === undefined;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: browser-crawler-service, Property 8: Request validation completeness
   * Validates: Requirements 9.1
   * 
   * Property: For any fetch request missing the required url field, the crawler service 
   * should return a 400 error before attempting to fetch
   */
  describe('Property 8: Request validation completeness', () => {
    it('should reject requests with missing URL', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(undefined, null as any, ''),
          (missingUrl) => {
            const result = validator.validateRequest(missingUrl);
            
            // Should be invalid
            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
            
            return !result.valid;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject requests with invalid timeout values', () => {
      fc.assert(
        fc.property(
          fc.webUrl({ validSchemes: ['http', 'https'] }),
          fc.oneof(
            fc.integer({ max: 999 }), // Too small
            fc.integer({ min: 60001 }), // Too large
            fc.constant(NaN),
            fc.constant(-1),
            fc.constant(0)
          ),
          (validUrl, invalidTimeout) => {
            const result = validator.validateRequest(validUrl, { timeout: invalidTimeout });
            
            // Should be invalid
            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
            
            return !result.valid;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject requests with invalid selector values', () => {
      fc.assert(
        fc.property(
          fc.webUrl({ validSchemes: ['http', 'https'] }),
          fc.oneof(
            fc.constant(''),
            fc.constant('   '),
            fc.constant('[unmatched'),
            fc.constant('unmatched]'),
            fc.constant('(unmatched'),
            fc.constant('unmatched)'),
            fc.constant('123invalid') // Starts with number
          ),
          (validUrl, invalidSelector) => {
            const result = validator.validateRequest(validUrl, { waitForSelector: invalidSelector });
            
            // Should be invalid
            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
            
            return !result.valid;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept valid requests with all valid parameters', () => {
      fc.assert(
        fc.property(
          fc.webUrl({ validSchemes: ['http', 'https'] }),
          fc.integer({ min: 1000, max: 60000 }),
          fc.oneof(
            fc.constant('.class'),
            fc.constant('#id'),
            fc.constant('div'),
            fc.constant('div.class'),
            fc.constant('div#id'),
            fc.constant('div > span'),
            fc.constant('[data-test]'),
            fc.constant('button[type="submit"]')
          ),
          (validUrl, validTimeout, validSelector) => {
            const result = validator.validateRequest(validUrl, {
              timeout: validTimeout,
              waitForSelector: validSelector
            });
            
            // Should be valid
            return result.valid === true && result.error === undefined;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept valid requests with optional parameters omitted', () => {
      fc.assert(
        fc.property(
          fc.webUrl({ validSchemes: ['http', 'https'] }),
          (validUrl) => {
            const result = validator.validateRequest(validUrl);
            
            // Should be valid
            return result.valid === true && result.error === undefined;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept valid requests with only timeout specified', () => {
      fc.assert(
        fc.property(
          fc.webUrl({ validSchemes: ['http', 'https'] }),
          fc.integer({ min: 1000, max: 60000 }),
          (validUrl, validTimeout) => {
            const result = validator.validateRequest(validUrl, { timeout: validTimeout });
            
            // Should be valid
            return result.valid === true && result.error === undefined;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept valid requests with only selector specified', () => {
      fc.assert(
        fc.property(
          fc.webUrl({ validSchemes: ['http', 'https'] }),
          fc.oneof(
            fc.constant('.class'),
            fc.constant('#id'),
            fc.constant('div')
          ),
          (validUrl, validSelector) => {
            const result = validator.validateRequest(validUrl, { waitForSelector: validSelector });
            
            // Should be valid
            return result.valid === true && result.error === undefined;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate timeout independently', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000, max: 60000 }),
          (validTimeout) => {
            const result = validator.validateTimeout(validTimeout);
            
            // Should be valid
            return result.valid === true && result.error === undefined;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate selector independently', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant('.class'),
            fc.constant('#id'),
            fc.constant('div'),
            fc.constant('span.class'),
            fc.constant('a[href]')
          ),
          (validSelector) => {
            const result = validator.validateSelector(validSelector);
            
            // Should be valid
            return result.valid === true && result.error === undefined;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

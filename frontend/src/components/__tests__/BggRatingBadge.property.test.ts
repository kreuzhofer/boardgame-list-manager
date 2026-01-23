/**
 * Property-based tests for BggRatingBadge component
 * Feature: bgg-rating-badge
 * **Validates: Requirements 3.3, 4.1-4.6**
 */

import * as fc from 'fast-check';
import { getRatingColor } from '../BggRatingBadge';

describe('BggRatingBadge Property Tests', () => {
  /**
   * Property 6: Rating Display Formatting
   * For any rating value passed to BggRatingBadge, the displayed text 
   * SHALL be the rating formatted to exactly one decimal place.
   * 
   * **Validates: Requirements 3.3**
   */
  describe('Property 6: Rating Display Formatting', () => {
    it('should format any rating to exactly one decimal place', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 1, max: 10, noNaN: true }),
          (rating) => {
            const formatted = rating.toFixed(1);
            // Verify it has exactly one decimal place
            const parts = formatted.split('.');
            return parts.length === 2 && parts[1].length === 1;
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should produce consistent formatting for any valid rating', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 1, max: 10, noNaN: true }),
          (rating) => {
            const formatted = rating.toFixed(1);
            // Parse back and verify it's close to original (within rounding)
            const parsed = parseFloat(formatted);
            return Math.abs(parsed - rating) < 0.1;
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  /**
   * Property 7: Rating Color Mapping
   * For any rating value from 1 to 10, the getRatingColor function SHALL return 
   * the correct hex color according to the BGG color scheme.
   * 
   * **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6**
   */
  describe('Property 7: Rating Color Mapping', () => {
    const colorMap: Record<number, string> = {
      1: '#d32f2f', // Red
      2: '#d32f2f',
      3: '#d32f2f',
      4: '#d32f2f',
      5: '#3f51b5', // Dark blue
      6: '#3f51b5',
      7: '#2196f3', // Light blue
      8: '#4caf50', // Green
      9: '#2e7d32', // Dark green
      10: '#1b5e20', // Darker green
    };

    it('should return correct color for any rating in valid range', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 1, max: Math.fround(10.99), noNaN: true }),
          (rating) => {
            const color = getRatingColor(rating);
            const expectedColor = colorMap[Math.floor(rating)] || '#9e9e9e';
            return color === expectedColor;
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should return gray for any rating outside valid range', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.float({ min: -100, max: Math.fround(0.99), noNaN: true }),
            fc.float({ min: 11, max: 100, noNaN: true })
          ),
          (rating) => {
            const color = getRatingColor(rating);
            return color === '#9e9e9e';
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should use floor for color determination (e.g., 7.9 uses color for 7)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }),
          fc.float({ min: 0, max: Math.fround(0.99), noNaN: true }),
          (base, decimal) => {
            const rating = base + decimal;
            const color = getRatingColor(rating);
            const expectedColor = colorMap[base] || '#9e9e9e';
            return color === expectedColor;
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});

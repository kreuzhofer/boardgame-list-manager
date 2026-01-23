/**
 * Unit tests for BggRatingBadge component
 * Feature: bgg-rating-badge
 * **Validates: Requirements 3.3, 3.4, 3.5, 6.1**
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BggRatingBadge, getRatingColor } from '../BggRatingBadge';

describe('BggRatingBadge', () => {
  describe('Rating display formatting', () => {
    /**
     * Requirement 3.3: Display rating formatted to one decimal place
     */
    it('should display rating with one decimal place', () => {
      render(<BggRatingBadge rating={7.5} />);
      expect(screen.getByText('7.5')).toBeInTheDocument();
    });

    it('should format whole numbers with one decimal place', () => {
      render(<BggRatingBadge rating={8} />);
      expect(screen.getByText('8.0')).toBeInTheDocument();
    });

    it('should round to one decimal place', () => {
      render(<BggRatingBadge rating={7.456} />);
      expect(screen.getByText('7.5')).toBeInTheDocument();
    });
  });

  describe('Hexagon structure', () => {
    /**
     * Requirement 3.4: Hexagon shape standing on its tip
     */
    it('should render an SVG polygon for the hexagon', () => {
      const { container } = render(<BggRatingBadge rating={7.5} />);
      const polygon = container.querySelector('polygon');
      expect(polygon).toBeInTheDocument();
      expect(polygon).toHaveAttribute('points', '12,0 24,7 24,21 12,28 0,21 0,7');
    });
  });

  describe('Text styling', () => {
    /**
     * Requirement 3.5: White text on colored background
     */
    it('should have white text', () => {
      const { container } = render(<BggRatingBadge rating={7.5} />);
      const textSpan = container.querySelector('span');
      expect(textSpan).toHaveClass('text-white');
    });
  });

  describe('German tooltip', () => {
    /**
     * Requirement 6.1: German tooltip text
     */
    it('should have German tooltip with rating', () => {
      const { container } = render(<BggRatingBadge rating={7.5} />);
      const badge = container.firstChild;
      expect(badge).toHaveAttribute('title', 'BGG Bewertung: 7.5');
    });

    it('should format tooltip rating to one decimal place', () => {
      const { container } = render(<BggRatingBadge rating={8} />);
      const badge = container.firstChild;
      expect(badge).toHaveAttribute('title', 'BGG Bewertung: 8.0');
    });
  });
});

describe('getRatingColor', () => {
  describe('Color mapping', () => {
    /**
     * Requirement 4.1: Red for ratings 1-4
     */
    it.each([1, 1.5, 2, 2.9, 3, 3.5, 4, 4.9])('should return red (#d32f2f) for rating %s', (rating) => {
      expect(getRatingColor(rating)).toBe('#d32f2f');
    });

    /**
     * Requirement 4.2: Dark blue for ratings 5-6
     */
    it.each([5, 5.5, 6, 6.9])('should return dark blue (#3f51b5) for rating %s', (rating) => {
      expect(getRatingColor(rating)).toBe('#3f51b5');
    });

    /**
     * Requirement 4.3: Light blue for rating 7
     */
    it.each([7, 7.5, 7.9])('should return light blue (#2196f3) for rating %s', (rating) => {
      expect(getRatingColor(rating)).toBe('#2196f3');
    });

    /**
     * Requirement 4.4: Green for rating 8
     */
    it.each([8, 8.5, 8.9])('should return green (#4caf50) for rating %s', (rating) => {
      expect(getRatingColor(rating)).toBe('#4caf50');
    });

    /**
     * Requirement 4.5: Dark green for rating 9
     */
    it.each([9, 9.5, 9.9])('should return dark green (#2e7d32) for rating %s', (rating) => {
      expect(getRatingColor(rating)).toBe('#2e7d32');
    });

    /**
     * Requirement 4.6: Darker green for rating 10
     */
    it('should return darker green (#1b5e20) for rating 10', () => {
      expect(getRatingColor(10)).toBe('#1b5e20');
    });

    /**
     * Requirement 4.7: Gray for invalid ratings
     */
    it.each([0, -1, 11, 100])('should return gray (#9e9e9e) for invalid rating %s', (rating) => {
      expect(getRatingColor(rating)).toBe('#9e9e9e');
    });
  });
});

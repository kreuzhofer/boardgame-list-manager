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
     * Requirement 4.1: Blush-deep for ratings 1-4
     */
    it.each([1, 1.5, 2, 2.9, 3, 3.5, 4, 4.9])('should return blush-deep (#a93b3a) for rating %s', (rating) => {
      expect(getRatingColor(rating)).toBe('#a93b3a');
    });

    /**
     * Requirement 4.2: Ocean for ratings 5-6
     */
    it.each([5, 5.5, 6, 6.9])('should return ocean (#4a7eb0) for rating %s', (rating) => {
      expect(getRatingColor(rating)).toBe('#4a7eb0');
    });

    /**
     * Requirement 4.3: Plum for rating 7
     */
    it.each([7, 7.5, 7.9])('should return plum (#6b3a5c) for rating %s', (rating) => {
      expect(getRatingColor(rating)).toBe('#6b3a5c');
    });

    /**
     * Requirement 4.4: Sage for rating 8
     */
    it.each([8, 8.5, 8.9])('should return sage (#5f9b6f) for rating %s', (rating) => {
      expect(getRatingColor(rating)).toBe('#5f9b6f');
    });

    /**
     * Requirement 4.5: Sage-deep for ratings 9-10
     */
    it.each([9, 9.5, 9.9, 10])('should return sage-deep (#3f7d52) for rating %s', (rating) => {
      expect(getRatingColor(rating)).toBe('#3f7d52');
    });

    /**
     * Requirement 4.7: Ink-mute for invalid ratings
     */
    it.each([0, -1, 11, 100])('should return ink-mute (#8a92a0) for invalid rating %s', (rating) => {
      expect(getRatingColor(rating)).toBe('#8a92a0');
    });
  });
});

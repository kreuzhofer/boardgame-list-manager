/**
 * Unit tests for AutocompleteDropdown thumbnail functionality
 * 
 * Requirements: 6.1, 9.1
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AutocompleteDropdown } from '../AutocompleteDropdown';
import type { BggSearchResult } from '../../types';

// Mock the LazyBggImage component
vi.mock('../LazyBggImage', () => ({
  LazyBggImage: ({ bggId, size, alt }: { bggId: number; size: string; alt: string }) => (
    <div data-testid={`lazy-bgg-image-${bggId}`} data-size={size} data-alt={alt}>
      Mock Image
    </div>
  ),
}));

const mockResults: BggSearchResult[] = [
  { id: 174430, name: 'Gloomhaven', yearPublished: 2017, rating: 8.7 },
  { id: 167791, name: 'Terraforming Mars', yearPublished: 2016, rating: 8.4 },
  { id: 224517, name: 'Brass: Birmingham', yearPublished: 2018, rating: 8.6 },
];

describe('AutocompleteDropdown Thumbnails', () => {
  const defaultProps = {
    results: mockResults,
    isOpen: true,
    isLoading: false,
    selectedIndex: -1,
    hasMore: false,
    onSelect: vi.fn(),
    onClose: vi.fn(),
  };

  describe('Requirement 6.1: Thumbnail rendering', () => {
    it('should render a thumbnail for each result', () => {
      render(<AutocompleteDropdown {...defaultProps} />);
      
      mockResults.forEach((result) => {
        expect(screen.getByTestId(`lazy-bgg-image-${result.id}`)).toBeInTheDocument();
      });
    });

    it('should use micro size for thumbnails', () => {
      render(<AutocompleteDropdown {...defaultProps} />);
      
      mockResults.forEach((result) => {
        const img = screen.getByTestId(`lazy-bgg-image-${result.id}`);
        expect(img).toHaveAttribute('data-size', 'micro');
      });
    });

    it('should use game name as alt text', () => {
      render(<AutocompleteDropdown {...defaultProps} />);
      
      mockResults.forEach((result) => {
        const img = screen.getByTestId(`lazy-bgg-image-${result.id}`);
        expect(img).toHaveAttribute('data-alt', result.name);
      });
    });
  });

  describe('Requirement 9.1: Graceful degradation', () => {
    it('should render dropdown even when no results', () => {
      render(<AutocompleteDropdown {...defaultProps} results={[]} />);
      
      expect(screen.getByText('Keine Treffer gefunden')).toBeInTheDocument();
    });

    it('should still show game names alongside thumbnails', () => {
      render(<AutocompleteDropdown {...defaultProps} />);
      
      mockResults.forEach((result) => {
        expect(screen.getByText(result.name)).toBeInTheDocument();
      });
    });

    it('should show year published when available', () => {
      render(<AutocompleteDropdown {...defaultProps} />);
      
      expect(screen.getByText('(2017)')).toBeInTheDocument();
      expect(screen.getByText('(2016)')).toBeInTheDocument();
      expect(screen.getByText('(2018)')).toBeInTheDocument();
    });
  });

  describe('Dropdown visibility', () => {
    it('should not render when isOpen is false', () => {
      render(<AutocompleteDropdown {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(<AutocompleteDropdown {...defaultProps} isOpen={true} />);
      
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });
  });
});

/**
 * Unit tests for AutocompleteDropdown alternate names display
 * Feature: 014-alternate-names-search
 * 
 * Requirements: 6.1, 6.3, 6.4, 7.1, 7.2
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

describe('AutocompleteDropdown Alternate Names', () => {
  const defaultProps = {
    isOpen: true,
    isLoading: false,
    selectedIndex: -1,
    hasMore: false,
    onSelect: vi.fn(),
    onClose: vi.fn(),
  };

  describe('Requirement 6.1, 6.3: Alternate name display', () => {
    it('should show alternate name when matchedAlternateName is present', () => {
      const results: BggSearchResult[] = [
        { 
          id: 115746, 
          name: 'War of the Ring: Second Edition', 
          yearPublished: 2012, 
          rating: 8.5,
          matchedAlternateName: 'Der Ringkrieg',
          alternateNames: ['Der Ringkrieg', 'La Guerra del Anillo']
        },
      ];

      render(<AutocompleteDropdown {...defaultProps} results={results} />);
      
      expect(screen.getByText('War of the Ring: Second Edition')).toBeInTheDocument();
      expect(screen.getByText('Auch bekannt als: Der Ringkrieg')).toBeInTheDocument();
    });

    it('should not show alternate name section when matchedAlternateName is null', () => {
      const results: BggSearchResult[] = [
        { 
          id: 174430, 
          name: 'Gloomhaven', 
          yearPublished: 2017, 
          rating: 8.7,
          matchedAlternateName: null,
          alternateNames: ['Gloomhaven DE']
        },
      ];

      render(<AutocompleteDropdown {...defaultProps} results={results} />);
      
      expect(screen.getByText('Gloomhaven')).toBeInTheDocument();
      expect(screen.queryByText(/Auch bekannt als/)).not.toBeInTheDocument();
    });

    it('should not show alternate name section when matchedAlternateName is undefined', () => {
      const results: BggSearchResult[] = [
        { 
          id: 174430, 
          name: 'Gloomhaven', 
          yearPublished: 2017, 
          rating: 8.7,
        },
      ];

      render(<AutocompleteDropdown {...defaultProps} results={results} />);
      
      expect(screen.getByText('Gloomhaven')).toBeInTheDocument();
      expect(screen.queryByText(/Auch bekannt als/)).not.toBeInTheDocument();
    });
  });

  describe('Requirement 6.4: Multiple results with mixed alternate names', () => {
    it('should correctly show alternate names only for results that have them', () => {
      const results: BggSearchResult[] = [
        { 
          id: 115746, 
          name: 'War of the Ring: Second Edition', 
          yearPublished: 2012, 
          rating: 8.5,
          matchedAlternateName: 'Der Ringkrieg',
        },
        { 
          id: 174430, 
          name: 'Gloomhaven', 
          yearPublished: 2017, 
          rating: 8.7,
          matchedAlternateName: null,
        },
        { 
          id: 342942, 
          name: 'Ark Nova', 
          yearPublished: 2021, 
          rating: 8.5,
          matchedAlternateName: 'Arche Nova',
        },
      ];

      render(<AutocompleteDropdown {...defaultProps} results={results} />);
      
      // All primary names should be visible
      expect(screen.getByText('War of the Ring: Second Edition')).toBeInTheDocument();
      expect(screen.getByText('Gloomhaven')).toBeInTheDocument();
      expect(screen.getByText('Ark Nova')).toBeInTheDocument();
      
      // Only two alternate names should be shown
      expect(screen.getByText('Auch bekannt als: Der Ringkrieg')).toBeInTheDocument();
      expect(screen.getByText('Auch bekannt als: Arche Nova')).toBeInTheDocument();
      
      // Should only have 2 "Auch bekannt als" entries
      const alternateNameElements = screen.getAllByText(/Auch bekannt als:/);
      expect(alternateNameElements).toHaveLength(2);
    });
  });

  describe('Requirement 7.1, 7.2: Dropdown height constraint', () => {
    it('should have max-height style on scroll container', () => {
      const results: BggSearchResult[] = Array.from({ length: 10 }, (_, i) => ({
        id: 100000 + i,
        name: `Game ${i + 1}`,
        yearPublished: 2020 + i,
        rating: 7.0 + i * 0.1,
      }));

      render(<AutocompleteDropdown {...defaultProps} results={results} />);
      
      // The dropdown should be rendered
      const listbox = screen.getByRole('listbox');
      expect(listbox).toBeInTheDocument();
      
      // Check that the scroll container has the expected max-height style
      // The scroll container is the div with overflow-y-auto
      const scrollContainer = listbox.querySelector('.overflow-y-auto');
      expect(scrollContainer).toBeInTheDocument();
      expect(scrollContainer).toHaveStyle({ maxHeight: 'min(400px, 60vh)' });
    });
  });

  describe('Loading and empty states', () => {
    it('should show loading state without alternate names', () => {
      render(<AutocompleteDropdown {...defaultProps} results={[]} isLoading={true} />);
      
      expect(screen.getByText('Suche...')).toBeInTheDocument();
      expect(screen.queryByText(/Auch bekannt als/)).not.toBeInTheDocument();
    });

    it('should show empty state without alternate names', () => {
      render(<AutocompleteDropdown {...defaultProps} results={[]} isLoading={false} />);
      
      expect(screen.getByText('Keine Treffer gefunden')).toBeInTheDocument();
      expect(screen.queryByText(/Auch bekannt als/)).not.toBeInTheDocument();
    });
  });
});

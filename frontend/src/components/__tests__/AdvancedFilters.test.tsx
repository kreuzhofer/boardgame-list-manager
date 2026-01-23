/**
 * Unit tests for AdvancedFilters component
 * **Validates: Requirements 8.4, 8.7**
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AdvancedFilters } from '../AdvancedFilters';

describe('AdvancedFilters', () => {
  describe('Collapsed by default (Requirement 8.4)', () => {
    it('renders collapsed by default', () => {
      render(
        <AdvancedFilters
          onPlayerSearch={vi.fn()}
          onBringerSearch={vi.fn()}
        />
      );

      // Toggle button should be visible
      const toggleButton = screen.getByRole('button', { name: /erweiterte filter/i });
      expect(toggleButton).toBeInTheDocument();
      expect(toggleButton).toHaveAttribute('aria-expanded', 'false');

      // Filter inputs should not be visible
      expect(screen.queryByLabelText(/mitspieler suchen/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/bringt mit suchen/i)).not.toBeInTheDocument();
    });
  });

  describe('Expand/collapse toggle', () => {
    it('expands when toggle button is clicked', () => {
      render(
        <AdvancedFilters
          onPlayerSearch={vi.fn()}
          onBringerSearch={vi.fn()}
        />
      );

      const toggleButton = screen.getByRole('button', { name: /erweiterte filter/i });
      fireEvent.click(toggleButton);

      expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByLabelText(/mitspieler suchen/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/bringt mit suchen/i)).toBeInTheDocument();
    });

    it('collapses when toggle button is clicked again', () => {
      render(
        <AdvancedFilters
          onPlayerSearch={vi.fn()}
          onBringerSearch={vi.fn()}
        />
      );

      const toggleButton = screen.getByRole('button', { name: /erweiterte filter/i });
      
      // Expand
      fireEvent.click(toggleButton);
      expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
      
      // Collapse
      fireEvent.click(toggleButton);
      expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByLabelText(/mitspieler suchen/i)).not.toBeInTheDocument();
    });
  });

  describe('Active filter count badge (Requirement 8.7)', () => {
    it('shows no badge when no filters are active', () => {
      render(
        <AdvancedFilters
          onPlayerSearch={vi.fn()}
          onBringerSearch={vi.fn()}
        />
      );

      // No badge should be visible
      expect(screen.queryByText('1')).not.toBeInTheDocument();
      expect(screen.queryByText('2')).not.toBeInTheDocument();
    });

    it('shows badge with count 1 when one filter is active', () => {
      render(
        <AdvancedFilters
          onPlayerSearch={vi.fn()}
          onBringerSearch={vi.fn()}
          initialValues={{ playerQuery: 'test' }}
        />
      );

      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('shows badge with count 2 when both filters are active', () => {
      render(
        <AdvancedFilters
          onPlayerSearch={vi.fn()}
          onBringerSearch={vi.fn()}
          initialValues={{ playerQuery: 'test', bringerQuery: 'test2' }}
        />
      );

      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('updates badge when filter is typed', () => {
      const onPlayerSearch = vi.fn();
      render(
        <AdvancedFilters
          onPlayerSearch={onPlayerSearch}
          onBringerSearch={vi.fn()}
        />
      );

      // Expand to access inputs
      const toggleButton = screen.getByRole('button', { name: /erweiterte filter/i });
      fireEvent.click(toggleButton);

      // Type in player search
      const playerInput = screen.getByLabelText(/mitspieler suchen/i);
      fireEvent.change(playerInput, { target: { value: 'test' } });

      // Badge should appear
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(onPlayerSearch).toHaveBeenCalledWith('test');
    });
  });

  describe('Filter callbacks', () => {
    it('calls onPlayerSearch when player input changes', () => {
      const onPlayerSearch = vi.fn();
      render(
        <AdvancedFilters
          onPlayerSearch={onPlayerSearch}
          onBringerSearch={vi.fn()}
        />
      );

      // Expand
      fireEvent.click(screen.getByRole('button', { name: /erweiterte filter/i }));

      // Type in player search
      const playerInput = screen.getByLabelText(/mitspieler suchen/i);
      fireEvent.change(playerInput, { target: { value: 'Alice' } });

      expect(onPlayerSearch).toHaveBeenCalledWith('Alice');
    });

    it('calls onBringerSearch when bringer input changes', () => {
      const onBringerSearch = vi.fn();
      render(
        <AdvancedFilters
          onPlayerSearch={vi.fn()}
          onBringerSearch={onBringerSearch}
        />
      );

      // Expand
      fireEvent.click(screen.getByRole('button', { name: /erweiterte filter/i }));

      // Type in bringer search
      const bringerInput = screen.getByLabelText(/bringt mit suchen/i);
      fireEvent.change(bringerInput, { target: { value: 'Bob' } });

      expect(onBringerSearch).toHaveBeenCalledWith('Bob');
    });
  });

  describe('Initial values', () => {
    it('uses initial values when provided', () => {
      render(
        <AdvancedFilters
          onPlayerSearch={vi.fn()}
          onBringerSearch={vi.fn()}
          initialValues={{
            playerQuery: 'initial player',
            bringerQuery: 'initial bringer',
          }}
        />
      );

      // Expand
      fireEvent.click(screen.getByRole('button', { name: /erweiterte filter/i }));

      expect(screen.getByLabelText(/mitspieler suchen/i)).toHaveValue('initial player');
      expect(screen.getByLabelText(/bringt mit suchen/i)).toHaveValue('initial bringer');
    });
  });
});

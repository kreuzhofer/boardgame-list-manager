import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PrototypeToggle } from '../PrototypeToggle';

/**
 * Unit tests for PrototypeToggle component
 * Validates: Requirements 022-prototype-toggle 2.3, 3.2
 */
describe('PrototypeToggle', () => {
  const gameId = 'test-game-id';

  describe('desktop mode (default)', () => {
    it('renders with correct label', () => {
      const onToggle = vi.fn().mockResolvedValue(undefined);
      render(
        <PrototypeToggle
          gameId={gameId}
          isPrototype={false}
          onToggle={onToggle}
        />
      );

      expect(screen.getByText('Prototyp')).toBeInTheDocument();
    });

    it('shows inactive styling when isPrototype is false', () => {
      const onToggle = vi.fn().mockResolvedValue(undefined);
      render(
        <PrototypeToggle
          gameId={gameId}
          isPrototype={false}
          onToggle={onToggle}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-gray-100');
    });

    it('shows active styling when isPrototype is true', () => {
      const onToggle = vi.fn().mockResolvedValue(undefined);
      render(
        <PrototypeToggle
          gameId={gameId}
          isPrototype={true}
          onToggle={onToggle}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-purple-100');
    });

    it('calls onToggle with correct parameters when clicked (false -> true)', async () => {
      const onToggle = vi.fn().mockResolvedValue(undefined);
      render(
        <PrototypeToggle
          gameId={gameId}
          isPrototype={false}
          onToggle={onToggle}
        />
      );

      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(onToggle).toHaveBeenCalledWith(gameId, true);
      });
    });

    it('calls onToggle with correct parameters when clicked (true -> false)', async () => {
      const onToggle = vi.fn().mockResolvedValue(undefined);
      render(
        <PrototypeToggle
          gameId={gameId}
          isPrototype={true}
          onToggle={onToggle}
        />
      );

      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(onToggle).toHaveBeenCalledWith(gameId, false);
      });
    });

    it('prevents interaction when disabled', () => {
      const onToggle = vi.fn().mockResolvedValue(undefined);
      render(
        <PrototypeToggle
          gameId={gameId}
          isPrototype={false}
          onToggle={onToggle}
          disabled={true}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      
      fireEvent.click(button);
      expect(onToggle).not.toHaveBeenCalled();
    });

    it('shows correct aria-label when inactive', () => {
      const onToggle = vi.fn().mockResolvedValue(undefined);
      render(
        <PrototypeToggle
          gameId={gameId}
          isPrototype={false}
          onToggle={onToggle}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Als Prototyp markieren');
    });

    it('shows correct aria-label when active', () => {
      const onToggle = vi.fn().mockResolvedValue(undefined);
      render(
        <PrototypeToggle
          gameId={gameId}
          isPrototype={true}
          onToggle={onToggle}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Prototyp-Status deaktivieren');
    });
  });

  describe('compact mode (mobile)', () => {
    it('renders with label and toggle switch', () => {
      const onToggle = vi.fn().mockResolvedValue(undefined);
      render(
        <PrototypeToggle
          gameId={gameId}
          isPrototype={false}
          onToggle={onToggle}
          compact={true}
        />
      );

      expect(screen.getByText('Prototyp')).toBeInTheDocument();
    });

    it('calls onToggle when clicked in compact mode', async () => {
      const onToggle = vi.fn().mockResolvedValue(undefined);
      render(
        <PrototypeToggle
          gameId={gameId}
          isPrototype={false}
          onToggle={onToggle}
          compact={true}
        />
      );

      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(onToggle).toHaveBeenCalledWith(gameId, true);
      });
    });

    it('prevents interaction when disabled in compact mode', () => {
      const onToggle = vi.fn().mockResolvedValue(undefined);
      render(
        <PrototypeToggle
          gameId={gameId}
          isPrototype={false}
          onToggle={onToggle}
          disabled={true}
          compact={true}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      
      fireEvent.click(button);
      expect(onToggle).not.toHaveBeenCalled();
    });
  });

  describe('loading state', () => {
    it('prevents multiple clicks while loading', async () => {
      // Create a promise that we can control
      let resolveToggle: () => void;
      const togglePromise = new Promise<void>((resolve) => {
        resolveToggle = resolve;
      });
      const onToggle = vi.fn().mockReturnValue(togglePromise);

      render(
        <PrototypeToggle
          gameId={gameId}
          isPrototype={false}
          onToggle={onToggle}
        />
      );

      const button = screen.getByRole('button');
      
      // First click
      fireEvent.click(button);
      expect(onToggle).toHaveBeenCalledTimes(1);

      // Second click while loading - should be ignored
      fireEvent.click(button);
      expect(onToggle).toHaveBeenCalledTimes(1);

      // Resolve the promise
      resolveToggle!();
      await waitFor(() => {
        expect(button).not.toBeDisabled();
      });
    });
  });
});

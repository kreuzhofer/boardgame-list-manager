import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NamePrompt, MAX_USERNAME_LENGTH } from '../NamePrompt';

/**
 * Unit tests for NamePrompt component length validation
 * 
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 3.3 (009-username-length-limit)
 */
describe('NamePrompt Length Validation', () => {
  const mockOnNameSubmitted = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test that character counter displays correct count
   * Validates: Requirement 1.1
   */
  describe('Character Counter', () => {
    it('should display character counter showing current length and maximum', () => {
      render(<NamePrompt onNameSubmitted={mockOnNameSubmitted} />);
      
      // Initial state should show 0/30
      expect(screen.getByText('0/30')).toBeInTheDocument();
    });

    it('should update character counter as user types', () => {
      render(<NamePrompt onNameSubmitted={mockOnNameSubmitted} />);
      
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'Hello' } });
      
      expect(screen.getByText('5/30')).toBeInTheDocument();
    });

    it('should show counter in yellow when approaching limit', () => {
      render(<NamePrompt onNameSubmitted={mockOnNameSubmitted} />);
      
      const input = screen.getByRole('textbox');
      // Type 26 characters (within 5 of limit)
      fireEvent.change(input, { target: { value: 'a'.repeat(26) } });
      
      const counter = screen.getByText('26/30');
      expect(counter).toHaveClass('text-yellow-600');
    });

    it('should show counter in red when exceeding limit', () => {
      render(<NamePrompt onNameSubmitted={mockOnNameSubmitted} />);
      
      const input = screen.getByRole('textbox');
      // Type 31 characters (exceeds limit)
      fireEvent.change(input, { target: { value: 'a'.repeat(31) } });
      
      const counter = screen.getByText('31/30');
      expect(counter).toHaveClass('text-red-600');
    });
  });

  /**
   * Test that error message appears for names > 30 chars
   * Validates: Requirement 1.2
   */
  describe('Error Message Display', () => {
    it('should display German error message when name exceeds 30 characters', () => {
      render(<NamePrompt onNameSubmitted={mockOnNameSubmitted} />);
      
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'a'.repeat(31) } });
      
      expect(screen.getByText('Der Name darf maximal 30 Zeichen lang sein.')).toBeInTheDocument();
    });

    it('should not show error for exactly 30 characters', () => {
      render(<NamePrompt onNameSubmitted={mockOnNameSubmitted} />);
      
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'a'.repeat(30) } });
      
      expect(screen.queryByText('Der Name darf maximal 30 Zeichen lang sein.')).not.toBeInTheDocument();
    });
  });

  /**
   * Test that submit button is disabled for invalid names
   * Validates: Requirement 1.3
   */
  describe('Submit Button State', () => {
    it('should disable submit button when name exceeds 30 characters', () => {
      render(<NamePrompt onNameSubmitted={mockOnNameSubmitted} />);
      
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'a'.repeat(31) } });
      
      const submitButton = screen.getByRole('button', { name: 'Speichern' });
      expect(submitButton).toBeDisabled();
    });

    it('should enable submit button for valid name length', () => {
      render(<NamePrompt onNameSubmitted={mockOnNameSubmitted} />);
      
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'Valid Name' } });
      
      const submitButton = screen.getByRole('button', { name: 'Speichern' });
      expect(submitButton).not.toBeDisabled();
    });

    it('should disable submit button for empty name', () => {
      render(<NamePrompt onNameSubmitted={mockOnNameSubmitted} />);
      
      const submitButton = screen.getByRole('button', { name: 'Speichern' });
      expect(submitButton).toBeDisabled();
    });
  });

  /**
   * Test that error clears when name becomes valid
   * Validates: Requirement 1.4
   */
  describe('Error Clearing', () => {
    it('should clear error when name is reduced to valid length', () => {
      render(<NamePrompt onNameSubmitted={mockOnNameSubmitted} />);
      
      const input = screen.getByRole('textbox');
      
      // Type 31 characters to trigger error
      fireEvent.change(input, { target: { value: 'a'.repeat(31) } });
      expect(screen.getByText('Der Name darf maximal 30 Zeichen lang sein.')).toBeInTheDocument();
      
      // Reduce to 30 characters to clear error
      fireEvent.change(input, { target: { value: 'a'.repeat(30) } });
      expect(screen.queryByText('Der Name darf maximal 30 Zeichen lang sein.')).not.toBeInTheDocument();
    });
  });

  /**
   * Test boundary condition: exactly 30 characters is valid
   * Validates: Requirement 3.3
   */
  describe('Boundary Conditions', () => {
    it('should accept exactly 30 characters', () => {
      render(<NamePrompt onNameSubmitted={mockOnNameSubmitted} />);
      
      const input = screen.getByRole('textbox');
      const exactlyThirtyChars = 'a'.repeat(30);
      fireEvent.change(input, { target: { value: exactlyThirtyChars } });
      
      // Should not show error
      expect(screen.queryByText('Der Name darf maximal 30 Zeichen lang sein.')).not.toBeInTheDocument();
      
      // Submit button should be enabled
      const submitButton = screen.getByRole('button', { name: 'Speichern' });
      expect(submitButton).not.toBeDisabled();
      
      // Should be able to submit
      fireEvent.click(submitButton);
      expect(mockOnNameSubmitted).toHaveBeenCalledWith(exactlyThirtyChars);
    });

    it('should reject 31 characters on submit', () => {
      render(<NamePrompt onNameSubmitted={mockOnNameSubmitted} />);
      
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'a'.repeat(31) } });
      
      // Try to submit (button is disabled, but test the form submission)
      const form = input.closest('form');
      fireEvent.submit(form!);
      
      expect(mockOnNameSubmitted).not.toHaveBeenCalled();
    });
  });

  /**
   * Test that MAX_USERNAME_LENGTH constant is exported correctly
   */
  describe('Constants', () => {
    it('should export MAX_USERNAME_LENGTH as 30', () => {
      expect(MAX_USERNAME_LENGTH).toBe(30);
    });
  });
});

/**
 * Unit tests for UserNameEditor component
 * 
 * **Validates: Requirements 7.2, 7.3, 7.4**
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UserNameEditor } from '../UserNameEditor';

// Mock the API client
vi.mock('../../api/client', () => ({
  usersApi: {
    update: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
    }
  },
}));

import { usersApi, ApiError } from '../../api/client';

const mockUsersApi = usersApi as {
  update: ReturnType<typeof vi.fn>;
};

describe('UserNameEditor', () => {
  const mockUser = { id: 'user-123', name: 'Test User' };
  const mockOnUserUpdated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Display mode', () => {
    /**
     * Test that user name is displayed
     */
    it('should display user name', () => {
      render(
        <UserNameEditor user={mockUser} onUserUpdated={mockOnUserUpdated} />
      );

      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    /**
     * Test that edit button is displayed
     * Validates: Requirement 7.1
     */
    it('should display edit button', () => {
      render(
        <UserNameEditor user={mockUser} onUserUpdated={mockOnUserUpdated} />
      );

      expect(screen.getByLabelText('Namen bearbeiten')).toBeInTheDocument();
    });
  });

  describe('Edit mode toggle', () => {
    /**
     * Test that clicking edit button shows input
     * Validates: Requirement 7.1
     */
    it('should show input when edit button is clicked', () => {
      render(
        <UserNameEditor user={mockUser} onUserUpdated={mockOnUserUpdated} />
      );

      fireEvent.click(screen.getByLabelText('Namen bearbeiten'));

      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toHaveValue('Test User');
    });

    /**
     * Test that cancel button hides input
     */
    it('should hide input when cancel button is clicked', () => {
      render(
        <UserNameEditor user={mockUser} onUserUpdated={mockOnUserUpdated} />
      );

      fireEvent.click(screen.getByLabelText('Namen bearbeiten'));
      expect(screen.getByRole('textbox')).toBeInTheDocument();

      fireEvent.click(screen.getByText('✕'));

      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });
  });

  describe('API call on submit', () => {
    /**
     * Test that submitting calls the API
     * Validates: Requirement 7.2
     */
    it('should call API when form is submitted', async () => {
      mockUsersApi.update.mockResolvedValue({ user: { id: 'user-123', name: 'New Name' } });

      render(
        <UserNameEditor user={mockUser} onUserUpdated={mockOnUserUpdated} />
      );

      fireEvent.click(screen.getByLabelText('Namen bearbeiten'));
      
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'New Name' } });
      
      fireEvent.click(screen.getByText('✓'));

      await waitFor(() => {
        expect(mockUsersApi.update).toHaveBeenCalledWith('user-123', 'New Name');
      });
    });

    /**
     * Test that onUserUpdated is called on success
     * Validates: Requirement 7.3
     */
    it('should call onUserUpdated on successful update', async () => {
      const updatedUser = { id: 'user-123', name: 'New Name' };
      mockUsersApi.update.mockResolvedValue({ user: updatedUser });

      render(
        <UserNameEditor user={mockUser} onUserUpdated={mockOnUserUpdated} />
      );

      fireEvent.click(screen.getByLabelText('Namen bearbeiten'));
      
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'New Name' } });
      
      fireEvent.click(screen.getByText('✓'));

      await waitFor(() => {
        expect(mockOnUserUpdated).toHaveBeenCalledWith(updatedUser);
      });
    });

    /**
     * Test that edit mode closes on success
     */
    it('should close edit mode on successful update', async () => {
      mockUsersApi.update.mockResolvedValue({ user: { id: 'user-123', name: 'New Name' } });

      render(
        <UserNameEditor user={mockUser} onUserUpdated={mockOnUserUpdated} />
      );

      fireEvent.click(screen.getByLabelText('Namen bearbeiten'));
      
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'New Name' } });
      
      fireEvent.click(screen.getByText('✓'));

      await waitFor(() => {
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      });
    });

    /**
     * Test that no API call is made when name is unchanged
     */
    it('should not call API when name is unchanged', async () => {
      render(
        <UserNameEditor user={mockUser} onUserUpdated={mockOnUserUpdated} />
      );

      fireEvent.click(screen.getByLabelText('Namen bearbeiten'));
      fireEvent.click(screen.getByText('✓'));

      await waitFor(() => {
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      });

      expect(mockUsersApi.update).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    /**
     * Test that API error is displayed
     * Validates: Requirement 7.4 (German error messages)
     */
    it('should display API error message', async () => {
      mockUsersApi.update.mockRejectedValue(
        new ApiError('Ein Benutzer mit diesem Namen existiert bereits.', 'DUPLICATE_USER')
      );

      render(
        <UserNameEditor user={mockUser} onUserUpdated={mockOnUserUpdated} />
      );

      fireEvent.click(screen.getByLabelText('Namen bearbeiten'));
      
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'Existing Name' } });
      
      fireEvent.click(screen.getByText('✓'));

      await waitFor(() => {
        expect(screen.getByText('Ein Benutzer mit diesem Namen existiert bereits.')).toBeInTheDocument();
      });
    });

    /**
     * Test that submit button is disabled when name is empty
     */
    it('should disable submit button when name is empty', () => {
      render(
        <UserNameEditor user={mockUser} onUserUpdated={mockOnUserUpdated} />
      );

      fireEvent.click(screen.getByLabelText('Namen bearbeiten'));
      
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: '' } });

      expect(screen.getByText('✓')).toBeDisabled();
    });

    /**
     * Test that generic error is displayed for non-API errors
     */
    it('should display generic error for non-API errors', async () => {
      mockUsersApi.update.mockRejectedValue(new Error('Network error'));

      render(
        <UserNameEditor user={mockUser} onUserUpdated={mockOnUserUpdated} />
      );

      fireEvent.click(screen.getByLabelText('Namen bearbeiten'));
      
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'New Name' } });
      
      fireEvent.click(screen.getByText('✓'));

      await waitFor(() => {
        expect(screen.getByText('Fehler beim Aktualisieren des Namens.')).toBeInTheDocument();
      });
    });
  });
});

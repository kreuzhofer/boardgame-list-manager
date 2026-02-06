/**
 * Unit tests for ParticipantNameEditor component
 * 
 * **Validates: Requirements 7.2, 7.3, 7.4**
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ParticipantNameEditor } from '../ParticipantNameEditor';

// Mock the API client
vi.mock('../../api/client', () => ({
  participantsApi: {
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

import { participantsApi, ApiError } from '../../api/client';

const mockParticipantsApi = participantsApi as {
  update: ReturnType<typeof vi.fn>;
};

describe('ParticipantNameEditor', () => {
  const mockParticipant = { id: 'user-123', name: 'Test User' };
  const mockOnParticipantUpdated = vi.fn();

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
        <ParticipantNameEditor participant={mockParticipant} onParticipantUpdated={mockOnParticipantUpdated} />
      );

      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    /**
     * Test that edit button is displayed
     * Validates: Requirement 7.1
     */
    it('should display edit button', () => {
      render(
        <ParticipantNameEditor participant={mockParticipant} onParticipantUpdated={mockOnParticipantUpdated} />
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
        <ParticipantNameEditor participant={mockParticipant} onParticipantUpdated={mockOnParticipantUpdated} />
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
        <ParticipantNameEditor participant={mockParticipant} onParticipantUpdated={mockOnParticipantUpdated} />
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
      mockParticipantsApi.update.mockResolvedValue({ participant: { id: 'user-123', name: 'New Name' } });

      render(
        <ParticipantNameEditor participant={mockParticipant} onParticipantUpdated={mockOnParticipantUpdated} />
      );

      fireEvent.click(screen.getByLabelText('Namen bearbeiten'));
      
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'New Name' } });
      
      fireEvent.click(screen.getByText('✓'));

      await waitFor(() => {
        expect(mockParticipantsApi.update).toHaveBeenCalledWith('user-123', 'New Name');
      });
    });

    /**
     * Test that onUserUpdated is called on success
     * Validates: Requirement 7.3
     */
    it('should call onUserUpdated on successful update', async () => {
      const updatedParticipant = { id: 'user-123', name: 'New Name' };
      mockParticipantsApi.update.mockResolvedValue({ participant: updatedParticipant });

      render(
        <ParticipantNameEditor participant={mockParticipant} onParticipantUpdated={mockOnParticipantUpdated} />
      );

      fireEvent.click(screen.getByLabelText('Namen bearbeiten'));
      
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'New Name' } });
      
      fireEvent.click(screen.getByText('✓'));

      await waitFor(() => {
        expect(mockOnParticipantUpdated).toHaveBeenCalledWith(updatedParticipant);
      });
    });

    /**
     * Test that edit mode closes on success
     */
    it('should close edit mode on successful update', async () => {
      mockParticipantsApi.update.mockResolvedValue({ participant: { id: 'user-123', name: 'New Name' } });

      render(
        <ParticipantNameEditor participant={mockParticipant} onParticipantUpdated={mockOnParticipantUpdated} />
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
        <ParticipantNameEditor participant={mockParticipant} onParticipantUpdated={mockOnParticipantUpdated} />
      );

      fireEvent.click(screen.getByLabelText('Namen bearbeiten'));
      fireEvent.click(screen.getByText('✓'));

      await waitFor(() => {
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      });

      expect(mockParticipantsApi.update).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    /**
     * Test that API error is displayed
     * Validates: Requirement 7.4 (German error messages)
     */
    it('should display API error message', async () => {
      mockParticipantsApi.update.mockRejectedValue(
        new ApiError('Ein Teilnehmer mit diesem Namen existiert bereits.', 'DUPLICATE_PARTICIPANT')
      );

      render(
        <ParticipantNameEditor participant={mockParticipant} onParticipantUpdated={mockOnParticipantUpdated} />
      );

      fireEvent.click(screen.getByLabelText('Namen bearbeiten'));
      
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'Existing Name' } });
      
      fireEvent.click(screen.getByText('✓'));

      await waitFor(() => {
        expect(screen.getByText('Ein Teilnehmer mit diesem Namen existiert bereits.')).toBeInTheDocument();
      });
    });

    /**
     * Test that submit button is disabled when name is empty
     */
    it('should disable submit button when name is empty', () => {
      render(
        <ParticipantNameEditor participant={mockParticipant} onParticipantUpdated={mockOnParticipantUpdated} />
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
      mockParticipantsApi.update.mockRejectedValue(new Error('Network error'));

      render(
        <ParticipantNameEditor participant={mockParticipant} onParticipantUpdated={mockOnParticipantUpdated} />
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

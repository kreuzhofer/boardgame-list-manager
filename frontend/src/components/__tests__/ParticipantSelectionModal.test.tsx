/**
 * Unit tests for ParticipantSelectionModal component
 * 
 * **Validates: Requirements 5.1, 5.2, 5.3**
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ParticipantSelectionModal } from '../ParticipantSelectionModal';

// Mock the API client
vi.mock('../../api/client', () => ({
  participantsApi: {
    getAll: vi.fn(),
    create: vi.fn(),
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
  getAll: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
};

describe('ParticipantSelectionModal', () => {
  const mockOnParticipantSelected = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    /**
     * Test that modal renders when isOpen is true
     */
    it('should render modal when isOpen is true', async () => {
      mockParticipantsApi.getAll.mockResolvedValue({ participants: [] });

      render(
        <ParticipantSelectionModal isOpen={true} onParticipantSelected={mockOnParticipantSelected} />
      );

      expect(screen.getByText('Wer bist du?')).toBeInTheDocument();
    });

    /**
     * Test that modal does not render when isOpen is false
     */
    it('should not render modal when isOpen is false', () => {
      render(
        <ParticipantSelectionModal isOpen={false} onParticipantSelected={mockOnParticipantSelected} />
      );

      expect(screen.queryByText('Wer bist du?')).not.toBeInTheDocument();
    });
  });

  describe('Participant list rendering', () => {
    /**
     * Test that existing users are displayed
     * Validates: Requirement 5.2
     */
    it('should display list of existing participants', async () => {
      const mockParticipants = [
        { id: 'user-1', name: 'Alice' },
        { id: 'user-2', name: 'Bob' },
        { id: 'user-3', name: 'Charlie' },
      ];
      mockParticipantsApi.getAll.mockResolvedValue({ participants: mockParticipants });

      render(
        <ParticipantSelectionModal isOpen={true} onParticipantSelected={mockOnParticipantSelected} />
      );

      await waitFor(() => {
        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.getByText('Bob')).toBeInTheDocument();
        expect(screen.getByText('Charlie')).toBeInTheDocument();
      });
    });

    /**
     * Test loading state
     */
    it('should show loading spinner while fetching users', async () => {
      mockParticipantsApi.getAll.mockImplementation(() => new Promise(() => {}));

      render(
        <ParticipantSelectionModal isOpen={true} onParticipantSelected={mockOnParticipantSelected} />
      );

      // Should show loading spinner (animate-spin class)
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    /**
     * Test error state
     */
    it('should show error message when fetching users fails', async () => {
      mockParticipantsApi.getAll.mockRejectedValue(new Error('Network error'));

      render(
        <ParticipantSelectionModal isOpen={true} onParticipantSelected={mockOnParticipantSelected} />
      );

      await waitFor(() => {
        expect(screen.getByText('Fehler beim Laden der Teilnehmer: Network error')).toBeInTheDocument();
      });
    });
  });

  describe('Participant selection', () => {
    /**
     * Test that clicking a user shows confirmation and then calls onUserSelected
     * Validates: Requirement 5.2
     */
    it('should show confirmation and call onParticipantSelected when confirmed', async () => {
      const mockParticipants = [
        { id: 'user-1', name: 'Alice' },
        { id: 'user-2', name: 'Bob' },
      ];
      mockParticipantsApi.getAll.mockResolvedValue({ participants: mockParticipants });

      render(
        <ParticipantSelectionModal isOpen={true} onParticipantSelected={mockOnParticipantSelected} />
      );

      await waitFor(() => {
        expect(screen.getByText('Alice')).toBeInTheDocument();
      });

      // Click on the user to select them
      fireEvent.click(screen.getByText('Alice'));

      // Should show confirmation dialog
      await waitFor(() => {
        expect(screen.getByText(/Du meldest Dich als/)).toBeInTheDocument();
        expect(screen.getByText('Alice')).toBeInTheDocument();
      });

      // Click "Ja" to confirm
      fireEvent.click(screen.getByText('Ja'));

      expect(mockOnParticipantSelected).toHaveBeenCalledWith({ id: 'user-1', name: 'Alice' });
    });

    it('should go back to participant list when clicking "Nein, nochmal zurück"', async () => {
      const mockParticipants = [
        { id: 'user-1', name: 'Alice' },
        { id: 'user-2', name: 'Bob' },
      ];
      mockParticipantsApi.getAll.mockResolvedValue({ participants: mockParticipants });

      render(
        <ParticipantSelectionModal isOpen={true} onParticipantSelected={mockOnParticipantSelected} />
      );

      await waitFor(() => {
        expect(screen.getByText('Alice')).toBeInTheDocument();
      });

      // Click on the user to select them
      fireEvent.click(screen.getByText('Alice'));

      // Should show confirmation dialog
      await waitFor(() => {
        expect(screen.getByText(/Du meldest Dich als/)).toBeInTheDocument();
      });

      // Click "Nein, nochmal zurück" to go back
      fireEvent.click(screen.getByText('Nein, nochmal zurück'));

      // Should be back to user list
      await waitFor(() => {
        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.getByText('Bob')).toBeInTheDocument();
      });

      expect(mockOnParticipantSelected).not.toHaveBeenCalled();
    });
  });

  describe('New participant creation', () => {
    /**
     * Test that create form can be shown
     * Validates: Requirement 5.3
     */
    it('should show create form when clicking "Neuen Teilnehmer erstellen"', async () => {
      mockParticipantsApi.getAll.mockResolvedValue({ participants: [{ id: 'user-1', name: 'Alice' }] });

      render(
        <ParticipantSelectionModal isOpen={true} onParticipantSelected={mockOnParticipantSelected} />
      );

      await waitFor(() => {
        expect(screen.getByText('+ Neuen Teilnehmer erstellen')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('+ Neuen Teilnehmer erstellen'));

      expect(screen.getByPlaceholderText('Dein Name')).toBeInTheDocument();
    });

    /**
     * Test successful user creation
     * Validates: Requirement 5.3
     */
    it('should create new participant and call onParticipantSelected', async () => {
      mockParticipantsApi.getAll.mockResolvedValue({ participants: [] });
      mockParticipantsApi.create.mockResolvedValue({ participant: { id: 'new-user-id', name: 'New User' } });

      render(
        <ParticipantSelectionModal isOpen={true} onParticipantSelected={mockOnParticipantSelected} />
      );

      await waitFor(() => {
        expect(screen.getByText('Ersten Teilnehmer erstellen')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Ersten Teilnehmer erstellen'));

      const input = screen.getByPlaceholderText('Dein Name');
      fireEvent.change(input, { target: { value: 'New User' } });

      fireEvent.click(screen.getByText('Erstellen'));

      await waitFor(() => {
        expect(mockParticipantsApi.create).toHaveBeenCalledWith('New User');
        expect(mockOnParticipantSelected).toHaveBeenCalledWith({ id: 'new-user-id', name: 'New User' });
      });
    });

    /**
     * Test validation error for empty name
     * Validates: Requirement 5.3
     */
    it('should disable create button when name is empty', async () => {
      mockParticipantsApi.getAll.mockResolvedValue({ participants: [] });

      render(
        <ParticipantSelectionModal isOpen={true} onParticipantSelected={mockOnParticipantSelected} />
      );

      await waitFor(() => {
        expect(screen.getByText('Ersten Teilnehmer erstellen')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Ersten Teilnehmer erstellen'));
      
      // The create button should be disabled when input is empty
      const createButton = screen.getByText('Erstellen');
      expect(createButton).toBeDisabled();

      expect(mockParticipantsApi.create).not.toHaveBeenCalled();
    });

    /**
     * Test API error handling (duplicate name)
     * Validates: Requirement 7.4 (German error messages)
     */
    it('should show API error message for duplicate name', async () => {
      mockParticipantsApi.getAll.mockResolvedValue({ participants: [] });
      mockParticipantsApi.create.mockRejectedValue(
        new ApiError('Ein Teilnehmer mit diesem Namen existiert bereits.', 'DUPLICATE_PARTICIPANT')
      );

      render(
        <ParticipantSelectionModal isOpen={true} onParticipantSelected={mockOnParticipantSelected} />
      );

      await waitFor(() => {
        expect(screen.getByText('Ersten Teilnehmer erstellen')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Ersten Teilnehmer erstellen'));

      const input = screen.getByPlaceholderText('Dein Name');
      fireEvent.change(input, { target: { value: 'Existing User' } });

      fireEvent.click(screen.getByText('Erstellen'));

      await waitFor(() => {
        expect(screen.getByText('Ein Teilnehmer mit diesem Namen existiert bereits.')).toBeInTheDocument();
      });
    });

    /**
     * Test cancel button
     */
    it('should hide create form when clicking cancel', async () => {
      mockParticipantsApi.getAll.mockResolvedValue({ participants: [{ id: 'user-1', name: 'Alice' }] });

      render(
        <ParticipantSelectionModal isOpen={true} onParticipantSelected={mockOnParticipantSelected} />
      );

      await waitFor(() => {
        expect(screen.getByText('+ Neuen Teilnehmer erstellen')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('+ Neuen Teilnehmer erstellen'));
      expect(screen.getByPlaceholderText('Dein Name')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Abbrechen'));

      expect(screen.queryByPlaceholderText('Dein Name')).not.toBeInTheDocument();
      expect(screen.getByText('+ Neuen Teilnehmer erstellen')).toBeInTheDocument();
    });
  });
});

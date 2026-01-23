/**
 * Unit tests for UserSelectionModal component
 * 
 * **Validates: Requirements 5.1, 5.2, 5.3**
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UserSelectionModal } from '../UserSelectionModal';

// Mock the API client
vi.mock('../../api/client', () => ({
  usersApi: {
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

import { usersApi, ApiError } from '../../api/client';

const mockUsersApi = usersApi as {
  getAll: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
};

describe('UserSelectionModal', () => {
  const mockOnUserSelected = vi.fn();

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
      mockUsersApi.getAll.mockResolvedValue({ users: [] });

      render(
        <UserSelectionModal isOpen={true} onUserSelected={mockOnUserSelected} />
      );

      expect(screen.getByText('Wer bist du?')).toBeInTheDocument();
    });

    /**
     * Test that modal does not render when isOpen is false
     */
    it('should not render modal when isOpen is false', () => {
      render(
        <UserSelectionModal isOpen={false} onUserSelected={mockOnUserSelected} />
      );

      expect(screen.queryByText('Wer bist du?')).not.toBeInTheDocument();
    });
  });

  describe('User list rendering', () => {
    /**
     * Test that existing users are displayed
     * Validates: Requirement 5.2
     */
    it('should display list of existing users', async () => {
      const mockUsers = [
        { id: 'user-1', name: 'Alice' },
        { id: 'user-2', name: 'Bob' },
        { id: 'user-3', name: 'Charlie' },
      ];
      mockUsersApi.getAll.mockResolvedValue({ users: mockUsers });

      render(
        <UserSelectionModal isOpen={true} onUserSelected={mockOnUserSelected} />
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
      mockUsersApi.getAll.mockImplementation(() => new Promise(() => {}));

      render(
        <UserSelectionModal isOpen={true} onUserSelected={mockOnUserSelected} />
      );

      // Should show loading spinner (animate-spin class)
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    /**
     * Test error state
     */
    it('should show error message when fetching users fails', async () => {
      mockUsersApi.getAll.mockRejectedValue(new Error('Network error'));

      render(
        <UserSelectionModal isOpen={true} onUserSelected={mockOnUserSelected} />
      );

      await waitFor(() => {
        expect(screen.getByText('Fehler beim Laden der Benutzer: Network error')).toBeInTheDocument();
      });
    });
  });

  describe('User selection', () => {
    /**
     * Test that clicking a user calls onUserSelected
     * Validates: Requirement 5.2
     */
    it('should call onUserSelected when a user is clicked', async () => {
      const mockUsers = [
        { id: 'user-1', name: 'Alice' },
        { id: 'user-2', name: 'Bob' },
      ];
      mockUsersApi.getAll.mockResolvedValue({ users: mockUsers });

      render(
        <UserSelectionModal isOpen={true} onUserSelected={mockOnUserSelected} />
      );

      await waitFor(() => {
        expect(screen.getByText('Alice')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Alice'));

      expect(mockOnUserSelected).toHaveBeenCalledWith({ id: 'user-1', name: 'Alice' });
    });
  });

  describe('New user creation', () => {
    /**
     * Test that create form can be shown
     * Validates: Requirement 5.3
     */
    it('should show create form when clicking "Neuen Benutzer erstellen"', async () => {
      mockUsersApi.getAll.mockResolvedValue({ users: [{ id: 'user-1', name: 'Alice' }] });

      render(
        <UserSelectionModal isOpen={true} onUserSelected={mockOnUserSelected} />
      );

      await waitFor(() => {
        expect(screen.getByText('+ Neuen Benutzer erstellen')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('+ Neuen Benutzer erstellen'));

      expect(screen.getByPlaceholderText('Dein Name')).toBeInTheDocument();
    });

    /**
     * Test successful user creation
     * Validates: Requirement 5.3
     */
    it('should create new user and call onUserSelected', async () => {
      mockUsersApi.getAll.mockResolvedValue({ users: [] });
      mockUsersApi.create.mockResolvedValue({ user: { id: 'new-user-id', name: 'New User' } });

      render(
        <UserSelectionModal isOpen={true} onUserSelected={mockOnUserSelected} />
      );

      await waitFor(() => {
        expect(screen.getByText('Ersten Benutzer erstellen')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Ersten Benutzer erstellen'));

      const input = screen.getByPlaceholderText('Dein Name');
      fireEvent.change(input, { target: { value: 'New User' } });

      fireEvent.click(screen.getByText('Erstellen'));

      await waitFor(() => {
        expect(mockUsersApi.create).toHaveBeenCalledWith('New User');
        expect(mockOnUserSelected).toHaveBeenCalledWith({ id: 'new-user-id', name: 'New User' });
      });
    });

    /**
     * Test validation error for empty name
     * Validates: Requirement 5.3
     */
    it('should disable create button when name is empty', async () => {
      mockUsersApi.getAll.mockResolvedValue({ users: [] });

      render(
        <UserSelectionModal isOpen={true} onUserSelected={mockOnUserSelected} />
      );

      await waitFor(() => {
        expect(screen.getByText('Ersten Benutzer erstellen')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Ersten Benutzer erstellen'));
      
      // The create button should be disabled when input is empty
      const createButton = screen.getByText('Erstellen');
      expect(createButton).toBeDisabled();

      expect(mockUsersApi.create).not.toHaveBeenCalled();
    });

    /**
     * Test API error handling (duplicate name)
     * Validates: Requirement 7.4 (German error messages)
     */
    it('should show API error message for duplicate name', async () => {
      mockUsersApi.getAll.mockResolvedValue({ users: [] });
      mockUsersApi.create.mockRejectedValue(
        new ApiError('Ein Benutzer mit diesem Namen existiert bereits.', 'DUPLICATE_USER')
      );

      render(
        <UserSelectionModal isOpen={true} onUserSelected={mockOnUserSelected} />
      );

      await waitFor(() => {
        expect(screen.getByText('Ersten Benutzer erstellen')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Ersten Benutzer erstellen'));

      const input = screen.getByPlaceholderText('Dein Name');
      fireEvent.change(input, { target: { value: 'Existing User' } });

      fireEvent.click(screen.getByText('Erstellen'));

      await waitFor(() => {
        expect(screen.getByText('Ein Benutzer mit diesem Namen existiert bereits.')).toBeInTheDocument();
      });
    });

    /**
     * Test cancel button
     */
    it('should hide create form when clicking cancel', async () => {
      mockUsersApi.getAll.mockResolvedValue({ users: [{ id: 'user-1', name: 'Alice' }] });

      render(
        <UserSelectionModal isOpen={true} onUserSelected={mockOnUserSelected} />
      );

      await waitFor(() => {
        expect(screen.getByText('+ Neuen Benutzer erstellen')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('+ Neuen Benutzer erstellen'));
      expect(screen.getByPlaceholderText('Dein Name')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Abbrechen'));

      expect(screen.queryByPlaceholderText('Dein Name')).not.toBeInTheDocument();
      expect(screen.getByText('+ Neuen Benutzer erstellen')).toBeInTheDocument();
    });
  });
});

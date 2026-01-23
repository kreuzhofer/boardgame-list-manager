/**
 * Unit tests for UserOptionsDialog component
 * **Validates: Requirements 9.1, 9.2, 9.3, 9.6, 9.7, 8.4**
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UserOptionsDialog } from '../UserOptionsDialog';
import type { User } from '../../types';

// Mock UserNameEditor component
vi.mock('../UserNameEditor', () => ({
  UserNameEditor: ({ user, onUserUpdated }: { user: User; onUserUpdated: (user: User) => void }) => (
    <div data-testid="user-name-editor">
      <span data-testid="current-user-name">{user.name}</span>
      <button 
        data-testid="save-name-button"
        onClick={() => onUserUpdated({ ...user, name: 'Updated Name' })}
      >
        Save
      </button>
    </div>
  ),
}));

const mockUser: User = {
  id: 'user-1',
  name: 'Test User',
};

const mockOnClose = vi.fn();
const mockOnUserUpdated = vi.fn();
const mockOnLogout = vi.fn();

describe('UserOptionsDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Dialog Open/Close', () => {
    it('renders nothing when isOpen is false', () => {
      const { container } = render(
        <UserOptionsDialog
          isOpen={false}
          onClose={mockOnClose}
          user={mockUser}
          onUserUpdated={mockOnUserUpdated}
          onLogout={mockOnLogout}
        />
      );

      expect(container).toBeEmptyDOMElement();
    });

    it('renders dialog when isOpen is true', () => {
      render(
        <UserOptionsDialog
          isOpen={true}
          onClose={mockOnClose}
          user={mockUser}
          onUserUpdated={mockOnUserUpdated}
          onLogout={mockOnLogout}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', () => {
      render(
        <UserOptionsDialog
          isOpen={true}
          onClose={mockOnClose}
          user={mockUser}
          onUserUpdated={mockOnUserUpdated}
          onLogout={mockOnLogout}
        />
      );

      const closeButton = screen.getByRole('button', { name: 'Schließen' });
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when clicking backdrop', () => {
      render(
        <UserOptionsDialog
          isOpen={true}
          onClose={mockOnClose}
          user={mockUser}
          onUserUpdated={mockOnUserUpdated}
          onLogout={mockOnLogout}
        />
      );

      // Click on the backdrop (the outer div with role="dialog")
      const backdrop = screen.getByRole('dialog');
      fireEvent.click(backdrop);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('does not close when clicking inside the dialog content', () => {
      render(
        <UserOptionsDialog
          isOpen={true}
          onClose={mockOnClose}
          user={mockUser}
          onUserUpdated={mockOnUserUpdated}
          onLogout={mockOnLogout}
        />
      );

      // Click on the dialog title (inside the content)
      const title = screen.getByText('Profil');
      fireEvent.click(title);

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('User Name Editor', () => {
    it('renders UserNameEditor when user is logged in (Requirement 9.2)', () => {
      render(
        <UserOptionsDialog
          isOpen={true}
          onClose={mockOnClose}
          user={mockUser}
          onUserUpdated={mockOnUserUpdated}
          onLogout={mockOnLogout}
        />
      );

      expect(screen.getByTestId('user-name-editor')).toBeInTheDocument();
      expect(screen.getByTestId('current-user-name')).toHaveTextContent('Test User');
    });

    it('displays "Benutzername" label in German (Requirement 8.4)', () => {
      render(
        <UserOptionsDialog
          isOpen={true}
          onClose={mockOnClose}
          user={mockUser}
          onUserUpdated={mockOnUserUpdated}
          onLogout={mockOnLogout}
        />
      );

      expect(screen.getByText('Benutzername')).toBeInTheDocument();
    });
  });

  describe('Logout Button', () => {
    it('renders logout button when user is logged in (Requirement 9.3)', () => {
      render(
        <UserOptionsDialog
          isOpen={true}
          onClose={mockOnClose}
          user={mockUser}
          onUserUpdated={mockOnUserUpdated}
          onLogout={mockOnLogout}
        />
      );

      expect(screen.getByTestId('logout-button')).toBeInTheDocument();
    });

    it('displays "Abmelden" text in German (Requirement 8.4)', () => {
      render(
        <UserOptionsDialog
          isOpen={true}
          onClose={mockOnClose}
          user={mockUser}
          onUserUpdated={mockOnUserUpdated}
          onLogout={mockOnLogout}
        />
      );

      expect(screen.getByText('Abmelden')).toBeInTheDocument();
    });

    it('calls onLogout when logout button is clicked (Requirement 9.5)', () => {
      render(
        <UserOptionsDialog
          isOpen={true}
          onClose={mockOnClose}
          user={mockUser}
          onUserUpdated={mockOnUserUpdated}
          onLogout={mockOnLogout}
        />
      );

      const logoutButton = screen.getByTestId('logout-button');
      fireEvent.click(logoutButton);

      expect(mockOnLogout).toHaveBeenCalledTimes(1);
    });
  });

  describe('No User State', () => {
    it('displays "Kein Benutzer angemeldet" message when no user (Requirement 9.7)', () => {
      render(
        <UserOptionsDialog
          isOpen={true}
          onClose={mockOnClose}
          user={null}
          onUserUpdated={mockOnUserUpdated}
          onLogout={mockOnLogout}
        />
      );

      expect(screen.getByTestId('no-user-message')).toBeInTheDocument();
      expect(screen.getByText('Kein Benutzer angemeldet')).toBeInTheDocument();
    });

    it('does not render UserNameEditor when no user', () => {
      render(
        <UserOptionsDialog
          isOpen={true}
          onClose={mockOnClose}
          user={null}
          onUserUpdated={mockOnUserUpdated}
          onLogout={mockOnLogout}
        />
      );

      expect(screen.queryByTestId('user-name-editor')).not.toBeInTheDocument();
    });

    it('does not render logout button when no user', () => {
      render(
        <UserOptionsDialog
          isOpen={true}
          onClose={mockOnClose}
          user={null}
          onUserUpdated={mockOnUserUpdated}
          onLogout={mockOnLogout}
        />
      );

      expect(screen.queryByTestId('logout-button')).not.toBeInTheDocument();
    });
  });

  describe('Dialog Title', () => {
    it('displays "Profil" as dialog title in German (Requirement 8.4)', () => {
      render(
        <UserOptionsDialog
          isOpen={true}
          onClose={mockOnClose}
          user={mockUser}
          onUserUpdated={mockOnUserUpdated}
          onLogout={mockOnLogout}
        />
      );

      expect(screen.getByText('Profil')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper dialog role and aria attributes', () => {
      render(
        <UserOptionsDialog
          isOpen={true}
          onClose={mockOnClose}
          user={mockUser}
          onUserUpdated={mockOnUserUpdated}
          onLogout={mockOnLogout}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'user-options-title');
    });

    it('close button has accessible label', () => {
      render(
        <UserOptionsDialog
          isOpen={true}
          onClose={mockOnClose}
          user={mockUser}
          onUserUpdated={mockOnUserUpdated}
          onLogout={mockOnLogout}
        />
      );

      expect(screen.getByRole('button', { name: 'Schließen' })).toBeInTheDocument();
    });
  });
});

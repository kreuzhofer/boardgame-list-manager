/**
 * Unit tests for ParticipantOptionsDialog component
 * **Validates: Requirements 9.1, 9.2, 9.3, 9.6, 9.7, 8.4**
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ParticipantOptionsDialog } from '../ParticipantOptionsDialog';
import type { Participant } from '../../types';

// Mock ParticipantNameEditor component
vi.mock('../ParticipantNameEditor', () => ({
  ParticipantNameEditor: ({ participant, onParticipantUpdated }: { participant: Participant; onParticipantUpdated: (participant: Participant) => void }) => (
    <div data-testid="participant-name-editor">
      <span data-testid="current-participant-name">{participant.name}</span>
      <button 
        data-testid="save-name-button"
        onClick={() => onParticipantUpdated({ ...participant, name: 'Updated Name' })}
      >
        Save
      </button>
    </div>
  ),
}));

const mockParticipant: Participant = {
  id: 'user-1',
  name: 'Test User',
};

const mockOnClose = vi.fn();
const mockOnParticipantUpdated = vi.fn();
const mockOnParticipantSwitch = vi.fn();

describe('ParticipantOptionsDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Dialog Open/Close', () => {
    it('renders nothing when isOpen is false', () => {
      const { container } = render(
        <ParticipantOptionsDialog
          isOpen={false}
          onClose={mockOnClose}
          participant={mockParticipant}
          onParticipantUpdated={mockOnParticipantUpdated}
          onParticipantSwitch={mockOnParticipantSwitch}
        />
      );

      expect(container).toBeEmptyDOMElement();
    });

    it('renders dialog when isOpen is true', () => {
      render(
        <ParticipantOptionsDialog
          isOpen={true}
          onClose={mockOnClose}
          participant={mockParticipant}
          onParticipantUpdated={mockOnParticipantUpdated}
          onParticipantSwitch={mockOnParticipantSwitch}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', () => {
      render(
        <ParticipantOptionsDialog
          isOpen={true}
          onClose={mockOnClose}
          participant={mockParticipant}
          onParticipantUpdated={mockOnParticipantUpdated}
          onParticipantSwitch={mockOnParticipantSwitch}
        />
      );

      const closeButton = screen.getByRole('button', { name: 'Schließen' });
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when clicking backdrop', () => {
      render(
        <ParticipantOptionsDialog
          isOpen={true}
          onClose={mockOnClose}
          participant={mockParticipant}
          onParticipantUpdated={mockOnParticipantUpdated}
          onParticipantSwitch={mockOnParticipantSwitch}
        />
      );

      // Click on the backdrop (the outer div with role="dialog")
      const backdrop = screen.getByRole('dialog');
      fireEvent.click(backdrop);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('does not close when clicking inside the dialog content', () => {
      render(
        <ParticipantOptionsDialog
          isOpen={true}
          onClose={mockOnClose}
          participant={mockParticipant}
          onParticipantUpdated={mockOnParticipantUpdated}
          onParticipantSwitch={mockOnParticipantSwitch}
        />
      );

      // Click on the dialog title (inside the content)
      const title = screen.getByText('Profil');
      fireEvent.click(title);

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Participant Name Editor', () => {
    it('renders ParticipantNameEditor when participant is logged in (Requirement 9.2)', () => {
      render(
        <ParticipantOptionsDialog
          isOpen={true}
          onClose={mockOnClose}
          participant={mockParticipant}
          onParticipantUpdated={mockOnParticipantUpdated}
          onParticipantSwitch={mockOnParticipantSwitch}
        />
      );

      expect(screen.getByTestId('participant-name-editor')).toBeInTheDocument();
      expect(screen.getByTestId('current-participant-name')).toHaveTextContent('Test User');
    });

    it('displays "Teilnehmername" label in German (Requirement 8.4)', () => {
      render(
        <ParticipantOptionsDialog
          isOpen={true}
          onClose={mockOnClose}
          participant={mockParticipant}
          onParticipantUpdated={mockOnParticipantUpdated}
          onParticipantSwitch={mockOnParticipantSwitch}
        />
      );

      expect(screen.getByText('Teilnehmername')).toBeInTheDocument();
    });
  });

  describe('Logout Button', () => {
    it('renders logout button when participant is logged in (Requirement 9.3)', () => {
      render(
        <ParticipantOptionsDialog
          isOpen={true}
          onClose={mockOnClose}
          participant={mockParticipant}
          onParticipantUpdated={mockOnParticipantUpdated}
          onParticipantSwitch={mockOnParticipantSwitch}
        />
      );

      expect(screen.getByTestId('logout-button')).toBeInTheDocument();
    });

    it('displays "Abmelden" text in German (Requirement 8.4)', () => {
      render(
        <ParticipantOptionsDialog
          isOpen={true}
          onClose={mockOnClose}
          participant={mockParticipant}
          onParticipantUpdated={mockOnParticipantUpdated}
          onParticipantSwitch={mockOnParticipantSwitch}
        />
      );

      expect(screen.getByText('Abmelden')).toBeInTheDocument();
    });

    it('calls onParticipantSwitch when logout button is clicked (Requirement 9.5)', () => {
      render(
        <ParticipantOptionsDialog
          isOpen={true}
          onClose={mockOnClose}
          participant={mockParticipant}
          onParticipantUpdated={mockOnParticipantUpdated}
          onParticipantSwitch={mockOnParticipantSwitch}
        />
      );

      const logoutButton = screen.getByTestId('logout-button');
      fireEvent.click(logoutButton);

      expect(mockOnParticipantSwitch).toHaveBeenCalledTimes(1);
    });
  });

  describe('No Participant State', () => {
    it('displays "Kein Teilnehmer angemeldet" message when no participant (Requirement 9.7)', () => {
      render(
        <ParticipantOptionsDialog
          isOpen={true}
          onClose={mockOnClose}
          participant={null}
          onParticipantUpdated={mockOnParticipantUpdated}
          onParticipantSwitch={mockOnParticipantSwitch}
        />
      );

      expect(screen.getByTestId('no-participant-message')).toBeInTheDocument();
      expect(screen.getByText('Kein Teilnehmer angemeldet')).toBeInTheDocument();
    });

    it('does not render ParticipantNameEditor when no participant', () => {
      render(
        <ParticipantOptionsDialog
          isOpen={true}
          onClose={mockOnClose}
          participant={null}
          onParticipantUpdated={mockOnParticipantUpdated}
          onParticipantSwitch={mockOnParticipantSwitch}
        />
      );

      expect(screen.queryByTestId('participant-name-editor')).not.toBeInTheDocument();
    });

    it('does not render logout button when no participant', () => {
      render(
        <ParticipantOptionsDialog
          isOpen={true}
          onClose={mockOnClose}
          participant={null}
          onParticipantUpdated={mockOnParticipantUpdated}
          onParticipantSwitch={mockOnParticipantSwitch}
        />
      );

      expect(screen.queryByTestId('logout-button')).not.toBeInTheDocument();
    });
  });

  describe('Dialog Title', () => {
    it('displays "Profil" as dialog title in German (Requirement 8.4)', () => {
      render(
        <ParticipantOptionsDialog
          isOpen={true}
          onClose={mockOnClose}
          participant={mockParticipant}
          onParticipantUpdated={mockOnParticipantUpdated}
          onParticipantSwitch={mockOnParticipantSwitch}
        />
      );

      expect(screen.getByText('Profil')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper dialog role and aria attributes', () => {
      render(
        <ParticipantOptionsDialog
          isOpen={true}
          onClose={mockOnClose}
          participant={mockParticipant}
          onParticipantUpdated={mockOnParticipantUpdated}
          onParticipantSwitch={mockOnParticipantSwitch}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'participant-options-title');
    });

    it('close button has accessible label', () => {
      render(
        <ParticipantOptionsDialog
          isOpen={true}
          onClose={mockOnClose}
          participant={mockParticipant}
          onParticipantUpdated={mockOnParticipantUpdated}
          onParticipantSwitch={mockOnParticipantSwitch}
        />
      );

      expect(screen.getByRole('button', { name: 'Schließen' })).toBeInTheDocument();
    });
  });
});

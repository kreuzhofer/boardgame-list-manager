/**
 * ParticipantOptionsDialog - Modal dialog for participant profile management
 * Displays participant name editor and logout option
 * Uses createPortal for proper modal rendering
 * All UI text in German (Requirement 8.4)
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.5, 9.6, 9.7, 8.4
 */

import { createPortal } from 'react-dom';
import { ParticipantNameEditor } from './ParticipantNameEditor';
import type { Participant } from '../types';

interface ParticipantOptionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  participant: Participant | null;
  onParticipantUpdated: (participant: Participant) => void;
  onParticipantSwitch: () => void;
}

export function ParticipantOptionsDialog({
  isOpen,
  onClose,
  participant,
  onParticipantUpdated,
  onParticipantSwitch,
}: ParticipantOptionsDialogProps) {
  if (!isOpen) {
    return null;
  }

  const handleLogout = () => {
    onParticipantSwitch();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const dialogContent = (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="participant-options-title"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-sm w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <h2 id="participant-options-title" className="text-xl font-semibold text-gray-900">
            Profil
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
            aria-label="Schließen"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
          {participant ? (
            <div className="space-y-6">
              {/* Participant Name Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teilnehmername
                </label>
                {/* Blue background to match ParticipantNameEditor's white text styling */}
                <div className="bg-blue-600 rounded-lg p-3">
                  <ParticipantNameEditor
                    participant={participant}
                    onParticipantUpdated={onParticipantUpdated}
                  />
                </div>
              </div>

              {/* Logout Section */}
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-3 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors font-medium text-sm"
                  data-testid="logout-button"
                >
                  Abmelden
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <svg
                className="w-16 h-16 mx-auto text-gray-300 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              <p className="text-gray-500" data-testid="no-participant-message">
                Kein Teilnehmer angemeldet
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(dialogContent, document.body);
}

export default ParticipantOptionsDialog;

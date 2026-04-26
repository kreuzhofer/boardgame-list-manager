/**
 * DeleteGameModal component
 * Confirmation dialog for deleting a game
 * Uses createPortal for proper modal rendering
 * All UI text in German (Requirement 9.1)
 */

import { createPortal } from 'react-dom';

interface DeleteGameModalProps {
  isOpen: boolean;
  gameName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
  playersCount?: number;
  bringersCount?: number;
}

export function DeleteGameModal({
  isOpen,
  gameName,
  onConfirm,
  onCancel,
  isDeleting = false,
  playersCount = 0,
  bringersCount = 0,
}: DeleteGameModalProps) {
  if (!isOpen) return null;

  const hasParticipants = playersCount > 0 || bringersCount > 0;
  const participantDetails = [
    playersCount > 0 ? `${playersCount} Mitspieler` : null,
    bringersCount > 0 ? `${bringersCount} Mitbringer` : null,
  ].filter(Boolean).join(' und ');

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-paper-hi rounded-lg shadow-floating max-w-md w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-rule flex items-center justify-between flex-shrink-0">
          <h2 className="text-xl font-semibold text-ink">Spiel löschen</h2>
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="text-ink-mute hover:text-ink-soft transition-colors"
            aria-label="Schließen"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
          <p className="text-ink-soft">
            Möchtest du das Spiel <strong>"{gameName}"</strong> wirklich löschen?
          </p>
          {hasParticipants && (
            <div className="mt-4 rounded-lg border border-butter bg-butter-50 p-3 text-sm text-butter-deep">
              <p className="font-semibold">Achtung: Es sind noch Einträge vorhanden.</p>
              <p className="mt-1">
                Für dieses Spiel sind noch {participantDetails} eingetragen. Beim Löschen werden diese Einträge entfernt.
              </p>
            </div>
          )}
          <p className="text-ink-mute text-sm mt-2">
            Diese Aktion kann nicht rückgängig gemacht werden.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-rule flex-shrink-0 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 text-ink-soft bg-paper-lo hover:bg-rule rounded transition-colors disabled:opacity-50"
          >
            Abbrechen
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-white bg-blush-deep hover:bg-blush-deep rounded transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isDeleting ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Löschen...
              </>
            ) : (
              'Löschen'
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default DeleteGameModal;

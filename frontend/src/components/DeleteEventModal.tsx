/**
 * DeleteEventModal — owner-side confirmation for deleting a Treff.
 *
 * Two visual paths driven by the server-supplied `preview.isEmpty` so
 * the modal never disagrees with what the server will do:
 *
 *  - empty event   → single-confirm "Treff löschen?"; on confirm
 *                    the server hard-deletes the row.
 *  - non-empty     → preview of substantive data (games, players,
 *                    bringers, participants), warn copy explaining
 *                    that the event will sit in "Gelöschte Treffs"
 *                    for 30 days before purging, single confirm.
 *
 * The parent fetches the preview before opening this modal so the
 * UI can stay synchronous; passing it down also keeps this component
 * trivially testable.
 */

import { createPortal } from 'react-dom';
import type { EventDeletionPreview } from '../types/event';

interface DeleteEventModalProps {
  isOpen: boolean;
  preview: EventDeletionPreview | null;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

export function DeleteEventModal({
  isOpen,
  preview,
  onConfirm,
  onCancel,
  isDeleting = false,
}: DeleteEventModalProps) {
  if (!isOpen || !preview) return null;

  const isEmpty = preview.isEmpty;

  return createPortal(
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center p-4 z-50">
      <div className="bg-paper-hi rounded-lg shadow-floating max-w-md w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-rule flex items-center justify-between flex-shrink-0">
          <h2 className="text-xl font-semibold text-ink">Treff löschen</h2>
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
            Möchtest du den Treff <strong>"{preview.name}"</strong> wirklich löschen?
          </p>

          {isEmpty ? (
            <div className="mt-4 rounded-lg border border-rule bg-paper-lo p-3 text-sm text-ink-soft">
              <p className="font-semibold text-ink">Leerer Treff</p>
              <p className="mt-1">
                Es sind weder Spiele noch Teilnehmer eingetragen. Der Treff
                wird endgültig gelöscht.
              </p>
            </div>
          ) : (
            <>
              <div className="mt-4 rounded-lg border border-butter bg-butter-50 p-3 text-sm text-butter-deep">
                <p className="font-semibold">Achtung: Dieser Treff enthält Daten.</p>
                <ul className="mt-2 space-y-0.5 list-disc list-inside text-butter-deep/90">
                  {preview.gamesCount > 0 && (
                    <li>
                      {preview.gamesCount}{' '}
                      {preview.gamesCount === 1 ? 'Spiel' : 'Spiele'}
                    </li>
                  )}
                  {preview.bringersCount > 0 && (
                    <li>
                      {preview.bringersCount} Mitbringer-Einträge
                    </li>
                  )}
                  {preview.playersCount > 0 && (
                    <li>
                      {preview.playersCount} Mitspieler-Einträge
                    </li>
                  )}
                  {preview.participantsCount > 0 && (
                    <li>
                      {preview.participantsCount}{' '}
                      {preview.participantsCount === 1 ? 'Teilnehmer:in' : 'Teilnehmer:innen'}
                    </li>
                  )}
                </ul>
              </div>
              <div className="mt-3 rounded-lg border border-rule bg-paper-lo p-3 text-sm text-ink-soft">
                <p>
                  Der Treff wird zur Löschung <strong>vorgemerkt</strong>. Du
                  findest ihn 30 Tage lang unter <em>„Gelöschte Treffs"</em>{' '}
                  und kannst ihn dort wiederherstellen.
                </p>
                <p className="mt-1">
                  Nach 30 Tagen wird er endgültig entfernt.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-rule flex-shrink-0 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="wg-btn-ghost disabled:opacity-50"
          >
            Abbrechen
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="wg-btn-danger disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Löschen…
              </>
            ) : isEmpty ? (
              'Endgültig löschen'
            ) : (
              'Zur Löschung markieren'
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default DeleteEventModal;

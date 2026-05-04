/**
 * DeleteAccountModal component
 * Confirmation dialog for hard-deleting an account.
 *
 * Two states:
 *  - account owns no events → confirm + delete enabled
 *  - account owns events    → primary CTA disabled, hint to transfer first
 *
 * Server enforces SELF_DELETE and ACCOUNT_HAS_EVENTS so this UI can
 * trust those guards exist; we surface them client-side just to
 * avoid letting the operator hit "Löschen" only to be rejected.
 */

import { createPortal } from 'react-dom';

interface DeleteAccountModalProps {
  isOpen: boolean;
  email: string;
  ownedEventsCount: number;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

export function DeleteAccountModal({
  isOpen,
  email,
  ownedEventsCount,
  onConfirm,
  onCancel,
  isDeleting = false,
}: DeleteAccountModalProps) {
  if (!isOpen) return null;

  const blockedByEvents = ownedEventsCount > 0;

  return createPortal(
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center p-4 z-50">
      <div className="bg-paper-hi rounded-lg shadow-floating max-w-md w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-rule flex items-center justify-between flex-shrink-0">
          <h2 className="text-xl font-semibold text-ink">Konto löschen</h2>
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
            Möchtest du das Konto <strong>{email}</strong> wirklich endgültig löschen?
          </p>

          {blockedByEvents ? (
            <div className="mt-4 rounded-lg border border-blush bg-blush-50 p-3 text-sm text-blush-deep">
              <p className="font-semibold">Konto besitzt noch Treffs.</p>
              <p className="mt-1">
                Dieses Konto verwaltet noch {ownedEventsCount}{' '}
                {ownedEventsCount === 1 ? 'Treff' : 'Treffs'}. Bitte zuerst über
                {' '}<strong>Treffs übertragen</strong> einen neuen Veranstalter
                auswählen.
              </p>
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-butter bg-butter-50 p-3 text-sm text-butter-deep">
              <p className="font-semibold">Auswirkungen:</p>
              <ul className="mt-1 list-disc list-inside space-y-0.5">
                <li>
                  Spieler-Einträge in Treffs bleiben erhalten, werden aber
                  anonymisiert (vom Konto getrennt).
                </li>
                <li>Alle aktiven Sitzungen werden beendet.</li>
                <li>Anmelde-Links und Passwort-Hash werden entfernt.</li>
              </ul>
            </div>
          )}

          <p className="text-ink-mute text-sm mt-3">
            Diese Aktion kann nicht rückgängig gemacht werden.
          </p>
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
            disabled={isDeleting || blockedByEvents}
            className="wg-btn-danger disabled:opacity-50 disabled:cursor-not-allowed"
            title={blockedByEvents ? 'Treffs zuerst übertragen' : undefined}
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
              'Endgültig löschen'
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default DeleteAccountModal;

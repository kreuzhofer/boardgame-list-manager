/**
 * UndeleteEventModal — restore a soft-deleted event.
 *
 * The slug input is pre-filled with the original (the part before
 * `-deleted[-N]`). The user can edit it; on confirm the server
 * checks uniqueness and either restores the event or rejects with
 * SLUG_TAKEN, which we surface inline so the user can pick a
 * different slug without closing the modal.
 */

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Event } from '../types/event';

interface UndeleteEventModalProps {
  isOpen: boolean;
  event: Event | null;
  /** Confirm handler. Returns the error code on failure (e.g. SLUG_TAKEN, SLUG_INVALID). */
  onConfirm: (slug: string) => Promise<string | null>;
  onCancel: () => void;
  isWorking?: boolean;
}

/** Strip `-deleted` or `-deletedN` suffix from a tombstoned slug. */
function strippedSlug(slug: string | null | undefined): string {
  if (!slug) return '';
  return slug.replace(/-deleted\d*$/, '');
}

export function UndeleteEventModal({
  isOpen,
  event,
  onConfirm,
  onCancel,
  isWorking = false,
}: UndeleteEventModalProps) {
  const [slug, setSlug] = useState('');
  const [inlineError, setInlineError] = useState<string | null>(null);

  // Reset state on open / event change.
  useEffect(() => {
    if (isOpen && event) {
      setSlug(strippedSlug(event.slug));
      setInlineError(null);
    }
  }, [isOpen, event?.id, event?.slug]);

  if (!isOpen || !event) return null;

  const handleConfirm = async () => {
    setInlineError(null);
    const trimmed = slug.trim();
    if (!trimmed) {
      setInlineError('Bitte einen Slug angeben.');
      return;
    }
    const errorCode = await onConfirm(trimmed);
    if (errorCode === 'SLUG_TAKEN') {
      setInlineError(`Slug "${trimmed}" ist bereits vergeben. Bitte wähle einen anderen.`);
    } else if (errorCode === 'SLUG_INVALID') {
      setInlineError('Slug ist ungültig (z. B. reserviert oder enthält ungültige Zeichen).');
    } else if (errorCode) {
      setInlineError('Wiederherstellung fehlgeschlagen.');
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center p-4 z-50">
      <div className="bg-paper-hi rounded-lg shadow-floating max-w-md w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-rule flex items-center justify-between flex-shrink-0">
          <h2 className="text-xl font-semibold text-ink">Treff wiederherstellen</h2>
          <button
            onClick={onCancel}
            disabled={isWorking}
            className="text-ink-mute hover:text-ink-soft transition-colors"
            aria-label="Schließen"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 overflow-y-auto flex-1 space-y-3">
          <p className="text-ink-soft">
            Der Treff <strong>"{event.name}"</strong> wird wiederhergestellt.
          </p>

          <div>
            <label htmlFor="undelete-slug" className="wg-label block mb-1">
              Slug
            </label>
            <input
              id="undelete-slug"
              type="text"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                if (inlineError) setInlineError(null);
              }}
              disabled={isWorking}
              className={`wg-input w-full ${inlineError ? 'wg-input-error' : ''}`}
              placeholder="treff-name"
            />
            <p className="text-xs text-ink-mute mt-1">
              Wenn der ursprüngliche Slug noch frei ist, kannst du ihn so
              behalten. Andernfalls wähle einen freien Slug.
            </p>
            {inlineError && (
              <p className="text-xs text-blush-deep mt-1">{inlineError}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-rule flex-shrink-0 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isWorking}
            className="wg-btn-ghost disabled:opacity-50"
          >
            Abbrechen
          </button>
          <button
            onClick={handleConfirm}
            disabled={isWorking || slug.trim().length === 0}
            className="wg-btn-primary disabled:opacity-50"
          >
            {isWorking ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Wiederherstellen…
              </>
            ) : (
              'Wiederherstellen'
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default UndeleteEventModal;

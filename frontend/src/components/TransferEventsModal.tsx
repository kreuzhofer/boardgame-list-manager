/**
 * TransferEventsModal component
 *
 * Bulk-reassigns ownership of every event a source account owns to a
 * target account. Backs the admin "Treffs übertragen" flow that gates
 * account deletion (you can't delete an owner without first emptying
 * their event list).
 *
 * The modal:
 *  - Lists the events being moved (read-only, for confirmation)
 *  - Provides a target picker filtered to active accounts excluding
 *    the source itself (server enforces this too — we just don't
 *    surface invalid choices)
 *  - On confirm, posts to /api/accounts/:source/transfer-events
 */

import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { AdminAccountRow, OwnedEventLite } from '../types/account';

interface TransferEventsModalProps {
  isOpen: boolean;
  source: AdminAccountRow | null;
  ownedEvents: OwnedEventLite[];
  /** All accounts in the admin list — the picker filters this. */
  allAccounts: AdminAccountRow[];
  onConfirm: (targetAccountId: string) => void | Promise<void>;
  onCancel: () => void;
  isTransferring?: boolean;
}

export function TransferEventsModal({
  isOpen,
  source,
  ownedEvents,
  allAccounts,
  onConfirm,
  onCancel,
  isTransferring = false,
}: TransferEventsModalProps) {
  const [targetId, setTargetId] = useState<string>('');

  // Reset target whenever the modal opens for a different source.
  useEffect(() => {
    if (isOpen) setTargetId('');
  }, [isOpen, source?.id]);

  // Eligible targets: active accounts only, excluding the source.
  // Server enforces the same constraints; this just trims the picker.
  const eligibleTargets = useMemo(
    () =>
      allAccounts.filter(
        (a) => a.id !== source?.id && a.status === 'active',
      ),
    [allAccounts, source?.id],
  );

  if (!isOpen || !source) return null;

  return createPortal(
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center p-4 z-50">
      <div className="bg-paper-hi rounded-lg shadow-floating max-w-lg w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-rule flex items-center justify-between flex-shrink-0">
          <h2 className="text-xl font-semibold text-ink">Treffs übertragen</h2>
          <button
            onClick={onCancel}
            disabled={isTransferring}
            className="text-ink-mute hover:text-ink-soft transition-colors"
            aria-label="Schließen"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 overflow-y-auto flex-1 space-y-4">
          <p className="text-ink-soft">
            Folgende Treffs werden von <strong>{source.email}</strong> auf
            ein anderes Konto übertragen:
          </p>

          {ownedEvents.length === 0 ? (
            <div className="rounded-lg border border-rule bg-paper-lo p-3 text-sm text-ink-mute">
              Keine Treffs vorhanden.
            </div>
          ) : (
            <ul className="rounded-lg border border-rule divide-y divide-rule bg-paper-lo">
              {ownedEvents.map((e) => (
                <li key={e.id} className="px-3 py-2 text-sm">
                  <span className="font-medium text-ink">{e.name}</span>
                  {e.slug && (
                    <span className="text-ink-mute"> · /{e.slug}</span>
                  )}
                  <span className="text-ink-mute"> · {e.status}</span>
                </li>
              ))}
            </ul>
          )}

          <div>
            <label htmlFor="transfer-target" className="wg-label block mb-1">
              Ziel-Konto
            </label>
            <select
              id="transfer-target"
              value={targetId}
              onChange={(ev) => setTargetId(ev.target.value)}
              disabled={isTransferring || eligibleTargets.length === 0}
              className="wg-input w-full"
            >
              <option value="" disabled>
                {eligibleTargets.length === 0
                  ? 'Kein geeignetes Konto verfügbar'
                  : 'Bitte wählen…'}
              </option>
              {eligibleTargets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.email} ({a.role})
                </option>
              ))}
            </select>
            <p className="text-xs text-ink-mute mt-1">
              Nur aktive Konten werden angezeigt. Spieler werden automatisch
              zu Veranstalter:innen befördert.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-rule flex-shrink-0 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isTransferring}
            className="wg-btn-ghost disabled:opacity-50"
          >
            Abbrechen
          </button>
          <button
            onClick={() => onConfirm(targetId)}
            disabled={
              isTransferring || !targetId || ownedEvents.length === 0
            }
            className="wg-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTransferring ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Übertragen…
              </>
            ) : (
              'Übertragen'
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default TransferEventsModal;

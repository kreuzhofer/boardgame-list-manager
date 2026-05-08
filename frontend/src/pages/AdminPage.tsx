import { useEffect, useState, useCallback } from 'react';
import { accountsApi, bggApi, ApiError } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useAdminSSE } from '../hooks/useAdminSSE';
import { useToast } from '../components/ToastProvider';
import { DeleteAccountModal } from '../components/DeleteAccountModal';
import { TransferEventsModal } from '../components/TransferEventsModal';
import type { Account, AdminAccountRow, OwnedEventLite } from '../types/account';
import type { ImportStatus, BulkEnrichmentStatus } from '../types/adminSse';

function formatEta(seconds: number | null): string {
  if (seconds === null) return '—';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function AdminPage() {
  const { account } = useAuth();
  const { showToast } = useToast();
  const [accounts, setAccounts] = useState<AdminAccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Delete + transfer modals. Each tracks its own target row and a
  // pending flag so the corresponding modal can show a spinner without
  // blocking the rest of the page.
  const [deleteTarget, setDeleteTarget] = useState<AdminAccountRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [transferTarget, setTransferTarget] = useState<AdminAccountRow | null>(null);
  const [transferOwnedEvents, setTransferOwnedEvents] = useState<OwnedEventLite[]>([]);
  const [isTransferring, setIsTransferring] = useState(false);

  const [importStatus, setImportStatus] = useState<ImportStatus | null>(null);
  const [enrichStatus, setEnrichStatus] = useState<BulkEnrichmentStatus | null>(null);
  // Bulk-enrich options. `force` clears scraping_done on the target set
  // first, so a server crash mid-run is resumable by clicking the
  // normal (no-force) button — the DB carries which rows are still
  // pending. `onlyReferenced` cuts the target to games used in events.
  const [enrichForce, setEnrichForce] = useState(false);
  const [enrichOnlyReferenced, setEnrichOnlyReferenced] = useState(false);

  const isAdmin = account?.role === 'admin';

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const response = await accountsApi.getAll();
      setAccounts(response.accounts);
      setError(null);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Konnte Konten nicht laden.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadAccounts();
      // Load current job status
      bggApi.getImportStatus().then(setImportStatus).catch(() => {});
      bggApi.getEnrichmentStatus().then(setEnrichStatus).catch(() => {});
    }
  }, [isAdmin]);

  // Admin SSE for real-time progress
  const onImportProgress = useCallback((event: ImportStatus & { type: string }) => {
    setImportStatus({ running: event.running, processed: event.processed, total: event.total, created: event.created, updated: event.updated, errors: event.errors, etaSeconds: event.etaSeconds });
  }, []);

  const onImportComplete = useCallback((event: { processed: number; total: number; created: number; updated: number; errors: number }) => {
    setImportStatus({ running: false, processed: event.processed, total: event.total, created: event.created, updated: event.updated, errors: event.errors, etaSeconds: null });
  }, []);

  const onEnrichProgress = useCallback((event: BulkEnrichmentStatus & { type: string }) => {
    setEnrichStatus({ running: event.running, processed: event.processed, total: event.total, skipped: event.skipped, errors: event.errors, bytesTransferred: event.bytesTransferred, etaSeconds: event.etaSeconds });
  }, []);

  const onEnrichComplete = useCallback((event: { processed: number; total: number; skipped: number; errors: number; bytesTransferred: number; stopReason?: string }) => {
    setEnrichStatus({ running: false, processed: event.processed, total: event.total, skipped: event.skipped, errors: event.errors, bytesTransferred: event.bytesTransferred, etaSeconds: null, stopReason: event.stopReason });
  }, []);

  useAdminSSE({
    enabled: isAdmin,
    onImportProgress,
    onImportComplete,
    onEnrichProgress,
    onEnrichComplete,
  });

  const handleStartImport = async () => {
    try {
      await bggApi.startImport();
      setImportStatus({ running: true, processed: 0, total: 0, created: 0, updated: 0, errors: 0, etaSeconds: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten.';
      alert(`Fehler: ${message}`);
    }
  };

  const handleStopImport = async () => {
    try {
      await bggApi.stopImport();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten.';
      alert(`Fehler: ${message}`);
    }
  };

  const handleStartEnrichment = async (
    options: { force?: boolean; onlyReferenced?: boolean; source?: 'bgg' | 'cache' } = {},
  ) => {
    try {
      await bggApi.startEnrichment(options);
      setEnrichStatus({ running: true, processed: 0, total: 0, skipped: 0, errors: 0, bytesTransferred: 0, etaSeconds: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten.';
      alert(`Fehler: ${message}`);
    }
  };

  const handleStopEnrichment = async () => {
    try {
      await bggApi.stopEnrichment();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten.';
      alert(`Fehler: ${message}`);
    }
  };

  const handleRoleToggle = async (target: Account) => {
    const nextRole = target.role === 'admin' ? 'account_owner' : 'admin';
    try {
      await accountsApi.setRole(target.id, nextRole);
      await loadAccounts();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten.';
      alert(`Fehler: ${message}`);
    }
  };

  const handleStatusToggle = async (target: Account) => {
    const nextStatus = target.status === 'active' ? 'deactivated' : 'active';
    await accountsApi.setStatus(target.id, nextStatus);
    await loadAccounts();
  };

  const handlePasswordReset = async (target: Account) => {
    const newPassword = window.prompt(`Neues Passwort für ${target.email}:`);
    if (!newPassword) {
      return;
    }
    try {
      await accountsApi.resetPassword(target.id, newPassword);
      alert('Passwort zurückgesetzt. Alle Sitzungen wurden beendet.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten.';
      alert(`Fehler: ${message}`);
    }
  };

  const handleForceLogout = async (target: Account) => {
    const confirm = window.confirm(`Alle Sitzungen von ${target.email} beenden?`);
    if (!confirm) {
      return;
    }
    await accountsApi.forceLogout(target.id);
  };

  // ─── Delete + transfer (admin destructive ops) ──────────────────────

  const openDeleteModal = (target: AdminAccountRow) => {
    setDeleteTarget(target);
  };

  const closeDeleteModal = () => {
    if (isDeleting) return;
    setDeleteTarget(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await accountsApi.deleteAccount(deleteTarget.id);
      showToast(`Konto ${deleteTarget.email} gelöscht.`);
      setDeleteTarget(null);
      await loadAccounts();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Löschen fehlgeschlagen.';
      showToast(`Fehler: ${message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const openTransferModal = async (target: AdminAccountRow) => {
    // Fetch the actual event list lazily — the row count alone is
    // enough to gate the button, but the modal shows the list so the
    // operator confirms what they're about to move.
    try {
      const { events } = await accountsApi.getOwnedEvents(target.id);
      setTransferOwnedEvents(events);
      setTransferTarget(target);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Treffs konnten nicht geladen werden.';
      showToast(`Fehler: ${message}`);
    }
  };

  const closeTransferModal = () => {
    if (isTransferring) return;
    setTransferTarget(null);
    setTransferOwnedEvents([]);
  };

  const confirmTransfer = async (targetAccountId: string) => {
    if (!transferTarget) return;
    setIsTransferring(true);
    try {
      const result = await accountsApi.transferEvents(transferTarget.id, targetAccountId);
      showToast(result.message);
      setTransferTarget(null);
      setTransferOwnedEvents([]);
      await loadAccounts();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Übertragung fehlgeschlagen.';
      showToast(`Fehler: ${message}`);
    } finally {
      setIsTransferring(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <h2 className="font-display text-3xl text-plum-deep">Admin</h2>
        <p className="text-sm text-ink-soft">
          Du hast keine Berechtigung für diesen Bereich.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <h2 className="font-display text-3xl text-plum-deep">Admin</h2>
        <p className="text-sm text-ink-mute">Lade Konten...</p>
      </div>
    );
  }

  const importRunning = importStatus?.running ?? false;
  const enrichRunning = enrichStatus?.running ?? false;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h2 className="font-display text-3xl text-plum-deep">Admin</h2>
      {error && (
        <div className="bg-blush-50 border border-blush-50 text-blush-deep text-sm rounded p-3">
          {error}
        </div>
      )}

      {/* Accounts Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-paper-lo text-ink-soft">
            <tr>
              <th className="text-left px-4 py-3 font-medium">E-Mail</th>
              <th className="text-left px-4 py-3 font-medium">Rolle</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Treffs</th>
              <th className="text-left px-4 py-3 font-medium">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((entry) => {
              const isSelf = entry.id === account?.id;
              const ownsEvents = entry.ownedEventsCount > 0;
              const deleteBlockedReason = isSelf
                ? 'Eigenes Konto kann nicht gelöscht werden'
                : ownsEvents
                  ? 'Treffs zuerst übertragen'
                  : undefined;
              return (
                <tr key={entry.id} className="border-t border-rule-soft">
                  <td className="px-4 py-3 text-ink">{entry.email}</td>
                  <td className="px-4 py-3 text-ink-soft">{entry.role}</td>
                  <td className="px-4 py-3 text-ink-soft">{entry.status}</td>
                  <td className="px-4 py-3 text-ink-soft">{entry.ownedEventsCount}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleRoleToggle(entry)}
                        disabled={isSelf}
                        title={isSelf ? 'Eigene Rolle kann nicht geändert werden' : undefined}
                        className={`text-xs px-3 py-1.5 rounded min-h-[32px] inline-flex items-center ${
                          isSelf
                            ? 'bg-paper-lo text-ink-mute cursor-not-allowed'
                            : 'bg-plum-50 text-plum-deep hover:bg-plum-100'
                        }`}
                      >
                        Rolle wechseln
                      </button>
                      <button
                        onClick={() => handleStatusToggle(entry)}
                        disabled={isSelf && entry.status === 'active'}
                        title={isSelf && entry.status === 'active' ? 'Eigenes Konto kann nicht deaktiviert werden' : undefined}
                        className={`text-xs px-3 py-1.5 rounded min-h-[32px] inline-flex items-center ${
                          isSelf && entry.status === 'active'
                            ? 'bg-paper-lo text-ink-mute cursor-not-allowed'
                            : 'bg-butter-50 text-butter-deep hover:bg-butter-50'
                        }`}
                      >
                        {entry.status === 'active' ? 'Deaktivieren' : 'Aktivieren'}
                      </button>
                      <button
                        onClick={() => handlePasswordReset(entry)}
                        className="text-xs px-3 py-1.5 rounded min-h-[32px] inline-flex items-center bg-plum-50 text-plum-deep hover:bg-plum-100"
                      >
                        Passwort reset
                      </button>
                      <button
                        onClick={() => handleForceLogout(entry)}
                        className="text-xs px-3 py-1.5 rounded min-h-[32px] inline-flex items-center bg-paper-lo text-ink-soft hover:bg-rule"
                      >
                        Sitzungen beenden
                      </button>
                      {ownsEvents && (
                        <button
                          onClick={() => openTransferModal(entry)}
                          className="text-xs px-3 py-1.5 rounded min-h-[32px] inline-flex items-center bg-ocean-50 text-ocean-deep hover:bg-ocean-50"
                        >
                          Treffs übertragen
                        </button>
                      )}
                      <button
                        onClick={() => openDeleteModal(entry)}
                        disabled={isSelf || ownsEvents}
                        title={deleteBlockedReason}
                        className={`text-xs px-3 py-1.5 rounded min-h-[32px] inline-flex items-center ${
                          isSelf || ownsEvents
                            ? 'bg-paper-lo text-ink-mute cursor-not-allowed'
                            : 'bg-blush-50 text-blush-deep hover:bg-blush-50'
                        }`}
                      >
                        Löschen
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {accounts.length === 0 && (
              <tr>
                <td className="px-4 py-3 text-ink-mute" colSpan={5}>
                  Keine Konten gefunden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* BGG Data Management */}
      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <h3 className="text-lg font-semibold text-ink">BGG Datenverwaltung</h3>

        {/* Import Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <button
              onClick={handleStartImport}
              disabled={importRunning}
              className="wg-btn-primary wg-btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importRunning ? 'Import läuft...' : 'BGG Import starten'}
            </button>
            {importRunning && (
              <button
                onClick={handleStopImport}
                className="wg-btn-danger wg-btn-sm"
              >
                Stoppen
              </button>
            )}
            {importStatus && !importRunning && importStatus.processed > 0 && (
              <span className="text-xs text-ink-mute">
                Letzter Import: {importStatus.created.toLocaleString()} neu, {importStatus.updated.toLocaleString()} aktualisiert, {importStatus.errors} Fehler
              </span>
            )}
          </div>
          {importRunning && importStatus && (
            <div className="space-y-1">
              <div className="w-full bg-rule rounded-full h-2.5">
                <div
                  className="bg-plum h-2.5 rounded-full transition-all"
                  style={{ width: importStatus.total > 0 ? `${(importStatus.processed / importStatus.total) * 100}%` : '0%' }}
                />
              </div>
              <div className="flex gap-4 text-xs text-ink-mute">
                <span>{importStatus.processed.toLocaleString()} / {importStatus.total.toLocaleString()}</span>
                <span>{importStatus.created.toLocaleString()} neu</span>
                <span>{importStatus.updated.toLocaleString()} aktualisiert</span>
                <span>Fehler: {importStatus.errors}</span>
                <span>ETA: {formatEta(importStatus.etaSeconds)}</span>
              </div>
            </div>
          )}
        </div>

        <hr className="border-rule" />

        {/* Enrichment Section */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() =>
                handleStartEnrichment({
                  source: 'bgg',
                  force: enrichForce,
                  onlyReferenced: enrichOnlyReferenced,
                })
              }
              disabled={enrichRunning}
              className="wg-btn-sage wg-btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {enrichRunning ? 'Enrichment läuft...' : 'BGG Enrichment starten'}
            </button>
            <button
              onClick={() =>
                handleStartEnrichment({
                  source: 'cache',
                  onlyReferenced: enrichOnlyReferenced,
                })
              }
              disabled={enrichRunning}
              className="wg-btn-soft wg-btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
              title="Re-extracts enrichment fields from the stored raw_preload blobs without hitting BGG. Use after the extractor learns a new field."
            >
              Aus Cache neu extrahieren
            </button>
            {enrichRunning && (
              <button
                onClick={handleStopEnrichment}
                className="wg-btn-danger wg-btn-sm"
              >
                Stoppen
              </button>
            )}
            {!enrichRunning && (
              <div className="flex flex-wrap items-center gap-3 text-xs text-ink-soft">
                <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={enrichForce}
                    onChange={(e) => setEnrichForce(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-rule"
                  />
                  Auch bereits angereicherte neu laden (force)
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={enrichOnlyReferenced}
                    onChange={(e) => setEnrichOnlyReferenced(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-rule"
                  />
                  Nur Spiele in Treffs
                </label>
              </div>
            )}
            {enrichStatus && !enrichRunning && (enrichStatus.stopReason || enrichStatus.processed > 0) && (
              <span className="text-xs text-ink-mute">
                {enrichStatus.stopReason ? `${enrichStatus.stopReason}: ` : ''}{enrichStatus.processed.toLocaleString()} neu angereichert, {enrichStatus.skipped.toLocaleString()} bereits vorhanden, {enrichStatus.errors} Fehler, {formatBytes(enrichStatus.bytesTransferred)}
              </span>
            )}
          </div>
          {enrichRunning && enrichStatus && (
            <div className="space-y-1">
              <div className="w-full bg-rule rounded-full h-2.5">
                <div
                  className="bg-sage h-2.5 rounded-full transition-all"
                  style={{ width: enrichStatus.total > 0 ? `${(enrichStatus.processed / enrichStatus.total) * 100}%` : '0%' }}
                />
              </div>
              <div className="flex gap-4 text-xs text-ink-mute">
                <span>{enrichStatus.processed.toLocaleString()} / {enrichStatus.total.toLocaleString()}</span>
                <span>{enrichStatus.skipped.toLocaleString()} übersprungen</span>
                <span>Fehler: {enrichStatus.errors}</span>
                <span>{formatBytes(enrichStatus.bytesTransferred)}</span>
                <span>ETA: {formatEta(enrichStatus.etaSeconds)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <DeleteAccountModal
        isOpen={!!deleteTarget}
        email={deleteTarget?.email ?? ''}
        ownedEventsCount={deleteTarget?.ownedEventsCount ?? 0}
        onConfirm={confirmDelete}
        onCancel={closeDeleteModal}
        isDeleting={isDeleting}
      />
      <TransferEventsModal
        isOpen={!!transferTarget}
        source={transferTarget}
        ownedEvents={transferOwnedEvents}
        allAccounts={accounts}
        onConfirm={confirmTransfer}
        onCancel={closeTransferModal}
        isTransferring={isTransferring}
      />
    </div>
  );
}

export default AdminPage;

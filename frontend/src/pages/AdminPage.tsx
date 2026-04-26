import { useEffect, useState, useCallback } from 'react';
import { accountsApi, bggApi, ApiError } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useAdminSSE } from '../hooks/useAdminSSE';
import type { Account } from '../types/account';
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
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [importStatus, setImportStatus] = useState<ImportStatus | null>(null);
  const [enrichStatus, setEnrichStatus] = useState<BulkEnrichmentStatus | null>(null);

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

  const handleStartEnrichment = async () => {
    try {
      await bggApi.startEnrichment();
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

  if (!isAdmin) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <h2 className="font-display italic text-3xl text-plum-deep">Admin</h2>
        <p className="text-sm text-ink-soft">
          Du hast keine Berechtigung für diesen Bereich.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <h2 className="font-display italic text-3xl text-plum-deep">Admin</h2>
        <p className="text-sm text-ink-mute">Lade Konten...</p>
      </div>
    );
  }

  const importRunning = importStatus?.running ?? false;
  const enrichRunning = enrichStatus?.running ?? false;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h2 className="font-display italic text-3xl text-plum-deep">Admin</h2>
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
              <th className="text-left px-4 py-3 font-medium">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((entry) => (
              <tr key={entry.id} className="border-t border-rule-soft">
                <td className="px-4 py-3 text-ink">{entry.email}</td>
                <td className="px-4 py-3 text-ink-soft">{entry.role}</td>
                <td className="px-4 py-3 text-ink-soft">{entry.status}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleRoleToggle(entry)}
                      className="text-xs px-3 py-1.5 rounded min-h-[32px] inline-flex items-center bg-plum-50 text-plum-deep hover:bg-plum-100"
                    >
                      Rolle wechseln
                    </button>
                    <button
                      onClick={() => handleStatusToggle(entry)}
                      disabled={entry.id === account?.id && entry.status === 'active'}
                      title={entry.id === account?.id && entry.status === 'active' ? 'Eigenes Konto kann nicht deaktiviert werden' : undefined}
                      className={`text-xs px-3 py-1.5 rounded min-h-[32px] inline-flex items-center ${
                        entry.id === account?.id && entry.status === 'active'
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
                  </div>
                </td>
              </tr>
            ))}
            {accounts.length === 0 && (
              <tr>
                <td className="px-4 py-3 text-ink-mute" colSpan={4}>
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
          <div className="flex items-center gap-3">
            <button
              onClick={handleStartEnrichment}
              disabled={enrichRunning}
              className="wg-btn-sage wg-btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {enrichRunning ? 'Enrichment läuft...' : 'BGG Enrichment starten'}
            </button>
            {enrichRunning && (
              <button
                onClick={handleStopEnrichment}
                className="wg-btn-danger wg-btn-sm"
              >
                Stoppen
              </button>
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
    </div>
  );
}

export default AdminPage;

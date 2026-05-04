import { useState } from 'react';
import { createPortal } from 'react-dom';
import { accountsApi, ApiError } from '../api/client';
import type { ClaimCandidate, ClaimableUser } from '../types/account';

type Step = 'password' | 'pick' | 'confirm';

interface LegacyClaimModalProps {
  candidate: ClaimCandidate;
  isOpen: boolean;
  onClose: () => void;
  onClaimed: () => void;
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('de-DE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatGameList(games: { id: string; name: string }[], maxShown = 6): string {
  if (games.length === 0) return '—';
  const shown = games.slice(0, maxShown).map((g) => g.name);
  if (games.length > maxShown) {
    shown.push(`und ${games.length - maxShown} weitere`);
  }
  return shown.join(', ');
}

export function LegacyClaimModal({ candidate, isOpen, onClose, onClaimed }: LegacyClaimModalProps) {
  const [step, setStep] = useState<Step>('password');
  const [password, setPassword] = useState('');
  const [users, setUsers] = useState<ClaimableUser[]>([]);
  const [picked, setPicked] = useState<ClaimableUser | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!isOpen) return null;

  const reset = () => {
    setStep('password');
    setPassword('');
    setUsers([]);
    setPicked(null);
    setConfirmed(false);
    setError(null);
    setBusy(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!password) {
      setError('Bitte das Kennwort des Treffs eingeben.');
      return;
    }
    setBusy(true);
    try {
      const result = await accountsApi.unlockClaimCandidate(candidate.id, password);
      setUsers(result.users);
      setStep('pick');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Anfrage fehlgeschlagen.');
    } finally {
      setBusy(false);
    }
  };

  const handlePick = (u: ClaimableUser) => {
    setPicked(u);
    setConfirmed(false);
    setError(null);
    setStep('confirm');
  };

  const handleConfirm = async () => {
    if (!picked || !confirmed) return;
    setError(null);
    setBusy(true);
    try {
      await accountsApi.claimUser(picked.userId, password);
      reset();
      onClaimed();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Übernahme fehlgeschlagen.';
      setError(msg);
      // If the row was just snapped up by someone else, fall back to
      // step 1 so the user can re-fetch the now-shorter list.
      if (err instanceof ApiError && err.code === 'ALREADY_CLAIMED') {
        setStep('password');
        setPicked(null);
      }
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-ink/50 flex items-center justify-center p-4 z-50">
      <div className="bg-paper-hi rounded-xl shadow-floating max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Sticky header */}
        <div className="px-6 py-4 border-b border-rule flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="wg-label text-plum">Treff übernehmen</div>
            <h2 className="font-display text-2xl text-plum-deep mt-1 truncate">
              {candidate.name}
            </h2>
            {candidate.startsAt && (
              <p className="text-sm text-ink-mute mt-1">{formatDate(candidate.startsAt)}</p>
            )}
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-ink-mute hover:text-ink text-2xl leading-none"
            aria-label="Schließen"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {error && (
            <div className="mb-4 p-3 bg-blush-50 border border-blush text-blush-deep rounded text-sm">
              {error}
            </div>
          )}

          {step === 'password' && (
            <form onSubmit={handleUnlock} className="space-y-4">
              <p className="text-sm text-ink-soft">
                Gib das Kennwort dieses Treffs ein, um zu bestätigen, dass du
                dabei warst. Erst dann zeigen wir dir die Liste der bisherigen
                Teilnehmenden.
              </p>
              <div>
                <label htmlFor="claim-password" className="block text-sm font-medium text-ink-soft mb-2">
                  Kennwort
                </label>
                <input
                  id="claim-password"
                  type="password"
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="wg-input w-full"
                  disabled={busy}
                  autoComplete="off"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={busy || !password}
                  className="wg-btn-primary disabled:bg-plum-soft"
                >
                  {busy ? 'Wird geprüft…' : 'Weiter'}
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="wg-btn-ghost"
                  disabled={busy}
                >
                  Abbrechen
                </button>
              </div>
            </form>
          )}

          {step === 'pick' && (
            <div className="space-y-3">
              <p className="text-sm text-ink-soft">
                Welcher Name warst du beim Treff <strong className="text-ink">{candidate.name}</strong>?
                Wähle aus der Liste — danach zeigen wir dir deine damalige
                Spieleliste zur Bestätigung.
              </p>

              {users.length === 0 ? (
                <div className="wg-card text-ink-soft text-sm">
                  Keine unbeanspruchten Identitäten in diesem Treff. Eventuell
                  wurden alle bereits übernommen.
                </div>
              ) : (
                <ul className="space-y-2">
                  {users.map((u) => (
                    <li key={u.userId}>
                      <button
                        type="button"
                        onClick={() => handlePick(u)}
                        className="w-full text-left wg-card hover:bg-paper-lo transition-colors"
                      >
                        <div className="flex items-baseline justify-between gap-3">
                          <strong className="text-ink">{u.displayName}</strong>
                          {u.lastActivityAt && (
                            <span className="text-xs text-ink-mute flex-shrink-0">
                              zuletzt aktiv: {formatDate(u.lastActivityAt)}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-sm text-ink-soft">
                          <span className="text-ink-mute">Mitgebracht:</span>{' '}
                          {u.brought.length === 0 ? '—' : `${u.brought.length} Spiel${u.brought.length === 1 ? '' : 'e'}`}
                          {' · '}
                          <span className="text-ink-mute">Mitgespielt:</span>{' '}
                          {u.played.length === 0 ? '—' : `${u.played.length} Spiel${u.played.length === 1 ? '' : 'e'}`}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <button
                type="button"
                onClick={handleClose}
                className="wg-btn-ghost mt-2"
              >
                Ich war nicht dabei
              </button>
            </div>
          )}

          {step === 'confirm' && picked && (
            <div className="space-y-4">
              <p className="text-sm text-ink-soft">
                Du übernimmst <strong className="text-ink">{picked.displayName}</strong> für
                dein Konto. Bitte prüfe, ob die Spieleliste tatsächlich zu dir
                passt — dieser Schritt kann nicht von dir selbst rückgängig
                gemacht werden.
              </p>

              <div className="wg-card-raised space-y-3">
                <div>
                  <div className="wg-label text-plum">Name beim Treff</div>
                  <p className="font-display text-xl text-plum-deep mt-1">{picked.displayName}</p>
                </div>
                <div className="border-t border-rule pt-3">
                  <div className="wg-label text-plum">Mitgebracht ({picked.brought.length})</div>
                  <p className="text-sm text-ink-soft mt-1">{formatGameList(picked.brought)}</p>
                </div>
                <div className="border-t border-rule pt-3">
                  <div className="wg-label text-plum">Mitgespielt ({picked.played.length})</div>
                  <p className="text-sm text-ink-soft mt-1">{formatGameList(picked.played)}</p>
                </div>
                {picked.lastActivityAt && (
                  <div className="border-t border-rule pt-3">
                    <div className="wg-label text-plum">Zuletzt aktiv</div>
                    <p className="text-sm text-ink-soft mt-1">{formatDate(picked.lastActivityAt)}</p>
                  </div>
                )}
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="h-4 w-4 rounded border-rule text-plum focus:ring-plum"
                />
                <span className="text-sm text-ink">Ja, das war ich</span>
              </label>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={!confirmed || busy}
                  className="wg-btn-primary disabled:bg-plum-soft"
                >
                  {busy ? 'Wird übernommen…' : 'Bestätigen'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep('pick');
                    setPicked(null);
                    setConfirmed(false);
                    setError(null);
                  }}
                  className="wg-btn-ghost"
                  disabled={busy}
                >
                  Zurück
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default LegacyClaimModal;

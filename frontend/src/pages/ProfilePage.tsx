import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { accountsApi, sessionsApi, ApiError } from '../api/client';
import type { Session } from '../types/account';

export function ProfilePage() {
  const { account, logout } = useAuth();
  const navigate = useNavigate();

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Sessions state
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  // Deactivation state
  const [deactivatePassword, setDeactivatePassword] = useState('');
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  // Load sessions
  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setIsLoadingSessions(true);
    setSessionsError(null);
    try {
      const response = await sessionsApi.getAll();
      setSessions(response.sessions);
    } catch (err) {
      if (err instanceof ApiError) {
        setSessionsError(err.message);
      } else {
        setSessionsError('Fehler beim Laden der Sitzungen.');
      }
    } finally {
      setIsLoadingSessions(false);
    }
  };

  // Password validation
  const passwordRequirements = {
    minLength: newPassword.length >= 8,
    hasLetter: /[a-zA-Z]/.test(newPassword),
    hasNumber: /[0-9]/.test(newPassword),
  };

  const isNewPasswordValid = passwordRequirements.minLength && 
                             passwordRequirements.hasLetter && 
                             passwordRequirements.hasNumber;

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setPasswordError('Bitte alle Felder ausfüllen.');
      return;
    }

    if (!isNewPasswordValid) {
      setPasswordError('Das neue Passwort erfüllt nicht die Anforderungen.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError('Die neuen Passwörter stimmen nicht überein.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await accountsApi.changePassword(currentPassword, newPassword);
      setPasswordSuccess(response.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      // Reload sessions since others were invalidated
      loadSessions();
    } catch (err) {
      if (err instanceof ApiError) {
        setPasswordError(err.message);
      } else {
        setPasswordError('Fehler beim Ändern des Passworts.');
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogoutSession = async (sessionId: string) => {
    try {
      await sessionsApi.logout(sessionId);
      loadSessions();
    } catch (err) {
      if (err instanceof ApiError) {
        setSessionsError(err.message);
      }
    }
  };

  const handleLogoutAll = async () => {
    try {
      await sessionsApi.logoutAll();
      logout();
      navigate('/login');
    } catch (err) {
      if (err instanceof ApiError) {
        setSessionsError(err.message);
      }
    }
  };

  const handleDeactivate = async () => {
    if (!deactivatePassword) {
      setDeactivateError('Bitte Passwort eingeben.');
      return;
    }

    setIsDeactivating(true);
    setDeactivateError(null);
    try {
      await accountsApi.deactivate(deactivatePassword);
      logout();
      navigate('/login', { 
        state: { message: 'Ihr Konto wurde deaktiviert.' } 
      });
    } catch (err) {
      if (err instanceof ApiError) {
        setDeactivateError(err.message);
      } else {
        setDeactivateError('Fehler beim Deaktivieren des Kontos.');
      }
    } finally {
      setIsDeactivating(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!account) {
    return null;
  }

  return (
    <div className="min-h-screen bg-paper py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Account Info */}
        <div className="bg-paper-hi rounded-lg shadow-raised p-6">
          <h1 className="text-2xl font-bold text-ink mb-4">Mein Profil</h1>
          
          <div className="space-y-3">
            <div>
              <span className="text-sm text-ink-mute">E-Mail</span>
              <p className="text-ink">{account.email}</p>
            </div>
            <div>
              <span className="text-sm text-ink-mute">Konto erstellt am</span>
              <p className="text-ink">{formatDate(account.createdAt)}</p>
            </div>
            <div>
              <span className="text-sm text-ink-mute">Status</span>
              <p className={`font-medium ${account.status === 'active' ? 'text-sage-deep' : 'text-blush-deep'}`}>
                {account.status === 'active' ? 'Aktiv' : 'Deaktiviert'}
              </p>
            </div>
            <div>
              <span className="text-sm text-ink-mute">Rolle</span>
              <p className="text-ink">
                {account.role === 'admin' ? 'Administrator' : 'Kontoinhaber'}
              </p>
            </div>
          </div>
        </div>

        {/* Password Change */}
        <div className="bg-paper-hi rounded-lg shadow-raised p-6">
          <h2 className="text-xl font-bold text-ink mb-4">Passwort ändern</h2>

          {passwordError && (
            <div className="mb-4 p-3 bg-blush-50 border border-blush text-blush-deep rounded">
              {passwordError}
            </div>
          )}

          {passwordSuccess && (
            <div className="mb-4 p-3 bg-sage-100 border border-sage text-sage-deep rounded">
              {passwordSuccess}
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-ink-soft mb-1">
                Aktuelles Passwort
              </label>
              <input
                type="password"
                id="currentPassword"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 border border-rule rounded-md focus:outline-none focus:ring-2 focus:ring-plum"
                disabled={isChangingPassword}
              />
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-ink-soft mb-1">
                Neues Passwort
              </label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-rule rounded-md focus:outline-none focus:ring-2 focus:ring-plum"
                disabled={isChangingPassword}
              />
              
              {newPassword && (
                <div className="mt-2 text-sm space-y-1">
                  <ul className="space-y-1">
                    <li className={passwordRequirements.minLength ? 'text-sage-deep' : 'text-ink-mute'}>
                      {passwordRequirements.minLength ? '✓' : '○'} Mindestens 8 Zeichen
                    </li>
                    <li className={passwordRequirements.hasLetter ? 'text-sage-deep' : 'text-ink-mute'}>
                      {passwordRequirements.hasLetter ? '✓' : '○'} Mindestens ein Buchstabe
                    </li>
                    <li className={passwordRequirements.hasNumber ? 'text-sage-deep' : 'text-ink-mute'}>
                      {passwordRequirements.hasNumber ? '✓' : '○'} Mindestens eine Zahl
                    </li>
                  </ul>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-ink-soft mb-1">
                Neues Passwort bestätigen
              </label>
              <input
                type="password"
                id="confirmNewPassword"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-rule rounded-md focus:outline-none focus:ring-2 focus:ring-plum"
                disabled={isChangingPassword}
              />
            </div>

            <button
              type="submit"
              disabled={isChangingPassword || !isNewPasswordValid}
              className="py-2 px-4 bg-plum hover:bg-plum-deep disabled:bg-plum-soft text-white font-medium rounded-md transition-colors"
            >
              {isChangingPassword ? 'Wird geändert...' : 'Passwort ändern'}
            </button>
          </form>
        </div>

        {/* Active Sessions */}
        <div className="bg-paper-hi rounded-lg shadow-raised p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-ink">Aktive Sitzungen</h2>
            <button
              onClick={handleLogoutAll}
              className="text-sm text-blush-deep hover:text-blush-deep font-medium"
            >
              Alle abmelden
            </button>
          </div>

          {sessionsError && (
            <div className="mb-4 p-3 bg-blush-50 border border-blush text-blush-deep rounded">
              {sessionsError}
            </div>
          )}

          {isLoadingSessions ? (
            <p className="text-ink-mute">Laden...</p>
          ) : sessions.length === 0 ? (
            <p className="text-ink-mute">Keine aktiven Sitzungen.</p>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`p-3 border rounded-md ${session.isCurrent ? 'border-plum bg-plum-50' : 'border-rule'}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-ink">
                        {session.userAgent || 'Unbekanntes Gerät'}
                        {session.isCurrent && (
                          <span className="ml-2 text-xs bg-plum-100 text-plum-deep px-2 py-0.5 rounded">
                            Aktuelle Sitzung
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-ink-mute mt-1">
                        Zuletzt aktiv: {formatDate(session.lastUsedAt)}
                      </p>
                      {session.ipAddress && (
                        <p className="text-xs text-ink-mute">
                          IP: {session.ipAddress}
                        </p>
                      )}
                    </div>
                    {!session.isCurrent && (
                      <button
                        onClick={() => handleLogoutSession(session.id)}
                        className="text-sm text-blush-deep hover:text-blush-deep"
                      >
                        Abmelden
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Account Deactivation */}
        {account.role !== 'admin' && (
        <div className="bg-paper-hi rounded-lg shadow-raised p-6">
          <h2 className="text-xl font-bold text-blush-deep mb-4">Konto deaktivieren</h2>
          <p className="text-ink-soft mb-4">
            Wenn Sie Ihr Konto deaktivieren, können Sie sich nicht mehr anmelden. 
            Ihre Daten bleiben erhalten und können von einem Administrator wiederhergestellt werden.
          </p>

          {!showDeactivateConfirm ? (
            <button
              onClick={() => setShowDeactivateConfirm(true)}
              className="py-2 px-4 bg-blush-deep hover:bg-blush-deep text-white font-medium rounded-md transition-colors"
            >
              Konto deaktivieren
            </button>
          ) : (
            <div className="space-y-4">
              {deactivateError && (
                <div className="p-3 bg-blush-50 border border-blush text-blush-deep rounded">
                  {deactivateError}
                </div>
              )}

              <div>
                <label htmlFor="deactivatePassword" className="block text-sm font-medium text-ink-soft mb-1">
                  Passwort zur Bestätigung
                </label>
                <input
                  type="password"
                  id="deactivatePassword"
                  value={deactivatePassword}
                  onChange={(e) => setDeactivatePassword(e.target.value)}
                  className="w-full px-3 py-2 border border-rule rounded-md focus:outline-none focus:ring-2 focus:ring-blush"
                  disabled={isDeactivating}
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleDeactivate}
                  disabled={isDeactivating}
                  className="py-2 px-4 bg-blush-deep hover:bg-blush-deep disabled:bg-blush text-white font-medium rounded-md transition-colors"
                >
                  {isDeactivating ? 'Wird deaktiviert...' : 'Endgültig deaktivieren'}
                </button>
                <button
                  onClick={() => {
                    setShowDeactivateConfirm(false);
                    setDeactivatePassword('');
                    setDeactivateError(null);
                  }}
                  disabled={isDeactivating}
                  className="py-2 px-4 bg-rule hover:bg-rule text-ink-soft font-medium rounded-md transition-colors"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
}

export default ProfilePage;

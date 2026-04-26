import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../api/client';
import { AuthLayout } from '../components/AuthLayout';
import { AuthEmailField, AuthPasswordField } from '../components/AuthInputs';

const REMEMBER_ME_KEY = 'auth_remember_me';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState<boolean>(() => {
    return localStorage.getItem(REMEMBER_ME_KEY) === 'true';
  });
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [magicLinkSending, setMagicLinkSending] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const { login, isAuthenticated, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    document.title = 'Anmelden — Brettspieltreff';
  }, []);

  // Carry success message from registration redirect
  useEffect(() => {
    const state = location.state as { message?: string } | null;
    if (state?.message) {
      setSuccessMessage(state.message);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  // Clear errors when component unmounts
  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  // Persist remember-me preference (token storage already handles 7-day TTL)
  useEffect(() => {
    localStorage.setItem(REMEMBER_ME_KEY, rememberMe ? 'true' : 'false');
  }, [rememberMe]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessMessage(null);

    if (!email || !password) {
      setLocalError('Bitte E-Mail und Passwort eingeben.');
      return;
    }

    try {
      await login(email, password);
      navigate('/');
    } catch {
      // Error is handled by AuthContext
    }
  };

  const handleMagicLinkRequest = async () => {
    setLocalError(null);
    setSuccessMessage(null);

    if (!email) {
      setLocalError('Bitte zuerst eine E-Mail-Adresse eingeben.');
      return;
    }

    setMagicLinkSending(true);
    try {
      await authApi.requestMagicLink(email);
      setMagicLinkSent(true);
    } catch {
      // Endpoint always returns 200 — only network errors land here.
      setLocalError('E-Mail konnte nicht gesendet werden. Bitte später erneut versuchen.');
    } finally {
      setMagicLinkSending(false);
    }
  };

  const displayError = localError || error;

  return (
    <AuthLayout
      marketingEyebrow="Für Organisatoren"
      marketingTitle={'Willkommen\nzurück.'}
      marketingBody="Verwalte deine Treffs, stelle Kennwörter ein, behalte den Überblick über Bringer und Wünsche."
      marketingFootnote="Teilnehmer brauchen kein Konto — nur den Link und das Kennwort des Treffs."
    >
      <div className="wg-label text-plum">Anmelden</div>
      <h1 className="font-display italic text-3xl sm:text-4xl text-plum-deep mt-2">
        Schön, dich zu sehen
      </h1>

      {successMessage && (
        <div className="mt-6 p-3 bg-sage-100 border border-sage text-sage-deep rounded-lg text-sm">
          {successMessage}
        </div>
      )}
      {displayError && (
        <div className="mt-6 p-3 bg-blush-50 border border-blush text-blush-deep rounded-lg text-sm">
          {displayError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <AuthEmailField
          id="email"
          label="E-Mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ihre@email.de"
          autoComplete="email"
          disabled={isLoading}

        />

        <AuthPasswordField
          id="password"
          label="Passwort"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
          disabled={isLoading}

        />

        <div className="flex items-center justify-between gap-3 text-sm">
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-rule text-plum focus:ring-plum"
            />
            <span className="text-ink-soft">Angemeldet bleiben</span>
          </label>
          {/* "Passwort vergessen?" deferred until SMTP/email infrastructure ships. */}
          <span
            className="text-ink-mute/70 cursor-not-allowed"
            title="Bitte den Admin kontaktieren — Passwort-Reset per E-Mail folgt"
          >
            Passwort vergessen?
          </span>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="wg-btn-primary wg-btn-lg w-full disabled:bg-plum-soft"
        >
          {isLoading ? 'Wird angemeldet…' : 'Anmelden →'}
        </button>
      </form>

      {/* Dotted divider */}
      <div className="my-7 flex items-center gap-3">
        <span className="flex-1 wg-divider-dotted" />
        <span className="text-xs text-ink-mute">oder</span>
        <span className="flex-1 wg-divider-dotted" />
      </div>

      {/* Magic-link path: passwordless sign-in via email */}
      {magicLinkSent ? (
        <div className="bg-sage-50 border border-sage-100 text-sage-deep rounded-lg p-4 text-sm">
          <strong>Wir haben dir einen Anmelde-Link an {email} geschickt.</strong>
          <br />
          Falls die E-Mail nicht ankommt, prüfe deinen Spam-Ordner oder fordere
          gleich einen neuen Link an.
        </div>
      ) : (
        <button
          type="button"
          onClick={handleMagicLinkRequest}
          disabled={magicLinkSending}
          className="wg-btn-secondary wg-btn-lg w-full disabled:opacity-60"
        >
          {magicLinkSending ? 'Wird gesendet…' : 'Magic-Link per E-Mail senden'}
        </button>
      )}

      <div className="mt-4 text-center text-sm text-ink-soft">
        Noch kein Konto?{' '}
        {/* L-7 fix: link to /register, NOT /events/new — accounts must exist first */}
        <Link to="/register" className="text-plum hover:text-plum-deep font-bold">
          Jetzt erstellen
        </Link>
      </div>
    </AuthLayout>
  );
}

export default LoginPage;

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../api/client';
import { AuthLayout } from '../components/AuthLayout';
import { AuthEmailField, AuthPasswordField } from '../components/AuthInputs';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPasswordLogin, setShowPasswordLogin] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [magicLinkSending, setMagicLinkSending] = useState(false);
  const [magicLinkSentTo, setMagicLinkSentTo] = useState<string | null>(null);
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

  const handleMagicLinkRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessMessage(null);

    if (!email) {
      setLocalError('Bitte zuerst eine E-Mail-Adresse eingeben.');
      return;
    }

    setMagicLinkSending(true);
    try {
      await authApi.requestMagicLink(email);
      setMagicLinkSentTo(email);
    } catch {
      // Endpoint always returns 200 — only network errors land here.
      setLocalError('E-Mail konnte nicht gesendet werden. Bitte später erneut versuchen.');
    } finally {
      setMagicLinkSending(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
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
      <p className="mt-3 text-ink-soft text-sm">
        Gib deine E-Mail-Adresse ein — wir schicken dir einen Anmelde-Link.
        Wenn du noch kein Konto hast, wird es mit dem ersten Klick auf den
        Link erstellt.
      </p>

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

      {/* Primary path: magic-link */}
      <form onSubmit={handleMagicLinkRequest} className="mt-8 space-y-5">
        <AuthEmailField
          id="email"
          label="E-Mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ihre@email.de"
          autoComplete="email"
          disabled={magicLinkSending || isLoading}
        />

        {magicLinkSentTo && (
          <div className="bg-sage-50 border border-sage-100 text-sage-deep rounded-lg p-4 text-sm">
            <strong>Wir haben dir einen Anmelde-Link an {magicLinkSentTo} geschickt.</strong>
            <br />
            Falls du dich zum ersten Mal anmeldest, dient derselbe Link als
            Bestätigung deiner E-Mail-Adresse. Falls die Mail nicht ankommt,
            prüfe deinen Spam-Ordner oder fordere unten einen neuen Link an.
          </div>
        )}

        <button
          type="submit"
          disabled={magicLinkSending || isLoading}
          className="wg-btn-primary wg-btn-lg w-full disabled:bg-plum-soft"
        >
          {magicLinkSending
            ? 'Wird gesendet…'
            : magicLinkSentTo
              ? 'Anmelde-Link erneut senden →'
              : 'Anmelde-Link per E-Mail senden →'}
        </button>
      </form>

      {/* Disclosure: password login as a low-emphasis alternative */}
      <div className="mt-6 text-center">
        {!showPasswordLogin ? (
          <button
            type="button"
            onClick={() => setShowPasswordLogin(true)}
            className="text-sm text-plum hover:text-plum-deep underline underline-offset-2"
          >
            Lieber mit Passwort anmelden
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setShowPasswordLogin(false);
              setPassword('');
            }}
            className="text-sm text-ink-mute hover:text-ink-soft underline underline-offset-2"
          >
            Passwort-Anmeldung ausblenden
          </button>
        )}
      </div>

      {showPasswordLogin && (
        <form onSubmit={handlePasswordLogin} className="mt-5 space-y-5">
          <AuthPasswordField
            id="password"
            label="Passwort"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="wg-btn-secondary wg-btn-lg w-full disabled:opacity-60"
          >
            {isLoading ? 'Wird angemeldet…' : 'Mit Passwort anmelden'}
          </button>
        </form>
      )}

      <div className="mt-7 text-center text-sm text-ink-soft">
        Noch kein Konto?{' '}
        <Link to="/register" className="text-plum hover:text-plum-deep font-bold">
          Jetzt erstellen
        </Link>
      </div>
    </AuthLayout>
  );
}

export default LoginPage;

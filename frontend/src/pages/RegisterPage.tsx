import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../api/client';
import { AuthLayout } from '../components/AuthLayout';
import { AuthEmailField, AuthPasswordField } from '../components/AuthInputs';

export function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordRegister, setShowPasswordRegister] = useState(false);
  const [magicLinkSending, setMagicLinkSending] = useState(false);
  const [magicLinkSentTo, setMagicLinkSentTo] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const { register, isAuthenticated, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Konto erstellen — Brettspieltreff';
  }, []);

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

  // Password validation
  const passwordRequirements = {
    minLength: password.length >= 8,
    hasLetter: /[a-zA-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
  };
  const isPasswordValid =
    passwordRequirements.minLength &&
    passwordRequirements.hasLetter &&
    passwordRequirements.hasNumber;

  const handleMagicLinkRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email) {
      setLocalError('Bitte zuerst eine E-Mail-Adresse eingeben.');
      return;
    }

    setMagicLinkSending(true);
    try {
      await authApi.requestMagicLink(email);
      setMagicLinkSentTo(email);
    } catch {
      setLocalError('E-Mail konnte nicht gesendet werden. Bitte später erneut versuchen.');
    } finally {
      setMagicLinkSending(false);
    }
  };

  const handlePasswordRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email || !password || !confirmPassword) {
      setLocalError('Bitte alle Felder ausfüllen.');
      return;
    }
    if (!isPasswordValid) {
      setLocalError('Das Passwort erfüllt nicht die Anforderungen.');
      return;
    }
    if (password !== confirmPassword) {
      setLocalError('Die Passwörter stimmen nicht überein.');
      return;
    }

    try {
      await register(email, password);
      navigate('/login', {
        state: { message: 'Konto erfolgreich erstellt. Bitte melden Sie sich an.' },
      });
    } catch {
      // Error is handled by AuthContext
    }
  };

  const displayError = localError || error;

  const Requirement = ({ met, label }: { met: boolean; label: string }) => (
    <li className={`flex items-center gap-2 ${met ? 'text-sage-deep' : 'text-ink-mute'}`}>
      <span aria-hidden="true">{met ? '✓' : '○'}</span>
      {label}
    </li>
  );

  return (
    <AuthLayout
      marketingEyebrow="Für Organisatoren"
      marketingTitle={'Werde\nGastgeber.'}
      marketingBody="Erstelle dein Konto und in zwei Minuten den ersten Treff. Teile den Link, lass die Gruppe Spiele eintragen — fertig."
      marketingFootnote="Teilnehmer brauchen kein Konto — nur den Link und das Kennwort des Treffs."
    >
      <div className="wg-label text-plum">Registrieren</div>
      <h1 className="font-display text-3xl sm:text-4xl text-plum-deep mt-2">
        Konto erstellen
      </h1>
      <p className="mt-3 text-ink-soft text-sm">
        Gib einfach deine E-Mail-Adresse ein — wir schicken dir einen
        Bestätigungs- und Anmelde-Link. Mit dem ersten Klick wird dein Konto
        erstellt.
      </p>

      {displayError && (
        <div className="mt-6 p-3 bg-blush-50 border border-blush text-blush-deep rounded-lg text-sm">
          {displayError}
        </div>
      )}

      {/* Primary path: magic-link signup (same flow as login) */}
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
            <strong>Wir haben dir einen Bestätigungs- und Anmelde-Link an {magicLinkSentTo} geschickt.</strong>
            <br />
            Mit dem ersten Klick wird dein Konto angelegt und du bist
            angemeldet. Falls die Mail nicht ankommt, prüfe deinen
            Spam-Ordner oder fordere unten einen neuen Link an.
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
              : 'Konto per E-Mail erstellen →'}
        </button>
      </form>

      {/* Disclosure: classic email + password registration */}
      <div className="mt-6 text-center">
        {!showPasswordRegister ? (
          <button
            type="button"
            onClick={() => setShowPasswordRegister(true)}
            className="text-sm text-plum hover:text-plum-deep underline underline-offset-2"
          >
            Lieber Konto mit Passwort anlegen
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setShowPasswordRegister(false);
              setPassword('');
              setConfirmPassword('');
            }}
            className="text-sm text-ink-mute hover:text-ink-soft underline underline-offset-2"
          >
            Passwort-Registrierung ausblenden
          </button>
        )}
      </div>

      {showPasswordRegister && (
        <form onSubmit={handlePasswordRegister} className="mt-5 space-y-5">
          <div>
            <AuthPasswordField
              id="password"
              label="Passwort"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              disabled={isLoading}
              required
            />
            <ul className="mt-2 ml-1 text-xs space-y-1">
              <Requirement met={passwordRequirements.minLength} label="Mindestens 8 Zeichen" />
              <Requirement met={passwordRequirements.hasLetter} label="Mindestens ein Buchstabe" />
              <Requirement met={passwordRequirements.hasNumber} label="Mindestens eine Zahl" />
            </ul>
          </div>

          <div>
            <AuthPasswordField
              id="confirmPassword"
              label="Passwort bestätigen"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              disabled={isLoading}
              required
            />
            {confirmPassword && password !== confirmPassword && (
              <p className="mt-2 text-xs text-blush-deep">
                Die Passwörter stimmen nicht überein.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || !isPasswordValid}
            className="wg-btn-secondary wg-btn-lg w-full disabled:opacity-60"
          >
            {isLoading ? 'Wird erstellt…' : 'Konto mit Passwort erstellen'}
          </button>
        </form>
      )}

      <div className="mt-7 text-center text-sm text-ink-soft">
        Schon ein Konto?{' '}
        <Link to="/login" className="text-plum hover:text-plum-deep font-bold">
          Anmelden
        </Link>
      </div>
    </AuthLayout>
  );
}

export default RegisterPage;

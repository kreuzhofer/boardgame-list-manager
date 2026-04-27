import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AuthLayout } from '../components/AuthLayout';
import { AuthEmailField, AuthPasswordField } from '../components/AuthInputs';

export function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

  const handleSubmit = async (e: React.FormEvent) => {
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
      <h1 className="font-display italic text-3xl sm:text-4xl text-plum-deep mt-2">
        Konto erstellen
      </h1>

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
          required
        />

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
          {/* Requirements */}
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
          className="wg-btn-primary wg-btn-lg w-full disabled:bg-plum-soft"
        >
          {isLoading ? 'Wird erstellt…' : 'Konto erstellen →'}
        </button>
      </form>

      {/* Dotted divider */}
      <div className="my-7 flex items-center gap-3">
        <span className="flex-1 wg-divider-dotted" />
        <span className="text-xs text-ink-mute">oder</span>
        <span className="flex-1 wg-divider-dotted" />
      </div>

      <Link to="/login" className="wg-btn-secondary wg-btn-lg w-full">
        Anmelden
      </Link>
    </AuthLayout>
  );
}

export default RegisterPage;

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const { register, isAuthenticated, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();

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

  const isPasswordValid = passwordRequirements.minLength && 
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
        state: { message: 'Konto erfolgreich erstellt. Bitte melden Sie sich an.' } 
      });
    } catch {
      // Error is handled by AuthContext
    }
  };

  const displayError = localError || error;

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-4">
      <div className="max-w-md w-full bg-paper-hi rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-center text-ink mb-6">
          Konto erstellen
        </h1>

        {displayError && (
          <div className="mb-4 p-3 bg-blush-50 border border-blush text-blush-deep rounded">
            {displayError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-ink-soft mb-1">
              E-Mail
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-rule rounded-md focus:outline-none focus:ring-2 focus:ring-plum focus:border-transparent"
              placeholder="ihre@email.de"
              autoComplete="email"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-ink-soft mb-1">
              Passwort
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-rule rounded-md focus:outline-none focus:ring-2 focus:ring-plum focus:border-transparent"
              placeholder="••••••••"
              autoComplete="new-password"
              disabled={isLoading}
            />

            {/* Password requirements */}
            <div className="mt-2 text-sm space-y-1">
              <p className="text-ink-soft font-medium">Passwort-Anforderungen:</p>
              <ul className="space-y-1">
                <li className={`flex items-center ${passwordRequirements.minLength ? 'text-sage-deep' : 'text-ink-mute'}`}>
                  <span className="mr-2">{passwordRequirements.minLength ? '✓' : '○'}</span>
                  Mindestens 8 Zeichen
                </li>
                <li className={`flex items-center ${passwordRequirements.hasLetter ? 'text-sage-deep' : 'text-ink-mute'}`}>
                  <span className="mr-2">{passwordRequirements.hasLetter ? '✓' : '○'}</span>
                  Mindestens ein Buchstabe
                </li>
                <li className={`flex items-center ${passwordRequirements.hasNumber ? 'text-sage-deep' : 'text-ink-mute'}`}>
                  <span className="mr-2">{passwordRequirements.hasNumber ? '✓' : '○'}</span>
                  Mindestens eine Zahl
                </li>
              </ul>
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-ink-soft mb-1">
              Passwort bestätigen
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-rule rounded-md focus:outline-none focus:ring-2 focus:ring-plum focus:border-transparent"
              placeholder="••••••••"
              autoComplete="new-password"
              disabled={isLoading}
            />
            {confirmPassword && password !== confirmPassword && (
              <p className="mt-1 text-sm text-blush-deep">
                Die Passwörter stimmen nicht überein.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || !isPasswordValid}
            className="w-full py-2 px-4 bg-plum hover:bg-plum-deep disabled:bg-plum-soft text-white font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-plum focus:ring-offset-2"
          >
            {isLoading ? 'Wird erstellt...' : 'Konto erstellen'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-soft">
          Bereits ein Konto?{' '}
          <Link to="/login" className="text-plum hover:text-plum-deep font-medium">
            Jetzt anmelden
          </Link>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { login, isAuthenticated, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Check for success message from registration
  useEffect(() => {
    const state = location.state as { message?: string } | null;
    if (state?.message) {
      setSuccessMessage(state.message);
      // Clear the state so message doesn't persist on refresh
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

  const displayError = localError || error;

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper-lo px-4">
      <div className="max-w-md w-full bg-paper-hi rounded-lg shadow-md p-8">
        <h1 className="font-display italic text-3xl text-center text-plum-deep mb-6">
          Anmelden
        </h1>

        {successMessage && (
          <div className="mb-4 p-3 bg-sage-100 border border-sage text-sage-deep rounded">
            {successMessage}
          </div>
        )}

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
              autoComplete="current-password"
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="wg-btn-primary wg-btn-lg w-full disabled:bg-plum-soft focus:outline-none focus:ring-2 focus:ring-plum focus:ring-offset-2"
          >
            {isLoading ? 'Wird angemeldet...' : 'Anmelden'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-soft">
          Noch kein Konto?{' '}
          <Link to="/register" className="text-plum hover:text-plum-deep font-medium">
            Jetzt registrieren
          </Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;

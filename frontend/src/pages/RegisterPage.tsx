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
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-6">
          Konto erstellen
        </h1>

        {displayError && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {displayError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              E-Mail
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="ihre@email.de"
              autoComplete="email"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Passwort
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
              autoComplete="new-password"
              disabled={isLoading}
            />
            
            {/* Password requirements */}
            <div className="mt-2 text-sm space-y-1">
              <p className="text-gray-600 font-medium">Passwort-Anforderungen:</p>
              <ul className="space-y-1">
                <li className={`flex items-center ${passwordRequirements.minLength ? 'text-green-600' : 'text-gray-500'}`}>
                  <span className="mr-2">{passwordRequirements.minLength ? '✓' : '○'}</span>
                  Mindestens 8 Zeichen
                </li>
                <li className={`flex items-center ${passwordRequirements.hasLetter ? 'text-green-600' : 'text-gray-500'}`}>
                  <span className="mr-2">{passwordRequirements.hasLetter ? '✓' : '○'}</span>
                  Mindestens ein Buchstabe
                </li>
                <li className={`flex items-center ${passwordRequirements.hasNumber ? 'text-green-600' : 'text-gray-500'}`}>
                  <span className="mr-2">{passwordRequirements.hasNumber ? '✓' : '○'}</span>
                  Mindestens eine Zahl
                </li>
              </ul>
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Passwort bestätigen
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
              autoComplete="new-password"
              disabled={isLoading}
            />
            {confirmPassword && password !== confirmPassword && (
              <p className="mt-1 text-sm text-red-600">
                Die Passwörter stimmen nicht überein.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || !isPasswordValid}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {isLoading ? 'Wird erstellt...' : 'Konto erstellen'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Bereits ein Konto?{' '}
          <Link to="/login" className="text-blue-600 hover:text-blue-800 font-medium">
            Jetzt anmelden
          </Link>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;

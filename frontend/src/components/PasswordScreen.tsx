/**
 * PasswordScreen component for authentication
 * Full-screen password entry form with German UI text
 * Requirements: 1.1, 1.2, 1.3, 9.1
 */

import { useState, useRef, useEffect, FormEvent } from 'react';
import { authApi, ApiError } from '../api/client';

interface PasswordScreenProps {
  onAuthenticated: (token: string) => void;
}

// Get event name from environment variable
const getEventName = (): string => {
  return import.meta.env.VITE_EVENT_NAME || 'Brettspiel-Event';
};

export function PasswordScreen({ onAuthenticated }: PasswordScreenProps) {
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const eventName = getEventName();

  useEffect(() => {
    passwordInputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password.trim()) {
      setError('Bitte Passwort eingeben.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await authApi.verify(password);
      
      if (response.success) {
        onAuthenticated(response.token || '');
      } else {
        setError('Falsches Passwort. Bitte erneut versuchen.');
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'INVALID_PASSWORD') {
          setError('Falsches Passwort. Bitte erneut versuchen.');
        } else {
          setError(err.message);
        }
      } else {
        // Show detailed error for debugging
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(`Fehler: ${errorMessage}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            {eventName}
          </h1>
          <p className="text-gray-600">
            Bitte melde Dich an, um fortzufahren.
          </p>
        </div>

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Passwort eingeben
            </label>
            <div className="relative">
              <input
                ref={passwordInputRef}
                type={isPasswordVisible ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Passwort"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setIsPasswordVisible((visible) => !visible)}
                className="absolute right-3 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded text-gray-500 hover:text-gray-700 disabled:text-gray-400"
                aria-label={isPasswordVisible ? 'Passwort verbergen' : 'Passwort anzeigen'}
                disabled={isLoading}
              >
                <img
                  src={isPasswordVisible ? '/eye-open.svg' : '/eye-closed.svg'}
                  alt=""
                  aria-hidden="true"
                  className="h-5 w-5"
                />
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Wird geprüft...
              </span>
            ) : (
              'Anmelden'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default PasswordScreen;

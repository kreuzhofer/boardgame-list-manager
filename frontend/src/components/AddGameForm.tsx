/**
 * AddGameForm component
 * Form for adding a new game with toggle buttons for playing and bringing
 * All UI text in German (Requirement 9.1)
 * Requirements: 3.1, 3.2
 */

import { useState, useCallback, FormEvent, useRef } from 'react';
import { gamesApi, ApiError } from '../api/client';
import { Game } from '../types';

interface AddGameFormProps {
  /** Current user's ID */
  currentUserId: string;
  /** Callback when a game is successfully added */
  onGameAdded: (game: Game) => void;
}

export function AddGameForm({ currentUserId, onGameAdded }: AddGameFormProps) {
  const [gameName, setGameName] = useState('');
  const [isBringing, setIsBringing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      const trimmedName = gameName.trim();

      // Validate that game name is not empty - Requirement 3.1
      if (!trimmedName) {
        setError('Bitte einen Spielnamen eingeben.');
        return;
      }

      setError(null);
      setIsSubmitting(true);

      try {
        // Call API to create game using the API client
        const response = await gamesApi.create(trimmedName, currentUserId, isBringing, isPlaying);
        
        // Reset form
        setGameName('');
        setIsBringing(false);
        setIsPlaying(false);
        inputRef.current?.focus();
        
        // Notify parent
        onGameAdded(response.game);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Netzwerkfehler. Bitte Verbindung prüfen.');
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [gameName, isBringing, isPlaying, currentUserId, onGameAdded]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setGameName(e.target.value);
      // Clear error when user starts typing
      if (error) {
        setError(null);
      }
    },
    [error]
  );

  // Button base classes
  const toggleButtonBase = 'px-3 py-2 text-sm font-medium rounded-lg transition-all min-h-[44px]';

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Neues Spiel hinzufügen
      </h3>
      
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-4">
          {/* Game name input */}
          <div>
            <label
              htmlFor="game-name-input"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Spielname
            </label>
            <input
              ref={inputRef}
              id="game-name-input"
              type="text"
              value={gameName}
              onChange={handleInputChange}
              placeholder="z.B. Catan, Azul, Wingspan..."
              disabled={isSubmitting}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                error
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300'
              }`}
              aria-describedby={error ? 'game-name-error' : undefined}
              aria-invalid={error ? 'true' : 'false'}
            />
          </div>

          {/* Toggle buttons row */}
          <div className="flex flex-wrap gap-2">
            {/* "Mitspielen" toggle button */}
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              disabled={isSubmitting}
              className={`${toggleButtonBase} ${
                isPlaying
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              🎮 {isPlaying ? 'Mitspielen ✓' : 'Mitspielen'}
            </button>

            {/* "Mitbringen" toggle button */}
            <button
              type="button"
              onClick={() => setIsBringing(!isBringing)}
              disabled={isSubmitting}
              className={`${toggleButtonBase} ${
                isBringing
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              📦 {isBringing ? 'Mitbringen ✓' : 'Mitbringen'}
            </button>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px]"
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
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
                  Wird hinzugefügt...
                </>
              ) : (
                'Hinzufügen'
              )}
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <p
            id="game-name-error"
            className="mt-2 text-sm text-red-600"
            role="alert"
          >
            {error}
          </p>
        )}
      </form>
    </div>
  );
}

export default AddGameForm;

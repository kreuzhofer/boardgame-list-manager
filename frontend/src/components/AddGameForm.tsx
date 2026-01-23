/**
 * AddGameForm component
 * Form for adding a new game with toggle buttons for playing and bringing
 * Includes BGG autocomplete functionality
 * All UI text in German (Requirement 9.1)
 * Requirements: 3.1, 3.2, 3.4, 3.5, 3.6
 */

import { useState, useCallback, FormEvent, useRef, useEffect } from 'react';
import { gamesApi, ApiError } from '../api/client';
import { useBggSearch } from '../hooks';
import { AutocompleteDropdown } from './AutocompleteDropdown';
import type { Game, BggSearchResult } from '../types';

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
  const containerRef = useRef<HTMLDivElement>(null);

  // BGG autocomplete state
  const [selectedBggId, setSelectedBggId] = useState<number | undefined>(undefined);
  const [selectedYearPublished, setSelectedYearPublished] = useState<number | undefined>(undefined);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const justSelectedRef = useRef(false);

  // Use BGG search hook with 300ms debounce
  const { results, isLoading, hasMore } = useBggSearch(gameName, 300);

  // Open dropdown when there are results and input has 1+ characters
  // But not if user just selected an item
  useEffect(() => {
    if (justSelectedRef.current) {
      // Don't reopen dropdown after selection
      return;
    }
    if (gameName.length >= 1 && results.length > 0) {
      setIsDropdownOpen(true);
    } else if (gameName.length < 1) {
      setIsDropdownOpen(false);
    }
  }, [gameName, results]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [results]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      setIsDropdownOpen(false);

      try {
        // Call API to create game using the API client
        const response = await gamesApi.create(
          trimmedName,
          currentUserId,
          isBringing,
          isPlaying,
          selectedBggId,
          selectedYearPublished
        );
        
        // Reset form
        setGameName('');
        setIsBringing(false);
        setIsPlaying(false);
        setSelectedBggId(undefined);
        setSelectedYearPublished(undefined);
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
    [gameName, isBringing, isPlaying, currentUserId, onGameAdded, selectedBggId, selectedYearPublished]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setGameName(newValue);
      
      // User is typing, so allow dropdown to open again
      justSelectedRef.current = false;
      
      // Clear BGG selection when user types (they might be changing their mind)
      if (selectedBggId !== undefined) {
        setSelectedBggId(undefined);
        setSelectedYearPublished(undefined);
      }
      
      // Clear error when user starts typing
      if (error) {
        setError(null);
      }
    },
    [error, selectedBggId]
  );

  const handleSelectGame = useCallback((result: BggSearchResult) => {
    // Mark that we just selected, so dropdown doesn't reopen
    justSelectedRef.current = true;
    // Requirement 3.4: Populate input with selected game name
    setGameName(result.name);
    // Requirement 3.5: Store BGG ID and yearPublished for submission
    setSelectedBggId(result.id);
    setSelectedYearPublished(result.yearPublished ?? undefined);
    setIsDropdownOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isDropdownOpen) return;

      const maxIndex = results.length - 1;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => (prev < maxIndex ? prev + 1 : 0));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev > 0 ? prev - 1 : maxIndex));
          break;
        case 'Enter':
          if (selectedIndex >= 0 && selectedIndex <= maxIndex) {
            e.preventDefault();
            handleSelectGame(results[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsDropdownOpen(false);
          setSelectedIndex(-1);
          break;
      }
    },
    [isDropdownOpen, results, selectedIndex, handleSelectGame]
  );

  const handleCloseDropdown = useCallback(() => {
    setIsDropdownOpen(false);
    setSelectedIndex(-1);
  }, []);

  // Button base classes
  const toggleButtonBase = 'px-3 py-2 text-sm font-medium rounded-lg transition-all min-h-[44px]';

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Neues Spiel hinzufügen
      </h3>
      
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-4">
          {/* Game name input with autocomplete */}
          <div ref={containerRef} className="relative">
            <label
              htmlFor="game-name-input"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Spielname
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                id="game-name-input"
                type="text"
                value={gameName}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  // Don't reopen if user just selected an item
                  if (!justSelectedRef.current && gameName.length >= 1 && results.length > 0) {
                    setIsDropdownOpen(true);
                  }
                }}
                placeholder="z.B. Catan, Azul, Wingspan..."
                disabled={isSubmitting}
                autoComplete="off"
                role="combobox"
                aria-expanded={isDropdownOpen}
                aria-haspopup="listbox"
                aria-autocomplete="list"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                  error
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300'
                }`}
                aria-describedby={error ? 'game-name-error' : undefined}
                aria-invalid={error ? 'true' : 'false'}
              />
              {/* BGG selection indicator */}
              {selectedBggId !== undefined && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                  BGG
                </span>
              )}
            </div>
            
            {/* Autocomplete dropdown */}
            <AutocompleteDropdown
              results={results}
              isOpen={isDropdownOpen}
              isLoading={isLoading}
              selectedIndex={selectedIndex}
              hasMore={hasMore}
              onSelect={handleSelectGame}
              onClose={handleCloseDropdown}
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

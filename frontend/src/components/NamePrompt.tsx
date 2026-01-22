/**
 * NamePrompt component for entering user name
 * Modal dialog for first-time users or name changes
 * All UI text in German (Requirement 9.1)
 * Uses createPortal per workspace guidelines
 * Requirements: 2.1, 2.2, 2.4, 2.5
 */

import { useState, useCallback, FormEvent, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface NamePromptProps {
  /** Callback when name is submitted */
  onNameSubmitted: (name: string) => void;
  /** Optional: Pre-fill with existing name (for name change) */
  initialName?: string;
  /** Optional: Show cancel button (for name change mode) */
  showCancel?: boolean;
  /** Optional: Callback when cancel is clicked */
  onCancel?: () => void;
}

export function NamePrompt({
  onNameSubmitted,
  initialName = '',
  showCancel = false,
  onCancel,
}: NamePromptProps) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const trimmedName = name.trim();

      // Validate that name is not empty
      if (!trimmedName) {
        setError('Bitte geben Sie Ihren Namen ein.');
        return;
      }

      setError(null);
      onNameSubmitted(trimmedName);
    },
    [name, onNameSubmitted]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setName(e.target.value);
      // Clear error when user starts typing
      if (error) {
        setError(null);
      }
    },
    [error]
  );

  const modalContent = (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="name-prompt-title"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2
            id="name-prompt-title"
            className="text-xl font-semibold text-gray-900"
          >
            Wie heißen Sie?
          </h2>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4">
            <label
              htmlFor="user-name-input"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Name eingeben
            </label>
            <input
              ref={inputRef}
              id="user-name-input"
              type="text"
              value={name}
              onChange={handleInputChange}
              placeholder="Ihr Name"
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                error
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300'
              }`}
              aria-describedby={error ? 'name-error' : undefined}
              aria-invalid={error ? 'true' : 'false'}
            />
            {error && (
              <p
                id="name-error"
                className="mt-2 text-sm text-red-600"
                role="alert"
              >
                {error}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
            {showCancel && onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Abbrechen
              </button>
            )}
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Speichern
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // Use createPortal to render modal at document.body level
  return createPortal(modalContent, document.body);
}

export default NamePrompt;

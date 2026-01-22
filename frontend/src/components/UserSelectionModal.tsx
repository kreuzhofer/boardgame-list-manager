/**
 * UserSelectionModal component
 * Modal for selecting an existing user or creating a new one
 * 
 * Requirements: 5.1, 5.2, 5.3, 7.4
 */

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { usersApi, ApiError } from '../api/client';
import type { User } from '../types';

interface UserSelectionModalProps {
  isOpen: boolean;
  onUserSelected: (user: User) => void;
}

export function UserSelectionModal({ isOpen, onUserSelected }: UserSelectionModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newUserName, setNewUserName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Fetch existing users when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await usersApi.getAll();
      setUsers(response.users);
    } catch (err) {
      // Show detailed error for debugging
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Fehler beim Laden der Benutzer: ${errorMessage}`);
      console.error('Failed to fetch users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectUser = (user: User) => {
    onUserSelected(user);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedName = newUserName.trim();
    if (!trimmedName) {
      setCreateError('Bitte einen Namen eingeben.');
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      const response = await usersApi.create(trimmedName);
      onUserSelected(response.user);
    } catch (err) {
      if (err instanceof ApiError) {
        setCreateError(err.message);
      } else {
        setCreateError('Fehler beim Erstellen des Benutzers.');
      }
      console.error('Failed to create user:', err);
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900">
            Wer bist du?
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Wähle deinen Namen aus der Liste oder erstelle einen neuen Benutzer.
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="text-red-600 text-center py-4">
              {error}
              <button
                onClick={fetchUsers}
                className="block mx-auto mt-2 text-blue-600 hover:underline"
              >
                Erneut versuchen
              </button>
            </div>
          ) : (
            <>
              {/* Existing users list */}
              {users.length > 0 && !showCreateForm && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Bestehende Benutzer:
                  </h3>
                  <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
                    {users.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => handleSelectUser(user)}
                        className="w-full px-4 py-3 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors"
                      >
                        <span className="text-gray-900">{user.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Toggle to create form */}
              {!showCreateForm && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="mt-4 w-full py-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  + Neuen Benutzer erstellen
                </button>
              )}

              {/* Create new user form */}
              {showCreateForm && (
                <form onSubmit={handleCreateUser} className="mt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Neuen Benutzer erstellen:
                  </h3>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={newUserName}
                      onChange={(e) => {
                        setNewUserName(e.target.value);
                        setCreateError(null);
                      }}
                      placeholder="Dein Name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      autoFocus
                      disabled={isCreating}
                    />
                    {createError && (
                      <p className="text-red-600 text-sm">{createError}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowCreateForm(false);
                          setNewUserName('');
                          setCreateError(null);
                        }}
                        className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        disabled={isCreating}
                      >
                        Abbrechen
                      </button>
                      <button
                        type="submit"
                        className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        disabled={isCreating || !newUserName.trim()}
                      >
                        {isCreating ? 'Erstelle...' : 'Erstellen'}
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Show create form directly if no users exist */}
              {users.length === 0 && !showCreateForm && (
                <div className="text-center py-4">
                  <p className="text-gray-600 mb-4">
                    Noch keine Benutzer vorhanden.
                  </p>
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Ersten Benutzer erstellen
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

export default UserSelectionModal;

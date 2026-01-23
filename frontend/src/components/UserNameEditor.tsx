/**
 * UserNameEditor component
 * Allows the current user to edit their display name
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */

import { useState } from 'react';
import { usersApi, ApiError } from '../api/client';
import type { User } from '../types';

interface UserNameEditorProps {
  user: User;
  onUserUpdated: (user: User) => void;
}

export function UserNameEditor({ user, onUserUpdated }: UserNameEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(user.name);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartEdit = () => {
    setNewName(user.name);
    setError(null);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setNewName(user.name);
    setError(null);
    setIsEditing(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = newName.trim();
    if (!trimmedName) {
      setError('Bitte einen Namen eingeben.');
      return;
    }

    // No change needed
    if (trimmedName === user.name) {
      setIsEditing(false);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await usersApi.update(user.id, trimmedName);
      onUserUpdated(response.user);
      setIsEditing(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Fehler beim Aktualisieren des Namens.');
      }
      console.error('Failed to update user name:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isEditing) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-medium text-white">{user.name}</span>
        <button
          onClick={handleStartEdit}
          className="text-white/80 hover:text-white text-sm"
          aria-label="Namen bearbeiten"
        >
          ✏️
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        type="text"
        value={newName}
        onChange={(e) => {
          setNewName(e.target.value);
          setError(null);
        }}
        className="px-2 py-1 border border-white/30 bg-white/20 text-white rounded text-sm focus:ring-2 focus:ring-white/50 focus:border-white/50 placeholder-white/50 caret-white"
        autoFocus
        disabled={isSubmitting}
      />
      <button
        type="submit"
        className="px-2 py-1 text-blue-600 bg-white rounded text-sm hover:bg-white/90 disabled:opacity-50"
        disabled={isSubmitting || !newName.trim()}
      >
        {isSubmitting ? '...' : '✓'}
      </button>
      <button
        type="button"
        onClick={handleCancel}
        className="px-2 py-1 text-white bg-white/20 rounded text-sm hover:bg-white/30"
        disabled={isSubmitting}
      >
        ✕
      </button>
      {error && (
        <span className="text-red-300 text-sm">{error}</span>
      )}
    </form>
  );
}

export default UserNameEditor;

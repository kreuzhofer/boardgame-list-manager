/**
 * ParticipantNameEditor component
 * Allows the current participant to edit their display name
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */

import { useState } from 'react';
import { participantsApi, ApiError } from '../api/client';
import type { Participant } from '../types';

interface ParticipantNameEditorProps {
  participant: Participant;
  onParticipantUpdated: (participant: Participant) => void;
}

export function ParticipantNameEditor({ participant, onParticipantUpdated }: ParticipantNameEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(participant.name);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartEdit = () => {
    setNewName(participant.name);
    setError(null);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setNewName(participant.name);
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
    if (trimmedName === participant.name) {
      setIsEditing(false);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await participantsApi.update(participant.id, trimmedName);
      onParticipantUpdated(response.participant);
      setIsEditing(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Fehler beim Aktualisieren des Namens.');
      }
      console.error('Failed to update participant name:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isEditing) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-medium text-white">{participant.name}</span>
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
        className="px-2 py-1 border border-white/30 bg-white/20 text-white rounded text-base focus:ring-2 focus:ring-white/50 focus:border-white/50 placeholder-white/50 caret-white"
        style={{ fontSize: '16px' }} // Prevent iOS Safari auto-zoom
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

export default ParticipantNameEditor;

/**
 * ParticipantSelectionModal component
 * Modal for selecting an existing participant or creating a new one
 * 
 * Requirements: 5.1, 5.2, 5.3, 7.4
 */

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { participantsApi, ApiError } from '../api/client';
import type { Participant } from '../types';

const MAX_USERNAME_LENGTH = 30;

interface ParticipantSelectionModalProps {
  isOpen: boolean;
  onParticipantSelected: (participant: Participant) => void;
}

export function ParticipantSelectionModal({ isOpen, onParticipantSelected }: ParticipantSelectionModalProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newParticipantName, setNewParticipantName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [pendingParticipant, setPendingParticipant] = useState<Participant | null>(null);

  // Fetch existing participants and reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setShowCreateForm(false);
      setNewParticipantName('');
      setCreateError(null);
      setPendingParticipant(null);
      fetchParticipants();
    }
  }, [isOpen]);

  const fetchParticipants = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await participantsApi.getAll();
      setParticipants(response.participants);
    } catch (err) {
      // Show detailed error for debugging
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Fehler beim Laden der Teilnehmer: ${errorMessage}`);
      console.error('Failed to fetch participants:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectParticipant = (participant: Participant) => {
    setPendingParticipant(participant);
  };

  const handleConfirmParticipant = () => {
    if (pendingParticipant) {
      onParticipantSelected(pendingParticipant);
    }
  };

  const handleCancelConfirm = () => {
    setPendingParticipant(null);
  };

  const handleCreateParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedName = newParticipantName.trim();
    if (!trimmedName) {
      setCreateError('Bitte einen Namen eingeben.');
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      const response = await participantsApi.create(trimmedName);
      onParticipantSelected(response.participant);
    } catch (err) {
      if (err instanceof ApiError) {
        setCreateError(err.message);
      } else {
        setCreateError('Fehler beim Erstellen des Teilnehmers.');
      }
      console.error('Failed to create participant:', err);
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
            Wähle deinen Namen aus der Liste oder erstelle einen neuen Teilnehmer.
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
          {/* Confirmation view */}
          {pendingParticipant ? (
            <div className="text-center py-4">
              <p className="text-lg text-gray-900 mb-6">
                Du meldest Dich als <span className="font-semibold">{pendingParticipant.name}</span> an
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleCancelConfirm}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Nein, nochmal zurück
                </button>
                <button
                  onClick={handleConfirmParticipant}
                  className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Ja
                </button>
              </div>
            </div>
          ) : isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="text-red-600 text-center py-4">
              {error}
              <button
                onClick={fetchParticipants}
                className="block mx-auto mt-2 text-blue-600 hover:underline"
              >
                Erneut versuchen
              </button>
            </div>
          ) : (
            <>
              {/* Existing users list */}
              {participants.length > 0 && !showCreateForm && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Bestehende Teilnehmer ({participants.length}):
                  </h3>
                  <div className="relative">
                    <div className="max-h-48 overflow-y-auto border rounded-lg divide-y scroll-smooth">
                      {participants.map((participant) => (
                        <button
                          key={participant.id}
                          onClick={() => handleSelectParticipant(participant)}
                          className="w-full px-4 py-3 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors"
                        >
                          <span className="text-gray-900">{participant.name}</span>
                        </button>
                      ))}
                    </div>
                    {participants.length > 4 && (
                      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent pointer-events-none rounded-b-lg" />
                    )}
                  </div>
                  {participants.length > 4 && (
                    <p className="text-xs text-gray-500 text-center">
                      ↓ Scrolle für mehr
                    </p>
                  )}
                </div>
              )}

              {/* Toggle to create form - only show when participants exist */}
              {!showCreateForm && participants.length > 0 && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="mt-4 w-full py-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  + Neuen Teilnehmer erstellen
                </button>
              )}

              {/* Create new participant form */}
              {showCreateForm && (
                <form onSubmit={handleCreateParticipant} className="mt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Neuen Teilnehmer erstellen:
                  </h3>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={newParticipantName}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        setNewParticipantName(newValue);
                        if (newValue.trim().length >= MAX_USERNAME_LENGTH) {
                          setCreateError('Der Name darf maximal 30 Zeichen lang sein.');
                        } else {
                          setCreateError(null);
                        }
                      }}
                      placeholder="Dein Name"
                      maxLength={MAX_USERNAME_LENGTH}
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
                          setNewParticipantName('');
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
                        disabled={isCreating || !newParticipantName.trim()}
                      >
                        {isCreating ? 'Erstelle...' : 'Erstellen'}
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Show create form directly if no participants exist */}
              {participants.length === 0 && !showCreateForm && (
                <div className="text-center py-4">
                  <p className="text-gray-600 mb-4">
                    Noch keine Teilnehmer vorhanden.
                  </p>
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Ersten Teilnehmer erstellen
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

export default ParticipantSelectionModal;

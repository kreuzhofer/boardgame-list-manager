import { useParams, Routes, Route } from 'react-router-dom';
import { EventProvider, useEvent } from '../contexts/EventContext';
import { AuthGuard } from './AuthGuard';
import { ParticipantSelectionModal } from './ParticipantSelectionModal';
import { Layout } from './Layout';
import { HomePage } from '../pages/HomePage';
import { PrintPage } from '../pages/PrintPage';
import { StatisticsPage } from '../pages/StatisticsPage';
import { useParticipant } from '../hooks';
import type { Participant } from '../types';
import { useState, useCallback } from 'react';

function EventContent() {
  const { slug, eventName, loading, error } = useEvent();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { participant, isLoading, setParticipant, clearParticipant } = useParticipant(slug);

  const handleAuthChange = useCallback((authenticated: boolean) => {
    setIsAuthenticated(authenticated);
  }, []);

  const handleParticipantSelected = useCallback((selectedParticipant: Participant) => {
    setParticipant(selectedParticipant);
  }, [setParticipant]);

  const handleParticipantUpdated = useCallback((updatedParticipant: Participant) => {
    setParticipant(updatedParticipant);
  }, [setParticipant]);

  const handleParticipantSwitch = useCallback(() => {
    clearParticipant();
  }, [clearParticipant]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8 text-center">
          <p className="text-gray-500">Lade Event...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8 text-center">
          <h1 className="text-xl font-bold text-gray-800 mb-2">Event nicht gefunden</h1>
          <p className="text-gray-600">
            Unter dieser Adresse gibt es kein Event.
          </p>
          <a href="/" className="text-blue-600 hover:underline mt-4 inline-block">
            Zur Startseite
          </a>
        </div>
      </div>
    );
  }

  const showParticipantSelection = isAuthenticated && !isLoading && !participant;

  return (
    <AuthGuard slug={slug} eventName={eventName} onAuthChange={handleAuthChange}>
      <ParticipantSelectionModal
        isOpen={showParticipantSelection}
        onParticipantSelected={handleParticipantSelected}
      />
      <Layout
        basePath={`/${slug}`}
        eventName={eventName}
        participant={participant ?? undefined}
        onParticipantUpdated={handleParticipantUpdated}
        onParticipantSwitch={handleParticipantSwitch}
      >
        <Routes>
          <Route path="/" element={<HomePage participant={participant} />} />
          <Route path="/print" element={<PrintPage participant={participant} />} />
          <Route path="/statistics" element={<StatisticsPage />} />
        </Routes>
      </Layout>
    </AuthGuard>
  );
}

export function EventRoutes() {
  const { slug } = useParams<{ slug: string }>();

  if (!slug) return null;

  return (
    <EventProvider slug={slug}>
      <EventContent />
    </EventProvider>
  );
}

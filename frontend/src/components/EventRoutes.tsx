import { useParams, Routes, Route } from 'react-router-dom';
import { EventProvider, useEvent } from '../contexts/EventContext';
import { AuthGuard } from './AuthGuard';
import { ParticipantSelectionModal } from './ParticipantSelectionModal';
import { Layout } from './Layout';
import { ViewAsToggle } from './ViewAsToggle';
import { HomePage } from '../pages/HomePage';
import { PrintPage } from '../pages/PrintPage';
import { StatisticsPage } from '../pages/StatisticsPage';
import { EventWelcomePage } from '../pages/EventWelcomePage';
import { useParticipant } from '../hooks';
import { useAuth } from '../contexts/AuthContext';
import type { Participant } from '../types';
import { useState, useCallback } from 'react';

function EventContent() {
  const { slug, eventName, effectiveStatus, loading, error } = useEvent();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { participant, isLoading, setParticipant, clearParticipant } = useParticipant(slug);
  const { account } = useAuth();
  // Account-authed users have a 1:1 binding between their Account and
  // the per-event User row (auto-resolved on verify), so switching to
  // a different participant doesn't make sense — hide "Wechseln". The
  // anon flow (no account JWT) keeps the switch button so users can
  // re-pick from the modal.
  const isAccountBound = !!account;

  const handleAuthChange = useCallback((authenticated: boolean) => {
    setIsAuthenticated(authenticated);
  }, []);

  const handleParticipantResolved = useCallback(
    (resolved: { id: string; name: string }) => {
      setParticipant({ id: resolved.id, name: resolved.name });
    },
    [setParticipant],
  );

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
      <div className="min-h-screen bg-gradient-to-br from-plum to-plum-deep flex items-center justify-center p-4">
        <div className="bg-paper-hi rounded-lg shadow-floating max-w-md w-full p-8 text-center">
          <p className="text-ink-mute">Lade Event...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-ink-mute to-ink-soft flex items-center justify-center p-4">
        <div className="bg-paper-hi rounded-lg shadow-floating max-w-md w-full p-8 text-center">
          <h1 className="text-xl font-bold text-ink mb-2">Event nicht gefunden</h1>
          <p className="text-ink-soft">
            Unter dieser Adresse gibt es kein Event.
          </p>
          <a href="/" className="text-plum hover:underline mt-4 inline-block">
            Zur Startseite
          </a>
        </div>
      </div>
    );
  }

  // Events in 'planning' status show a public welcome page — no password
  // gate, no participant selection, no game list. Participants get a peek
  // before the organizer flips the status to 'active'. effectiveStatus
  // honours the owner's "view as" preview override.
  if (effectiveStatus === 'planning') {
    return (
      <>
        <ViewAsToggle />
        <EventWelcomePage />
      </>
    );
  }

  const showParticipantSelection = isAuthenticated && !isLoading && !participant;

  return (
    <>
      <ViewAsToggle />
      <AuthGuard
        slug={slug}
        eventName={eventName}
        onAuthChange={handleAuthChange}
        onParticipantResolved={handleParticipantResolved}
      >
        <ParticipantSelectionModal
          isOpen={showParticipantSelection}
          onParticipantSelected={handleParticipantSelected}
        />
        <Layout
          basePath={`/${slug}`}
          eventName={eventName}
          participant={participant ?? undefined}
          onParticipantUpdated={handleParticipantUpdated}
          onParticipantSwitch={isAccountBound ? undefined : handleParticipantSwitch}
        >
          <Routes>
            <Route path="/" element={<HomePage participant={participant} />} />
            <Route path="/print" element={<PrintPage participant={participant} />} />
            <Route path="/statistics" element={<StatisticsPage />} />
          </Routes>
        </Layout>
      </AuthGuard>
    </>
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

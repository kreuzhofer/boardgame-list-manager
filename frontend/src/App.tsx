/**
 * Main App component with React Router configuration
 * Routes:
 *   / - Main game list page (HomePage)
 *   /print - Print view page (PrintPage)
 *   /login - Account login page
 *   /register - Account registration page
 *   /profile - Account profile page (requires auth)
 * 
 * Authentication flow:
 *   1. AuthGuard checks sessionStorage for auth state
 *   2. If not authenticated, shows PasswordScreen
 *   3. If authenticated, checks for stored user
 *   4. If no participant stored, shows ParticipantSelectionModal
 *   5. If user stored, renders the app content
 * 
 * Requirements: 1.1, 2.1, 2.2, 2.3, 2.4, 2.5, 5.1, 5.5, 5.6
 */

import { useState, useCallback, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthGuard, Layout, ParticipantSelectionModal, ToastProvider, ReleaseNotesDialog } from './components';
import { AccountAuthGuard } from './components/AccountAuthGuard';
import { AuthProvider } from './contexts/AuthContext';
import { useParticipant } from './hooks';
import { HomePage } from './pages/HomePage';
import { PrintPage } from './pages/PrintPage';
import { StatisticsPage } from './pages/StatisticsPage';
import { AdminPage } from './pages/AdminPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ProfilePage } from './pages/ProfilePage';
import type { Participant } from './types';

// Get event name from environment variable
const eventName = import.meta.env.VITE_EVENT_NAME || 'Brettspiel-Event';
const RELEASE_NOTES_PATH = '/release-notes.md';
const RELEASE_NOTES_STORAGE_PREFIX = 'boardgame_event_release_notes_dismissed_';

function hashReleaseNotes(content: string): string {
  let hash = 2166136261;
  for (let i = 0; i < content.length; i += 1) {
    hash ^= content.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function App() {
  // Track authentication state for passing to Layout
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Participant management via localStorage and API
  const { participant, isLoading, setParticipant, clearParticipant } = useParticipant();
  const [releaseNotesContent, setReleaseNotesContent] = useState('');
  const [releaseNotesHash, setReleaseNotesHash] = useState<string | null>(null);
  const [isReleaseNotesOpen, setIsReleaseNotesOpen] = useState(false);

  // Set document title from environment variable
  useEffect(() => {
    document.title = eventName;
  }, []);

  const handleAuthChange = useCallback((authenticated: boolean) => {
    setIsAuthenticated(authenticated);
  }, []);

  // Handle participant selection from ParticipantSelectionModal
  const handleParticipantSelected = useCallback((selectedParticipant: Participant) => {
    setParticipant(selectedParticipant);
  }, [setParticipant]);

  // Handle user update (e.g., name change)
  const handleParticipantUpdated = useCallback((updatedParticipant: Participant) => {
    setParticipant(updatedParticipant);
  }, [setParticipant]);

  // Handle participant switch - clears participant from localStorage and shows selection
  const handleParticipantSwitch = useCallback(() => {
    clearParticipant();
  }, [clearParticipant]);

  const participantId = participant?.id;

  const handleDismissReleaseNotes = useCallback(() => {
    setIsReleaseNotesOpen(false);
    if (!participantId || !releaseNotesHash) return;
    const storageKey = `${RELEASE_NOTES_STORAGE_PREFIX}${participantId}`;
    try {
      localStorage.setItem(storageKey, releaseNotesHash);
    } catch (error) {
      console.warn('Unable to persist release notes dismissal:', error);
    }
  }, [releaseNotesHash, participantId]);

  useEffect(() => {
    if (!isAuthenticated || !participantId) {
      setIsReleaseNotesOpen(false);
      return;
    }

    let cancelled = false;

    const checkReleaseNotes = async () => {
      if (typeof fetch !== 'function') return;
      try {
        const response = await fetch(RELEASE_NOTES_PATH, { cache: 'no-store' });
        if (!response.ok) return;
        const text = await response.text();
        if (cancelled) return;
        const hash = hashReleaseNotes(text);
        const storageKey = `${RELEASE_NOTES_STORAGE_PREFIX}${participantId}`;
        let dismissedHash: string | null = null;
        try {
          dismissedHash = localStorage.getItem(storageKey);
        } catch (error) {
          console.warn('Unable to read release notes dismissal:', error);
        }

        setReleaseNotesContent(text);
        setReleaseNotesHash(hash);
        if (dismissedHash !== hash) {
          setIsReleaseNotesOpen(true);
        }
      } catch (error) {
        console.error('Failed to load release notes:', error);
      }
    };

    checkReleaseNotes();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, participantId]);

  // Determine if we need to show the participant selection modal
  // Show if authenticated but no participant stored (first-time participant or participant deleted)
  const showParticipantSelection = isAuthenticated && !isLoading && !participant;

  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Account routes - outside of event auth */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/profile"
              element={
                <AccountAuthGuard>
                  <ProfilePage />
                </AccountAuthGuard>
              }
            />
            <Route
              path="/admin"
              element={
                <AccountAuthGuard>
                  <AdminPage />
                </AccountAuthGuard>
              }
            />

            {/* Event routes - require event password */}
            <Route
              path="/*"
              element={
                <AuthGuard onAuthChange={handleAuthChange}>
                  {/* Show ParticipantSelectionModal for participants without a stored selection */}
                  <ParticipantSelectionModal
                    isOpen={showParticipantSelection}
                    onParticipantSelected={handleParticipantSelected}
                  />
                  {releaseNotesContent && (
                    <ReleaseNotesDialog
                      isOpen={isReleaseNotesOpen}
                      content={releaseNotesContent}
                      onDismiss={handleDismissReleaseNotes}
                    />
                  )}

                  <Layout 
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
              }
            />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;

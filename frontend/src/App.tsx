/**
 * Main App component with React Router configuration
 * Routes:
 *   / - Main game list page (HomePage)
 *   /print - Print view page (PrintPage)
 * 
 * Authentication flow:
 *   1. AuthGuard checks sessionStorage for auth state
 *   2. If not authenticated, shows PasswordScreen
 *   3. If authenticated, checks for stored user name
 *   4. If no name stored, shows NamePrompt
 *   5. If name stored, renders the app content
 * 
 * Requirements: 1.1, 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { useState, useCallback, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthGuard, Layout, NamePrompt } from './components';
import { useUserName } from './hooks';
import { HomePage } from './pages/HomePage';
import { PrintPage } from './pages/PrintPage';

// Get event name from environment variable
const eventName = import.meta.env.VITE_EVENT_NAME || 'Brettspiel-Event';

function App() {
  // Track authentication state for passing to Layout
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Track whether name change dialog is open
  const [isNameChangeOpen, setIsNameChangeOpen] = useState(false);

  // User name management via localStorage
  const { userName, setUserName } = useUserName();

  // Set document title from environment variable
  useEffect(() => {
    document.title = eventName;
  }, []);

  const handleAuthChange = useCallback((authenticated: boolean) => {
    setIsAuthenticated(authenticated);
  }, []);

  // Handle name submission from NamePrompt
  const handleNameSubmitted = useCallback((name: string) => {
    setUserName(name);
    setIsNameChangeOpen(false);
  }, [setUserName]);

  // Handle name change button click in Header
  const handleNameChange = useCallback(() => {
    setIsNameChangeOpen(true);
  }, []);

  // Handle cancel in name change dialog
  const handleNameChangeCancel = useCallback(() => {
    setIsNameChangeOpen(false);
  }, []);

  // Determine if we need to show the name prompt
  // Show if authenticated but no name stored (first-time user)
  const showNamePrompt = isAuthenticated && !userName;

  return (
    <BrowserRouter>
      <AuthGuard onAuthChange={handleAuthChange}>
        {/* Show NamePrompt for first-time users (no stored name) */}
        {showNamePrompt && (
          <NamePrompt onNameSubmitted={handleNameSubmitted} />
        )}

        {/* Show name change dialog when user clicks "Ändern" */}
        {isNameChangeOpen && userName && (
          <NamePrompt
            onNameSubmitted={handleNameSubmitted}
            initialName={userName}
            showCancel
            onCancel={handleNameChangeCancel}
          />
        )}

        <Layout userName={userName ?? undefined} onNameChange={handleNameChange}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/print" element={<PrintPage />} />
          </Routes>
        </Layout>
      </AuthGuard>
    </BrowserRouter>
  );
}

export default App;

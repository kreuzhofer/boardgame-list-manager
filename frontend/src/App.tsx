/**
 * Main App component with React Router configuration
 * Routes:
 *   / - Main game list page (HomePage)
 *   /print - Print view page (PrintPage)
 * 
 * Authentication flow:
 *   1. AuthGuard checks sessionStorage for auth state
 *   2. If not authenticated, shows PasswordScreen
 *   3. If authenticated, checks for stored user
 *   4. If no user stored, shows UserSelectionModal
 *   5. If user stored, renders the app content
 * 
 * Requirements: 1.1, 2.1, 2.2, 2.3, 2.4, 2.5, 5.1, 5.5, 5.6
 */

import { useState, useCallback, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthGuard, Layout, UserSelectionModal } from './components';
import { useUser } from './hooks';
import { HomePage } from './pages/HomePage';
import { PrintPage } from './pages/PrintPage';
import { StatisticsPage } from './pages/StatisticsPage';
import type { User } from './types';

// Get event name from environment variable
const eventName = import.meta.env.VITE_EVENT_NAME || 'Brettspiel-Event';

function App() {
  // Track authentication state for passing to Layout
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // User management via localStorage and API
  const { user, isLoading, setUser, clearUser } = useUser();

  // Set document title from environment variable
  useEffect(() => {
    document.title = eventName;
  }, []);

  const handleAuthChange = useCallback((authenticated: boolean) => {
    setIsAuthenticated(authenticated);
  }, []);

  // Handle user selection from UserSelectionModal
  const handleUserSelected = useCallback((selectedUser: User) => {
    setUser(selectedUser);
  }, [setUser]);

  // Handle user update (e.g., name change)
  const handleUserUpdated = useCallback((updatedUser: User) => {
    setUser(updatedUser);
  }, [setUser]);

  // Handle logout - clears user from localStorage and shows user selection
  const handleLogout = useCallback(() => {
    clearUser();
  }, [clearUser]);

  // Determine if we need to show the user selection modal
  // Show if authenticated but no user stored (first-time user or user deleted)
  const showUserSelection = isAuthenticated && !isLoading && !user;

  return (
    <BrowserRouter>
      <AuthGuard onAuthChange={handleAuthChange}>
        {/* Show UserSelectionModal for users without a stored user */}
        <UserSelectionModal
          isOpen={showUserSelection}
          onUserSelected={handleUserSelected}
        />

        <Layout 
          user={user ?? undefined} 
          onUserUpdated={handleUserUpdated}
          onLogout={handleLogout}
        >
          <Routes>
            <Route path="/" element={<HomePage user={user} />} />
            <Route path="/print" element={<PrintPage user={user} />} />
            <Route path="/statistics" element={<StatisticsPage />} />
          </Routes>
        </Layout>
      </AuthGuard>
    </BrowserRouter>
  );
}

export default App;

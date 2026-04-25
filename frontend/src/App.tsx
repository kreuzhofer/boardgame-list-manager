/**
 * Main App component with React Router configuration
 * Routes:
 *   / - Public landing page
 *   /login, /register - Account auth
 *   /profile, /admin, /events/* - Account management (behind AccountAuthGuard)
 *   /:slug/* - Event routes (behind event auth)
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './components';
import { AccountAuthGuard } from './components/AccountAuthGuard';
import { AccountLayout } from './components/AccountLayout';
import { AuthProvider } from './contexts/AuthContext';
import { AdminPage } from './pages/AdminPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ProfilePage } from './pages/ProfilePage';
import { EventsPage } from './pages/EventsPage';
import { EventSettingsPage } from './pages/EventSettingsPage';
import { LandingPage } from './pages/LandingPage';
import { EventRoutes } from './components/EventRoutes';

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Public landing page */}
            <Route path="/" element={<LandingPage />} />

            {/* Account auth */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Account management */}
            <Route
              path="/profile"
              element={
                <AccountAuthGuard>
                  <AccountLayout><ProfilePage /></AccountLayout>
                </AccountAuthGuard>
              }
            />
            <Route
              path="/admin"
              element={
                <AccountAuthGuard>
                  <AccountLayout><AdminPage /></AccountLayout>
                </AccountAuthGuard>
              }
            />
            <Route
              path="/events"
              element={
                <AccountAuthGuard>
                  <AccountLayout><EventsPage /></AccountLayout>
                </AccountAuthGuard>
              }
            />
            <Route
              path="/events/new"
              element={
                <AccountAuthGuard>
                  <AccountLayout><EventSettingsPage /></AccountLayout>
                </AccountAuthGuard>
              }
            />
            <Route
              path="/events/:id"
              element={
                <AccountAuthGuard>
                  <AccountLayout><EventSettingsPage /></AccountLayout>
                </AccountAuthGuard>
              }
            />

            {/* Slug-based event routes */}
            <Route path="/:slug/*" element={<EventRoutes />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;

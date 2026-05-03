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
import { ImpressumPage } from './pages/ImpressumPage';
import { DatenschutzPage } from './pages/DatenschutzPage';
import { MagicLinkConsumePage } from './pages/MagicLinkConsumePage';
import { EmailChangeConfirmPage } from './pages/EmailChangeConfirmPage';
import { MyParticipationsPage } from './pages/MyParticipationsPage';
import { EventRoutes } from './components/EventRoutes';

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Public landing page */}
            <Route path="/" element={<LandingPage />} />

            {/* Public pages */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/impressum" element={<AccountLayout><ImpressumPage /></AccountLayout>} />
            <Route path="/datenschutz" element={<AccountLayout><DatenschutzPage /></AccountLayout>} />
            <Route path="/auth/magic" element={<MagicLinkConsumePage />} />
            <Route path="/auth/email-change/confirm" element={<EmailChangeConfirmPage />} />

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
              path="/meine-treffs"
              element={
                <AccountAuthGuard>
                  <AccountLayout><MyParticipationsPage /></AccountLayout>
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

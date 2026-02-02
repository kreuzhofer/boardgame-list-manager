/**
 * Header component with event name and user info
 * All UI text in German (Requirement 9.1)
 * Requirement 6.1, 6.4: Responsive design with mobile-friendly navigation
 * Requirement 6.3, 7.1: Display user name with edit option
 * 
 * Updated for Spec 007:
 * - Added "Statistiken" as third tab in desktop navigation
 * - Removed burger menu (replaced by MobileBottomTabs)
 * - Simplified mobile header display
 * 
 * Updated for Spec 016:
 * - Added account management link (Profil)
 */

import { Link, useLocation } from 'react-router-dom';
import { UserNameEditor } from './UserNameEditor';
import { useAuth } from '../contexts/AuthContext';
import type { User } from '../types';

interface HeaderProps {
  user?: User;
  onUserUpdated?: (user: User) => void;
  onLogout?: () => void;
}

// Get event name from environment variable
const getEventName = (): string => {
  return import.meta.env.VITE_EVENT_NAME || 'Brettspiel-Event';
};

// Desktop navigation tabs configuration
const DESKTOP_TABS = [
  { path: '/', label: 'Spieleliste' },
  { path: '/print', label: 'Druckansicht' },
  { path: '/statistics', label: 'Statistiken' },
];

export function Header({ user, onUserUpdated, onLogout }: HeaderProps) {
  const eventName = getEventName();
  const location = useLocation();
  const { isAuthenticated: isAccountAuthenticated, account, logout: accountLogout } = useAuth();

  // Check if a nav link is active
  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="bg-blue-600 text-white shadow-lg fixed top-0 left-0 right-0 z-50">
      <div className="container mx-auto px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          {/* Event Title */}
          <Link 
            to="/" 
            className="hover:opacity-90 transition-opacity flex-shrink-0"
          >
            <h1 className="text-lg sm:text-2xl font-bold truncate max-w-[200px] sm:max-w-none">
              {eventName}
            </h1>
          </Link>

          {/* Desktop Navigation - hidden on mobile */}
          <nav className="hidden md:flex items-center gap-6" data-testid="desktop-nav">
            {DESKTOP_TABS.map((tab) => (
              <Link
                key={tab.path}
                to={tab.path}
                className={`transition-colors text-sm font-medium ${
                  isActive(tab.path) 
                    ? 'text-white border-b-2 border-white pb-1' 
                    : 'text-white/80 hover:text-white'
                }`}
                data-testid={`desktop-nav-${tab.path.replace('/', '') || 'home'}`}
              >
                {tab.label}
              </Link>
            ))}
          </nav>

          {/* Desktop User Info - hidden on mobile */}
          <div className="hidden md:flex items-center gap-3">
            {/* Account management links */}
            {isAccountAuthenticated && account ? (
              <>
                <Link
                  to="/profile"
                  className="text-white/80 hover:text-white text-sm px-3 py-1 rounded hover:bg-white/10 transition-colors"
                >
                  Profil ({account.email})
                </Link>
                <button
                  onClick={accountLogout}
                  className="text-white/80 hover:text-white text-sm px-3 py-1 rounded hover:bg-white/10 transition-colors"
                  aria-label="Konto abmelden"
                >
                  Konto abmelden
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="text-white/80 hover:text-white text-sm px-3 py-1 rounded hover:bg-white/10 transition-colors"
              >
                Anmelden
              </Link>
            )}

            {/* Event user info */}
            {user && onUserUpdated && (
              <>
                <span className="text-white/50">|</span>
                <span className="text-white/90 text-sm">
                  Event-Nutzer:
                </span>
                <div className="bg-white/10 px-3 py-1 rounded">
                  <UserNameEditor user={user} onUserUpdated={onUserUpdated} />
                </div>
                {onLogout && (
                  <button
                    onClick={onLogout}
                    className="text-white/80 hover:text-white text-sm px-3 py-1 rounded hover:bg-white/10 transition-colors"
                    aria-label="Event-Nutzer wechseln"
                  >
                    Wechseln
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;

/**
 * Header component with event name and participant info
 * All UI text in German (Requirement 9.1)
 * Requirement 6.1, 6.4: Responsive design with mobile-friendly navigation
 * Requirement 6.3, 7.1: Display participant name with edit option
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
import { ParticipantNameEditor } from './ParticipantNameEditor';
import { useAuth } from '../contexts/AuthContext';
import type { Participant } from '../types';

interface HeaderProps {
  participant?: Participant;
  onParticipantUpdated?: (participant: Participant) => void;
  onParticipantSwitch?: () => void;
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

export function Header({ participant, onParticipantUpdated, onParticipantSwitch }: HeaderProps) {
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

          {/* Desktop participant info - hidden on mobile */}
          <div className="hidden md:flex items-center gap-3">
            {/* Account management links */}
            {isAccountAuthenticated && account ? (
              <>
                {account.role === 'admin' && (
                  <Link
                    to="/admin"
                    className="text-white/80 hover:text-white text-sm px-3 py-1 rounded hover:bg-white/10 transition-colors"
                  >
                    Admin
                  </Link>
                )}
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
            ) : null}

            {/* Event participant info */}
            {participant && onParticipantUpdated && (
              <>
                <span className="text-white/50">|</span>
                <span className="text-white/90 text-sm">
                  Teilnehmer:
                </span>
                <div className="bg-white/10 px-3 py-1 rounded">
                  <ParticipantNameEditor
                    participant={participant}
                    onParticipantUpdated={onParticipantUpdated}
                  />
                </div>
                {onParticipantSwitch && (
                  <button
                    onClick={onParticipantSwitch}
                    className="text-white/80 hover:text-white text-sm px-3 py-1 rounded hover:bg-white/10 transition-colors"
                    aria-label="Teilnehmer wechseln"
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

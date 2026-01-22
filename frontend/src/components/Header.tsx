/**
 * Header component with event name and user info
 * All UI text in German (Requirement 9.1)
 * Requirement 6.1, 6.4: Responsive design with mobile-friendly navigation
 */

import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface HeaderProps {
  userName?: string;
  onNameChange?: () => void;
}

// Get event name from environment variable
const getEventName = (): string => {
  return import.meta.env.VITE_EVENT_NAME || 'Brettspiel-Event';
};

export function Header({ userName, onNameChange }: HeaderProps) {
  const eventName = getEventName();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  // Check if a nav link is active
  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="bg-blue-600 text-white shadow-lg">
      <div className="container mx-auto px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          {/* Event Title */}
          <Link 
            to="/" 
            className="hover:opacity-90 transition-opacity flex-shrink-0"
            onClick={closeMobileMenu}
          >
            <h1 className="text-lg sm:text-2xl font-bold truncate max-w-[200px] sm:max-w-none">
              {eventName}
            </h1>
          </Link>

          {/* Desktop Navigation - hidden on mobile */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              to="/"
              className={`transition-colors text-sm font-medium ${
                isActive('/') 
                  ? 'text-white border-b-2 border-white pb-1' 
                  : 'text-white/80 hover:text-white'
              }`}
            >
              Spieleliste
            </Link>
            <Link
              to="/print"
              className={`transition-colors text-sm font-medium ${
                isActive('/print') 
                  ? 'text-white border-b-2 border-white pb-1' 
                  : 'text-white/80 hover:text-white'
              }`}
            >
              Druckansicht
            </Link>
          </nav>

          {/* Desktop User Info - hidden on mobile */}
          {userName && (
            <div className="hidden md:flex items-center gap-3">
              <span className="text-white/90 text-sm">
                Angemeldet als:
              </span>
              <span className="font-medium">{userName}</span>
              {onNameChange && (
                <button
                  onClick={onNameChange}
                  className="text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded transition-colors"
                  aria-label="Name ändern"
                >
                  Ändern
                </button>
              )}
            </div>
          )}

          {/* Mobile menu button - visible on mobile only */}
          <button
            onClick={toggleMobileMenu}
            className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label={isMobileMenuOpen ? 'Menü schließen' : 'Menü öffnen'}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? (
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile menu - visible when open on mobile */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-white/20">
            {/* Mobile Navigation */}
            <nav className="flex flex-col gap-2 mb-4">
              <Link
                to="/"
                onClick={closeMobileMenu}
                className={`px-4 py-3 rounded-lg text-base font-medium transition-colors min-h-[44px] flex items-center ${
                  isActive('/') 
                    ? 'bg-white/20 text-white' 
                    : 'text-white/90 hover:bg-white/10'
                }`}
              >
                🎲 Spieleliste
              </Link>
              <Link
                to="/print"
                onClick={closeMobileMenu}
                className={`px-4 py-3 rounded-lg text-base font-medium transition-colors min-h-[44px] flex items-center ${
                  isActive('/print') 
                    ? 'bg-white/20 text-white' 
                    : 'text-white/90 hover:bg-white/10'
                }`}
              >
                🖨️ Druckansicht
              </Link>
            </nav>

            {/* Mobile User Info */}
            {userName && (
              <div className="flex items-center justify-between px-4 py-3 bg-white/10 rounded-lg">
                <div className="flex flex-col">
                  <span className="text-white/70 text-xs">Angemeldet als</span>
                  <span className="font-medium text-base">{userName}</span>
                </div>
                {onNameChange && (
                  <button
                    onClick={() => {
                      closeMobileMenu();
                      onNameChange();
                    }}
                    className="text-sm bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg transition-colors min-h-[44px]"
                    aria-label="Name ändern"
                  >
                    Ändern
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;

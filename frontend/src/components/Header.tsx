/**
 * Header — Würfelglück design system.
 * - Header chrome: plum-deep.
 * - Body + headlines: Lora (single-family system, font-display = font-sans).
 * - Active nav underline: butter (warm accent on plum chrome).
 *
 * Updated for Spec 016: account management link (Verwaltung → /events).
 */

import { Link, useLocation } from 'react-router-dom';
import { ParticipantNameEditor } from './ParticipantNameEditor';
import { useAuth } from '../contexts/AuthContext';
import type { Participant } from '../types';

interface HeaderProps {
  basePath?: string;
  eventName?: string;
  startsAt?: string | null;
  location?: string | null;
  participant?: Participant;
  onParticipantUpdated?: (participant: Participant) => void;
  onParticipantSwitch?: () => void;
}

const getEventName = (): string =>
  import.meta.env.VITE_EVENT_NAME || 'Brettspieltreff';

function formatHeaderDate(startsAt: string): string {
  return new Date(startsAt).toLocaleDateString('de-DE', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  });
}

function formatHeaderTime(startsAt: string): string {
  return new Date(startsAt).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

const DESKTOP_TABS = [
  { path: '/', label: 'Spieleliste' },
  { path: '/print', label: 'Druckansicht' },
  { path: '/statistics', label: 'Statistiken' },
];

export function Header({
  basePath = '',
  eventName: eventNameProp,
  startsAt,
  location: eventLocation,
  participant,
  onParticipantUpdated,
  onParticipantSwitch,
}: HeaderProps) {
  const eventName = eventNameProp || getEventName();
  const metaParts: string[] = [];
  if (startsAt) {
    metaParts.push(formatHeaderDate(startsAt));
    metaParts.push(formatHeaderTime(startsAt));
  }
  if (eventLocation) metaParts.push(eventLocation);
  const metaLine = metaParts.length > 0 ? metaParts.join(' • ') : null;
  const location = useLocation();
  const { isAuthenticated: isAccountAuthenticated, account } = useAuth();

  const resolvePath = (path: string) => basePath + path;
  const isActive = (path: string) => location.pathname === resolvePath(path);

  return (
    <header
      className="bg-plum-deep text-paper-hi shadow-raised fixed left-0 right-0 z-50"
      style={{ top: 'var(--admin-bar-h, 0px)' }}
    >
      <div className="container mx-auto px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          {/* Brand: meeple-stack mark + wordmark + event subline */}
          <Link
            to={resolvePath('/')}
            className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink hover:opacity-90 transition-opacity"
            aria-label={`${eventName} – Startseite`}
          >
            {/* Mark — favicon.svg already includes the butter chip */}
            <img
              src="/favicon.svg"
              alt=""
              aria-hidden="true"
              className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10"
            />
            {/* Event name + optional meta line (date • time • place) */}
            <div className="flex flex-col min-w-0 leading-tight">
              <span className="font-display text-paper-hi text-lg sm:text-xl truncate">
                {eventName}
              </span>
              {metaLine && (
                <span className="font-sans text-paper-hi/70 text-[10px] sm:text-xs truncate mt-0.5">
                  {metaLine}
                </span>
              )}
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-7" data-testid="desktop-nav">
            {DESKTOP_TABS.map((tab) => (
              <Link
                key={tab.path}
                to={resolvePath(tab.path)}
                className={`transition-colors text-sm font-bold tracking-wide ${
                  isActive(tab.path)
                    ? 'text-paper-hi border-b-2 border-butter pb-1'
                    : 'text-paper-hi/75 hover:text-paper-hi'
                }`}
                data-testid={`desktop-nav-${tab.path.replace('/', '') || 'home'}`}
              >
                {tab.label}
              </Link>
            ))}
          </nav>

          {/* Desktop participant info */}
          <div className="hidden md:flex items-center gap-3">
            {isAccountAuthenticated && account ? (
              <Link
                to="/events"
                className="text-paper-hi/80 hover:text-paper-hi text-sm font-bold px-3 py-1 rounded hover:bg-paper-hi/10 transition-colors"
              >
                Verwaltung
              </Link>
            ) : null}

            {participant && onParticipantUpdated && (
              <>
                <span className="text-paper-hi/40">|</span>
                <span className="text-paper-hi/85 text-sm">Teilnehmer:</span>
                <div className="bg-paper-hi/10 px-3 py-1 rounded">
                  <ParticipantNameEditor
                    participant={participant}
                    onParticipantUpdated={onParticipantUpdated}
                  />
                </div>
                {onParticipantSwitch && (
                  <button
                    onClick={onParticipantSwitch}
                    className="text-paper-hi/80 hover:text-paper-hi text-sm font-bold px-3 py-1 rounded hover:bg-paper-hi/10 transition-colors"
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

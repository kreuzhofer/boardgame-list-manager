import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useEvent } from '../contexts/EventContext';

const BMC_URL = 'https://www.buymeacoffee.com/kreuzhofer';

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="text-plum flex-shrink-0">
      <rect x="1.5" y="2.5" width="11" height="10" rx="1.5" />
      <path d="M1.5 5.5h11" />
      <path d="M4.5 1v2" />
      <path d="M9.5 1v2" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="text-plum flex-shrink-0">
      <path d="M7 13S2.5 8.5 2.5 5.5a4.5 4.5 0 1 1 9 0C11.5 8.5 7 13 7 13z" />
      <circle cx="7" cy="5.5" r="1.5" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="text-plum flex-shrink-0">
      <circle cx="7" cy="7" r="5.5" />
      <path d="M7 4v3l2 1.5" />
    </svg>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function EventWelcomePage() {
  const { eventName, description, welcomeMessage, startsAt, location } = useEvent();

  useEffect(() => {
    if (eventName) {
      document.title = `${eventName} — Brettspieltreff`;
    }
  }, [eventName]);

  return (
    <div className="min-h-screen bg-paper pt-[var(--admin-bar-h,0px)]">
      {/* Plum-deep header strip */}
      <header className="bg-plum-deep text-paper-hi shadow-raised">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 sm:gap-3 hover:opacity-90 transition-opacity">
            <img src="/favicon.svg" alt="" aria-hidden="true" className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0" />
            <span className="font-display text-lg sm:text-xl">Brettspieltreff</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-3xl">
        {/* Eyebrow */}
        <div className="wg-label text-butter-deep">In Planung</div>

        {/* Title */}
        <h1 className="font-display text-4xl sm:text-5xl text-plum-deep mt-2 leading-tight">
          {eventName}
        </h1>

        {/* Meta line */}
        {(startsAt || location) && (
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-ink-soft">
            {startsAt && (
              <span className="inline-flex items-center gap-2">
                <CalendarIcon />
                <span>{formatDate(startsAt)}</span>
              </span>
            )}
            {startsAt && (
              <span className="inline-flex items-center gap-2">
                <ClockIcon />
                <span>{formatTime(startsAt)} Uhr</span>
              </span>
            )}
            {location && (
              <span className="inline-flex items-center gap-2">
                <PinIcon />
                <span>{location}</span>
              </span>
            )}
          </div>
        )}

        {/* Welcome message — italic display, like a personal note */}
        {welcomeMessage && (
          <div className="mt-10 wg-card border-l-[3px] border-l-butter">
            <p className="font-display text-xl text-plum-deep leading-snug whitespace-pre-line">
              {welcomeMessage}
            </p>
          </div>
        )}

        {/* Description body */}
        {description && (
          <section className="mt-8">
            <p className="text-ink-soft text-base leading-relaxed whitespace-pre-line">
              {description}
            </p>
          </section>
        )}

        {/* Status notice */}
        <div className="mt-12 wg-card-raised">
          <div className="wg-label text-plum">Hinweis</div>
          <h3 className="font-display text-xl text-plum-deep mt-2">
            Der Treff wird vorbereitet
          </h3>
          <p className="mt-2 text-sm text-ink-soft leading-relaxed">
            Sobald der Treff freigeschaltet ist, kannst du dich hier mit dem Kennwort
            anmelden, Spiele eintragen und sehen, wer was mitbringt.
          </p>
        </div>

        {/* Footer */}
        <footer className="mt-16 pt-6 border-t border-rule text-sm text-ink-mute flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <span>
            Brettspieltreff —{' '}
            <a
              href={BMC_URL}
              target="_blank"
              rel="noreferrer"
              className="text-plum hover:underline font-medium"
            >
              Spende eine Kaffeekasse
            </a>
          </span>
          <nav className="flex items-center gap-4">
            <Link to="/impressum" className="hover:text-ink-soft transition-colors">
              Impressum
            </Link>
            <Link to="/datenschutz" className="hover:text-ink-soft transition-colors">
              Datenschutz
            </Link>
          </nav>
        </footer>
      </main>
    </div>
  );
}

export default EventWelcomePage;

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { eventsApi, donationsApi, ApiError, type DonationStats } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import type { Event, EventStatus } from '../types/event';
import { EVENT_STATUS_LABEL } from '../types/event';

const BMC_URL = 'https://www.buymeacoffee.com/kreuzhofer';

function formatGermanDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatGermanTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatShortMonthYear(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', {
    month: 'long',
    year: 'numeric',
  });
}

// Status comes from the backend (planning | active | archived).
// Keep helpers small and centred on `event.status`.

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="text-plum flex-shrink-0">
      <rect x="1.5" y="2.5" width="11" height="10" rx="1.5" />
      <path d="M1.5 5.5h11" />
      <path d="M4.5 1v2" />
      <path d="M9.5 1v2" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="text-plum flex-shrink-0">
      <path d="M7 13S2.5 8.5 2.5 5.5a4.5 4.5 0 1 1 9 0C11.5 8.5 7 13 7 13z" />
      <circle cx="7" cy="5.5" r="1.5" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 2 8 6 4 10" />
    </svg>
  );
}

function StatusEyebrow({ status }: { status: EventStatus }) {
  const cls: Record<EventStatus, string> = {
    active:   'text-sage-deep',
    planning: 'text-ink-mute',
    archived: 'text-ink-mute',
  };
  return <span className={`wg-label ${cls[status]}`}>{EVENT_STATUS_LABEL[status]}</span>;
}

function ActiveEventCard({ event }: { event: Event }) {
  const isActive = event.status === 'active';
  const dottedDivider = (
    <div
      className="my-4 h-px"
      style={{
        backgroundImage: 'radial-gradient(circle, #e3d5b8 1px, transparent 1px)',
        backgroundSize: '6px 1px',
        backgroundRepeat: 'repeat-x',
      }}
    />
  );

  return (
    <div
      className={`bg-paper-hi border border-rule rounded-xl p-6 shadow-raised flex flex-col ${
        isActive ? 'border-t-[3px] border-t-sage' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <StatusEyebrow status={event.status} />
        {event.isDefault && (
          <span className="wg-tag-plum">Standard</span>
        )}
      </div>

      <h3 className="font-display italic text-2xl text-plum-deep mt-3 leading-tight">
        {event.name}
      </h3>

      <div className="mt-3 space-y-1 text-sm text-ink-soft">
        {event.startsAt && (
          <div className="inline-flex items-center gap-1.5">
            <CalendarIcon />
            <span>
              {formatGermanDate(event.startsAt)} · {formatGermanTime(event.startsAt)}
            </span>
          </div>
        )}
        {event.location && (
          <div className="inline-flex items-center gap-1.5">
            <PinIcon />
            <span>{event.location}</span>
          </div>
        )}
      </div>

      {dottedDivider}

      <div className="flex items-end justify-between mt-auto">
        <div className="flex gap-6">
          <div>
            <div className="font-display italic font-semibold text-2xl text-plum-deep leading-none">
              {event.gameCount}
            </div>
            <div className="wg-label mt-1">Spiele</div>
          </div>
          <div>
            <div className="font-display italic font-semibold text-2xl text-plum-deep leading-none">
              {event.participantCount}
            </div>
            <div className="wg-label mt-1">Teilnehmer</div>
          </div>
        </div>
        <Link
          to={`/events/${event.id}`}
          className={`${isActive ? 'wg-btn-primary' : 'wg-btn-secondary'} wg-btn-sm`}
        >
          Öffnen
          <ChevronRight />
        </Link>
      </div>
    </div>
  );
}

function ArchiveListItem({ event }: { event: Event }) {
  const dateLabel = event.endsAt
    ? formatShortMonthYear(event.endsAt)
    : event.startsAt
      ? formatShortMonthYear(event.startsAt)
      : '';
  return (
    <div className="flex items-center gap-4 py-3 border-t border-rule-soft first:border-t-0">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-ink truncate">{event.name}</div>
        <div className="text-xs text-ink-mute mt-0.5">
          Beendet · {event.gameCount} Spiele · {event.participantCount} Teilnehmer
          {dateLabel && ` · ${dateLabel}`}
        </div>
      </div>
      <Link
        to={`/${event.slug}/statistics`}
        className="wg-btn-soft wg-btn-sm"
      >
        Statistik
      </Link>
      <Link
        to={`/events/${event.id}`}
        className="wg-btn-ghost wg-btn-sm"
        title="Als Vorlage für neuen Treff verwenden"
      >
        Duplizieren
      </Link>
    </div>
  );
}

function ArchiveCard({ events }: { events: Event[] }) {
  return (
    <div className="bg-paper-hi border border-rule rounded-xl p-6 shadow-raised">
      <div className="wg-label">Letzte Treffs</div>
      <h3 className="text-2xl font-bold text-ink mt-1.5">Archiv</h3>
      {events.length === 0 ? (
        <p className="text-sm text-ink-mute mt-4">Noch keine beendeten Treffs.</p>
      ) : (
        <div className="mt-4">
          {events.map((event) => (
            <ArchiveListItem key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}

function formatDonationTotal(total: number, currency: string): string {
  const numberPart = total.toLocaleString('de-DE', {
    minimumFractionDigits: total % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  if (currency === 'EUR') return `${numberPart} €`;
  if (currency === 'USD') return `${numberPart} $`;
  return `${numberPart} ${currency}`;
}

function OrganizerDonateCard({ stats }: { stats: DonationStats | null }) {
  return (
    <div
      className="bg-paper-hi border border-rule border-t-[3px] border-t-butter rounded-xl p-6 shadow-raised"
      style={{
        backgroundImage:
          'linear-gradient(180deg, rgba(232,199,92,.14), rgba(232,199,92,0))',
      }}
    >
      <div className="wg-label text-butter-deep">Brettspieltreff bleibt kostenlos</div>
      <h3 className="font-display italic text-xl text-plum-deep mt-2.5 leading-tight">
        Kaffeekasse fürs Hosting
      </h3>
      {stats && stats.count > 0 ? (
        <p className="text-sm text-ink-soft mt-2 leading-relaxed">
          Letzten Monat:{' '}
          <strong className="text-sage-deep">
            {stats.count} {stats.count === 1 ? 'Spende' : 'Spenden'},{' '}
            {formatDonationTotal(stats.total, stats.currency)}
          </strong>
          . Danke!
        </p>
      ) : (
        <p className="text-sm text-ink-soft mt-2 leading-relaxed">
          Server, Domain und ein wenig Kaffee — kleine Spenden halten die App am Laufen.
        </p>
      )}
      <a
        href={BMC_URL}
        target="_blank"
        rel="noreferrer"
        className="wg-btn-donate w-full mt-4"
      >
        Selbst spenden
      </a>
    </div>
  );
}

export function EventsPage() {
  const { account } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [donationStats, setDonationStats] = useState<DonationStats | null>(null);

  useEffect(() => {
    if (!account) return;

    const loadEvents = async () => {
      try {
        setLoading(true);
        const response = await eventsApi.getAll();
        setEvents(response.events);
        setError(null);
      } catch (err) {
        const apiError = err as ApiError;
        setError(apiError.message || 'Konnte Events nicht laden.');
      } finally {
        setLoading(false);
      }
    };

    // Donation stats are best-effort: silent fail keeps the dashboard
    // unchanged if the endpoint or DB query fails.
    const loadStats = async () => {
      try {
        const stats = await donationsApi.getStats(30);
        setDonationStats(stats);
      } catch {
        setDonationStats(null);
      }
    };

    loadEvents();
    loadStats();
  }, [account]);

  const { activeEvents, archivedEvents } = useMemo(() => {
    const active: Event[] = [];
    const archived: Event[] = [];
    for (const e of events) {
      if (e.status === 'archived') archived.push(e);
      else active.push(e);
    }
    // Sort active: 'active' first, then 'planning'; both by startsAt asc.
    active.sort((a, b) => {
      if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
      const aStart = a.startsAt ? new Date(a.startsAt).getTime() : Number.MAX_SAFE_INTEGER;
      const bStart = b.startsAt ? new Date(b.startsAt).getTime() : Number.MAX_SAFE_INTEGER;
      return aStart - bStart;
    });
    // Sort archived: most recently ended first (fallback to updatedAt).
    archived.sort((a, b) => {
      const aTime = a.endsAt ? new Date(a.endsAt).getTime() : new Date(a.updatedAt).getTime();
      const bTime = b.endsAt ? new Date(b.endsAt).getTime() : new Date(b.updatedAt).getTime();
      return bTime - aTime;
    });
    return { activeEvents: active, archivedEvents: archived };
  }, [events]);

  if (!account) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <h2 className="font-display italic text-3xl text-plum-deep">Meine Events</h2>
        <p className="text-sm text-ink-soft">Bitte melde dich an.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="wg-label text-plum">Deine Treffs</div>
        <h2 className="font-display italic text-3xl sm:text-4xl text-plum-deep">
          Lade Treffs…
        </h2>
      </div>
    );
  }

  const activeCount = activeEvents.filter((e) => e.status === 'active').length;
  const titleCount = activeCount > 0 ? activeCount : activeEvents.length;
  const noun = titleCount === 1 ? 'Spieletreff' : 'Spieletreffs';
  const adjective = activeCount > 0 ? (titleCount === 1 ? 'aktiver ' : 'aktive ') : '';
  const titleLine =
    titleCount === 0
      ? 'Noch keine Treffs'
      : `${titleCount} ${adjective}${noun}`;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Title row */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="wg-label text-plum">Deine Treffs</div>
          <h2 className="font-display italic text-3xl sm:text-4xl text-plum-deep mt-1.5">
            {titleLine}
          </h2>
          <p className="text-sm text-ink-soft mt-2">
            Verwalte Treffs, Kennwörter und Teilnehmer.
          </p>
        </div>
        <Link to="/events/new" className="wg-btn-primary self-start sm:self-end">
          + Neuer Treff
        </Link>
      </div>

      {error && (
        <div className="bg-blush-50 border border-blush-50 text-blush-deep text-sm rounded p-3">
          {error}
        </div>
      )}

      {/* Active events grid */}
      {activeEvents.length === 0 ? (
        <div className="bg-paper-hi border border-rule rounded-xl shadow-raised p-8 text-center">
          <p className="text-ink-soft">Du hast noch keine Treffs erstellt.</p>
          <Link
            to="/events/new"
            className="text-plum hover:underline mt-2 inline-block font-medium"
          >
            Erstelle deinen ersten Treff
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {activeEvents.map((event) => (
            <ActiveEventCard key={event.id} event={event} />
          ))}
        </div>
      )}

      {/* Archive + Donate row */}
      {(archivedEvents.length > 0 || activeEvents.length > 0) && (
        <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
          <ArchiveCard events={archivedEvents} />
          <OrganizerDonateCard stats={donationStats} />
        </div>
      )}
    </div>
  );
}

export default EventsPage;

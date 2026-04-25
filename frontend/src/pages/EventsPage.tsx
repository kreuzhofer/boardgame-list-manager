import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { eventsApi, ApiError } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import type { Event } from '../types/event';

export function EventsPage() {
  const { account } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

    loadEvents();
  }, [account]);

  if (!account) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <h2 className="text-2xl font-bold text-ink">Meine Events</h2>
        <p className="text-sm text-ink-soft">Bitte melde dich an.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <h2 className="text-2xl font-bold text-ink">Meine Events</h2>
        <p className="text-sm text-ink-mute">Lade Events...</p>
      </div>
    );
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '–';
    return new Date(dateStr).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-ink">Meine Events</h2>
        <Link
          to="/events/new"
          className="bg-plum text-white px-4 py-2 rounded-lg hover:bg-plum-deep transition-colors text-sm font-medium"
        >
          + Neues Event
        </Link>
      </div>

      {error && (
        <div className="bg-blush-50 border border-blush-50 text-blush-deep text-sm rounded p-3">
          {error}
        </div>
      )}

      {events.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-ink-mute">
          <p>Du hast noch keine Events erstellt.</p>
          <Link
            to="/events/new"
            className="text-plum hover:underline mt-2 inline-block"
          >
            Erstelle dein erstes Event
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-paper-lo text-ink-soft">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Slug</th>
                <th className="text-right px-4 py-3 font-medium">Teilnehmer</th>
                <th className="text-right px-4 py-3 font-medium">Spiele</th>
                <th className="text-left px-4 py-3 font-medium">Zeitraum</th>
                <th className="text-left px-4 py-3 font-medium">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} className="border-t border-rule-soft">
                  <td className="px-4 py-3">
                    <Link
                      to={`/events/${event.id}`}
                      className="text-plum hover:underline font-medium"
                    >
                      {event.name}
                    </Link>
                    {event.isDefault && (
                      <span className="ml-2 text-xs bg-paper-lo text-ink-mute px-2 py-0.5 rounded">
                        Standard
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-soft font-mono text-xs">
                    {event.slug}
                  </td>
                  <td className="px-4 py-3 text-right text-ink-soft">
                    {event.participantCount}
                  </td>
                  <td className="px-4 py-3 text-right text-ink-soft">
                    {event.gameCount}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {formatDate(event.startsAt)}
                    {event.endsAt && ` – ${formatDate(event.endsAt)}`}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={`/${event.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs px-2 py-1 rounded bg-plum-50 text-plum-deep hover:bg-plum-100"
                      >
                        Öffnen
                      </a>
                      <a
                        href={`/${event.slug}/statistics`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs px-2 py-1 rounded bg-sage-50 text-sage-deep hover:bg-sage-100"
                      >
                        Statistiken
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default EventsPage;

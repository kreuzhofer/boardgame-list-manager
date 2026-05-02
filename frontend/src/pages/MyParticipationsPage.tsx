import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { accountsApi, ApiError } from '../api/client';
import type { Participation } from '../types/account';
import { EVENT_STATUS_LABEL } from '../types/event';

function formatGermanDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

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

export function MyParticipationsPage() {
  const [participations, setParticipations] = useState<Participation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Meine Treffs — Brettspieltreff';
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await accountsApi.getMyParticipations();
        if (!cancelled) setParticipations(res.participations);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : 'Treffs konnten nicht geladen werden. Bitte später erneut versuchen.',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="wg-label text-plum">Teilnahmen</div>
      <h1 className="font-display italic text-3xl sm:text-4xl text-plum-deep mt-2">
        Meine Treffs
      </h1>
      <p className="mt-3 text-ink-soft text-sm">
        Alle Treffs, bei denen du als Teilnehmer:in dabei bist. Sobald du
        ein Kennwort an einem Treff einlöst, taucht er hier auf.
      </p>

      {loading && (
        <p className="mt-8 text-ink-mute text-sm">Lade …</p>
      )}

      {error && (
        <div className="mt-8 p-3 bg-blush-50 border border-blush text-blush-deep rounded-lg text-sm">
          {error}
        </div>
      )}

      {!loading && !error && participations.length === 0 && (
        <div className="mt-8 wg-card-raised">
          <p className="text-ink-soft">
            Du bist bei keinem Treff angemeldet. Sobald du an einem Treff
            teilnimmst, sehen wir uns hier wieder.
          </p>
        </div>
      )}

      {!loading && !error && participations.length > 0 && (
        <ul className="mt-8 space-y-4">
          {participations.map((p) => {
            const ev = p.event;
            if (!ev) return null;
            const link = ev.slug ? `/${ev.slug}` : null;
            const Inner = (
              <div className="wg-card-raised">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="wg-label text-plum">
                      {EVENT_STATUS_LABEL[ev.status]}
                    </div>
                    <h2 className="font-display italic text-2xl text-plum-deep mt-1 truncate">
                      {ev.name}
                    </h2>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft">
                      {ev.startsAt && (
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarIcon />
                          <span>{formatGermanDate(ev.startsAt)}</span>
                        </span>
                      )}
                      {ev.location && (
                        <span className="inline-flex items-center gap-1.5">
                          <PinIcon />
                          <span className="truncate">{ev.location}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
            return (
              <li key={p.id}>
                {link ? <Link to={link}>{Inner}</Link> : Inner}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default MyParticipationsPage;

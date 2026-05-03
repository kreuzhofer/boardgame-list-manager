import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { accountsApi, ApiError } from '../api/client';
import type { Participation, ClaimCandidate } from '../types/account';
import { EVENT_STATUS_LABEL } from '../types/event';
import { LegacyClaimModal } from '../components/LegacyClaimModal';

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
  const [candidates, setCandidates] = useState<ClaimCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claimingFor, setClaimingFor] = useState<ClaimCandidate | null>(null);

  useEffect(() => {
    document.title = 'Meine Treffs — Brettspieltreff';
  }, []);

  const reload = useCallback(async () => {
    try {
      const [participationsRes, candidatesRes] = await Promise.all([
        accountsApi.getMyParticipations(),
        accountsApi.getClaimCandidates(),
      ]);
      setParticipations(participationsRes.participations);
      setCandidates(candidatesRes.candidates);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Treffs konnten nicht geladen werden. Bitte später erneut versuchen.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

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

      {!loading && !error && candidates.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display italic text-2xl text-plum-deep">
            Vergangene Treffs zum Anspruch
          </h2>
          <p className="mt-2 text-sm text-ink-soft">
            Diese Treffs haben Identitäten ohne Konto. Wenn du an einem von
            ihnen teilgenommen hast, kannst du deine damalige Spieleliste
            an dein Konto übernehmen.
          </p>
          <ul className="mt-4 space-y-4">
            {candidates.map((c) => (
              <li key={c.id}>
                <div className="wg-card-raised flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="wg-label text-plum">
                      {EVENT_STATUS_LABEL[c.status]}
                    </div>
                    <h3 className="font-display italic text-xl text-plum-deep mt-1 truncate">
                      {c.name}
                    </h3>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft">
                      {c.startsAt && (
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarIcon />
                          <span>{formatGermanDate(c.startsAt)}</span>
                        </span>
                      )}
                      {c.location && (
                        <span className="inline-flex items-center gap-1.5">
                          <PinIcon />
                          <span className="truncate">{c.location}</span>
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-ink-mute">
                      {c.unclaimedCount} unbeanspruchte{' '}
                      {c.unclaimedCount === 1 ? 'Identität' : 'Identitäten'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setClaimingFor(c)}
                    className="wg-btn-secondary flex-shrink-0"
                  >
                    Hast du teilgenommen?
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!loading && !error && participations.length > 0 && (
        <ul className="mt-10 space-y-4">
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

      {claimingFor && (
        <LegacyClaimModal
          candidate={claimingFor}
          isOpen={!!claimingFor}
          onClose={() => setClaimingFor(null)}
          onClaimed={() => {
            setClaimingFor(null);
            // Refresh the list — claimed event moves from candidates
            // into participations.
            reload();
          }}
        />
      )}
    </div>
  );
}

export default MyParticipationsPage;

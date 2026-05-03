import { StatChip } from './StatChip';

export interface EventBarProps {
  eventName: string;
  startsAt?: string | null;
  location?: string | null;
  gamesCount: number;
  bringersCount: number;
  wishesCount: number;
  participantsCount: number;
}

function formatDate(startsAt: string): string {
  return new Date(startsAt).toLocaleDateString('de-DE', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(startsAt: string): string {
  return new Date(startsAt).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  }) + ' Uhr';
}

export function EventBar({
  eventName,
  startsAt,
  location,
  gamesCount,
  bringersCount,
  wishesCount,
  participantsCount,
}: EventBarProps) {
  return (
    <section className="bg-paper-lo border-b-[1.5px] border-rule py-6 px-4 sm:px-6 lg:px-14">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between">
        {/* Left: eyebrow + title + meta */}
        <div>
          <span className="wg-label text-plum">
            Aktueller Treff
          </span>
          <h2 className="font-display text-3xl lg:text-[42px] text-plum-deep mt-1.5">
            {eventName}
          </h2>
          {(startsAt || location) && (
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-ink-soft text-sm">
              {startsAt && (
                <>
                  <span className="inline-flex items-center gap-1.5">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-plum flex-shrink-0"
                    >
                      <rect x="1.5" y="2.5" width="11" height="10" rx="1.5" />
                      <path d="M1.5 5.5h11" />
                      <path d="M4.5 1v2" />
                      <path d="M9.5 1v2" />
                    </svg>
                    {formatDate(startsAt)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-plum flex-shrink-0"
                    >
                      <circle cx="7" cy="7" r="5.5" />
                      <path d="M7 4v3l2 1.5" />
                    </svg>
                    {formatTime(startsAt)}
                  </span>
                </>
              )}
              {location && (
                <span className="inline-flex items-center gap-1.5">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-plum flex-shrink-0"
                  >
                    <path d="M7 13S2.5 8.5 2.5 5.5a4.5 4.5 0 1 1 9 0C11.5 8.5 7 13 7 13z" />
                    <circle cx="7" cy="5.5" r="1.5" />
                  </svg>
                  {location}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right: stat chips — desktop row */}
        <div className="hidden md:flex gap-3">
          <StatChip n={gamesCount} label="Spiele" tone="plum" />
          <StatChip n={bringersCount} label="Bringer" tone="sage" />
          <StatChip n={wishesCount} label="Wünsche" tone="butter" />
          <StatChip n={participantsCount} label="Teilnehmer" tone="ocean" />
        </div>
      </div>

      {/* Mobile: stat chips as 2x2 grid */}
      <div className="grid grid-cols-2 gap-2 mt-4 md:hidden">
        <StatChip n={gamesCount} label="Spiele" tone="plum" />
        <StatChip n={bringersCount} label="Bringer" tone="sage" />
        <StatChip n={wishesCount} label="Wünsche" tone="butter" />
        <StatChip n={participantsCount} label="Teilnehmer" tone="ocean" />
      </div>
    </section>
  );
}

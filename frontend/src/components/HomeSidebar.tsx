import type { Game, Participant } from '../types';
import { PersonChip } from './PersonChip';

interface HomeSidebarProps {
  games: Game[];
  participants: Participant[];
}

// ── Eyebrow helper ────────────────────────────────────────────────────
function Eyebrow({ text }: { text: string }) {
  return (
    <div className="wg-label">
      {text}
    </div>
  );
}

// ── Card 1: DonateCard ────────────────────────────────────────────────
function DonateCard() {
  const href = 'https://www.buymeacoffee.com/kreuzhofer';

  return (
    <div className="wg-card wg-card-accent-butter bg-gradient-to-b from-butter-50 to-transparent rounded-2xl">
      <div className="flex items-center gap-2.5">
        <span className="w-8 h-8 rounded-full bg-butter flex items-center justify-center">
          <svg
            className="w-4 h-4 text-plum-deep"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </span>
        <Eyebrow text="Brettspieltreff ist kostenlos" />
      </div>

      <h3 className="font-display italic text-xl text-plum-deep mt-3">
        Hilf mit, das Licht anzulassen.
      </h3>

      <p className="text-sm text-ink-soft mt-2 leading-relaxed">
        Server, Domain und ein wenig Kaffee — kleine Spenden halten die App am
        Laufen.
      </p>

      <div className="mt-3.5 flex gap-2">
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="bg-butter text-plum-deep font-bold text-sm px-4 py-2 rounded-lg hover:bg-butter-hi"
        >
          3 &euro;
        </a>
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="bg-butter text-plum-deep font-bold text-sm px-4 py-2 rounded-lg hover:bg-butter-hi"
        >
          5 &euro;
        </a>
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="bg-butter text-plum-deep font-bold text-sm px-4 py-2 rounded-lg hover:bg-butter-hi"
        >
          10 &euro;
        </a>
      </div>
    </div>
  );
}

// ── Card 2: BringerSummaryCard ────────────────────────────────────────
function BringerSummaryCard({ games }: { games: Game[] }) {
  const bringedGamesCount = games.filter((g) => g.bringers.length > 0).length;
  const wishesCount = games.filter((g) => g.bringers.length === 0).length;

  // Count games per unique bringer, take top 4
  const bringerCounts = new Map<string, { name: string; count: number }>();
  for (const game of games) {
    for (const b of game.bringers) {
      const existing = bringerCounts.get(b.participant.id);
      if (existing) {
        existing.count++;
      } else {
        bringerCounts.set(b.participant.id, {
          name: b.participant.name,
          count: 1,
        });
      }
    }
  }
  const topBringers = [...bringerCounts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  return (
    <div className="wg-card rounded-2xl">
      <Eyebrow text="Wer bringt was" />

      <h3 className="font-display italic text-xl text-ink mt-1.5">
        {bringedGamesCount} Spiele zugesagt
      </h3>

      <p className="text-sm text-ink-soft mt-1">
        {wishesCount === 0
          ? 'Alle Spiele sind versorgt.'
          : `${wishesCount} Spiele suchen noch einen Bringer.`}
      </p>

      {topBringers.length > 0 && (
        <div className="mt-3.5 grid gap-2">
          {topBringers.map((bringer) => (
            <div
              key={bringer.name}
              className="flex items-center gap-2.5"
            >
              <span className="w-6 h-6 rounded-full bg-plum-50 text-plum text-[10px] font-bold flex items-center justify-center">
                {bringer.name.charAt(0).toUpperCase()}
              </span>
              <span className="text-sm font-bold text-ink flex-1">
                {bringer.name}
              </span>
              <span className="wg-tag-sage">
                {bringer.count} Spiele
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Card 3: ParticipantsCard ──────────────────────────────────────────
function ParticipantsCard({ participants }: { participants: Participant[] }) {
  const visible = participants.slice(0, 10);
  const remaining = participants.length - visible.length;

  return (
    <div className="wg-card rounded-2xl">
      <div className="flex justify-between items-center">
        <Eyebrow text="Teilnehmer" />
        <span className="text-ink-mute text-xs">{participants.length}</span>
      </div>

      {participants.length === 0 ? (
        <p className="text-ink-mute italic mt-3">Noch niemand dabei</p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {visible.map((p) => (
            <PersonChip key={p.id} name={p.name} />
          ))}
          {remaining > 0 && (
            <span className="inline-flex items-center px-3 h-7 rounded-full border border-dashed border-rule text-ink-mute font-sans text-[11px] font-bold">
              + {remaining} weitere
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Sidebar composite ─────────────────────────────────────────────────
export function HomeSidebar({ games, participants }: HomeSidebarProps) {
  return (
    <>
      <DonateCard />
      <BringerSummaryCard games={games} />
      <ParticipantsCard participants={participants} />
    </>
  );
}

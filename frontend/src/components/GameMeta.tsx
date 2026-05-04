/**
 * Compact metadata line shown beneath a game's title:
 *
 *     2014 • 1-4 • 90-150 min  [⬢ 8.1]
 *
 * Year, player range, and play time are plain text segments joined
 * by a fat bullet. The BGG rating stays as a pill so its clickable
 * affordance reads against the surrounding text.
 *
 * Each segment is independently optional. When all are missing the
 * component renders nothing.
 */
import type { Game } from '../types';
import { getRatingColor } from './BggRatingBadge';
import { openBggPage } from './BggModal';

interface GameMetaProps {
  game: Pick<
    Game,
    | 'minPlayers'
    | 'maxPlayers'
    | 'minPlaytime'
    | 'maxPlaytime'
    | 'bggRating'
    | 'bggId'
    | 'yearPublished'
  >;
  className?: string;
}

function formatRange(min: number | null, max: number | null): string | null {
  if (min === null && max === null) return null;
  if (min !== null && max !== null) {
    return min === max ? `${min}` : `${min}-${max}`;
  }
  return String(min ?? max);
}

function RatingHex({ rating }: { rating: number }) {
  return (
    <svg viewBox="0 0 24 28" width="9" height="10" aria-hidden="true" className="inline-block">
      <polygon points="12,0 24,7 24,21 12,28 0,21 0,7" fill={getRatingColor(rating)} />
    </svg>
  );
}

export function GameMeta({ game, className = '' }: GameMetaProps) {
  const year = typeof game.yearPublished === 'number' && game.yearPublished > 0 ? game.yearPublished : null;
  const players = formatRange(game.minPlayers, game.maxPlayers);
  const time = formatRange(game.minPlaytime, game.maxPlaytime);
  const rating =
    typeof game.bggRating === 'number' && game.bggRating > 0 ? game.bggRating : null;

  const textParts: string[] = [];
  if (year !== null) textParts.push(String(year));
  if (players) textParts.push(players);
  if (time) textParts.push(`${time} min`);

  if (textParts.length === 0 && rating === null) return null;

  return (
    <span className={`inline-flex items-center gap-2 flex-wrap text-xs text-ink-soft ${className}`}>
      {textParts.length > 0 && <span>{textParts.join(' • ')}</span>}
      {rating !== null &&
        (game.bggId ? (
          <button
            type="button"
            onClick={() => openBggPage(game.bggId!)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-paper-hi border border-rule text-ink whitespace-nowrap leading-tight hover:bg-paper-lo focus:outline-none focus-visible:ring-2 focus-visible:ring-plum/40 transition-colors cursor-pointer"
            aria-label={`BoardGameGeek Bewertung ${rating.toFixed(1)} – Seite öffnen`}
            title="BoardGameGeek Seite öffnen (neuer Tab)"
          >
            <RatingHex rating={rating} />
            {rating.toFixed(1)}
          </button>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-paper-hi border border-rule text-ink whitespace-nowrap leading-tight">
            <RatingHex rating={rating} />
            {rating.toFixed(1)}
          </span>
        ))}
    </span>
  );
}

export default GameMeta;

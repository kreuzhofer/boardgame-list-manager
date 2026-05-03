/**
 * Compact metadata line shown beneath a game's title:
 *
 *     1 - 4 · 90 - 150 min · ★ 8.1
 *
 * Each segment is independently optional — fields not enriched yet
 * (or simply absent on BGG) just disappear from the line. When all
 * three are missing the component renders nothing.
 *
 * Player range collapses to a single number when min === max
 * ("Solo", just `2`, etc.). Time range collapses similarly.
 * Rating shows one decimal place with a leading star.
 */
import type { Game } from '../types';

interface GameMetaProps {
  game: Pick<Game, 'minPlayers' | 'maxPlayers' | 'minPlaytime' | 'maxPlaytime' | 'bggRating'>;
  className?: string;
}

function formatRange(min: number | null, max: number | null): string | null {
  if (min === null && max === null) return null;
  if (min !== null && max !== null) {
    return min === max ? `${min}` : `${min} - ${max}`;
  }
  return String(min ?? max);
}

export function GameMeta({ game, className = '' }: GameMetaProps) {
  const players = formatRange(game.minPlayers, game.maxPlayers);
  const time = formatRange(game.minPlaytime, game.maxPlaytime);
  const rating =
    typeof game.bggRating === 'number' && game.bggRating > 0
      ? game.bggRating.toFixed(1)
      : null;

  const segments: string[] = [];
  if (players) segments.push(players);
  if (time) segments.push(`${time} min`);
  if (rating) segments.push(`★ ${rating}`);

  if (segments.length === 0) return null;

  return (
    <span className={`text-xs text-ink-soft ${className}`}>
      {segments.join(' · ')}
    </span>
  );
}

export default GameMeta;

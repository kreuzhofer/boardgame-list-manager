/**
 * Statistics component
 * Displays event statistics dashboard with aggregate data
 * All UI text in German (Requirement 9.1)
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

import { useEffect, useState } from 'react';
import { statisticsApi } from '../api/client';
import type {
  StatisticsData,
  PopularGame,
  ReleaseYearCount,
  StatisticsTimelineData,
} from '../types';

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon?: React.ReactNode;
  highlight?: boolean;
}

/**
 * StatCard - Individual statistic display card
 */
function StatCard({ title, value, subtitle, icon, highlight }: StatCardProps) {
  return (
    <div
      className={`bg-white rounded-lg shadow p-4 ${
        highlight ? 'ring-2 ring-blue-500' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        {icon && (
          <div className="flex-shrink-0 text-blue-600">{icon}</div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}

interface PopularGamesListProps {
  games: PopularGame[];
}

/**
 * PopularGamesList - Displays ranked list of popular games
 * Requirement 8.4: Display the most popular games ranked by player interest count
 */
function PopularGamesList({ games }: PopularGamesListProps) {
  if (games.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-medium text-gray-500 mb-3">
          Beliebteste Spiele
        </h3>
        <p className="text-gray-400 text-sm">Noch keine Spiele vorhanden.</p>
      </div>
    );
  }

  // Show top 5 games
  const topGames = games.slice(0, 5);

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-sm font-medium text-gray-500 mb-3">
        Beliebteste Spiele
      </h3>
      <ul className="space-y-2">
        {topGames.map((game, index) => (
          <li
            key={game.id}
            className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
          >
            <div className="flex items-center gap-3">
              <span
                className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  index === 0
                    ? 'bg-yellow-100 text-yellow-700'
                    : index === 1
                    ? 'bg-gray-100 text-gray-600'
                    : index === 2
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-gray-50 text-gray-500'
                }`}
              >
                {index + 1}
              </span>
              <span className="text-sm font-medium text-gray-900 truncate">
                {game.name}
              </span>
            </div>
            <span className="text-sm text-gray-500 flex-shrink-0">
              {game.playerCount} {game.playerCount === 1 ? 'Spieler' : 'Spieler'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface ReleaseYearChartProps {
  data: ReleaseYearCount[];
}

function getHeatColor(value: number, min: number, max: number) {
  if (max === min) {
    return 'hsl(200, 80%, 55%)';
  }
  const ratio = (value - min) / (max - min);
  const hue = 220 - ratio * 200;
  return `hsl(${Math.round(hue)}, 80%, 55%)`;
}

function ReleaseYearChart({ data }: ReleaseYearChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-medium text-gray-500 mb-3">
          Spiele nach Veröffentlichungsjahr
        </h3>
        <p className="text-gray-400 text-sm">
          Keine Veröffentlichungsjahre vorhanden.
        </p>
      </div>
    );
  }

  const sortedData = [...data].sort((a, b) => b.year - a.year);
  const counts = sortedData.map((item) => item.count);
  const minCount = Math.min(...counts);
  const maxCount = Math.max(...counts);
  const maxBarHeight = 140;

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-gray-500">
          Spiele nach Veröffentlichungsjahr
        </h3>
        <div className="flex items-center gap-2 text-[10px] text-gray-400">
          <span>Kühl</span>
          <span
            className="w-16 h-2 rounded-full"
            style={{
              background:
                'linear-gradient(90deg, hsl(220, 80%, 55%), hsl(15, 80%, 55%))',
            }}
            aria-hidden="true"
          ></span>
          <span>Heiß</span>
        </div>
      </div>
      <div className="mt-4 overflow-x-auto">
        <div className="flex items-end gap-2 h-[180px] min-w-max pb-2">
          {sortedData.map((item) => {
            const heightRatio = maxCount === 0 ? 0 : item.count / maxCount;
            const barHeight = Math.max(6, Math.round(heightRatio * maxBarHeight));
            const barColor = getHeatColor(item.count, minCount, maxCount);

            return (
              <div key={item.year} className="flex flex-col items-center w-8">
                <div className="text-[10px] text-gray-500 mb-1">
                  {item.count}
                </div>
                <div
                  className="w-6 rounded-t shadow-sm"
                  style={{ height: `${barHeight}px`, backgroundColor: barColor }}
                  title={`${item.year}: ${item.count}`}
                  aria-label={`${item.year}: ${item.count} Spiele`}
                ></div>
                <div className="mt-1 text-[10px] text-gray-500">
                  {item.year}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface TimelineChartProps {
  data: StatisticsTimelineData;
}

function buildLinePath(
  values: number[],
  width: number,
  height: number,
  padding: number,
  maxValue: number
) {
  if (values.length === 0) {
    return '';
  }
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;

  return values
    .map((value, index) => {
      const x =
        values.length === 1
          ? padding + usableWidth / 2
          : padding + (index / (values.length - 1)) * usableWidth;
      const y = padding + usableHeight - (value / maxValue) * usableHeight;
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

function TimelineChart({ data }: TimelineChartProps) {
  const points = data.points;
  if (points.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-medium text-gray-500 mb-3">
          Tagesverlauf der Aktivität
        </h3>
        <p className="text-gray-400 text-sm">Noch keine Aktivität vorhanden.</p>
      </div>
    );
  }

  const gamesSeries = points.map((point) => point.gamesAdded);
  const playersSeries = points.map((point) => point.playersAdded);
  const newUsersSeries = points.map((point) => point.newUsers);
  const activeUsersSeries = points.map((point) => point.activeUsers);
  const maxValue = Math.max(
    ...gamesSeries,
    ...playersSeries,
    ...newUsersSeries,
    ...activeUsersSeries,
    1
  );

  const width = 640;
  const height = 200;
  const padding = 28;
  const gamePath = buildLinePath(gamesSeries, width, height, padding, maxValue);
  const playerPath = buildLinePath(playersSeries, width, height, padding, maxValue);
  const newUsersPath = buildLinePath(newUsersSeries, width, height, padding, maxValue);
  const activeUsersPath = buildLinePath(activeUsersSeries, width, height, padding, maxValue);
  const midIndex = Math.floor(points.length / 2);
  const tickLabels = Array.from(
    new Set([points[0]?.date, points[midIndex]?.date, points[points.length - 1]?.date])
  ).filter(Boolean) as string[];

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-sm font-medium text-gray-500">
          Tagesverlauf der Aktivität
        </h3>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-2">
            <span className="w-3 h-0.5 bg-red-500"></span>
            Spiele hinzugefügt
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-0.5 bg-blue-500"></span>
            Spieler hinzugefügt
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-0.5 bg-emerald-500"></span>
            Neue Nutzer
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-0.5 bg-amber-500"></span>
            Aktive Nutzer
          </span>
        </div>
      </div>
      <div className="mt-4">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-48"
          role="img"
          aria-label="Aktivitätsverlauf pro Tag"
        >
          <rect
            x={padding}
            y={padding}
            width={width - padding * 2}
            height={height - padding * 2}
            fill="transparent"
            stroke="#e5e7eb"
            strokeWidth={1}
          />
          {[0, 0.5, 1].map((ratio) => {
            const y = padding + (height - padding * 2) * ratio;
            const value = Math.round(maxValue * (1 - ratio));
            return (
              <g key={ratio}>
                <line
                  x1={padding}
                  x2={width - padding}
                  y1={y}
                  y2={y}
                  stroke="#f3f4f6"
                  strokeWidth={1}
                />
                <text
                  x={padding - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-gray-400 text-[10px]"
                >
                  {value}
                </text>
              </g>
            );
          })}
          <path
            d={gamePath}
            fill="none"
            stroke="#ef4444"
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
          <path
            d={playerPath}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
          <path
            d={newUsersPath}
            fill="none"
            stroke="#10b981"
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
          <path
            d={activeUsersPath}
            fill="none"
            stroke="#f59e0b"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeDasharray="6 4"
          />
        </svg>
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] text-gray-400">
        {tickLabels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </div>
  );
}

function TotalUsersChart({ data }: TimelineChartProps) {
  const points = data.points;
  if (points.length === 0) {
    return null;
  }

  const totalUsersSeries = points.map((point) => point.totalUsers);
  const maxValue = Math.max(...totalUsersSeries, 1);
  const width = 640;
  const height = 200;
  const padding = 28;
  const totalUsersPath = buildLinePath(totalUsersSeries, width, height, padding, maxValue);
  const midIndex = Math.floor(points.length / 2);
  const tickLabels = Array.from(
    new Set([points[0]?.date, points[midIndex]?.date, points[points.length - 1]?.date])
  ).filter(Boolean) as string[];

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-sm font-medium text-gray-500">Gesamte Nutzerzahl</h3>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="w-3 h-0.5 bg-purple-500"></span>
          Gesamt
        </div>
      </div>
      <div className="mt-4">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-48"
          role="img"
          aria-label="Gesamte Nutzerzahl pro Tag"
        >
          <rect
            x={padding}
            y={padding}
            width={width - padding * 2}
            height={height - padding * 2}
            fill="transparent"
            stroke="#e5e7eb"
            strokeWidth={1}
          />
          {[0, 0.5, 1].map((ratio) => {
            const y = padding + (height - padding * 2) * ratio;
            const value = Math.round(maxValue * (1 - ratio));
            return (
              <g key={ratio}>
                <line
                  x1={padding}
                  x2={width - padding}
                  y1={y}
                  y2={y}
                  stroke="#f3f4f6"
                  strokeWidth={1}
                />
                <text
                  x={padding - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-gray-400 text-[10px]"
                >
                  {value}
                </text>
              </g>
            );
          })}
          <path
            d={totalUsersPath}
            fill="none"
            stroke="#a855f7"
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] text-gray-400">
        {tickLabels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </div>
  );
}

interface StatisticsProps {
  /** Optional: Refresh trigger - increment to force refresh */
  refreshTrigger?: number;
}

/**
 * Statistics component
 * Displays event statistics dashboard
 * 
 * Requirements:
 * - 8.1: Display total count of games
 * - 8.2: Display total count of unique participants
 * - 8.3: Display available vs requested games
 * - 8.4: Display most popular games ranked by player interest
 */
export function Statistics({ refreshTrigger }: StatisticsProps) {
  const [statistics, setStatistics] = useState<StatisticsData | null>(null);
  const [timeline, setTimeline] = useState<StatisticsTimelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setLoading(true);
        setError(null);
        const [data, timelineData] = await Promise.all([
          statisticsApi.get(),
          statisticsApi.getTimeline(),
        ]);
        setStatistics(data);
        setTimeline(timelineData);
      } catch (err) {
        console.error('Failed to fetch statistics:', err);
        setError('Statistiken konnten nicht geladen werden.');
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, [refreshTrigger]);

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Statistiken</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white rounded-lg shadow p-4 animate-pulse"
            >
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700 text-sm">{error}</p>
        <button
          onClick={() => setError(null)}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Erneut versuchen
        </button>
      </div>
    );
  }

  if (!statistics || !timeline) {
    return null;
  }

  // Icons for stat cards
  const gamesIcon = (
    <svg
      className="w-8 h-8"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
      />
    </svg>
  );

  const participantsIcon = (
    <svg
      className="w-8 h-8"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
      />
    </svg>
  );

  const availableIcon = (
    <svg
      className="w-8 h-8"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );

  const requestedIcon = (
    <svg
      className="w-8 h-8"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Statistiken</h2>
      
      {/* Main statistics grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Requirement 8.1: Total games count */}
        <StatCard
          title="Spiele gesamt"
          value={statistics.totalGames}
          icon={gamesIcon}
        />
        
        {/* Requirement 8.2: Total participants count */}
        <StatCard
          title="Teilnehmer"
          value={statistics.totalParticipants}
          icon={participantsIcon}
        />
        
        {/* Requirement 8.3: Available games (with bringers) */}
        <StatCard
          title="Verfügbare Spiele"
          value={statistics.availableGames}
          subtitle="Mit Bringer"
          icon={availableIcon}
        />
        
        {/* Requirement 8.3: Requested games (without bringers) */}
        <StatCard
          title="Gesuchte Spiele"
          value={statistics.requestedGames}
          subtitle="Ohne Bringer"
          icon={requestedIcon}
          highlight={statistics.requestedGames > 0}
        />
      </div>

      <TimelineChart data={timeline} />
      <TotalUsersChart data={timeline} />
      <ReleaseYearChart data={statistics.releaseYearCounts} />
      
      {/* Requirement 8.4: Popular games list */}
      <PopularGamesList games={statistics.popularGames} />
    </div>
  );
}

export default Statistics;

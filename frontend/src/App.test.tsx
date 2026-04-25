import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock the API client
vi.mock('./api/client', () => ({
  getToken: vi.fn().mockReturnValue(null),
  setToken: vi.fn(),
  removeToken: vi.fn(),
  EVENT_TOKEN_KEY: 'boardgame_event_token',
  getEventToken: vi.fn().mockReturnValue(null),
  setEventToken: vi.fn(),
  removeEventToken: vi.fn(),
  setActiveEventSlug: vi.fn(),
  getActiveEventSlug: vi.fn().mockReturnValue(undefined),
  authApi: { verify: vi.fn() },
  eventsApi: {
    getAll: vi.fn().mockResolvedValue({ events: [] }),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    getBySlug: vi.fn(),
  },
  participantsApi: {
    getAll: vi.fn().mockResolvedValue({ participants: [] }),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  gamesApi: { getAll: vi.fn().mockResolvedValue({ games: [] }) },
  statisticsApi: {
    get: vi.fn().mockResolvedValue({
      totalGames: 0, totalParticipants: 0, availableGames: 0,
      requestedGames: 0, popularGames: [], releaseYearCounts: [],
    }),
    getTimeline: vi.fn().mockResolvedValue({ points: [] }),
  },
  accountsApi: {
    getMe: vi.fn().mockRejectedValue(new Error('not authenticated')),
  },
  ApiError: class ApiError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
    }
  },
}));

describe('App', () => {
  it('renders the landing page at /', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Brettspieltreff')).toBeInTheDocument();
  });

  it('shows register and login links on landing page', () => {
    render(<App />);
    expect(screen.getByText('Treff erstellen')).toBeInTheDocument();
    // "Anmelden" appears in header and footer
    expect(screen.getAllByText('Anmelden').length).toBeGreaterThanOrEqual(1);
  });

  it('renders footer with legal links', () => {
    render(<App />);
    expect(screen.getByText('Impressum')).toBeInTheDocument();
    expect(screen.getByText('Datenschutz')).toBeInTheDocument();
  });
});

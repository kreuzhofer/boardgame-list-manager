import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';

// Storage key used by AuthGuard
const AUTH_STORAGE_KEY = 'boardgame_event_auth';
// Storage key used by useParticipant hook
const PARTICIPANT_ID_STORAGE_KEY = 'boardgame_event_participant_id';

// Mock participant data
const mockParticipant = { id: 'user-123', name: 'Test User' };
const mockParticipants = [
  { id: 'user-123', name: 'Test User' },
  { id: 'user-456', name: 'Another User' },
];

// Mock the API client
vi.mock('./api/client', () => ({
  getToken: vi.fn().mockReturnValue(null),
  setToken: vi.fn(),
  removeToken: vi.fn(),
  participantsApi: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  gamesApi: {
    getAll: vi.fn().mockResolvedValue({ games: [] }),
  },
  statisticsApi: {
    get: vi.fn().mockResolvedValue({
      totalGames: 0,
      totalParticipants: 0,
      availableGames: 0,
      requestedGames: 0,
      popularGames: [],
      releaseYearCounts: [],
    }),
    getTimeline: vi.fn().mockResolvedValue({
      points: [],
    }),
  },
  ApiError: class ApiError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
    }
  },
}));

// Import mocked module
import { participantsApi, gamesApi, statisticsApi } from './api/client';

describe('App', () => {
  beforeEach(() => {
    // Clear sessionStorage and localStorage before each test
    sessionStorage.clear();
    localStorage.clear();
    vi.clearAllMocks();
    
    // Default mock implementations
    vi.mocked(participantsApi.getAll).mockResolvedValue({ participants: mockParticipants });
    vi.mocked(participantsApi.getById).mockResolvedValue({ participant: mockParticipant });
    vi.mocked(participantsApi.create).mockResolvedValue({ participant: mockParticipant });
    vi.mocked(gamesApi.getAll).mockResolvedValue({ games: [] });
    vi.mocked(statisticsApi.get).mockResolvedValue({
      totalGames: 0,
      totalParticipants: 0,
      availableGames: 0,
      requestedGames: 0,
      popularGames: [],
      releaseYearCounts: [],
    });
    vi.mocked(statisticsApi.getTimeline).mockResolvedValue({
      points: [],
    });
  });

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('when not authenticated', () => {
    it('renders the password screen with event name', () => {
      render(<App />);
      // Event name comes from env var, check for the h1 heading
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    });

    it('renders the password input field', () => {
      render(<App />);
      expect(screen.getByLabelText('Passwort eingeben')).toBeInTheDocument();
    });

    it('renders the login button', () => {
      render(<App />);
      expect(screen.getByRole('button', { name: 'Anmelden' })).toBeInTheDocument();
    });

    it('shows error message when submitting empty password', async () => {
      render(<App />);
      const submitButton = screen.getByRole('button', { name: 'Anmelden' });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Bitte Passwort eingeben.')).toBeInTheDocument();
      });
    });
  });

  describe('when authenticated but no participant stored', () => {
    beforeEach(() => {
      // Simulate authenticated state without stored user
      sessionStorage.setItem(AUTH_STORAGE_KEY, 'true');
    });

    it('renders the user selection modal', async () => {
      render(<App />);
      await waitFor(() => {
        expect(screen.getByText('Wer bist du?')).toBeInTheDocument();
      });
    });

    it('shows existing participants in the modal', async () => {
      render(<App />);
      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument();
        expect(screen.getByText('Another User')).toBeInTheDocument();
      });
    });

    it('allows selecting an existing participant', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument();
      });
      
      // Click on the participant to select them
      fireEvent.click(screen.getByText('Test User'));
      
      // Should show confirmation dialog
      await waitFor(() => {
        expect(screen.getByText(/Du meldest Dich als/)).toBeInTheDocument();
      });
      
      // Click "Ja" to confirm
      fireEvent.click(screen.getByText('Ja'));
      
      await waitFor(() => {
        // Modal should close and user should be displayed in header
        expect(screen.queryByText('Wer bist du?')).not.toBeInTheDocument();
      });
      
      // Verify participant ID was stored in localStorage
      expect(localStorage.getItem(PARTICIPANT_ID_STORAGE_KEY)).toBe('user-123');
    });

    it('shows create participant form when clicking create button', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('+ Neuen Teilnehmer erstellen')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('+ Neuen Teilnehmer erstellen'));
      
      await waitFor(() => {
        expect(screen.getByText('Neuen Teilnehmer erstellen:')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Dein Name')).toBeInTheDocument();
      });
    });

    it('disables create button when name is empty', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('+ Neuen Teilnehmer erstellen')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('+ Neuen Teilnehmer erstellen'));
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Dein Name')).toBeInTheDocument();
      });
      
      // Submit button should be disabled when name is empty
      const submitButton = screen.getByRole('button', { name: 'Erstellen' });
      expect(submitButton).toBeDisabled();
      
      // Also disabled with whitespace-only
      const nameInput = screen.getByPlaceholderText('Dein Name');
      fireEvent.change(nameInput, { target: { value: '   ' } });
      expect(submitButton).toBeDisabled();
    });

    it('creates new participant and closes modal after submission', async () => {
      const newParticipant = { id: 'new-user-789', name: 'New User' };
      vi.mocked(participantsApi.create).mockResolvedValue({ participant: newParticipant });
      
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('+ Neuen Teilnehmer erstellen')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('+ Neuen Teilnehmer erstellen'));
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Dein Name')).toBeInTheDocument();
      });
      
      const nameInput = screen.getByPlaceholderText('Dein Name');
      fireEvent.change(nameInput, { target: { value: 'New User' } });
      
      const submitButton = screen.getByRole('button', { name: 'Erstellen' });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        // Modal should close
        expect(screen.queryByText('Wer bist du?')).not.toBeInTheDocument();
      });
      
      // Verify participant ID was stored in localStorage
      expect(localStorage.getItem(PARTICIPANT_ID_STORAGE_KEY)).toBe('new-user-789');
    });

    it('shows message when no participants exist', async () => {
      vi.mocked(participantsApi.getAll).mockResolvedValue({ participants: [] });
      
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('Noch keine Teilnehmer vorhanden.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Ersten Teilnehmer erstellen' })).toBeInTheDocument();
      });
    });
  });

  describe('when authenticated with stored participant', () => {
    beforeEach(() => {
      // Simulate authenticated state with stored participant ID
      sessionStorage.setItem(AUTH_STORAGE_KEY, 'true');
      localStorage.setItem(PARTICIPANT_ID_STORAGE_KEY, 'user-123');
    });

    it('renders the header with event name', async () => {
      render(<App />);
      
      await waitFor(() => {
        // Event name is in h1 heading
        expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      });
    });

    it('renders the navigation links', async () => {
      render(<App />);
      
      await waitFor(() => {
        // Use getAllByText since navigation text appears in both desktop nav and mobile bottom tabs
        const spielelisteElements = screen.getAllByText('Spieleliste');
        expect(spielelisteElements.length).toBeGreaterThanOrEqual(1);
        const druckansichtElements = screen.getAllByText('Druckansicht');
        expect(druckansichtElements.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('renders the home page by default', async () => {
      render(<App />);
      
      await waitFor(() => {
        // HomePage shows "Spieleliste" as the page title (h2)
        expect(screen.getByRole('heading', { name: 'Spieleliste', level: 2 })).toBeInTheDocument();
      });
    });

    it('renders the footer', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText(/Daniel Kreuzhofer/)).toBeInTheDocument();
      });
    });

    it('displays the participant name in the header', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument();
        expect(screen.getByText('Teilnehmer:')).toBeInTheDocument();
      });
    });

    it('shows edit name button', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Namen bearbeiten' })).toBeInTheDocument();
      });
    });

    it('clears participant if API returns not found', async () => {
      vi.mocked(participantsApi.getById).mockRejectedValue(new Error('Participant not found'));
      
      render(<App />);
      
      await waitFor(() => {
        // Should show user selection modal since user was cleared
        expect(screen.getByText('Wer bist du?')).toBeInTheDocument();
      });
      
      // Participant ID should be cleared from localStorage
      expect(localStorage.getItem(PARTICIPANT_ID_STORAGE_KEY)).toBeNull();
    });
  });
});

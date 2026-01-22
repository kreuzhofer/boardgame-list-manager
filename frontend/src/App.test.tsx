import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';

// Storage key used by AuthGuard
const AUTH_STORAGE_KEY = 'boardgame_event_auth';
// Storage key used by useUserName hook
const USER_NAME_STORAGE_KEY = 'boardgame_event_user_name';

describe('App', () => {
  beforeEach(() => {
    // Clear sessionStorage and localStorage before each test
    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('when not authenticated', () => {
    it('renders the password screen with event name', () => {
      render(<App />);
      expect(screen.getByText('Brettspiel-Event')).toBeInTheDocument();
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

  describe('when authenticated but no name stored', () => {
    beforeEach(() => {
      // Simulate authenticated state without stored name
      sessionStorage.setItem(AUTH_STORAGE_KEY, 'true');
    });

    it('renders the name prompt modal', () => {
      render(<App />);
      expect(screen.getByText('Wie heißen Sie?')).toBeInTheDocument();
    });

    it('renders the name input field', () => {
      render(<App />);
      expect(screen.getByLabelText('Name eingeben')).toBeInTheDocument();
    });

    it('renders the save button', () => {
      render(<App />);
      expect(screen.getByRole('button', { name: 'Speichern' })).toBeInTheDocument();
    });

    it('shows error when submitting empty name', async () => {
      render(<App />);
      const submitButton = screen.getByRole('button', { name: 'Speichern' });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Bitte geben Sie Ihren Namen ein.')).toBeInTheDocument();
      });
    });

    it('stores name and shows main content after submission', async () => {
      render(<App />);
      const nameInput = screen.getByLabelText('Name eingeben');
      const submitButton = screen.getByRole('button', { name: 'Speichern' });
      
      fireEvent.change(nameInput, { target: { value: 'Max Mustermann' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        // Name prompt should be gone
        expect(screen.queryByText('Wie heißen Sie?')).not.toBeInTheDocument();
        // User name should be displayed in header
        expect(screen.getByText('Max Mustermann')).toBeInTheDocument();
      });
      
      // Verify name was stored in localStorage
      expect(localStorage.getItem(USER_NAME_STORAGE_KEY)).toBe('Max Mustermann');
    });
  });

  describe('when authenticated with stored name', () => {
    beforeEach(() => {
      // Simulate authenticated state with stored name
      sessionStorage.setItem(AUTH_STORAGE_KEY, 'true');
      localStorage.setItem(USER_NAME_STORAGE_KEY, 'Test User');
    });

    it('renders the header with event name', () => {
      render(<App />);
      expect(screen.getByText('Brettspiel-Event')).toBeInTheDocument();
    });

    it('renders the navigation links', () => {
      render(<App />);
      // Use getAllByText since "Spieleliste" appears in both nav and page title
      const spielelisteElements = screen.getAllByText('Spieleliste');
      expect(spielelisteElements.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Druckansicht')).toBeInTheDocument();
    });

    it('renders the home page by default', () => {
      render(<App />);
      // HomePage shows "Spieleliste" as the page title (h2)
      expect(screen.getByRole('heading', { name: 'Spieleliste', level: 2 })).toBeInTheDocument();
    });

    it('renders the footer', () => {
      render(<App />);
      expect(screen.getByText(/Brettspiel-Event Koordination/)).toBeInTheDocument();
    });

    it('displays the user name in the header', () => {
      render(<App />);
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('Angemeldet als:')).toBeInTheDocument();
    });

    it('shows change name button', () => {
      render(<App />);
      expect(screen.getByRole('button', { name: 'Name ändern' })).toBeInTheDocument();
    });

    it('opens name change dialog when clicking change button', async () => {
      render(<App />);
      const changeButton = screen.getByRole('button', { name: 'Name ändern' });
      fireEvent.click(changeButton);
      
      await waitFor(() => {
        expect(screen.getByText('Wie heißen Sie?')).toBeInTheDocument();
        // Should show cancel button in change mode
        expect(screen.getByRole('button', { name: 'Abbrechen' })).toBeInTheDocument();
      });
    });

    it('closes name change dialog when clicking cancel', async () => {
      render(<App />);
      const changeButton = screen.getByRole('button', { name: 'Name ändern' });
      fireEvent.click(changeButton);
      
      await waitFor(() => {
        expect(screen.getByText('Wie heißen Sie?')).toBeInTheDocument();
      });
      
      const cancelButton = screen.getByRole('button', { name: 'Abbrechen' });
      fireEvent.click(cancelButton);
      
      await waitFor(() => {
        expect(screen.queryByText('Wie heißen Sie?')).not.toBeInTheDocument();
      });
    });

    it('updates name when submitting new name', async () => {
      render(<App />);
      const changeButton = screen.getByRole('button', { name: 'Name ändern' });
      fireEvent.click(changeButton);
      
      await waitFor(() => {
        expect(screen.getByText('Wie heißen Sie?')).toBeInTheDocument();
      });
      
      const nameInput = screen.getByLabelText('Name eingeben');
      const submitButton = screen.getByRole('button', { name: 'Speichern' });
      
      fireEvent.change(nameInput, { target: { value: 'New Name' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.queryByText('Wie heißen Sie?')).not.toBeInTheDocument();
        expect(screen.getByText('New Name')).toBeInTheDocument();
      });
      
      // Verify name was updated in localStorage
      expect(localStorage.getItem(USER_NAME_STORAGE_KEY)).toBe('New Name');
    });
  });
});

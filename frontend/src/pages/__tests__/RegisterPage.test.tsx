import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { RegisterPage } from '../RegisterPage';
import { AuthProvider } from '../../contexts/AuthContext';
import * as client from '../../api/client';

// Mock the API client
vi.mock('../../api/client', async () => {
  const actual = await vi.importActual('../../api/client');
  return {
    ...actual,
    accountsApi: {
      register: vi.fn(),
      getMe: vi.fn(),
    },
    getToken: vi.fn(),
    setToken: vi.fn(),
    removeToken: vi.fn(),
  };
});

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(client.getToken).mockReturnValue(null);
  });

  const renderRegisterPage = () => {
    return render(
      <BrowserRouter>
        <AuthProvider>
          <RegisterPage />
        </AuthProvider>
      </BrowserRouter>
    );
  };

  it('renders registration form', () => {
    renderRegisterPage();

    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^passwort$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/passwort bestätigen/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /konto erstellen/i })).toBeInTheDocument();
  });

  it('shows password requirements', () => {
    renderRegisterPage();

    expect(screen.getByText(/mindestens 8 zeichen/i)).toBeInTheDocument();
    expect(screen.getByText(/mindestens ein buchstabe/i)).toBeInTheDocument();
    expect(screen.getByText(/mindestens eine zahl/i)).toBeInTheDocument();
  });

  it('shows link to login', () => {
    renderRegisterPage();

    expect(screen.getByText(/jetzt anmelden/i)).toBeInTheDocument();
  });

  it('validates password requirements visually', async () => {
    renderRegisterPage();

    const passwordInput = screen.getByLabelText(/^passwort$/i);

    // Type a short password
    fireEvent.change(passwordInput, { target: { value: 'abc' } });

    // Requirements should show as not met (gray)
    await waitFor(() => {
      const minLengthItem = screen.getByText(/mindestens 8 zeichen/i);
      expect(minLengthItem.className).toContain('text-gray');
    });

    // Type a valid password
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    // Requirements should show as met (green)
    await waitFor(() => {
      const minLengthItem = screen.getByText(/mindestens 8 zeichen/i);
      expect(minLengthItem.className).toContain('text-green');
    });
  });

  it('shows error when passwords do not match', async () => {
    renderRegisterPage();

    fireEvent.change(screen.getByLabelText(/e-mail/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^passwort$/i), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText(/passwort bestätigen/i), {
      target: { value: 'different123' },
    });

    await waitFor(() => {
      expect(screen.getByText(/die passwörter stimmen nicht überein/i)).toBeInTheDocument();
    });
  });

  it('calls register API with valid data', async () => {
    const mockAccount = {
      id: '123',
      email: 'new@example.com',
      role: 'account_owner' as const,
      status: 'active' as const,
      createdAt: '2024-01-01T00:00:00Z',
    };

    vi.mocked(client.accountsApi.register).mockResolvedValue({
      account: mockAccount,
      message: 'Konto erfolgreich erstellt.',
    });

    renderRegisterPage();

    fireEvent.change(screen.getByLabelText(/e-mail/i), {
      target: { value: 'new@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^passwort$/i), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText(/passwort bestätigen/i), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /konto erstellen/i }));

    await waitFor(() => {
      expect(client.accountsApi.register).toHaveBeenCalledWith('new@example.com', 'password123');
    });
  });

  it('shows error message on failed registration', async () => {
    vi.mocked(client.accountsApi.register).mockRejectedValue(
      new client.ApiError('Diese E-Mail-Adresse ist bereits registriert.', 'EMAIL_EXISTS')
    );

    renderRegisterPage();

    fireEvent.change(screen.getByLabelText(/e-mail/i), {
      target: { value: 'existing@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^passwort$/i), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText(/passwort bestätigen/i), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /konto erstellen/i }));

    await waitFor(() => {
      expect(screen.getByText(/diese e-mail-adresse ist bereits registriert/i)).toBeInTheDocument();
    });
  });
});

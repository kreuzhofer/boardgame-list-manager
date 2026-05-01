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
    authApi: {
      verify: vi.fn(),
      requestMagicLink: vi.fn(),
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

  it('renders magic-link form by default with no password fields', () => {
    renderRegisterPage();

    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /konto per e-mail erstellen/i })
    ).toBeInTheDocument();
    // Password fields hidden until disclosure clicked
    expect(screen.queryByLabelText(/^passwort$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/passwort bestätigen/i)).not.toBeInTheDocument();
  });

  it('sends magic link via primary CTA', async () => {
    vi.mocked(client.authApi.requestMagicLink).mockResolvedValue({ ok: true });
    renderRegisterPage();

    fireEvent.change(screen.getByLabelText(/e-mail/i), {
      target: { value: 'new@example.com' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: /konto per e-mail erstellen/i })
    );

    await waitFor(() => {
      expect(client.authApi.requestMagicLink).toHaveBeenCalledWith('new@example.com');
    });
    expect(
      await screen.findByText(/wir haben dir einen bestätigungs- und anmelde-link an new@example\.com geschickt/i)
    ).toBeInTheDocument();
  });

  it('reveals password registration when disclosure is clicked', () => {
    renderRegisterPage();
    fireEvent.click(
      screen.getByRole('button', { name: /lieber konto mit passwort anlegen/i })
    );

    expect(screen.getByLabelText(/^passwort$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/passwort bestätigen/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /konto mit passwort erstellen/i })
    ).toBeInTheDocument();
  });

  it('shows password requirements when password disclosure is open', () => {
    renderRegisterPage();
    fireEvent.click(
      screen.getByRole('button', { name: /lieber konto mit passwort anlegen/i })
    );

    expect(screen.getByText(/mindestens 8 zeichen/i)).toBeInTheDocument();
    expect(screen.getByText(/mindestens ein buchstabe/i)).toBeInTheDocument();
    expect(screen.getByText(/mindestens eine zahl/i)).toBeInTheDocument();
  });

  it('shows link to login', () => {
    renderRegisterPage();
    expect(screen.getByRole('link', { name: /^anmelden$/i })).toBeInTheDocument();
  });

  it('validates password requirements visually', async () => {
    renderRegisterPage();
    fireEvent.click(
      screen.getByRole('button', { name: /lieber konto mit passwort anlegen/i })
    );

    const passwordInput = screen.getByLabelText(/^passwort$/i);

    fireEvent.change(passwordInput, { target: { value: 'abc' } });
    await waitFor(() => {
      const minLengthItem = screen.getByText(/mindestens 8 zeichen/i);
      expect(minLengthItem.className).toContain('text-ink-mute');
    });

    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    await waitFor(() => {
      const minLengthItem = screen.getByText(/mindestens 8 zeichen/i);
      expect(minLengthItem.className).toContain('text-sage');
    });
  });

  it('shows error when passwords do not match', async () => {
    renderRegisterPage();
    fireEvent.click(
      screen.getByRole('button', { name: /lieber konto mit passwort anlegen/i })
    );

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
    fireEvent.click(
      screen.getByRole('button', { name: /lieber konto mit passwort anlegen/i })
    );

    fireEvent.change(screen.getByLabelText(/e-mail/i), {
      target: { value: 'new@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^passwort$/i), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText(/passwort bestätigen/i), {
      target: { value: 'password123' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: /konto mit passwort erstellen/i })
    );

    await waitFor(() => {
      expect(client.accountsApi.register).toHaveBeenCalledWith('new@example.com', 'password123');
    });
  });

  it('shows error message on failed registration', async () => {
    vi.mocked(client.accountsApi.register).mockRejectedValue(
      new client.ApiError('Diese E-Mail-Adresse ist bereits registriert.', 'EMAIL_EXISTS')
    );

    renderRegisterPage();
    fireEvent.click(
      screen.getByRole('button', { name: /lieber konto mit passwort anlegen/i })
    );

    fireEvent.change(screen.getByLabelText(/e-mail/i), {
      target: { value: 'existing@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^passwort$/i), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText(/passwort bestätigen/i), {
      target: { value: 'password123' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: /konto mit passwort erstellen/i })
    );

    await waitFor(() => {
      expect(screen.getByText(/diese e-mail-adresse ist bereits registriert/i)).toBeInTheDocument();
    });
  });
});

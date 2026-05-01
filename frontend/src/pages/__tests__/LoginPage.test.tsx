import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LoginPage } from '../LoginPage';
import { AuthProvider } from '../../contexts/AuthContext';
import * as client from '../../api/client';

// Mock the API client
vi.mock('../../api/client', async () => {
  const actual = await vi.importActual('../../api/client');
  return {
    ...actual,
    accountsApi: {
      login: vi.fn(),
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

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(client.getToken).mockReturnValue(null);
  });

  const renderLoginPage = () => {
    return render(
      <BrowserRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </BrowserRouter>
    );
  };

  it('renders magic-link form by default with no password field', () => {
    renderLoginPage();

    expect(screen.getByLabelText('E-Mail')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /anmelde-link per e-mail senden/i })
    ).toBeInTheDocument();
    // Password field is hidden until disclosure is clicked
    expect(screen.queryByLabelText('Passwort')).not.toBeInTheDocument();
  });

  it('shows link to registration', () => {
    renderLoginPage();
    expect(screen.getByRole('link', { name: /jetzt erstellen/i })).toBeInTheDocument();
  });

  it('sends magic link via primary CTA', async () => {
    vi.mocked(client.authApi.requestMagicLink).mockResolvedValue({ ok: true });
    renderLoginPage();

    fireEvent.change(screen.getByLabelText('E-Mail'), {
      target: { value: 'someone@example.com' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: /anmelde-link per e-mail senden/i })
    );

    await waitFor(() => {
      expect(client.authApi.requestMagicLink).toHaveBeenCalledWith('someone@example.com');
    });
    expect(
      await screen.findByText(/wir haben dir einen anmelde-link an someone@example\.com geschickt/i)
    ).toBeInTheDocument();
  });

  it('reveals password login form when disclosure is clicked', () => {
    renderLoginPage();

    fireEvent.click(screen.getByRole('button', { name: /lieber mit passwort anmelden/i }));

    expect(screen.getByLabelText('Passwort')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^mit passwort anmelden$/i })
    ).toBeInTheDocument();
  });

  it('shows error when password login fields are empty', async () => {
    renderLoginPage();
    fireEvent.click(screen.getByRole('button', { name: /lieber mit passwort anmelden/i }));
    fireEvent.click(screen.getByRole('button', { name: /^mit passwort anmelden$/i }));

    await waitFor(() => {
      expect(screen.getByText(/bitte e-mail und passwort eingeben/i)).toBeInTheDocument();
    });
  });

  it('calls login API with credentials via password disclosure', async () => {
    const mockAccount = {
      id: '123',
      email: 'test@example.com',
      role: 'account_owner' as const,
      status: 'active' as const,
      createdAt: '2024-01-01T00:00:00Z',
    };

    vi.mocked(client.accountsApi.login).mockResolvedValue({
      token: 'test-token',
      account: mockAccount,
    });

    renderLoginPage();
    fireEvent.click(screen.getByRole('button', { name: /lieber mit passwort anmelden/i }));

    fireEvent.change(screen.getByLabelText('E-Mail'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Passwort'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^mit passwort anmelden$/i }));

    await waitFor(() => {
      expect(client.accountsApi.login).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('shows error message on failed password login', async () => {
    vi.mocked(client.accountsApi.login).mockRejectedValue(
      new client.ApiError('E-Mail oder Passwort ist falsch.', 'INVALID_CREDENTIALS')
    );

    renderLoginPage();
    fireEvent.click(screen.getByRole('button', { name: /lieber mit passwort anmelden/i }));

    fireEvent.change(screen.getByLabelText('E-Mail'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Passwort'), {
      target: { value: 'wrongpassword' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^mit passwort anmelden$/i }));

    await waitFor(() => {
      expect(screen.getByText(/e-mail oder passwort ist falsch/i)).toBeInTheDocument();
    });
  });
});

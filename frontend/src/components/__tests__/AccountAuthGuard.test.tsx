import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AccountAuthGuard } from '../AccountAuthGuard';

// Mock the useAuth hook
const mockUseAuth = vi.fn();
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

/**
 * Unit tests for AccountAuthGuard redirect behavior
 * Validates: Requirements 6.1, 6.4
 *
 * 6.1 - /profile and /admin routes require authenticated account access
 * 6.4 - Unauthenticated access to protected routes redirects to login
 */
describe('AccountAuthGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderGuarded(initialPath = '/profile') {
    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route
            path="/profile"
            element={
              <AccountAuthGuard>
                <div data-testid="protected-content">Protected Content</div>
              </AccountAuthGuard>
            }
          />
          <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );
  }

  it('renders children when authenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });

    renderGuarded();

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
  });

  it('redirects to /login when unauthenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    });

    renderGuarded();

    expect(screen.getByTestId('login-page')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('shows loading spinner while loading', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
    });

    renderGuarded();

    expect(screen.getByText('Laden...')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
  });

  it('preserves intended destination in redirect state', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    });

    // Render with a route that captures location state
    render(
      <MemoryRouter initialEntries={['/profile']}>
        <Routes>
          <Route
            path="/profile"
            element={
              <AccountAuthGuard>
                <div>Protected</div>
              </AccountAuthGuard>
            }
          />
          <Route
            path="/login"
            element={<LocationStateDisplay />}
          />
        </Routes>
      </MemoryRouter>
    );

    // The Navigate component passes state={{ from: location }}
    // Verify the login page received the intended destination
    expect(screen.getByTestId('from-pathname')).toHaveTextContent('/profile');
  });
});

/**
 * Helper component that displays the location state passed via Navigate.
 * Used to verify that AccountAuthGuard preserves the intended destination.
 */
function LocationStateDisplay() {
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from;

  return (
    <div data-testid="login-page">
      <span data-testid="from-pathname">{from?.pathname ?? 'none'}</span>
    </div>
  );
}

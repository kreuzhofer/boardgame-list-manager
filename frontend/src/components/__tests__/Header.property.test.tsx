/**
 * Property-based tests for Header component navigation
 * **Validates: Requirements 2.2, 3.3**
 * 
 * Property 1: Navigation Tab Click Routes Correctly
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import * as fc from 'fast-check';
import { Header } from '../Header';
import type { User } from '../../types';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    account: null,
    logout: vi.fn(),
  }),
}));

const mockUser: User = {
  id: 'user-1',
  name: 'Test User',
};

const mockOnUserUpdated = vi.fn();
const mockOnLogout = vi.fn();

// Desktop navigation tabs configuration (matching Header component)
const DESKTOP_TABS = [
  { path: '/', label: 'Spieleliste', testId: 'desktop-nav-home' },
  { path: '/print', label: 'Druckansicht', testId: 'desktop-nav-print' },
  { path: '/statistics', label: 'Statistiken', testId: 'desktop-nav-statistics' },
];

// Arbitrary for valid routes
const routeArbitrary = fc.constantFrom('/', '/print', '/statistics');

// Helper component to display current location
function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="current-location">{location.pathname}</div>;
}

describe('Header Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Property 1: Navigation Tab Click Routes Correctly', () => {
    /**
     * **Validates: Requirements 2.2, 3.3**
     * For any navigation tab (Spieleliste, Druckansicht, Statistiken),
     * clicking the tab SHALL navigate to the corresponding route.
     */
    it('clicking any desktop navigation tab navigates to the correct route', () => {
      fc.assert(
        fc.property(routeArbitrary, (targetRoute) => {
          const { unmount } = render(
            <MemoryRouter initialEntries={['/']}>
              <Header
                user={mockUser}
                onUserUpdated={mockOnUserUpdated}
                onLogout={mockOnLogout}
              />
              <Routes>
                <Route path="*" element={<LocationDisplay />} />
              </Routes>
            </MemoryRouter>
          );

          // Find the tab that should navigate to this route
          const tabConfig = DESKTOP_TABS.find(tab => tab.path === targetRoute);
          
          if (tabConfig) {
            // Click the navigation link
            const navLink = screen.getByTestId(tabConfig.testId);
            fireEvent.click(navLink);

            // Verify navigation occurred
            const locationDisplay = screen.getByTestId('current-location');
            expect(locationDisplay).toHaveTextContent(targetRoute);
          }

          unmount();
        }),
        { numRuns: 5 }
      );
    });

    it('all three desktop tabs have correct href attributes', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <Header
            user={mockUser}
            onUserUpdated={mockOnUserUpdated}
            onLogout={mockOnLogout}
          />
        </MemoryRouter>
      );

      DESKTOP_TABS.forEach(tab => {
        const navLink = screen.getByTestId(tab.testId);
        expect(navLink).toHaveAttribute('href', tab.path);
      });
    });

    it('navigation tabs display correct German labels', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <Header
            user={mockUser}
            onUserUpdated={mockOnUserUpdated}
            onLogout={mockOnLogout}
          />
        </MemoryRouter>
      );

      DESKTOP_TABS.forEach(tab => {
        const navLink = screen.getByTestId(tab.testId);
        expect(navLink).toHaveTextContent(tab.label);
      });
    });
  });

  describe('Active Tab Highlighting', () => {
    it('active route highlights the correct desktop tab', () => {
      fc.assert(
        fc.property(routeArbitrary, (route) => {
          const { unmount } = render(
            <MemoryRouter initialEntries={[route]}>
              <Header
                user={mockUser}
                onUserUpdated={mockOnUserUpdated}
                onLogout={mockOnLogout}
              />
            </MemoryRouter>
          );

          // Find the tab that should be active for this route
          const activeTabConfig = DESKTOP_TABS.find(tab => tab.path === route);
          
          if (activeTabConfig) {
            const activeTab = screen.getByTestId(activeTabConfig.testId);
            
            // Active tab should have white text and border
            expect(activeTab).toHaveClass('text-white');
            expect(activeTab).toHaveClass('border-b-2');
            expect(activeTab).toHaveClass('border-white');
            
            // Other tabs should have muted text
            DESKTOP_TABS.filter(tab => tab.path !== route).forEach(tab => {
              const inactiveTab = screen.getByTestId(tab.testId);
              expect(inactiveTab).toHaveClass('text-white/80');
              expect(inactiveTab).not.toHaveClass('border-b-2');
            });
          }

          unmount();
        }),
        { numRuns: 5 }
      );
    });
  });

  describe('Desktop Navigation Structure', () => {
    it('renders exactly 3 navigation tabs', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <Header
            user={mockUser}
            onUserUpdated={mockOnUserUpdated}
            onLogout={mockOnLogout}
          />
        </MemoryRouter>
      );

      const desktopNav = screen.getByTestId('desktop-nav');
      const links = desktopNav.querySelectorAll('a');
      expect(links.length).toBe(3);
    });

    it('tabs are in correct order: Spieleliste, Druckansicht, Statistiken', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <Header
            user={mockUser}
            onUserUpdated={mockOnUserUpdated}
            onLogout={mockOnLogout}
          />
        </MemoryRouter>
      );

      const desktopNav = screen.getByTestId('desktop-nav');
      const links = desktopNav.querySelectorAll('a');
      
      expect(links[0]).toHaveTextContent('Spieleliste');
      expect(links[1]).toHaveTextContent('Druckansicht');
      expect(links[2]).toHaveTextContent('Statistiken');
    });
  });

  describe('Burger Menu Removal', () => {
    it('does not render burger menu button', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <Header
            user={mockUser}
            onUserUpdated={mockOnUserUpdated}
            onLogout={mockOnLogout}
          />
        </MemoryRouter>
      );

      // Should not find any button with menu-related aria-label
      expect(screen.queryByRole('button', { name: /menü/i })).not.toBeInTheDocument();
    });

    it('does not render mobile menu dropdown', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <Header
            user={mockUser}
            onUserUpdated={mockOnUserUpdated}
            onLogout={mockOnLogout}
          />
        </MemoryRouter>
      );

      // Should not find mobile navigation links with emoji icons
      expect(screen.queryByText('🎲 Spieleliste')).not.toBeInTheDocument();
      expect(screen.queryByText('🖨️ Druckansicht')).not.toBeInTheDocument();
    });
  });
});

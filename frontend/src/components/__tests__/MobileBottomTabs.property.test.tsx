/**
 * Property-based tests for MobileBottomTabs component
 * **Validates: Requirements 4.1, 2.3, 5.1, 5.4**
 * 
 * Property 3: All Tabs Have Icon and Label
 * Property 2: Active Route Highlights Correct Tab
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as fc from 'fast-check';
import { MobileBottomTabs } from '../MobileBottomTabs';
import type { User } from '../../types';

// Mock UserOptionsDialog to avoid portal issues in tests
vi.mock('../UserOptionsDialog', () => ({
  UserOptionsDialog: ({ isOpen }: { isOpen: boolean }) => 
    isOpen ? <div data-testid="user-options-dialog">Dialog</div> : null,
}));

const mockUser: User = {
  id: 'user-1',
  name: 'Test User',
};

const mockOnUserUpdated = vi.fn();
const mockOnLogout = vi.fn();

// Tab configuration matching the component
const TAB_CONFIG = [
  { id: 'games', path: '/', label: 'Spieleliste' },
  { id: 'print', path: '/print', label: 'Druckansicht' },
  { id: 'stats', path: '/statistics', label: 'Statistiken' },
  { id: 'profile', path: null, label: 'Profil' },
];

// Navigation tabs (excluding profile which opens dialog)
const NAVIGATION_TABS = TAB_CONFIG.filter(tab => tab.path !== null);

// Arbitrary for valid routes
const routeArbitrary = fc.constantFrom('/', '/print', '/statistics');

// Arbitrary for tab IDs
const tabIdArbitrary = fc.constantFrom('games', 'print', 'stats', 'profile');

describe('MobileBottomTabs Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Property 3: All Tabs Have Icon and Label', () => {
    /**
     * **Validates: Requirements 4.1**
     * For any tab in the mobile bottom tab bar, the tab SHALL display 
     * both an SVG icon element and a text label element.
     */
    it('every tab has both an icon (SVG) and a text label', () => {
      fc.assert(
        fc.property(tabIdArbitrary, (tabId) => {
          const { unmount } = render(
            <MemoryRouter initialEntries={['/']}>
              <MobileBottomTabs
                user={mockUser}
                onUserUpdated={mockOnUserUpdated}
                onLogout={mockOnLogout}
              />
            </MemoryRouter>
          );

          const tab = screen.getByTestId(`tab-${tabId}`);
          
          // Tab should exist
          expect(tab).toBeInTheDocument();
          
          // Tab should contain an SVG icon
          const svg = tab.querySelector('svg');
          expect(svg).toBeInTheDocument();
          
          // Tab should contain a text label
          const expectedLabel = TAB_CONFIG.find(t => t.id === tabId)?.label;
          expect(tab).toHaveTextContent(expectedLabel!);

          unmount();
        }),
        { numRuns: 5 }
      );
    });

    it('all four tabs are rendered with icons and labels', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <MobileBottomTabs
            user={mockUser}
            onUserUpdated={mockOnUserUpdated}
            onLogout={mockOnLogout}
          />
        </MemoryRouter>
      );

      TAB_CONFIG.forEach(tab => {
        const tabElement = screen.getByTestId(`tab-${tab.id}`);
        expect(tabElement).toBeInTheDocument();
        
        // Check for SVG icon
        const svg = tabElement.querySelector('svg');
        expect(svg).toBeInTheDocument();
        
        // Check for label text
        expect(tabElement).toHaveTextContent(tab.label);
      });
    });
  });

  describe('Property 2: Active Route Highlights Correct Tab', () => {
    /**
     * **Validates: Requirements 2.3, 5.1, 5.4**
     * For any route in the application, the corresponding navigation tab 
     * SHALL be visually highlighted as active.
     */
    it('active route highlights the correct tab with blue color', () => {
      fc.assert(
        fc.property(routeArbitrary, (route) => {
          const { unmount } = render(
            <MemoryRouter initialEntries={[route]}>
              <MobileBottomTabs
                user={mockUser}
                onUserUpdated={mockOnUserUpdated}
                onLogout={mockOnLogout}
              />
            </MemoryRouter>
          );

          // Find the tab that should be active for this route
          const activeTabConfig = NAVIGATION_TABS.find(tab => tab.path === route);
          
          if (activeTabConfig) {
            const activeTab = screen.getByTestId(`tab-${activeTabConfig.id}`);
            
            // Active tab should have blue color class
            expect(activeTab).toHaveClass('text-blue-600');
            
            // Other navigation tabs should have gray color
            NAVIGATION_TABS.filter(tab => tab.path !== route).forEach(tab => {
              const inactiveTab = screen.getByTestId(`tab-${tab.id}`);
              expect(inactiveTab).toHaveClass('text-gray-500');
            });
          }

          unmount();
        }),
        { numRuns: 5 }
      );
    });

    it('only one navigation tab is highlighted at a time', () => {
      fc.assert(
        fc.property(routeArbitrary, (route) => {
          const { unmount } = render(
            <MemoryRouter initialEntries={[route]}>
              <MobileBottomTabs
                user={mockUser}
                onUserUpdated={mockOnUserUpdated}
                onLogout={mockOnLogout}
              />
            </MemoryRouter>
          );

          // Count tabs with active styling
          const activeTabs = NAVIGATION_TABS.filter(tab => {
            const tabElement = screen.getByTestId(`tab-${tab.id}`);
            return tabElement.classList.contains('text-blue-600');
          });

          // Exactly one tab should be active
          expect(activeTabs.length).toBe(1);

          unmount();
        }),
        { numRuns: 5 }
      );
    });
  });

  describe('Tab Navigation Links', () => {
    it('navigation tabs have correct href attributes', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <MobileBottomTabs
            user={mockUser}
            onUserUpdated={mockOnUserUpdated}
            onLogout={mockOnLogout}
          />
        </MemoryRouter>
      );

      NAVIGATION_TABS.forEach(tab => {
        const tabElement = screen.getByTestId(`tab-${tab.id}`);
        expect(tabElement).toHaveAttribute('href', tab.path);
      });
    });

    it('profile tab is a button, not a link', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <MobileBottomTabs
            user={mockUser}
            onUserUpdated={mockOnUserUpdated}
            onLogout={mockOnLogout}
          />
        </MemoryRouter>
      );

      const profileTab = screen.getByTestId('tab-profile');
      expect(profileTab.tagName).toBe('BUTTON');
      expect(profileTab).not.toHaveAttribute('href');
    });
  });
});

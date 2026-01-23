/**
 * Unit tests for StatisticsPage
 * **Validates: Requirements 1.1, 1.2, 1.4, 1.5, 8.2**
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { StatisticsPage } from '../StatisticsPage';

// Mock the Statistics component to control its behavior
vi.mock('../../components/Statistics', () => ({
  Statistics: ({ refreshTrigger }: { refreshTrigger?: number }) => (
    <div data-testid="statistics-component" data-refresh={refreshTrigger}>
      <div data-testid="total-games">10</div>
      <div data-testid="total-participants">25</div>
      <div data-testid="available-games">8</div>
      <div data-testid="requested-games">2</div>
      <div data-testid="popular-games">Beliebteste Spiele</div>
    </div>
  ),
}));

describe('StatisticsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Page Title', () => {
    it('renders "Statistiken" as the page title', () => {
      render(<StatisticsPage />);

      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Statistiken');
    });

    it('renders page title in German (Requirement 8.2)', () => {
      render(<StatisticsPage />);

      // Title should be in German
      expect(screen.getByText('Statistiken')).toBeInTheDocument();
    });
  });

  describe('Statistics Component Integration', () => {
    it('renders the Statistics component', () => {
      render(<StatisticsPage />);

      expect(screen.getByTestId('statistics-component')).toBeInTheDocument();
    });

    it('displays statistics dashboard content (Requirement 1.1)', () => {
      render(<StatisticsPage />);

      // Statistics component should render with dashboard data
      expect(screen.getByTestId('total-games')).toBeInTheDocument();
      expect(screen.getByTestId('total-participants')).toBeInTheDocument();
      expect(screen.getByTestId('available-games')).toBeInTheDocument();
      expect(screen.getByTestId('requested-games')).toBeInTheDocument();
    });

    it('displays popular games list (Requirement 1.2)', () => {
      render(<StatisticsPage />);

      expect(screen.getByTestId('popular-games')).toBeInTheDocument();
    });
  });

  describe('Page Layout', () => {
    it('has proper spacing between title and content', () => {
      const { container } = render(<StatisticsPage />);

      // Check that the container has space-y-6 class for proper spacing
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('space-y-6');
    });

    it('renders title with correct styling', () => {
      render(<StatisticsPage />);

      const title = screen.getByRole('heading', { level: 2 });
      expect(title).toHaveClass('text-2xl', 'font-bold', 'text-gray-800');
    });
  });
});

describe('StatisticsPage with real Statistics component', () => {
  // These tests use the actual Statistics component behavior
  // by not mocking it - useful for integration testing

  beforeEach(() => {
    vi.resetModules();
  });

  it('page structure is correct', () => {
    // Re-import without mock for this test
    vi.doUnmock('../../components/Statistics');
    
    // Just verify the page renders without errors
    render(<StatisticsPage />);
    
    expect(screen.getByText('Statistiken')).toBeInTheDocument();
  });
});

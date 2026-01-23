import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { LazyBggImage } from '../LazyBggImage';

// Mock ImageZoomOverlay
vi.mock('../ImageZoomOverlay', () => ({
  ImageZoomOverlay: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="zoom-overlay" onClick={onClose}>Zoom Overlay</div>
  ),
}));

// Mock touch detection - ensure desktop mode for tests
beforeAll(() => {
  Object.defineProperty(window, 'ontouchstart', { value: undefined, writable: true });
  Object.defineProperty(navigator, 'maxTouchPoints', { value: 0, writable: true });
});

// Mock IntersectionObserver
let intersectionCallback: IntersectionObserverCallback;
const mockObserve = vi.fn();
const mockDisconnect = vi.fn();

class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: ReadonlyArray<number> = [];
  
  constructor(callback: IntersectionObserverCallback) {
    intersectionCallback = callback;
  }
  
  observe = mockObserve;
  unobserve = vi.fn();
  disconnect = mockDisconnect;
  takeRecords = vi.fn(() => []);
}

// Helper to simulate element entering viewport
function simulateIntersection(isIntersecting: boolean) {
  const entry = {
    isIntersecting,
    boundingClientRect: {} as DOMRectReadOnly,
    intersectionRatio: isIntersecting ? 1 : 0,
    intersectionRect: {} as DOMRectReadOnly,
    rootBounds: null,
    target: document.createElement('div'),
    time: Date.now(),
  };
  intersectionCallback([entry], {} as IntersectionObserver);
}

describe('LazyBggImage', () => {
  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
    mockObserve.mockClear();
    mockDisconnect.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Loading state', () => {
    it('should render shimmer placeholder initially (idle state)', () => {
      render(<LazyBggImage bggId={12345} size="micro" alt="Test Game" />);
      expect(screen.getByTestId('shimmer-placeholder')).toBeInTheDocument();
    });

    it('should have animate-pulse class on shimmer', () => {
      render(<LazyBggImage bggId={12345} size="micro" alt="Test Game" />);
      expect(screen.getByTestId('shimmer-placeholder')).toHaveClass('animate-pulse');
    });

    it('should not render image until in viewport', () => {
      render(<LazyBggImage bggId={12345} size="micro" alt="Test Game" />);
      expect(screen.queryByAltText('Test Game')).not.toBeInTheDocument();
    });

    it('should render image when in viewport', () => {
      render(<LazyBggImage bggId={12345} size="micro" alt="Test Game" />);
      act(() => simulateIntersection(true));
      expect(screen.getByAltText('Test Game')).toBeInTheDocument();
    });
  });

  describe('Loaded state', () => {
    it('should show image after load', () => {
      render(<LazyBggImage bggId={12345} size="micro" alt="Test Game" />);
      act(() => simulateIntersection(true));
      const img = screen.getByAltText('Test Game');
      fireEvent.load(img);
      expect(img).toHaveClass('opacity-100');
    });

    it('should hide shimmer after load', () => {
      render(<LazyBggImage bggId={12345} size="micro" alt="Test Game" />);
      act(() => simulateIntersection(true));
      fireEvent.load(screen.getByAltText('Test Game'));
      expect(screen.queryByTestId('shimmer-placeholder')).not.toBeInTheDocument();
    });
  });

  describe('Error state', () => {
    it('should show error placeholder on failure', () => {
      render(<LazyBggImage bggId={12345} size="micro" alt="Test Game" />);
      act(() => simulateIntersection(true));
      fireEvent.error(screen.getByAltText('Test Game'));
      expect(screen.getByTestId('error-placeholder')).toBeInTheDocument();
    });
  });

  describe('Zoom interaction', () => {
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); });

    it('should show zoom on mouseenter when loaded', async () => {
      render(<LazyBggImage bggId={12345} size="micro" alt="Test Game" _forceTouch={false} />);
      // Simulate intersection and load
      act(() => simulateIntersection(true));
      fireEvent.load(screen.getByAltText('Test Game'));
      // Hover to show zoom
      fireEvent.mouseEnter(screen.getByTestId('lazy-bgg-image-container'));
      expect(screen.getByTestId('zoom-overlay')).toBeInTheDocument();
    });

    it('should hide zoom on mouseleave', async () => {
      render(<LazyBggImage bggId={12345} size="micro" alt="Test Game" _forceTouch={false} />);
      act(() => simulateIntersection(true));
      fireEvent.load(screen.getByAltText('Test Game'));
      const container = screen.getByTestId('lazy-bgg-image-container');
      fireEvent.mouseEnter(container);
      expect(screen.getByTestId('zoom-overlay')).toBeInTheDocument();
      fireEvent.mouseLeave(container);
      expect(screen.queryByTestId('zoom-overlay')).not.toBeInTheDocument();
    });

    it('should not show zoom when image not loaded', () => {
      render(<LazyBggImage bggId={12345} size="micro" alt="Test Game" _forceTouch={false} />);
      fireEvent.mouseEnter(screen.getByTestId('lazy-bgg-image-container'));
      expect(screen.queryByTestId('zoom-overlay')).not.toBeInTheDocument();
    });
  });

  describe('Image URL', () => {
    it('should use correct URL for micro', () => {
      render(<LazyBggImage bggId={174430} size="micro" alt="Game" />);
      act(() => simulateIntersection(true));
      expect((screen.getByAltText('Game') as HTMLImageElement).src).toContain('/api/bgg/image/174430/micro');
    });

    it('should use correct URL for square200', () => {
      render(<LazyBggImage bggId={174430} size="square200" alt="Game" />);
      act(() => simulateIntersection(true));
      expect((screen.getByAltText('Game') as HTMLImageElement).src).toContain('/api/bgg/image/174430/square200');
    });
  });

  describe('Dimensions', () => {
    it('should have 64x64 for micro', () => {
      render(<LazyBggImage bggId={12345} size="micro" alt="Test" />);
      expect(screen.getByTestId('lazy-bgg-image-container')).toHaveStyle({ width: '64px', height: '64px' });
    });

    it('should have 200x200 for square200', () => {
      render(<LazyBggImage bggId={12345} size="square200" alt="Test" />);
      expect(screen.getByTestId('lazy-bgg-image-container')).toHaveStyle({ width: '200px', height: '200px' });
    });
  });

  describe('Intersection Observer', () => {
    it('should observe the container element', () => {
      render(<LazyBggImage bggId={12345} size="micro" alt="Test" />);
      expect(mockObserve).toHaveBeenCalled();
    });

    it('should disconnect observer when element enters viewport', () => {
      render(<LazyBggImage bggId={12345} size="micro" alt="Test" />);
      act(() => simulateIntersection(true));
      expect(mockDisconnect).toHaveBeenCalled();
    });
  });
});

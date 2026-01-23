import '@testing-library/jest-dom';

// Mock IntersectionObserver for tests that use LazyBggImage
class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: ReadonlyArray<number> = [];
  
  constructor(private callback: IntersectionObserverCallback) {
    // Immediately trigger intersection for all observed elements
    // This simulates elements being in viewport by default in tests
  }
  
  observe(target: Element): void {
    // Simulate immediate intersection (element is in viewport)
    const entry: IntersectionObserverEntry = {
      isIntersecting: true,
      boundingClientRect: target.getBoundingClientRect(),
      intersectionRatio: 1,
      intersectionRect: target.getBoundingClientRect(),
      rootBounds: null,
      target,
      time: Date.now(),
    };
    // Use setTimeout to ensure the callback runs after the component mounts
    setTimeout(() => this.callback([entry], this), 0);
  }
  
  unobserve = (): void => {};
  disconnect = (): void => {};
  takeRecords = (): IntersectionObserverEntry[] => [];
}

// Use globalThis for cross-environment compatibility
(globalThis as unknown as { IntersectionObserver: typeof IntersectionObserver }).IntersectionObserver = MockIntersectionObserver;
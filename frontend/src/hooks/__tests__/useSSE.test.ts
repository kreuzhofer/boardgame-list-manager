import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSSE, calculateBackoffDelay } from '../useSSE';

/**
 * Unit tests for useSSE hook
 * 
 * Requirements: 1.1, 1.3, 4.8
 */

// Mock EventSource
class MockEventSource {
  static instances: MockEventSource[] = [];
  
  url: string;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  readyState = 0;
  
  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
    // Auto-open after a tick
    setTimeout(() => this.simulateOpen(), 0);
  }
  
  close() {
    this.readyState = 2;
  }
  
  // Helper to simulate connection
  simulateOpen() {
    this.readyState = 1;
    this.onopen?.();
  }
  
  // Helper to simulate message
  simulateMessage(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }
  
  // Helper to simulate error
  simulateError() {
    this.onerror?.();
  }
  
  static reset() {
    MockEventSource.instances = [];
  }
}

describe('useSSE', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    MockEventSource.reset();
    vi.stubGlobal('EventSource', MockEventSource);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe('connection establishment', () => {
    it('should establish connection on mount when enabled', () => {
      const handlers = {
        onGameCreated: vi.fn(),
        onGameUpdated: vi.fn(),
        onGameDeleted: vi.fn(),
        onToast: vi.fn(),
      };

      renderHook(() => useSSE({
        currentUserId: 'user-123',
        handlers,
        enabled: true,
      }));

      expect(MockEventSource.instances).toHaveLength(1);
      expect(MockEventSource.instances[0].url).toContain('/api/events');
    });

    it('should not establish connection when disabled', () => {
      const handlers = {
        onGameCreated: vi.fn(),
      };

      renderHook(() => useSSE({
        currentUserId: 'user-123',
        handlers,
        enabled: false,
      }));

      expect(MockEventSource.instances).toHaveLength(0);
    });

    it('should set isConnected to true when connection opens', () => {
      const handlers = {};

      const { result } = renderHook(() => useSSE({
        currentUserId: 'user-123',
        handlers,
      }));

      expect(result.current.isConnected).toBe(false);

      act(() => {
        vi.runAllTimers();
      });

      expect(result.current.isConnected).toBe(true);
    });
  });

  describe('cleanup on unmount', () => {
    it('should close connection on unmount', () => {
      const handlers = {};

      const { unmount } = renderHook(() => useSSE({
        currentUserId: 'user-123',
        handlers,
      }));

      const eventSource = MockEventSource.instances[0];
      const closeSpy = vi.spyOn(eventSource, 'close');

      unmount();

      expect(closeSpy).toHaveBeenCalled();
    });
  });

  describe('event handler invocation', () => {
    it('should call onGameCreated for game:created events', () => {
      const onGameCreated = vi.fn();
      const handlers = { onGameCreated };

      renderHook(() => useSSE({
        currentUserId: 'user-123',
        handlers,
      }));

      act(() => {
        vi.runAllTimers();
      });

      act(() => {
        MockEventSource.instances[0].simulateMessage({
          type: 'game:created',
          gameId: 'game-1',
          userId: 'user-456',
          userName: 'Test User',
          gameName: 'Test Game',
          isBringing: true,
        });
      });

      expect(onGameCreated).toHaveBeenCalledWith(expect.objectContaining({
        type: 'game:created',
        gameId: 'game-1',
      }));
    });

    it('should call onGameUpdated for bringer/player events', () => {
      const onGameUpdated = vi.fn();
      const handlers = { onGameUpdated };

      renderHook(() => useSSE({
        currentUserId: 'user-123',
        handlers,
      }));

      act(() => {
        vi.runAllTimers();
      });

      act(() => {
        MockEventSource.instances[0].simulateMessage({
          type: 'game:bringer-added',
          gameId: 'game-1',
          userId: 'user-456',
          userName: 'Test User',
          gameName: 'Test Game',
        });
      });

      expect(onGameUpdated).toHaveBeenCalledWith(expect.objectContaining({
        type: 'game:bringer-added',
      }));
    });

    it('should call onGameDeleted for game:deleted events', () => {
      const onGameDeleted = vi.fn();
      const handlers = { onGameDeleted };

      renderHook(() => useSSE({
        currentUserId: 'user-123',
        handlers,
      }));

      act(() => {
        vi.runAllTimers();
      });

      act(() => {
        MockEventSource.instances[0].simulateMessage({
          type: 'game:deleted',
          gameId: 'game-1',
          userId: 'user-456',
        });
      });

      expect(onGameDeleted).toHaveBeenCalledWith(expect.objectContaining({
        type: 'game:deleted',
        gameId: 'game-1',
      }));
    });

    /**
     * Test for prototype-toggled SSE event handling
     * Requirements: 022-prototype-toggle 4.1, 4.2
     */
    it('should call onGameUpdated for game:prototype-toggled events', () => {
      const onGameUpdated = vi.fn();
      const handlers = { onGameUpdated };

      renderHook(() => useSSE({
        currentUserId: 'user-123',
        handlers,
      }));

      act(() => {
        vi.runAllTimers();
      });

      act(() => {
        MockEventSource.instances[0].simulateMessage({
          type: 'game:prototype-toggled',
          gameId: 'game-1',
          userId: 'user-456',
          isPrototype: true,
        });
      });

      expect(onGameUpdated).toHaveBeenCalledWith(expect.objectContaining({
        type: 'game:prototype-toggled',
        gameId: 'game-1',
        isPrototype: true,
      }));
    });
  });

  describe('toast filtering', () => {
    it('should call onToast for other users actions', () => {
      const onToast = vi.fn();
      const handlers = { onToast };

      renderHook(() => useSSE({
        currentUserId: 'user-123',
        handlers,
      }));

      act(() => {
        vi.runAllTimers();
      });

      act(() => {
        MockEventSource.instances[0].simulateMessage({
          type: 'game:created',
          gameId: 'game-1',
          userId: 'user-456', // Different user
          userName: 'Other User',
          gameName: 'Test Game',
          isBringing: true,
        });
      });

      expect(onToast).toHaveBeenCalledWith('Other User bringt Test Game mit');
    });

    it('should NOT call onToast for own actions', () => {
      const onToast = vi.fn();
      const handlers = { onToast };

      renderHook(() => useSSE({
        currentUserId: 'user-123',
        handlers,
      }));

      act(() => {
        vi.runAllTimers();
      });

      act(() => {
        MockEventSource.instances[0].simulateMessage({
          type: 'game:created',
          gameId: 'game-1',
          userId: 'user-123', // Same user
          userName: 'Current User',
          gameName: 'Test Game',
          isBringing: true,
        });
      });

      expect(onToast).not.toHaveBeenCalled();
    });

    it('should NOT call onToast for non-toast events', () => {
      const onToast = vi.fn();
      const handlers = { onToast };

      renderHook(() => useSSE({
        currentUserId: 'user-123',
        handlers,
      }));

      act(() => {
        vi.runAllTimers();
      });

      act(() => {
        MockEventSource.instances[0].simulateMessage({
          type: 'game:player-removed',
          gameId: 'game-1',
          userId: 'user-456',
        });
      });

      expect(onToast).not.toHaveBeenCalled();
    });

    it('should call onToast for game:player-added events from other users', () => {
      const onToast = vi.fn();
      const handlers = { onToast };

      renderHook(() => useSSE({
        currentUserId: 'user-123',
        handlers,
      }));

      act(() => {
        vi.runAllTimers();
      });

      act(() => {
        MockEventSource.instances[0].simulateMessage({
          type: 'game:player-added',
          gameId: 'game-1',
          userId: 'user-456',
          userName: 'Other User',
          gameName: 'Test Game',
        });
      });

      expect(onToast).toHaveBeenCalledWith('Other User spielt mit bei Test Game');
    });
  });
});

describe('calculateBackoffDelay', () => {
  it('should return 1000ms for first attempt', () => {
    expect(calculateBackoffDelay(1)).toBe(1000);
  });

  it('should return 2000ms for second attempt', () => {
    expect(calculateBackoffDelay(2)).toBe(2000);
  });

  it('should return 4000ms for third attempt', () => {
    expect(calculateBackoffDelay(3)).toBe(4000);
  });

  it('should cap at 30000ms', () => {
    expect(calculateBackoffDelay(10)).toBe(30000);
    expect(calculateBackoffDelay(100)).toBe(30000);
  });
});

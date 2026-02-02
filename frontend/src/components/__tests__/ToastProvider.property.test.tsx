import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';
import { ToastProvider, useToast } from '../ToastProvider';

/**
 * Property-Based Tests for Toast Ordering
 * 
 * **Feature: 012-sse-real-time-updates**
 * **Property 6: Toast Ordering**
 * **Validates: Requirements 4.7**
 */

// Test component that exposes showToast
function TestComponent({ onMount }: { onMount: (showToast: (msg: string) => void) => void }) {
  const { showToast } = useToast();
  onMount(showToast);
  return null;
}

describe('Toast Ordering Properties', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Property 6: Toast Ordering
   * For any sequence of toast notifications, they SHALL be displayed in
   * chronological order with the newest toast appearing at the bottom of the stack.
   */
  describe('Property 6: Toast Ordering', () => {
    it('should display toasts in chronological order with newest at bottom', () => {
      // Generate random toast messages
      const messageArb = fc.array(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        { minLength: 2, maxLength: 5 }
      );

      fc.assert(
        fc.property(messageArb, (messages) => {
          let showToastFn: ((msg: string) => void) | undefined;

          const { unmount } = render(
            <ToastProvider>
              <TestComponent onMount={(fn) => { showToastFn = fn; }} />
            </ToastProvider>
          );

          try {
            // Show all toasts
            messages.forEach((message) => {
              act(() => {
                showToastFn!(message);
              });
            });

            // Get all toast elements
            const toasts = screen.getAllByRole('alert');

            // Property: Number of toasts should match number of messages
            expect(toasts).toHaveLength(messages.length);

            // Property: Toasts should be in chronological order (first message first, newest last)
            messages.forEach((message, index) => {
              const toastText = toasts[index].textContent ?? '';
              expect(toastText).toBe(message);
            });
          } finally {
            unmount();
            cleanup();
          }
        }),
        { numRuns: 10 }
      );
    });

    it('should maintain order when multiple toasts are added sequentially', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), { minLength: 3, maxLength: 5 }),
          (messages) => {
            let showToastFn: ((msg: string) => void) | undefined;

            const { unmount } = render(
              <ToastProvider>
                <TestComponent onMount={(fn) => { showToastFn = fn; }} />
              </ToastProvider>
            );

            try {
              // Add all toasts in sequence
              act(() => {
                messages.forEach((message) => {
                  showToastFn!(message);
                });
              });

              const toasts = screen.getAllByRole('alert');

              // Property: Order should be preserved (oldest first, newest last)
              expect(toasts).toHaveLength(messages.length);
              messages.forEach((message, index) => {
                const toastText = toasts[index].textContent ?? '';
                expect(toastText).toBe(message);
              });
            } finally {
              unmount();
              cleanup();
            }
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});

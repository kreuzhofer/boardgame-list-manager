import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';
import { ToastProvider, useToast } from '../ToastProvider';

/**
 * Unit tests for ToastProvider
 * 
 * Requirements: 4.5, 4.7
 */

// Test component that uses the toast hook
function TestComponent({ onMount }: { onMount?: (showToast: (msg: string) => void) => void }) {
  const { showToast } = useToast();
  
  if (onMount) {
    onMount(showToast);
  }
  
  return (
    <button onClick={() => showToast('Test message')}>
      Show Toast
    </button>
  );
}

describe('ToastProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render children', () => {
    render(
      <ToastProvider>
        <div data-testid="child">Child content</div>
      </ToastProvider>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('should show toast when showToast is called', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Toast'));

    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('should auto-dismiss toast after 4 seconds', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Toast'));
    expect(screen.getByText('Test message')).toBeInTheDocument();

    // Advance time by 4 seconds
    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(screen.queryByText('Test message')).not.toBeInTheDocument();
  });

  it('should stack multiple toasts vertically with newest at bottom', async () => {
    let showToastFn: ((msg: string) => void) | undefined;
    
    render(
      <ToastProvider>
        <TestComponent onMount={(fn) => { showToastFn = fn; }} />
      </ToastProvider>
    );

    // Show multiple toasts
    act(() => {
      showToastFn!('First toast');
    });
    act(() => {
      showToastFn!('Second toast');
    });
    act(() => {
      showToastFn!('Third toast');
    });

    const toasts = screen.getAllByRole('alert');
    expect(toasts).toHaveLength(3);

    // Verify order (newest at bottom means last in DOM order)
    expect(toasts[0]).toHaveTextContent('First toast');
    expect(toasts[1]).toHaveTextContent('Second toast');
    expect(toasts[2]).toHaveTextContent('Third toast');
  });

  it('should allow manual dismissal of toast', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Toast'));
    expect(screen.getByText('Test message')).toBeInTheDocument();

    // Click the close button
    const closeButton = screen.getByLabelText('Schließen');
    fireEvent.click(closeButton);

    expect(screen.queryByText('Test message')).not.toBeInTheDocument();
  });

  it('should render toasts in bottom-right corner', async () => {
    let showToastFn: ((msg: string) => void) | undefined;
    
    render(
      <ToastProvider>
        <TestComponent onMount={(fn) => { showToastFn = fn; }} />
      </ToastProvider>
    );

    act(() => {
      showToastFn!('Test toast');
    });

    const container = screen.getByLabelText('Benachrichtigungen');
    expect(container).toHaveClass('fixed', 'bottom-4', 'right-4');
  });

  it('should throw error when useToast is used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    function BadComponent() {
      useToast();
      return null;
    }

    expect(() => render(<BadComponent />)).toThrow(
      'useToast must be used within a ToastProvider'
    );

    consoleSpy.mockRestore();
  });
});

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { Toast } from '../types';

// Toast auto-dismiss duration in milliseconds
const TOAST_DURATION = 4000;

interface ToastContextValue {
  showToast: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Hook to access toast functionality
 * Must be used within a ToastProvider
 */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: ReactNode;
}

/**
 * ToastProvider - Context provider for toast notifications
 * 
 * Features:
 * - Auto-dismiss after 4 seconds
 * - Stacked vertically in bottom-right corner
 * - Newest toast appears at the bottom
 * 
 * Requirements: 4.5, 4.6, 4.7
 */
export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Show a new toast
  const showToast = useCallback((message: string) => {
    const newToast: Toast = {
      id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
      message,
      createdAt: Date.now(),
    };
    setToasts((prev) => [...prev, newToast]);
  }, []);

  // Remove a toast by ID
  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // Auto-dismiss toasts after TOAST_DURATION
  useEffect(() => {
    if (toasts.length === 0) return;

    const timers = toasts.map((toast) => {
      const elapsed = Date.now() - toast.createdAt;
      const remaining = Math.max(0, TOAST_DURATION - elapsed);
      
      return setTimeout(() => {
        removeToast(toast.id);
      }, remaining);
    });

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [toasts, removeToast]);

  const contextValue: ToastContextValue = {
    showToast,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {createPortal(
        <ToastContainer toasts={toasts} onDismiss={removeToast} />,
        document.body
      )}
    </ToastContext.Provider>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

/**
 * ToastContainer - Renders the toast stack in bottom-right corner
 */
function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
      aria-label="Benachrichtigungen"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

/**
 * ToastItem - Individual toast notification
 */
function ToastItem({ toast, onDismiss }: ToastItemProps) {
  return (
    <div
      className="pointer-events-auto bg-gray-800 text-white px-4 py-3 rounded-lg shadow-lg max-w-sm animate-slide-in-right flex items-center gap-3"
      role="alert"
    >
      <span className="flex-1 text-sm">{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-gray-400 hover:text-white transition-colors"
        aria-label="Schließen"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export default ToastProvider;

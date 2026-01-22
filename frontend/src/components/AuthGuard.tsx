/**
 * AuthGuard component for protecting routes
 * Checks sessionStorage for authentication state
 * Shows PasswordScreen if not authenticated
 * Requirements: 1.1, 1.4, 1.5
 */

import { useState, useEffect, ReactNode } from 'react';
import { PasswordScreen } from './PasswordScreen';

// Storage key for authentication state
const AUTH_STORAGE_KEY = 'boardgame_event_auth';

interface AuthGuardProps {
  children: ReactNode;
  onAuthChange?: (isAuthenticated: boolean) => void;
}

/**
 * Check if user is authenticated by reading from sessionStorage
 */
function checkAuthentication(): boolean {
  try {
    const authState = sessionStorage.getItem(AUTH_STORAGE_KEY);
    return authState === 'true';
  } catch {
    // sessionStorage might not be available
    return false;
  }
}

/**
 * Store authentication state in sessionStorage
 */
function setAuthentication(isAuthenticated: boolean): void {
  try {
    if (isAuthenticated) {
      sessionStorage.setItem(AUTH_STORAGE_KEY, 'true');
    } else {
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
    }
  } catch {
    // sessionStorage might not be available
    console.warn('Unable to store authentication state in sessionStorage');
  }
}

export function AuthGuard({ children, onAuthChange }: AuthGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return checkAuthentication();
  });

  // Notify parent of auth state changes
  useEffect(() => {
    onAuthChange?.(isAuthenticated);
  }, [isAuthenticated, onAuthChange]);

  const handleAuthenticated = () => {
    setAuthentication(true);
    setIsAuthenticated(true);
  };

  // Show password screen if not authenticated
  if (!isAuthenticated) {
    return <PasswordScreen onAuthenticated={handleAuthenticated} />;
  }

  // Render children if authenticated
  return <>{children}</>;
}

/**
 * Utility function to clear authentication (for logout)
 */
export function clearAuthentication(): void {
  setAuthentication(false);
}

/**
 * Utility function to check if user is authenticated
 */
export function isUserAuthenticated(): boolean {
  return checkAuthentication();
}

export default AuthGuard;

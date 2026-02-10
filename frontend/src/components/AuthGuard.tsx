/**
 * AuthGuard component for protecting routes
 * Reads JWT event token from localStorage, decodes payload to check expiry
 * Shows PasswordScreen if token is missing or expired
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2
 */

import { useState, useEffect, ReactNode } from 'react';
import { PasswordScreen } from './PasswordScreen';
import { getEventToken, setEventToken, removeEventToken } from '../api/client';

interface AuthGuardProps {
  children: ReactNode;
  onAuthChange?: (isAuthenticated: boolean) => void;
}

/**
 * Decode a JWT payload (base64) without cryptographic verification.
 * The frontend only needs to read the `exp` claim for expiry checks;
 * actual signature verification happens on the backend.
 */
function decodeTokenPayload(token: string): { exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch {
    return null;
  }
}

/**
 * Check if event access is authenticated by reading the JWT from localStorage
 * and verifying it has not expired.
 */
function checkAuthentication(): boolean {
  try {
    const token = getEventToken();
    if (!token) return false;

    const payload = decodeTokenPayload(token);
    if (!payload || !payload.exp) {
      removeEventToken();
      return false;
    }

    const now = Date.now() / 1000;
    if (payload.exp < now) {
      removeEventToken();
      return false;
    }

    return true;
  } catch {
    // localStorage might not be available
    console.warn('Unable to read authentication state from localStorage');
    return false;
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

  const handleAuthenticated = (token: string) => {
    setEventToken(token);
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
  removeEventToken();
}

/**
 * Utility function to check if event access is authenticated
 */
export function isEventAuthenticated(): boolean {
  return checkAuthentication();
}

export default AuthGuard;

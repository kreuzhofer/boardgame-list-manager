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
  slug?: string;
  eventName?: string;
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
function checkAuthentication(slug?: string): boolean {
  try {
    const token = getEventToken(slug);
    if (!token) return false;

    const payload = decodeTokenPayload(token);
    if (!payload || !payload.exp) {
      removeEventToken(slug);
      return false;
    }

    const now = Date.now() / 1000;
    if (payload.exp < now) {
      removeEventToken(slug);
      return false;
    }

    return true;
  } catch {
    // localStorage might not be available
    console.warn('Unable to read authentication state from localStorage');
    return false;
  }
}

export function AuthGuard({ children, slug, eventName, onAuthChange }: AuthGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return checkAuthentication(slug);
  });

  // Re-check auth when slug changes
  useEffect(() => {
    setIsAuthenticated(checkAuthentication(slug));
  }, [slug]);

  // Notify parent of auth state changes
  useEffect(() => {
    onAuthChange?.(isAuthenticated);
  }, [isAuthenticated, onAuthChange]);

  const handleAuthenticated = (token: string) => {
    setEventToken(token, slug);
    setIsAuthenticated(true);
  };

  // Show password screen if not authenticated
  if (!isAuthenticated) {
    return <PasswordScreen slug={slug} eventName={eventName} onAuthenticated={handleAuthenticated} />;
  }

  // Render children if authenticated
  return <>{children}</>;
}

/**
 * Utility function to clear authentication (for logout)
 */
export function clearAuthentication(slug?: string): void {
  removeEventToken(slug);
}

/**
 * Utility function to check if event access is authenticated
 */
export function isEventAuthenticated(slug?: string): boolean {
  return checkAuthentication(slug);
}

export default AuthGuard;

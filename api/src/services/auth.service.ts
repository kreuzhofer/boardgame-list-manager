import { config } from '../config';

/**
 * AuthService handles password verification for the event.
 * Compares input against the EVENT_PASSWORD environment variable.
 */
export class AuthService {
  /**
   * Verifies if the provided password matches the configured event password.
   * @param password - The password to verify
   * @returns true if the password matches, false otherwise
   */
  verifyPassword(password: string): boolean {
    return password === config.auth.eventPassword;
  }
}

// Export singleton instance
export const authService = new AuthService();

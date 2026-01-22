import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock the config module before importing AuthService
jest.mock('../../config', () => ({
  config: {
    auth: {
      eventPassword: 'test-secret-password',
    },
  },
}));

// Import AuthService after mocking
import { AuthService } from '../auth.service';

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
  });

  describe('verifyPassword', () => {
    /**
     * Test correct password returns success
     * Validates: Requirements 1.2
     */
    it('should return true for correct password', () => {
      const result = authService.verifyPassword('test-secret-password');
      expect(result).toBe(true);
    });

    /**
     * Test incorrect password returns failure
     * Validates: Requirements 1.3
     */
    it('should return false for incorrect password', () => {
      const result = authService.verifyPassword('wrong-password');
      expect(result).toBe(false);
    });

    /**
     * Test empty string returns failure
     * Validates: Requirements 1.3
     */
    it('should return false for empty string', () => {
      const result = authService.verifyPassword('');
      expect(result).toBe(false);
    });

    /**
     * Test whitespace-only string returns failure
     * Validates: Requirements 1.3
     */
    it('should return false for whitespace-only string', () => {
      const result = authService.verifyPassword('   ');
      expect(result).toBe(false);
    });

    /**
     * Test case sensitivity - password should be case-sensitive
     * Validates: Requirements 1.3
     */
    it('should return false for password with different case', () => {
      const result = authService.verifyPassword('TEST-SECRET-PASSWORD');
      expect(result).toBe(false);
    });

    /**
     * Test password with leading/trailing whitespace
     * Validates: Requirements 1.3
     */
    it('should return false for password with extra whitespace', () => {
      const result = authService.verifyPassword(' test-secret-password ');
      expect(result).toBe(false);
    });
  });
});

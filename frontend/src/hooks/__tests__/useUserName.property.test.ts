/**
 * Property-based tests for useUserName hook
 * 
 * **Validates: Requirements 2.2, 2.3**
 * 
 * Property 2: Name Persistence Round-Trip
 * For any valid user name string, storing it in localStorage and then 
 * retrieving it SHALL return the exact same string.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import * as fc from 'fast-check';
import { useUserName, USER_NAME_STORAGE_KEY } from '../useUserName';

describe('useUserName - Property-Based Tests', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    // Clean up after each test
    localStorage.clear();
  });

  /**
   * Property 2: Name Persistence Round-Trip
   * **Validates: Requirements 2.2, 2.3**
   * 
   * For any valid user name string, storing it in localStorage and then
   * retrieving it SHALL return the exact same string.
   */
  describe('Property 2: Name Persistence Round-Trip', () => {
    it('should persist and retrieve any valid user name string exactly', () => {
      fc.assert(
        fc.property(
          // Generate valid user name strings:
          // - Non-empty after trimming
          // - Reasonable length (1-100 chars as per design doc)
          fc.string({ minLength: 1, maxLength: 100 })
            .filter(s => s.trim().length > 0)
            .map(s => s.trim()), // Pre-trim since the hook trims input
          (userName) => {
            // Clear localStorage for each property test iteration
            localStorage.clear();

            // Step 1: Render the hook
            const { result, rerender } = renderHook(() => useUserName());

            // Step 2: Store the name using setUserName
            act(() => {
              result.current.setUserName(userName);
            });

            // Step 3: Verify the name is immediately available in state
            expect(result.current.userName).toBe(userName);

            // Step 4: Verify the name was persisted to localStorage
            expect(localStorage.getItem(USER_NAME_STORAGE_KEY)).toBe(userName);

            // Step 5: Simulate a new hook instance (like page reload)
            // by rendering a fresh hook that reads from localStorage
            const { result: freshResult } = renderHook(() => useUserName());

            // Step 6: Verify the retrieved name matches the original exactly
            expect(freshResult.current.userName).toBe(userName);

            return true;
          }
        ),
        { numRuns: 20 } // Pure function test - use 20 runs per workspace guidelines
      );
    });

    it('should handle names with special characters in round-trip', () => {
      fc.assert(
        fc.property(
          // Generate strings with various unicode characters
          fc.stringOf(
            fc.oneof(
              fc.char(),
              fc.unicode(),
              fc.constantFrom('ä', 'ö', 'ü', 'ß', 'é', 'ñ', 'ø', '中', '日', '한')
            ),
            { minLength: 1, maxLength: 50 }
          ).filter(s => s.trim().length > 0)
           .map(s => s.trim()),
          (userName) => {
            localStorage.clear();

            const { result } = renderHook(() => useUserName());

            act(() => {
              result.current.setUserName(userName);
            });

            // Verify round-trip preserves special characters
            expect(result.current.userName).toBe(userName);
            expect(localStorage.getItem(USER_NAME_STORAGE_KEY)).toBe(userName);

            // Fresh hook should retrieve the same value
            const { result: freshResult } = renderHook(() => useUserName());
            expect(freshResult.current.userName).toBe(userName);

            return true;
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should handle names with whitespace correctly (trimming)', () => {
      fc.assert(
        fc.property(
          // Generate strings with leading/trailing whitespace
          fc.tuple(
            fc.stringOf(fc.constantFrom(' ', '\t', '\n'), { minLength: 0, maxLength: 5 }),
            fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            fc.stringOf(fc.constantFrom(' ', '\t', '\n'), { minLength: 0, maxLength: 5 })
          ).map(([leading, core, trailing]) => ({
            input: leading + core + trailing,
            expected: core.trim()
          })).filter(({ expected }) => expected.length > 0),
          ({ input, expected }) => {
            localStorage.clear();

            const { result } = renderHook(() => useUserName());

            act(() => {
              result.current.setUserName(input);
            });

            // The hook should trim the input
            expect(result.current.userName).toBe(expected);
            expect(localStorage.getItem(USER_NAME_STORAGE_KEY)).toBe(expected);

            return true;
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should not store empty strings after trimming', () => {
      fc.assert(
        fc.property(
          // Generate strings that become empty after trimming
          fc.stringOf(fc.constantFrom(' ', '\t', '\n', '\r'), { minLength: 1, maxLength: 20 }),
          (whitespaceOnly) => {
            localStorage.clear();

            const { result } = renderHook(() => useUserName());

            // Set initial valid name
            act(() => {
              result.current.setUserName('Initial Name');
            });

            expect(result.current.userName).toBe('Initial Name');

            // Try to set whitespace-only name
            act(() => {
              result.current.setUserName(whitespaceOnly);
            });

            // Should keep the previous name (whitespace-only is rejected)
            expect(result.current.userName).toBe('Initial Name');
            expect(localStorage.getItem(USER_NAME_STORAGE_KEY)).toBe('Initial Name');

            return true;
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});

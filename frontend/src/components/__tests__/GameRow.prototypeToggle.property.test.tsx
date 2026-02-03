/**
 * Property-based tests for GameRow prototype toggle visibility
 * Feature: prototype-toggle
 * **Validates: Requirements 022-prototype-toggle 3.1, 3.5**
 * 
 * Property 3: Desktop Prototype Toggle Visibility
 * For any game and current user, the desktop prototype toggle switch 
 * SHALL be visible if and only if:
 * - The current user is the owner of the game, AND
 * - The game has no BGG ID (bggId === null)
 */

import * as fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { GameRow } from '../GameRow';
import type { Game } from '../../types';

// Arbitrary for generating user IDs
const userIdArbitrary = fc.uuid();

// Arbitrary for generating game names
const gameNameArbitrary = fc
  .string({ minLength: 1, maxLength: 50 })
  .filter((s) => s.trim().length > 0)
  .map((s) => s.trim());

// Arbitrary for generating optional BGG IDs
const bggIdArbitrary = fc.option(fc.integer({ min: 1, max: 999999 }), { nil: null });

// Arbitrary for generating a game with configurable ownership and BGG ID
const gameArbitrary = (currentUserId: string) =>
  fc.record({
    id: fc.uuid(),
    name: gameNameArbitrary,
    owner: fc.option(
      fc.record({
        id: fc.oneof(fc.constant(currentUserId), userIdArbitrary),
        name: fc.string({ minLength: 1, maxLength: 30 }),
      }),
      { nil: null }
    ),
    bggId: bggIdArbitrary,
    yearPublished: fc.option(fc.integer({ min: 1900, max: 2030 }), { nil: null }),
    bggRating: fc.option(fc.float({ min: 1, max: 10, noNaN: true }), { nil: null }),
    addedAsAlternateName: fc.constant(null),
    alternateNames: fc.constant([]),
    isPrototype: fc.boolean(),
    players: fc.constant([]),
    bringers: fc.constant([]),
    status: fc.constantFrom('wunsch', 'verfuegbar') as fc.Arbitrary<'wunsch' | 'verfuegbar'>,
    createdAt: fc.date(),
  }) as fc.Arbitrary<Game>;

// Helper to render GameRow in a table context
function renderGameRow(game: Game, currentUserId: string, onTogglePrototype?: (gameId: string, isPrototype: boolean) => Promise<void>) {
  return render(
    <table>
      <tbody>
        <GameRow
          game={game}
          currentUserId={currentUserId}
          onTogglePrototype={onTogglePrototype}
        />
      </tbody>
    </table>
  );
}

describe('GameRow Property Tests - Prototype Toggle', () => {
  /**
   * Property 3: Desktop Prototype Toggle Visibility
   * **Validates: Requirements 022-prototype-toggle 3.1, 3.5**
   */
  describe('Property 3: Desktop Prototype Toggle Visibility', () => {
    it('should show prototype toggle if and only if user is owner AND game has no BGG ID', () => {
      fc.assert(
        fc.property(
          userIdArbitrary,
          userIdArbitrary,
          gameNameArbitrary,
          bggIdArbitrary,
          fc.boolean(),
          fc.boolean(),
          (currentUserId, potentialOwnerId, gameName, bggId, isOwnerScenario, isPrototype) => {
            // Cleanup before each iteration
            cleanup();
            
            // Determine if the game owner should be the current user
            const ownerId = isOwnerScenario ? currentUserId : potentialOwnerId;
            
            const game: Game = {
              id: 'test-id',
              name: gameName,
              owner: { id: ownerId, name: 'Owner' },
              bggId: bggId,
              yearPublished: null,
              bggRating: null,
              addedAsAlternateName: null,
              alternateNames: [],
              isPrototype: isPrototype,
              players: [],
              bringers: [],
              status: 'wunsch',
              createdAt: new Date(),
            };
            
            const onTogglePrototype = async () => {};
            
            renderGameRow(game, currentUserId, onTogglePrototype);

            const isOwner = game.owner?.id === currentUserId;
            const hasNoBggId = game.bggId === null;
            const shouldShowToggle = isOwner && hasNoBggId;

            // The toggle is now inside DesktopActionsMenu, which shows a "Weitere Aktionen" button
            // when the user is owner and game has no BGG ID
            const menuButton = screen.queryByRole('button', { name: /Weitere Aktionen/i });

            if (shouldShowToggle) {
              expect(menuButton).toBeInTheDocument();
            } else {
              expect(menuButton).not.toBeInTheDocument();
            }

            return true;
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should never show prototype toggle when game has BGG ID regardless of ownership', () => {
      fc.assert(
        fc.property(
          userIdArbitrary,
          fc.integer({ min: 1, max: 999999 }),
          gameNameArbitrary,
          (currentUserId, bggId, gameName) => {
            // Cleanup before each iteration
            cleanup();
            
            const game: Game = {
              id: 'test-id',
              name: gameName,
              owner: { id: currentUserId, name: 'Owner' }, // User IS owner
              bggId: bggId, // But game HAS BGG ID
              yearPublished: null,
              bggRating: null,
              addedAsAlternateName: null,
              alternateNames: [],
              isPrototype: false,
              players: [],
              bringers: [],
              status: 'wunsch',
              createdAt: new Date(),
            };

            const onTogglePrototype = async () => {};
            
            renderGameRow(game, currentUserId, onTogglePrototype);

            // The toggle is now inside DesktopActionsMenu, which shows a "Weitere Aktionen" button
            const menuButton = screen.queryByRole('button', { name: /Weitere Aktionen/i });
            expect(menuButton).not.toBeInTheDocument();

            return true;
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should never show prototype toggle when user is not owner regardless of BGG ID', () => {
      fc.assert(
        fc.property(
          userIdArbitrary,
          userIdArbitrary.filter((id) => id !== 'current-user'),
          gameNameArbitrary,
          (currentUserId, ownerId, gameName) => {
            // Cleanup before each iteration
            cleanup();
            
            // Ensure owner is different from current user
            if (currentUserId === ownerId) return true;

            const game: Game = {
              id: 'test-id',
              name: gameName,
              owner: { id: ownerId, name: 'Other Owner' }, // Different owner
              bggId: null, // No BGG ID
              yearPublished: null,
              bggRating: null,
              addedAsAlternateName: null,
              alternateNames: [],
              isPrototype: false,
              players: [],
              bringers: [],
              status: 'wunsch',
              createdAt: new Date(),
            };

            const onTogglePrototype = async () => {};
            
            renderGameRow(game, currentUserId, onTogglePrototype);

            // The toggle is now inside DesktopActionsMenu, which shows a "Weitere Aktionen" button
            const menuButton = screen.queryByRole('button', { name: /Weitere Aktionen/i });
            expect(menuButton).not.toBeInTheDocument();

            return true;
          }
        ),
        { numRuns: 5 }
      );
    });
  });
});

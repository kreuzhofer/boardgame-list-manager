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
import { describe, it, expect, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { GameRow } from '../GameRow';
import type { Game } from '../../types';

vi.mock('../ToastProvider', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

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
const gameArbitrary = (currentParticipantId: string) =>
  fc.record({
    id: fc.uuid(),
    name: gameNameArbitrary,
    owner: fc.option(
      fc.record({
        id: fc.oneof(fc.constant(currentParticipantId), userIdArbitrary),
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
    isHidden: fc.constant(false),
    players: fc.constant([]),
    bringers: fc.constant([]),
    status: fc.constantFrom('wunsch', 'verfuegbar') as fc.Arbitrary<'wunsch' | 'verfuegbar'>,
    createdAt: fc.date(),
  }) as fc.Arbitrary<Game>;

// Helper to render GameRow in a table context
function renderGameRow(game: Game, currentParticipantId: string, onTogglePrototype?: (gameId: string, isPrototype: boolean) => Promise<void>) {
  return render(
    <table>
      <tbody>
        <GameRow
          game={game}
          currentParticipantId={currentParticipantId}
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
          (currentParticipantId, potentialOwnerId, gameName, bggId, isOwnerScenario, isPrototype) => {
            // Cleanup before each iteration
            cleanup();
            
            // Determine if the game owner should be the current user
            const ownerId = isOwnerScenario ? currentParticipantId : potentialOwnerId;
            
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
              isHidden: false,
              players: [],
              bringers: [],
              status: 'wunsch',
              createdAt: new Date(),
            };
            
            const onTogglePrototype = async () => {};
            
            renderGameRow(game, currentParticipantId, onTogglePrototype);

            const isOwner = game.owner?.id === currentParticipantId;
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
          (currentParticipantId, bggId, gameName) => {
            // Cleanup before each iteration
            cleanup();
            
            const game: Game = {
              id: 'test-id',
              name: gameName,
              owner: { id: currentParticipantId, name: 'Owner' }, // User IS owner
              bggId: bggId, // But game HAS BGG ID
              yearPublished: null,
              bggRating: null,
              addedAsAlternateName: null,
              alternateNames: [],
              isPrototype: false,
              isHidden: false,
              players: [],
              bringers: [],
              status: 'wunsch',
              createdAt: new Date(),
            };

            const onTogglePrototype = async () => {};
            
            renderGameRow(game, currentParticipantId, onTogglePrototype);

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
          (currentParticipantId, ownerId, gameName) => {
            // Cleanup before each iteration
            cleanup();
            
            // Ensure owner is different from current user
            if (currentParticipantId === ownerId) return true;

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
              isHidden: false,
              players: [],
              bringers: [],
              status: 'wunsch',
              createdAt: new Date(),
            };

            const onTogglePrototype = async () => {};
            
            renderGameRow(game, currentParticipantId, onTogglePrototype);

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

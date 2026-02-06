/**
 * Unit tests for GameTable sorting headers
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GameTable } from '../GameTable';
import type { Game } from '../../types';

vi.mock('../GameRow', () => ({
  GameRow: () => <tr data-testid="game-row" />,
}));

vi.mock('../GameCard', () => ({
  GameCard: () => <div data-testid="game-card" />,
}));

const createGame = (name: string): Game => ({
  id: `game-${name}`,
  name,
  owner: null,
  bggId: null,
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
});

const renderGameTable = () => {
  return render(
    <GameTable
      games={[createGame('Catan')]}
      currentParticipantId="user-1"
    />
  );
};

describe('GameTable sorting headers', () => {
  it('uses text-sm on the desktop "Hinzugefügt" header to match other sort labels', () => {
    renderGameTable();

    const labels = screen.getAllByText('Hinzugefügt');
    const desktopLabel = labels.find((label) => label.closest('th'));

    expect(desktopLabel).toBeTruthy();
    expect(desktopLabel?.closest('th')).toHaveClass('text-sm');
  });

  it('keeps the mobile "Hinzugefügt" sort label at a fixed width', () => {
    renderGameTable();

    const buttons = screen.getAllByRole('button', { name: /hinzugefügt/i });
    const mobileButton = buttons.find((button) => !button.closest('table'));

    expect(mobileButton).toBeTruthy();
    expect(mobileButton).toHaveClass('w-28');
    expect(mobileButton).toHaveClass('shrink-0');
  });
});

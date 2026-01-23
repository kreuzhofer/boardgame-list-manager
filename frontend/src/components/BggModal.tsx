/**
 * BggModal component - DEPRECATED
 * BoardGameGeek blocks iframe embedding, so we now open in a new tab instead.
 * This file is kept for the getBggUrl utility function.
 * 
 * Requirements: 7.3
 */

/**
 * Generates the BGG URL for a given bggId
 */
export function getBggUrl(bggId: number): string {
  return `https://boardgamegeek.com/boardgame/${bggId}`;
}

/**
 * Opens the BoardGameGeek page for a game in a new tab
 */
export function openBggPage(bggId: number): void {
  window.open(getBggUrl(bggId), '_blank', 'noopener,noreferrer');
}

// Keep BggModal export for backwards compatibility, but it's no longer used
export function BggModal() {
  return null;
}

export default BggModal;

import type { SSEEvent, GameCreatedEvent, BringerAddedEvent } from '../types';

/**
 * Get the toast message for an SSE event.
 * Returns null for events that should not trigger a toast.
 * 
 * Toast messages are in German:
 * - game:created with isBringing: "NAME bringt GAME_NAME mit"
 * - game:created without isBringing: "NAME wünscht sich GAME_NAME"
 * - game:bringer-added: "NAME bringt GAME_NAME mit"
 * - All other events: null (no toast)
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */
export function getToastMessage(event: SSEEvent): string | null {
  switch (event.type) {
    case 'game:created': {
      const createdEvent = event as GameCreatedEvent;
      if (createdEvent.isBringing) {
        return `${createdEvent.userName} bringt ${createdEvent.gameName} mit`;
      }
      return `${createdEvent.userName} wünscht sich ${createdEvent.gameName}`;
    }
    case 'game:bringer-added': {
      const bringerEvent = event as BringerAddedEvent;
      return `${bringerEvent.userName} bringt ${bringerEvent.gameName} mit`;
    }
    // No toast for these events
    case 'game:bringer-removed':
    case 'game:player-added':
    case 'game:player-removed':
    case 'game:deleted':
      return null;
    default:
      return null;
  }
}

/**
 * Check if an event should trigger a toast notification.
 * Only game:created and game:bringer-added events trigger toasts.
 */
export function shouldShowToast(event: SSEEvent): boolean {
  return event.type === 'game:created' || event.type === 'game:bringer-added';
}

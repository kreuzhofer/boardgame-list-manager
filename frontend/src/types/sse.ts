// SSE Event Types for Frontend

export type SSEEventType =
  | 'game:created'
  | 'game:bringer-added'
  | 'game:bringer-removed'
  | 'game:player-added'
  | 'game:player-removed'
  | 'game:deleted';

// Base event structure
export interface BaseSSEEvent {
  type: SSEEventType;
  gameId: string;
  userId: string;
}

// Event for game creation
export interface GameCreatedEvent extends BaseSSEEvent {
  type: 'game:created';
  userName: string;
  gameName: string;
  isBringing: boolean;
}

// Event for bringer added
export interface BringerAddedEvent extends BaseSSEEvent {
  type: 'game:bringer-added';
  userName: string;
  gameName: string;
}

// Event for bringer removed
export interface BringerRemovedEvent extends BaseSSEEvent {
  type: 'game:bringer-removed';
}

// Event for player added
export interface PlayerAddedEvent extends BaseSSEEvent {
  type: 'game:player-added';
}

// Event for player removed
export interface PlayerRemovedEvent extends BaseSSEEvent {
  type: 'game:player-removed';
}

// Event for game deleted
export interface GameDeletedEvent extends BaseSSEEvent {
  type: 'game:deleted';
}

// Union type for all SSE events
export type SSEEvent =
  | GameCreatedEvent
  | BringerAddedEvent
  | BringerRemovedEvent
  | PlayerAddedEvent
  | PlayerRemovedEvent
  | GameDeletedEvent;

// Helper type guards
export function isGameCreatedEvent(event: SSEEvent): event is GameCreatedEvent {
  return event.type === 'game:created';
}

export function isBringerAddedEvent(event: SSEEvent): event is BringerAddedEvent {
  return event.type === 'game:bringer-added';
}

export function hasToastData(event: SSEEvent): event is GameCreatedEvent | BringerAddedEvent {
  return event.type === 'game:created' || event.type === 'game:bringer-added';
}

// Toast state types
export interface Toast {
  id: string;
  message: string;
  createdAt: number;
}

// SSE Event Types for Frontend

export type SSEEventType =
  | 'game:created'
  | 'game:bringer-added'
  | 'game:bringer-removed'
  | 'game:player-added'
  | 'game:player-removed'
  | 'game:deleted'
  | 'game:prototype-toggled'
  | 'game:thumbnail-uploaded';

// Base event structure
export interface BaseSSEEvent {
  type: SSEEventType;
  gameId: string;
  participantId: string;
}

// Event for game creation
export interface GameCreatedEvent extends BaseSSEEvent {
  type: 'game:created';
  participantName: string;
  gameName: string;
  isBringing: boolean;
}

// Event for bringer added
export interface BringerAddedEvent extends BaseSSEEvent {
  type: 'game:bringer-added';
  participantName: string;
  gameName: string;
}

// Event for bringer removed
export interface BringerRemovedEvent extends BaseSSEEvent {
  type: 'game:bringer-removed';
}

// Event for player added
export interface PlayerAddedEvent extends BaseSSEEvent {
  type: 'game:player-added';
  participantName: string;
  gameName: string;
}

// Event for player removed
export interface PlayerRemovedEvent extends BaseSSEEvent {
  type: 'game:player-removed';
}

// Event for game deleted
export interface GameDeletedEvent extends BaseSSEEvent {
  type: 'game:deleted';
}

// Event for prototype status toggled
export interface PrototypeToggledEvent extends BaseSSEEvent {
  type: 'game:prototype-toggled';
  isPrototype: boolean;
}

// Event for thumbnail uploaded
export interface ThumbnailUploadedEvent extends BaseSSEEvent {
  type: 'game:thumbnail-uploaded';
  /** Timestamp for cache-busting */
  timestamp: number;
}

// Union type for all SSE events
export type SSEEvent =
  | GameCreatedEvent
  | BringerAddedEvent
  | BringerRemovedEvent
  | PlayerAddedEvent
  | PlayerRemovedEvent
  | GameDeletedEvent
  | PrototypeToggledEvent
  | ThumbnailUploadedEvent;

// Helper type guards
export function isGameCreatedEvent(event: SSEEvent): event is GameCreatedEvent {
  return event.type === 'game:created';
}

export function isBringerAddedEvent(event: SSEEvent): event is BringerAddedEvent {
  return event.type === 'game:bringer-added';
}

export function hasToastData(event: SSEEvent): event is GameCreatedEvent | BringerAddedEvent | PlayerAddedEvent {
  return event.type === 'game:created' || event.type === 'game:bringer-added' || event.type === 'game:player-added';
}

// Toast state types
export interface Toast {
  id: string;
  message: string;
  createdAt: number;
}

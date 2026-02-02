// SSE Event Types

export type SSEEventType =
  | 'game:created'
  | 'game:bringer-added'
  | 'game:bringer-removed'
  | 'game:player-added'
  | 'game:player-removed'
  | 'game:deleted'
  | 'game:prototype-toggled';

// Base event structure
export interface BaseGameEvent {
  type: SSEEventType;
  gameId: string;
  userId: string;
}

// Event for game creation
export interface GameCreatedEvent extends BaseGameEvent {
  type: 'game:created';
  userName: string;
  gameName: string;
  isBringing: boolean;
}

// Event for bringer added
export interface BringerAddedEvent extends BaseGameEvent {
  type: 'game:bringer-added';
  userName: string;
  gameName: string;
}

// Event for bringer removed
export interface BringerRemovedEvent extends BaseGameEvent {
  type: 'game:bringer-removed';
}

// Event for player added
export interface PlayerAddedEvent extends BaseGameEvent {
  type: 'game:player-added';
  userName: string;
  gameName: string;
}

// Event for player removed
export interface PlayerRemovedEvent extends BaseGameEvent {
  type: 'game:player-removed';
}

// Event for game deleted
export interface GameDeletedEvent extends BaseGameEvent {
  type: 'game:deleted';
}

// Event for prototype status toggled
export interface PrototypeToggledEvent extends BaseGameEvent {
  type: 'game:prototype-toggled';
  isPrototype: boolean;
}

// Union type for all SSE events
export type GameEvent =
  | GameCreatedEvent
  | BringerAddedEvent
  | BringerRemovedEvent
  | PlayerAddedEvent
  | PlayerRemovedEvent
  | GameDeletedEvent
  | PrototypeToggledEvent;

// Helper type guards
export function isGameCreatedEvent(event: GameEvent): event is GameCreatedEvent {
  return event.type === 'game:created';
}

export function isBringerAddedEvent(event: GameEvent): event is BringerAddedEvent {
  return event.type === 'game:bringer-added';
}

export function hasToastData(event: GameEvent): event is GameCreatedEvent | BringerAddedEvent | PlayerAddedEvent {
  return event.type === 'game:created' || event.type === 'game:bringer-added' || event.type === 'game:player-added';
}

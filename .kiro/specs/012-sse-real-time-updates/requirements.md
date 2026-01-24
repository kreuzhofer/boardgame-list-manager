# Requirements Document

## Introduction

This feature integrates Server-Sent Events (SSE) into the board game event application to provide real-time updates across all connected clients. When any user performs game-related actions (adding games, bringing games, playing games, removing games, or stopping bringing), all connected clients receive notifications to refresh the affected game data. Additionally, toast notifications in German inform users about specific actions performed by others.

## Glossary

- **SSE_Endpoint**: The server-side endpoint that maintains persistent HTTP connections with clients and pushes events
- **SSE_Client**: The frontend component that establishes and maintains a connection to the SSE_Endpoint
- **Game_Event**: A server-side event triggered when a game-related action occurs (create, add bringer, remove bringer, add player, remove player, delete)
- **Toast_Notification**: A temporary, auto-dismissing UI message displayed to inform users of actions by others
- **Game_Row**: A single row in the game table representing one game entry
- **Event_Payload**: The data structure sent via SSE containing event type, game ID, user name, and game name

## Requirements

### Requirement 1: SSE Connection Management

**User Story:** As a user, I want my browser to automatically connect to the server for real-time updates, so that I see changes made by other users without manually refreshing.

#### Acceptance Criteria

1. WHEN the HomePage component mounts, THE SSE_Client SHALL establish a connection to the SSE_Endpoint at `/api/events`
2. WHEN the SSE connection is lost, THE SSE_Client SHALL automatically attempt to reconnect with exponential backoff (1s, 2s, 4s, max 30s)
3. WHEN the HomePage component unmounts, THE SSE_Client SHALL close the SSE connection to prevent resource leaks
4. WHILE the SSE connection is active, THE SSE_Client SHALL process incoming events and trigger appropriate UI updates

### Requirement 2: Server-Side Event Broadcasting

**User Story:** As a system, I want to broadcast events when game data changes, so that all connected clients can stay synchronized.

#### Acceptance Criteria

1. WHEN a game is created, THE SSE_Endpoint SHALL broadcast a `game:created` event with the game ID, game name, user name, and whether the user is bringing the game
2. WHEN a user adds themselves as a bringer to an existing game, THE SSE_Endpoint SHALL broadcast a `game:bringer-added` event with the game ID, game name, and user name
3. WHEN a user removes themselves as a bringer, THE SSE_Endpoint SHALL broadcast a `game:bringer-removed` event with the game ID
4. WHEN a user adds themselves as a player, THE SSE_Endpoint SHALL broadcast a `game:player-added` event with the game ID
5. WHEN a user removes themselves as a player, THE SSE_Endpoint SHALL broadcast a `game:player-removed` event with the game ID
6. WHEN a game is deleted, THE SSE_Endpoint SHALL broadcast a `game:deleted` event with the game ID
7. THE SSE_Endpoint SHALL maintain a list of connected clients and broadcast events to all of them

### Requirement 3: Client-Side Data Refresh

**User Story:** As a user, I want to see updated game data when others make changes, so that I always have accurate information without refreshing the page.

#### Acceptance Criteria

1. WHEN a `game:created` event is received, THE SSE_Client SHALL fetch the new game from the server and add it to the local game list
2. WHEN a `game:bringer-added`, `game:bringer-removed`, `game:player-added`, or `game:player-removed` event is received, THE SSE_Client SHALL fetch the updated game data for that specific game ID and update the local state
3. WHEN a `game:deleted` event is received, THE SSE_Client SHALL remove the game from the local game list
4. WHEN updating game data, THE SSE_Client SHALL NOT disrupt the user's current scroll position
5. WHEN updating game data, THE SSE_Client SHALL update only the affected Game_Row without re-rendering the entire list

### Requirement 4: Toast Notifications

**User Story:** As a user, I want to see brief notifications when others add or bring games, so that I'm aware of activity without being distracted.

#### Acceptance Criteria

1. WHEN a `game:created` event is received with `isBringing: true`, THE Toast_Notification SHALL display "NAME bringt GAME_NAME mit" where NAME is the user's name and GAME_NAME is the game name
2. WHEN a `game:created` event is received with `isBringing: false`, THE Toast_Notification SHALL display "NAME hat GAME_NAME hinzugefügt"
3. WHEN a `game:bringer-added` event is received, THE Toast_Notification SHALL display "NAME bringt GAME_NAME mit"
4. THE Toast_Notification SHALL NOT display for `game:bringer-removed`, `game:player-added`, `game:player-removed`, or `game:deleted` events
5. THE Toast_Notification SHALL auto-dismiss after 4 seconds
6. THE Toast_Notification SHALL appear in a non-intrusive position (bottom-right corner)
7. WHEN multiple Toast_Notifications occur, THE system SHALL stack them vertically with the newest at the bottom
8. THE Toast_Notification SHALL NOT display for events triggered by the current user's own actions

### Requirement 5: Event Payload Structure

**User Story:** As a developer, I want a consistent event payload structure, so that the frontend can reliably process events.

#### Acceptance Criteria

1. THE Event_Payload SHALL include a `type` field indicating the event type (e.g., `game:created`, `game:bringer-added`)
2. THE Event_Payload SHALL include a `gameId` field containing the affected game's unique identifier
3. THE Event_Payload SHALL include a `userId` field containing the ID of the user who triggered the action
4. WHEN the event type is `game:created` or `game:bringer-added`, THE Event_Payload SHALL include `userName` and `gameName` fields for toast display
5. WHEN the event type is `game:created`, THE Event_Payload SHALL include an `isBringing` boolean field
6. THE Event_Payload SHALL be serialized as JSON within the SSE data field

### Requirement 6: Error Handling and Resilience

**User Story:** As a user, I want the app to handle connection issues gracefully, so that I can continue using it even with intermittent connectivity.

#### Acceptance Criteria

1. IF the SSE connection fails to establish, THEN THE SSE_Client SHALL retry with exponential backoff
2. IF the server sends a malformed event, THEN THE SSE_Client SHALL log the error and continue processing subsequent events
3. IF fetching updated game data fails, THEN THE SSE_Client SHALL log the error and not crash the application
4. WHILE the SSE connection is disconnected, THE application SHALL continue to function normally with manual refresh capability

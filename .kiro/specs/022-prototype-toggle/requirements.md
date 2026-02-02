# Requirements Document

## Introduction

This feature enables owners of board game list entries to toggle the prototype status of their self-added non-BGG games after the initial creation. Currently, prototype status can only be set during game creation. This enhancement allows owners to mark or unmark games as prototypes at any time through the game list UI.

## Glossary

- **Game_Entry**: A board game record in the shared list, containing name, owner, players, bringers, and metadata
- **Prototype**: A game marked as a prototype (unpublished/in-development game), indicated by the `isPrototype` flag
- **Owner**: The user who originally added the game entry to the list
- **Non_BGG_Game**: A game entry that does not have a BoardGameGeek ID (`bggId` is null)
- **Toggle_Switch**: A UI control that allows switching between two states (on/off)
- **Actions_Menu**: A dropdown menu containing additional actions for a game entry (mobile view)

## Requirements

### Requirement 1: Prototype Toggle API Endpoint

**User Story:** As a game owner, I want to toggle the prototype status of my game via an API, so that the change is persisted and synchronized across all clients.

#### Acceptance Criteria

1. WHEN an owner sends a PATCH request to `/api/games/:id/prototype` with `{ isPrototype: boolean }` THEN THE API SHALL update the game's prototype status and return the updated game
2. WHEN a non-owner attempts to toggle prototype status THEN THE API SHALL return a 403 Forbidden error with message "Du bist nicht berechtigt, dieses Spiel zu bearbeiten."
3. WHEN a user attempts to toggle prototype status on a game with a BGG ID THEN THE API SHALL return a 400 Bad Request error with message "Nur Spiele ohne BGG-Eintrag können als Prototyp markiert werden."
4. WHEN the prototype status is successfully toggled THEN THE API SHALL broadcast an SSE event `game:prototype-toggled` with gameId, userId, and isPrototype fields
5. IF the game ID does not exist THEN THE API SHALL return a 404 Not Found error with message "Spiel nicht gefunden."

### Requirement 2: Mobile Card View Prototype Toggle

**User Story:** As a mobile user and game owner, I want to access a prototype toggle through an actions menu, so that I can mark my non-BGG games as prototypes without cluttering the limited mobile screen space.

#### Acceptance Criteria

1. WHEN viewing a game card on mobile where the current user is the owner AND the game has no BGG ID THEN THE Game_Card SHALL display a "..." (more actions) button
2. WHEN the user taps the "..." button THEN THE Game_Card SHALL display an Actions_Menu containing a "Prototyp" toggle switch
3. WHEN the user toggles the "Prototyp" switch THEN THE Game_Card SHALL call the prototype toggle API and update the UI to reflect the new state
4. WHILE the API request is in progress THEN THE Toggle_Switch SHALL display a loading state
5. IF the API request fails THEN THE Game_Card SHALL display an error notification and revert the toggle to its previous state
6. WHEN viewing a game card where the current user is NOT the owner OR the game has a BGG ID THEN THE Game_Card SHALL NOT display the "..." button for prototype actions

### Requirement 3: Desktop Row View Prototype Toggle

**User Story:** As a desktop user and game owner, I want to see a prototype toggle switch directly in the game row, so that I can quickly toggle prototype status without additional clicks.

#### Acceptance Criteria

1. WHEN viewing a game row on desktop where the current user is the owner AND the game has no BGG ID THEN THE Game_Row SHALL display a "Prototyp" toggle switch after all other action buttons
2. WHEN the user clicks the toggle switch THEN THE Game_Row SHALL call the prototype toggle API and update the UI to reflect the new state
3. WHILE the API request is in progress THEN THE Toggle_Switch SHALL display a loading state
4. IF the API request fails THEN THE Game_Row SHALL display an error notification and revert the toggle to its previous state
5. WHEN viewing a game row where the current user is NOT the owner OR the game has a BGG ID THEN THE Game_Row SHALL NOT display the prototype toggle switch

### Requirement 4: Real-time Synchronization

**User Story:** As a user viewing the game list, I want to see prototype status changes in real-time, so that I always see the current state without refreshing.

#### Acceptance Criteria

1. WHEN a `game:prototype-toggled` SSE event is received THEN THE Game_List SHALL update the affected game's prototype indicator without a full page refresh
2. WHEN the prototype status changes THEN THE Game_Card and Game_Row SHALL update the prototype badge/indicator accordingly

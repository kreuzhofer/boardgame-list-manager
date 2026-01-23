# Requirements Document

## Introduction

This feature adds logout functionality and game ownership management to the board game event application. Users can log out to return to the user selection screen, and game entries now have owners who can delete their games. The system ensures games persist even when their owner's account is deleted.

## Glossary

- **System**: The board game event application
- **User**: A person using the application, stored in the User table
- **Game**: A board game entry in the system, stored in the Game table
- **Owner**: The user who created a game entry
- **Logout**: The action of clearing the current user session and returning to user selection
- **User_Selection_Screen**: The modal shown when no user is logged in, allowing user selection or creation

## Requirements

### Requirement 1: Logout Functionality

**User Story:** As a user, I want to log out of the application, so that I can switch to a different user or let someone else use the device.

#### Acceptance Criteria

1. THE System SHALL display a logout button in the header when a user is logged in
2. WHEN a user clicks the logout button, THE System SHALL clear the user ID from localStorage
3. WHEN a user clicks the logout button, THE System SHALL display the User_Selection_Screen
4. WHEN a user logs out, THE System SHALL reset the application state as if the user were a new visitor

### Requirement 2: Game Ownership

**User Story:** As a user who creates a game, I want the game to be associated with me as the owner, so that I have control over the game entry I created.

#### Acceptance Criteria

1. THE Game table SHALL have an ownerId field referencing the User who created the game
2. WHEN a user creates a new game, THE System SHALL set the ownerId to the creating user's ID
3. THE System SHALL display the owner's name for each game in the game list
4. WHEN the ownerId field is null, THE System SHALL display "Kein Besitzer" (No owner) for the game

### Requirement 3: Game Deletion by Owner

**User Story:** As a game owner, I want to delete my game entry, so that I can remove games I no longer want listed.

#### Acceptance Criteria

1. WHEN displaying a game, THE System SHALL show a delete button only to the game's owner
2. THE System SHALL only allow deletion of a game when it has no players and no bringers
3. WHEN a game has players or bringers, THE System SHALL disable the delete button and display a tooltip explaining the restriction
4. WHEN the owner clicks the delete button on an empty game, THE System SHALL prompt for confirmation before deletion
5. WHEN the owner confirms deletion, THE System SHALL remove the game from the database
6. WHEN a non-owner attempts to delete a game via API, THE System SHALL return a 403 Forbidden error
7. WHEN attempting to delete a game with players or bringers via API, THE System SHALL return a 400 Bad Request error
8. IF a game has no owner (ownerId is null), THEN THE System SHALL not display a delete button for that game

### Requirement 4: No Cascade Delete on User Deletion

**User Story:** As a system administrator, I want games to persist when a user is deleted, so that game history is preserved.

#### Acceptance Criteria

1. WHEN a user is deleted, THE System SHALL set the ownerId to null for all games owned by that user
2. WHEN a user is deleted, THE System SHALL NOT delete any games owned by that user
3. THE Game table ownerId field SHALL allow null values to support orphaned games
4. WHEN a user is deleted, THE System SHALL still cascade delete their Player and Bringer associations

### Requirement 5: User Account Deletion Restriction

**User Story:** As a user, I should not be able to delete my own account, so that accidental data loss is prevented.

#### Acceptance Criteria

1. THE System SHALL NOT provide a UI option for users to delete their own account
2. THE System SHALL continue to allow user name editing functionality

# Requirements Document

## Introduction

This feature introduces a User table to the board game event application, enabling centralized user management. Currently, player and bringer names are stored as plain text strings directly in the Player and Bringer tables. This change will create a dedicated User entity with a unique ID and name, allowing all references (players, bringers) to use foreign keys instead of text. This enables name changes to propagate automatically throughout the system.

This is a **BREAKING CHANGE** - existing data will be dropped and not migrated.

## Glossary

- **User**: A person participating in the board game event, stored in the User table with a unique ID and name
- **User_Table**: The database table storing user records with id and name fields
- **Player**: A user who wants to play a specific game (references User by foreign key)
- **Bringer**: A user who will bring a specific game to the event (references User by foreign key)
- **User_Service**: The backend service handling user CRUD operations
- **User_Repository**: The data access layer for User table operations
- **Current_User**: The user currently logged in on the frontend (stored in localStorage by user ID)

## Requirements

### Requirement 1: User Table Schema

**User Story:** As a system administrator, I want users stored in a dedicated table with unique IDs, so that user data is normalized and can be referenced consistently.

#### Acceptance Criteria

1. THE User_Table SHALL store each user with a unique UUID identifier
2. THE User_Table SHALL store each user with a name field (non-empty string)
3. THE User_Table SHALL enforce uniqueness on the name field
4. THE User_Table SHALL include createdAt and updatedAt timestamp fields
5. WHEN a user is created, THE User_Table SHALL auto-generate the UUID

### Requirement 2: Player and Bringer Foreign Key References

**User Story:** As a developer, I want Player and Bringer records to reference users by ID, so that name changes propagate automatically.

#### Acceptance Criteria

1. THE Player table SHALL reference User by userId foreign key instead of storing userName as text
2. THE Bringer table SHALL reference User by userId foreign key instead of storing userName as text
3. WHEN a User is deleted, THE System SHALL cascade delete all associated Player and Bringer records
4. THE Player table SHALL maintain a unique constraint on (gameId, userId) combination
5. THE Bringer table SHALL maintain a unique constraint on (gameId, userId) combination

### Requirement 3: User CRUD API Endpoints

**User Story:** As a frontend developer, I want API endpoints to manage users, so that I can create, read, update, and list users.

#### Acceptance Criteria

1. WHEN a GET request is made to /api/users, THE User_Service SHALL return all users sorted by name
2. WHEN a GET request is made to /api/users/:id, THE User_Service SHALL return the user with that ID
3. IF a GET request is made for a non-existent user ID, THEN THE User_Service SHALL return a 404 error
4. WHEN a POST request is made to /api/users with a valid name, THE User_Service SHALL create a new user and return it
5. IF a POST request is made with an empty or whitespace-only name, THEN THE User_Service SHALL return a 400 validation error
6. IF a POST request is made with a name that already exists, THEN THE User_Service SHALL return a 409 conflict error
7. WHEN a PATCH request is made to /api/users/:id with a new name, THE User_Service SHALL update the user's name
8. IF a PATCH request is made with an empty or whitespace-only name, THEN THE User_Service SHALL return a 400 validation error
9. IF a PATCH request is made with a name that already exists for another user, THEN THE User_Service SHALL return a 409 conflict error
10. WHEN a DELETE request is made to /api/users/:id, THE User_Service SHALL delete the user and cascade to Player/Bringer records

### Requirement 4: Game API Updates for User References

**User Story:** As a frontend developer, I want game-related APIs to work with user IDs, so that the system uses normalized user references.

#### Acceptance Criteria

1. WHEN creating a game, THE Game_Service SHALL accept userId instead of userName
2. WHEN adding a player to a game, THE Game_Service SHALL accept userId instead of userName
3. WHEN adding a bringer to a game, THE Game_Service SHALL accept userId instead of userName
4. WHEN removing a player from a game, THE Game_Service SHALL use userId in the URL path
5. WHEN removing a bringer from a game, THE Game_Service SHALL use userId in the URL path
6. WHEN returning game data, THE Game_Service SHALL include the full user object (id and name) for each player and bringer

### Requirement 5: Frontend User Selection

**User Story:** As an event participant, I want to select my user from a list or create a new user, so that I can identify myself in the application.

#### Acceptance Criteria

1. WHEN the application loads without a stored user, THE Frontend SHALL prompt the user to select or create their identity
2. THE Frontend SHALL display a dropdown/list of existing users to select from
3. THE Frontend SHALL provide an option to create a new user with a name input
4. WHEN a user is selected or created, THE Frontend SHALL store the user ID in localStorage
5. WHEN the application loads with a stored user ID, THE Frontend SHALL verify the user still exists via API
6. IF the stored user ID no longer exists, THEN THE Frontend SHALL clear localStorage and prompt for user selection

### Requirement 6: Frontend User Name Display

**User Story:** As an event participant, I want to see user names displayed throughout the application, so that I know who is playing and bringing games.

#### Acceptance Criteria

1. WHEN displaying player lists, THE Frontend SHALL show user names from the user object
2. WHEN displaying bringer lists, THE Frontend SHALL show user names from the user object
3. WHEN displaying the current user in the header, THE Frontend SHALL show the user's name
4. WHEN a user's name is updated, THE Frontend SHALL reflect the change on next data fetch

### Requirement 7: User Name Change

**User Story:** As an event participant, I want to change my display name, so that I can correct typos or update my name.

#### Acceptance Criteria

1. THE Frontend SHALL provide a way for the current user to edit their name
2. WHEN the user submits a name change, THE Frontend SHALL call the PATCH /api/users/:id endpoint
3. IF the name change succeeds, THEN THE Frontend SHALL update the displayed name
4. IF the name change fails due to duplicate, THEN THE Frontend SHALL display an error message in German

### Requirement 8: Data Migration Strategy

**User Story:** As a system administrator, I want a clear migration path, so that I understand the impact of this change.

#### Acceptance Criteria

1. THE Migration SHALL drop all existing Player records
2. THE Migration SHALL drop all existing Bringer records
3. THE Migration SHALL drop all existing Game records
4. THE Migration SHALL create the new User table
5. THE Migration SHALL update Player table schema to use userId foreign key
6. THE Migration SHALL update Bringer table schema to use userId foreign key

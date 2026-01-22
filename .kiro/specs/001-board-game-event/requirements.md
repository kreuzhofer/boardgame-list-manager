# Requirements Document

## Introduction

This document defines the requirements for a board game event coordination application. The application helps organizers and participants of private board game events (~100 players) coordinate which games will be available at the event. The primary focus is pre-event coordination: preventing duplicate game copies, allowing players to request games they want to play, and enabling others to fulfill those requests by bringing the games.

## Glossary

- **Event_App**: The board game event coordination application
- **User**: A person who has authenticated with the shared password and entered their name
- **Game**: A board game entry in the shared list
- **Player**: A user who has indicated interest in playing a specific game ("Möchte ich spielen")
- **Bringer**: A user who has indicated they will bring a specific game ("Bringe ich mit")
- **Wunsch_Game**: A game where players are interested but no one is bringing it (status: "Wunsch")
- **Available_Game**: A game where at least one person is bringing it (status: "Verfügbar")
- **Game_List**: The shared list of all games for the event
- **Statistics_Dashboard**: A view showing aggregate data about games and participants

## Requirements

### Requirement 1: Password Authentication

**User Story:** As an event organizer, I want all pages protected by a single shared password, so that only invited participants can access the application.

#### Acceptance Criteria

1. WHEN a user visits any page without authentication THEN THE Event_App SHALL redirect to a password entry screen
2. WHEN a user enters the correct password THEN THE Event_App SHALL grant access to the application
3. WHEN a user enters an incorrect password THEN THE Event_App SHALL display an error message and remain on the password screen
4. THE Event_App SHALL persist the authentication state in the browser session
5. WHEN an authenticated user closes and reopens the browser THEN THE Event_App SHALL require re-authentication

### Requirement 2: User Name Management

**User Story:** As a participant, I want to enter my name once and have it remembered, so that I don't have to re-enter it on subsequent visits.

#### Acceptance Criteria

1. WHEN a user authenticates successfully and has no stored name THEN THE Event_App SHALL prompt for name entry
2. WHEN a user enters their name THEN THE Event_App SHALL persist the name in browser localStorage
3. WHEN a returning user authenticates THEN THE Event_App SHALL retrieve and use the stored name from localStorage
4. THE Event_App SHALL display the current user's name in the interface
5. WHEN a user wants to change their name THEN THE Event_App SHALL provide an option to update the stored name

### Requirement 3: Game List Management

**User Story:** As a participant, I want to add board games to a shared list and indicate my interest or intent to bring them, so that we can coordinate which games will be available at the event.

#### Acceptance Criteria

1. WHEN a user adds a new game THEN THE Event_App SHALL create a game entry with the game name
2. WHEN a user adds a new game THEN THE Event_App SHALL optionally allow the user to flag "Bringe ich mit"
3. WHEN a user adds a game with "Bringe ich mit" flagged THEN THE Event_App SHALL add the user to both the players list and the bringers list
4. WHEN a user adds a game without "Bringe ich mit" flagged THEN THE Event_App SHALL add the user only to the players list
5. WHEN a user indicates interest in an existing game THEN THE Event_App SHALL add the user to that game's players list
6. WHEN a user indicates they will bring an existing game THEN THE Event_App SHALL add the user to that game's bringers list
7. THE Event_App SHALL allow multiple users to be bringers for the same game
8. THE Event_App SHALL allow unlimited players per game
9. THE Event_App SHALL display players and bringers separately for each game

### Requirement 4: Game Status System

**User Story:** As a participant, I want to see which games are requested but not yet available, so that I can decide to bring a game that others want to play.

#### Acceptance Criteria

1. WHEN a game has players but no bringers THEN THE Event_App SHALL display the game with status "Wunsch" and a "Wird gesucht!" badge
2. WHEN a game has at least one bringer THEN THE Event_App SHALL display the game with status "Verfügbar"
3. WHEN a game is in "Wunsch" status THEN THE Event_App SHALL visually highlight it to catch attention
4. WHEN a game is in "Wunsch" status THEN THE Event_App SHALL display a "Wunsch erfüllen" quick action button
5. WHEN a user clicks "Wunsch erfüllen" THEN THE Event_App SHALL add the user as a bringer for that game
6. WHEN 3 or more users are bringing the same game THEN THE Event_App SHALL display a hint "Wird bereits von X Personen mitgebracht"

### Requirement 5: Game List Display and Sorting

**User Story:** As a participant, I want to view, sort, and filter the game list, so that I can easily find games I'm interested in.

#### Acceptance Criteria

1. THE Event_App SHALL display each game as a row in a table format
2. THE Event_App SHALL sort games alphabetically by name as the default order
3. WHEN a user toggles the sort order THEN THE Event_App SHALL switch between ascending and descending alphabetical order
4. THE Event_App SHALL provide a search box above the Name column for filtering by game name
5. THE Event_App SHALL provide a search box above the Mitspieler column for filtering by player name
6. THE Event_App SHALL provide a search box above the "Bringt mit" column for filtering by bringer name
7. WHEN a user enters text in a search box THEN THE Event_App SHALL filter the list to show only matching entries
8. THE Event_App SHALL provide a filter option to show only "Gesuchte Spiele" (games without bringers)
9. THE Event_App SHALL provide a "Meine Spiele" filter to show only games the current user is involved with

### Requirement 6: Responsive Design

**User Story:** As a participant, I want to use the application on any device, so that I can coordinate games from my phone or computer.

#### Acceptance Criteria

1. THE Event_App SHALL adapt its layout to desktop screen sizes
2. THE Event_App SHALL adapt its layout to mobile screen sizes
3. THE Event_App SHALL maintain full functionality on both desktop and mobile devices
4. WHEN viewed on mobile THEN THE Event_App SHALL optimize touch interactions and readability

### Requirement 7: Print Functionality

**User Story:** As a participant bringing games, I want to print a list of games I'm bringing, so that I can create table labels at the event for game return.

#### Acceptance Criteria

1. THE Event_App SHALL provide a print function for generating a per-person game list
2. WHEN a user initiates print THEN THE Event_App SHALL generate a list of all games the user is bringing
3. THE Event_App SHALL format the printed list for use as table labels
4. THE Event_App SHALL include the user's name on the printed list for identification

### Requirement 8: Statistics Dashboard

**User Story:** As an event organizer, I want to see statistics about the event, so that I can understand participation levels and game availability.

#### Acceptance Criteria

1. THE Event_App SHALL display the total count of games in the list
2. THE Event_App SHALL display the total count of unique participants
3. THE Event_App SHALL display the count of available games (with bringers) vs. requested games (without bringers)
4. THE Event_App SHALL display the most popular games ranked by player interest count

### Requirement 9: Localization

**User Story:** As a German-speaking participant, I want all UI text in German, so that I can use the application in my native language.

#### Acceptance Criteria

1. THE Event_App SHALL display all UI text in German language
2. THE Event_App SHALL NOT provide language switching functionality
3. THE Event_App SHALL read the event name from an environment variable
4. THE Event_App SHALL NOT allow editing of the event name in the UI

### Requirement 10: Technical Infrastructure

**User Story:** As a developer, I want a well-structured technical stack, so that the application is maintainable and deployable.

#### Acceptance Criteria

1. THE Event_App frontend SHALL be built with React, TypeScript, and Tailwind CSS
2. THE Event_App backend SHALL be built with Express.js
3. THE Event_App SHALL use PostgreSQL as the database
4. THE Event_App SHALL be deployable via Docker Compose with three containers: frontend, api, and postgresql
5. THE Event_App SHALL store the shared password in an environment variable
6. THE Event_App SHALL store the event name in an environment variable

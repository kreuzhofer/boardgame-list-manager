# Requirements Document

## Introduction

This feature integrates BoardGameGeek (BGG) static data into the board game event application. It enables users to search and select games from a comprehensive database of ~170,000 board games when adding new games to the event list. Selected games will store their BGG ID, enabling additional features like displaying "Neuheit" (new release) stickers and providing quick access to BGG game pages via an embedded modal.

## Glossary

- **BGG**: BoardGameGeek - a popular board game database and community website
- **BGG_ID**: The unique identifier for a game in the BoardGameGeek database
- **BGG_Cache**: In-memory data structure holding parsed CSV data for fast search
- **Autocomplete_Dropdown**: UI component showing matching game suggestions below the input field
- **Neuheit_Sticker**: Visual badge indicating a game is a recent release (current or previous year)
- **BGG_Modal**: Full-screen modal displaying the BoardGameGeek website for a game via iframe
- **CSV_Parser**: Component that reads and parses the boardgames_ranks.csv file
- **Search_Index**: Data structure optimized for fast prefix-based game name lookups

## Requirements

### Requirement 1: CSV Data Loading

**User Story:** As a system administrator, I want the API to load and cache BGG data at startup, so that game searches are fast and don't require repeated file reads.

#### Acceptance Criteria

1. WHEN the API server starts, THE CSV_Parser SHALL read the boardgames_ranks.csv file and parse all entries
2. WHEN the CSV file is parsed, THE BGG_Cache SHALL store id, name, and yearpublished for each game entry
3. WHEN the CSV file is parsed, THE BGG_Cache SHALL exclude entries where is_expansion equals 1
4. IF the CSV file cannot be read, THEN THE API SHALL log an error and continue startup with an empty cache
5. THE BGG_Cache SHALL remain in memory for the lifetime of the API process

### Requirement 2: Game Search API

**User Story:** As a frontend developer, I want an API endpoint to search BGG games by name, so that I can implement autocomplete functionality.

#### Acceptance Criteria

1. THE API SHALL expose a GET /api/bgg/search endpoint accepting a query parameter "q"
2. WHEN a search query is received, THE Search_Index SHALL perform case-insensitive partial matching on game names
3. WHEN matches are found, THE API SHALL return a maximum of 10 matching games sorted by BGG rank (ascending)
4. WHEN a search query has fewer than 2 characters, THE API SHALL return an empty result array
5. THE API response SHALL include id, name, and yearpublished for each matching game

### Requirement 3: Autocomplete Search Box

**User Story:** As a user, I want to see game suggestions while typing a game name, so that I can quickly find and select games from the BGG database.

#### Acceptance Criteria

1. WHEN a user types in the game name input field, THE Autocomplete_Dropdown SHALL appear after 1 or more characters are entered
2. WHEN the user types, THE frontend SHALL debounce API calls with a 300ms delay to reduce server load
3. WHEN search results are returned, THE Autocomplete_Dropdown SHALL display up to 5 matching games
4. WHEN a user selects a game from the dropdown, THE system SHALL populate the input field with the selected game name
5. WHEN a user selects a game from the dropdown, THE system SHALL store the BGG_ID and yearpublished for submission
6. WHEN a user continues typing without selecting, THE system SHALL allow submission without a BGG_ID
7. WHEN the user clicks outside the dropdown or presses Escape, THE Autocomplete_Dropdown SHALL close
8. WHEN the dropdown is open, THE user SHALL be able to navigate options using arrow keys and select with Enter

### Requirement 4: Database Schema Update

**User Story:** As a developer, I want to store BGG data with games, so that I can display additional information and link to BGG pages.

#### Acceptance Criteria

1. THE Game model SHALL include an optional bggId field of type integer
2. THE Game model SHALL include an optional yearPublished field of type integer
3. WHEN a game is created with a BGG selection, THE system SHALL store the bggId and yearPublished values
4. WHEN a game is created without a BGG selection, THE system SHALL store null for bggId and yearPublished

### Requirement 5: Neuheit Sticker Display

**User Story:** As a user, I want to see which games are new releases, so that I can easily identify recently published games.

#### Acceptance Criteria

1. WHEN a game has a yearPublished of the last year (use system date to get this) or the current year, THE GameCard SHALL display a Neuheit_Sticker
2. THE Neuheit_Sticker SHALL display the text "Neuheit YEAR" where YEAR is the game's yearPublished value
3. THE Neuheit_Sticker SHALL be visually prominent with a distinctive color (e.g., orange or gold background)
4. WHEN a game does not have a yearPublished or it is before 2025, THE GameCard SHALL NOT display a Neuheit_Sticker

### Requirement 6: BGG Info Button

**User Story:** As a user, I want quick access to a game's BGG page, so that I can view detailed information about the game.

#### Acceptance Criteria

1. WHEN a game has a bggId, THE GameCard SHALL display a green BGG button with an info icon
2. WHEN a game does not have a bggId, THE GameCard SHALL NOT display the BGG button
3. WHEN the user clicks the BGG button, THE system SHALL open the BGG_Modal

### Requirement 7: BGG Modal

**User Story:** As a user, I want to view the BGG page for a game in a modal, so that I can see game details without leaving the application.

#### Acceptance Criteria

1. WHEN the BGG_Modal opens, THE system SHALL display a full-screen overlay with a header and iframe
2. THE BGG_Modal header SHALL include the game name and an "X" button to close the modal
3. THE iframe SHALL load the URL https://boardgamegeek.com/boardgame/{bggId}
4. WHEN the user clicks the "X" button or presses Escape, THE BGG_Modal SHALL close
5. WHEN the user clicks outside the modal content area, THE BGG_Modal SHALL close
6. THE BGG_Modal SHALL use createPortal to render directly into document.body

### Requirement 8: German Language UI

**User Story:** As a German-speaking user, I want all UI text in German, so that I can use the application in my native language.

#### Acceptance Criteria

1. THE Autocomplete_Dropdown placeholder text SHALL be in German
2. THE Neuheit_Sticker text SHALL use the German word "Neuheit"
3. THE BGG_Modal close button SHALL have German aria-label text
4. All error messages related to BGG search SHALL be in German

# Requirements Document

## Introduction

This feature extends the existing BGG Static Data Integration (spec 004) to display the BoardGameGeek rating for games. When a user selects a game from the BGG autocomplete dropdown, the rating is extracted from the CSV data, stored in the database, and displayed as a colored hexagon badge next to the BGG button. The badge color corresponds to BGG's official rating breakdown colors.

## Glossary

- **BGG_Rating**: The average user rating for a game on BoardGameGeek (scale 1-10)
- **Rating_Badge**: Hexagon-shaped visual component displaying the BGG rating with color coding
- **CSV_Average_Column**: The "average" column in boardgames_ranks.csv containing the BGG rating
- **Rating_Color_Map**: Mapping of rating ranges to specific colors matching BGG's breakdown

## Requirements

### Requirement 1: Rating Data Extraction from CSV

**User Story:** As a system administrator, I want the BGG rating to be extracted from the CSV data, so that ratings are available for display when users select games.

#### Acceptance Criteria

1. WHEN the CSV_Parser reads the boardgames_ranks.csv file, THE system SHALL extract the "average" column value as the rating
2. WHEN a rating value is extracted, THE system SHALL round it to one decimal place
3. WHEN a rating value is missing or invalid, THE system SHALL store null for that game's rating
4. THE BggGame interface SHALL include a rating field of type number or null
5. THE BggSearchResult SHALL include the rating field in API responses

### Requirement 2: Rating Storage in Database

**User Story:** As a developer, I want to store the BGG rating with games, so that the rating persists and can be displayed without re-fetching.

#### Acceptance Criteria

1. THE Game model SHALL include an optional bggRating field of type Float
2. WHEN a game is created with a BGG selection, THE system SHALL store the bggRating value from the selected game
3. WHEN a game is created without a BGG selection, THE system SHALL store null for bggRating
4. THE game API responses SHALL include the bggRating field

### Requirement 3: Rating Badge Display

**User Story:** As a user, I want to see the BGG rating displayed as a badge, so that I can quickly assess game quality.

#### Acceptance Criteria

1. WHEN a game has a bggRating value, THE Rating_Badge SHALL be displayed next to the BGG button
2. WHEN a game does not have a bggRating value, THE Rating_Badge SHALL NOT be displayed
3. THE Rating_Badge SHALL display the rating number formatted to one decimal place (e.g., "7.5")
4. THE Rating_Badge SHALL have a hexagon shape standing on its tip
5. THE Rating_Badge SHALL display white text on a colored background

### Requirement 4: Rating Color Mapping

**User Story:** As a user, I want the rating badge color to indicate the rating quality, so that I can visually distinguish good games from poor ones.

#### Acceptance Criteria

1. WHEN the rating is 1-4, THE Rating_Badge background SHALL be red (#d32f2f)
2. WHEN the rating is 5-6, THE Rating_Badge background SHALL be dark blue (#3f51b5)
3. WHEN the rating is 7, THE Rating_Badge background SHALL be light blue (#2196f3)
4. WHEN the rating is 8, THE Rating_Badge background SHALL be green (#4caf50)
5. WHEN the rating is 9, THE Rating_Badge background SHALL be dark green (#2e7d32)
6. WHEN the rating is 10, THE Rating_Badge background SHALL be darker green (#1b5e20)
7. WHEN the rating is outside 1-10 range, THE Rating_Badge background SHALL be gray (#9e9e9e)

### Requirement 5: Consistent Display Across Views

**User Story:** As a user, I want to see the rating badge in both mobile and desktop views, so that I have a consistent experience.

#### Acceptance Criteria

1. THE GameCard component (mobile view) SHALL display the Rating_Badge next to the BGG button when bggRating exists
2. THE GameRow component (desktop view) SHALL display the Rating_Badge next to the BGG button when bggRating exists
3. THE Rating_Badge SHALL have consistent sizing and styling across both views

### Requirement 6: German Language UI

**User Story:** As a German-speaking user, I want the rating badge tooltip in German, so that I can understand the information.

#### Acceptance Criteria

1. THE Rating_Badge title attribute SHALL display "BGG Bewertung: {rating}" in German

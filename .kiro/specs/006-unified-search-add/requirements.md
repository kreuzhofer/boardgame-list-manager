# Requirements Document

## Introduction

This feature unifies the separate "Add Game" form and "Search/Filter" functionality into a single cohesive search bar experience. The unified search bar will filter the existing game list in real-time while simultaneously providing BGG search results for adding new games. This simplifies the user experience by consolidating two related but separate interactions into one intuitive interface.

## Glossary

- **Unified_Search_Bar**: The single input component that replaces both AddGameForm and SearchFilters for game name search
- **In_Liste_Section**: Dropdown section showing games already in the user's list that match the search query
- **BGG_Section**: Dropdown section showing BoardGameGeek search results that can be added as new games
- **Normalized_Name**: A game name converted to lowercase with special characters and extra whitespace removed for comparison purposes
- **Bringer_Info**: Display of users who have marked themselves as bringing a specific game (e.g., "📦 Thorsten, Daniel")
- **Highlight**: Visual indication (light green background) applied to games in the list that match the current search query
- **Progressive_Loading**: The pattern of initially showing limited results with an option to load more
- **Advanced_Filters**: The collapsible section containing player search, bringer search, and toggle filters

## Requirements

### Requirement 1: Unified Search Input

**User Story:** As a user, I want a single search bar that both filters my game list and searches BGG, so that I can find and add games more efficiently.

#### Acceptance Criteria

1. THE Unified_Search_Bar SHALL replace the separate game name input from AddGameForm and the name search from SearchFilters
2. WHEN a user types in the Unified_Search_Bar, THE System SHALL filter the game list in real-time
3. WHEN a user types at least 1 character, THE System SHALL display a dropdown with search results
4. THE Unified_Search_Bar SHALL have a placeholder text "Spiel suchen oder hinzufügen..."
5. THE Unified_Search_Bar SHALL be touch-friendly with a minimum height of 44px

### Requirement 2: Dual-Section Dropdown

**User Story:** As a user, I want to see both my existing games and BGG results in the dropdown, so that I can quickly find what I'm looking for.

#### Acceptance Criteria

1. WHEN the dropdown is open, THE System SHALL display an "In deiner Liste" section showing matching games from the user's list
2. WHEN the dropdown is open, THE System SHALL display a "Von BGG" section showing BGG search results
3. THE In_Liste_Section SHALL display a maximum of 3 items initially
4. THE BGG_Section SHALL display a maximum of 3 items initially
5. WHEN there are more than 3 BGG results, THE System SHALL show a "X weitere Treffer anzeigen..." link
6. WHEN a user clicks "weitere Treffer anzeigen", THE System SHALL expand the BGG_Section by 5 more items
7. WHEN the BGG_Section is expanded and more results exist, THE System SHALL show "X weitere - Suchbegriff verfeinern" hint
8. THE dropdown SHALL have fixed height sections without internal scrolling
9. WHEN no games match in the In_Liste_Section, THE System SHALL hide that section
10. WHEN no BGG results are found, THE System SHALL hide the BGG_Section

### Requirement 3: In-Liste Item Display

**User Story:** As a user, I want to see relevant information about matching games in my list, so that I can identify them quickly.

#### Acceptance Criteria

1. WHEN displaying an In_Liste item, THE System SHALL show the game name
2. WHEN displaying an In_Liste item with bringers, THE System SHALL show Bringer_Info (e.g., "📦 Thorsten, Daniel")
3. WHEN a user clicks an In_Liste item, THE System SHALL scroll to that game in the list
4. WHEN a user clicks an In_Liste item, THE System SHALL close the dropdown
5. WHEN a user clicks an In_Liste item, THE System SHALL clear the search input

### Requirement 4: BGG Item Selection

**User Story:** As a user, I want to select a BGG result to add it as a new game, so that I can easily add games from the BGG database.

#### Acceptance Criteria

1. WHEN a user clicks a BGG item, THE System SHALL fill the input with the selected game name
2. WHEN a user clicks a BGG item, THE System SHALL store the BGG ID, year published, and rating for submission
3. WHEN a user clicks a BGG item, THE System SHALL close the dropdown
4. WHEN a user clicks a BGG item, THE System SHALL enable the add button
5. WHEN displaying a BGG item, THE System SHALL show the game name and year published (if available)

### Requirement 5: Duplicate Prevention

**User Story:** As a user, I want to be prevented from adding duplicate games, so that the game list stays clean and organized.

#### Acceptance Criteria

1. WHEN checking for duplicates, THE System SHALL first match by bggId
2. WHEN no bggId match is found, THE System SHALL match by Normalized_Name
3. WHEN a selected BGG game already exists in the list (by bggId), THE System SHALL disable the add button
4. WHEN a selected BGG game already exists in the list (by bggId), THE System SHALL show a message "Spiel bereits in der Liste"
5. WHEN a custom name matches an existing game (by Normalized_Name), THE System SHALL disable the add button
6. THE Normalized_Name comparison SHALL convert names to lowercase and remove extra whitespace

### Requirement 6: Add Button Behavior

**User Story:** As a user, I want clear feedback on when I can add a game, so that I understand the system's state.

#### Acceptance Criteria

1. THE add button SHALL be visible when a BGG item is selected
2. THE add button SHALL be visible when a custom name is typed that does not match any existing game
3. THE add button SHALL be hidden when the input is empty
4. THE add button SHALL be hidden when the input matches an existing game in the list
5. WHEN the add button is visible, THE System SHALL also show Mitspielen and Mitbringen toggle buttons
6. WHEN a game is successfully added, THE System SHALL clear the input and reset the form state

### Requirement 7: Game List Highlighting

**User Story:** As a user, I want matching games highlighted in the list, so that I can easily see which games match my search.

#### Acceptance Criteria

1. WHEN a search query is active, THE System SHALL highlight matching games in the list with a light green background
2. THE highlight SHALL be applied to both GameRow and GameCard components
3. WHEN the search query is cleared, THE System SHALL remove all highlights
4. THE highlight color SHALL be visually distinct but not overwhelming (e.g., bg-green-100)

### Requirement 8: Advanced Filters Section

**User Story:** As a user, I want access to additional filters without cluttering the main interface, so that I can perform more specific searches when needed.

#### Acceptance Criteria

1. THE System SHALL provide a collapsible "Erweiterte Filter" section
2. THE Advanced_Filters section SHALL contain the player search input
3. THE Advanced_Filters section SHALL contain the bringer search input
4. THE Advanced_Filters section SHALL be collapsed by default
5. THE Wunsch filter toggle SHALL remain visible outside the Advanced_Filters section
6. THE "Meine Spiele" filter toggle SHALL remain visible outside the Advanced_Filters section
7. WHEN Advanced_Filters has active filters, THE System SHALL show a badge indicating the count

### Requirement 9: Mobile Responsiveness

**User Story:** As a mobile user, I want the unified search to work well on my device, so that I can use the app comfortably on the go.

#### Acceptance Criteria

1. THE Unified_Search_Bar SHALL have touch-friendly tap targets (minimum 44px height)
2. THE dropdown SHALL not overwhelm the screen on mobile devices
3. THE dropdown items SHALL have touch-friendly tap targets (minimum 44px height)
4. THE Advanced_Filters toggle SHALL be easily accessible on mobile
5. All UI text SHALL be in German (existing requirement 9.1)

### Requirement 10: Keyboard Navigation

**User Story:** As a keyboard user, I want to navigate the dropdown with my keyboard, so that I can use the feature without a mouse.

#### Acceptance Criteria

1. WHEN the dropdown is open, THE System SHALL support Arrow Down to move to the next item
2. WHEN the dropdown is open, THE System SHALL support Arrow Up to move to the previous item
3. WHEN the dropdown is open, THE System SHALL support Enter to select the highlighted item
4. WHEN the dropdown is open, THE System SHALL support Escape to close the dropdown
5. THE keyboard navigation SHALL work across both In_Liste and BGG sections

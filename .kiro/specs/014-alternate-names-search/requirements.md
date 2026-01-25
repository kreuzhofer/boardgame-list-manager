# Requirements Document

## Introduction

This feature enhances the BGG game search functionality to leverage the enriched database data from spec 013. It switches the data source from CSV to the database when fully populated, and enables searching by alternate game names (translations) stored in the enrichment data. When a match occurs via an alternate name, the search results display both the primary game name and the matching alternate name.

## Scope

**In Scope:**
- Startup detection comparing CSV row count vs database row count
- Data source switching from CSV to database when database is complete
- Building a searchable index of alternate names from enrichment data
- Search matching against both primary and alternate names
- API response including matched alternate name information
- Frontend display of alternate name matches as secondary text

**Out of Scope:**
- Modifying the enrichment process itself (handled by spec 013)
- Language filtering for alternate names
- Weighted scoring based on language preference
- Admin UI for managing alternate names

## Glossary

- **BggCache**: Singleton service that loads and caches BGG game data for fast search
- **BggGame**: Database table containing imported CSV data and enrichment data
- **Primary_Name**: The main English name of a game as stored in the `name` column
- **Alternate_Name**: A translation or alternate title stored in `enrichment_data.alternateNames`
- **Data_Source**: Either CSV file or database, determined at startup
- **Alternate_Name_Index**: In-memory mapping from alternate names to their parent game IDs

## Requirements

### Requirement 1: Data Source Detection

**User Story:** As a system administrator, I want the application to automatically detect whether the database has complete game data, so that it uses the best available data source.

#### Acceptance Criteria

1. WHEN the application starts, THE BggCache SHALL count the number of non-expansion games in the CSV file
2. WHEN the application starts, THE BggCache SHALL count the number of non-expansion games in the BggGame database table
3. WHEN the database count equals or exceeds the CSV count, THE BggCache SHALL load data from the database
4. WHEN the database count is less than the CSV count, THE BggCache SHALL load data from the CSV file
5. THE BggCache SHALL log which data source was selected and the row counts

### Requirement 2: Database Data Loading

**User Story:** As a developer, I want the cache to load game data from the database, so that enrichment data is available for search.

#### Acceptance Criteria

1. WHEN loading from database, THE BggCache SHALL query all non-expansion BggGame records
2. WHEN loading from database, THE BggCache SHALL extract alternate names from the `enrichment_data` JSONB column
3. WHEN a game has no enrichment data, THE BggCache SHALL treat it as having no alternate names
4. THE BggCache SHALL build an in-memory index mapping each alternate name to its parent game ID
5. THE BggCache SHALL normalize alternate names for case-insensitive matching

### Requirement 3: Alternate Name Search

**User Story:** As a user, I want to find games by their translated names, so that I can search in my native language.

#### Acceptance Criteria

1. WHEN a search query matches an alternate name, THE BggCache SHALL include that game in the results
2. WHEN a search query matches both primary and alternate names of different games, THE BggCache SHALL return both games
3. WHEN a search query matches a game's primary name, THE BggCache SHALL prioritize it over alternate name matches
4. THE BggCache SHALL apply the same fuzzy matching logic to alternate names as to primary names
5. WHEN multiple alternate names match for the same game, THE BggCache SHALL use the best-scoring match

### Requirement 4: Search Result Enhancement

**User Story:** As a developer, I want search results to indicate when a match came from an alternate name, so that the UI can display this information.

#### Acceptance Criteria

1. WHEN a match occurs via an alternate name, THE BggService SHALL include the matched alternate name in the result
2. WHEN a match occurs via the primary name only, THE BggService SHALL return null for the alternate name field
3. THE search response SHALL include a new optional field `matchedAlternateName` for each result
4. WHEN a game matches both primary and alternate names, THE BggService SHALL prefer the primary name match (no alternate name in result)

### Requirement 5: API Response Format

**User Story:** As a frontend developer, I want the API to return alternate name match information, so that I can display it in the UI.

#### Acceptance Criteria

1. THE `/api/bgg/search` endpoint response SHALL include `matchedAlternateName: string | null` for each result
2. THE response format SHALL remain backward compatible (existing fields unchanged)
3. WHEN `matchedAlternateName` is present, it SHALL contain the exact alternate name that matched the query

### Requirement 6: Frontend Display

**User Story:** As a user, I want to see which alternate name matched my search, so that I understand why a game appeared in results.

#### Acceptance Criteria

1. WHEN a search result has a matched alternate name, THE AutocompleteDropdown SHALL display it below the primary name
2. THE matched alternate name SHALL be displayed in smaller, muted text
3. THE primary game name SHALL always be displayed as the main result text
4. WHEN no alternate name matched, THE AutocompleteDropdown SHALL display only the primary name (current behavior)
5. THE alternate name display SHALL not significantly increase the height of result items


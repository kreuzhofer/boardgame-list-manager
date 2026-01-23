# Requirements Document

## Introduction

This feature modifies the BGG search functionality to sort results by release year in descending order (newest games first) instead of the current BGG rank-based sorting. This change applies to both the internal BGG cache and the search results returned to users. The rationale is that users searching for games are more likely to be interested in newer releases, and if there are many search results, it's acceptable for older games to be pushed further down or beyond the visible results. Users can always refine their search to find specific older games.

## Glossary

- **BGG_Cache**: In-memory data structure holding parsed CSV data for fast search
- **Release_Year**: The year a game was published (yearpublished field from BGG data)
- **Year_Descending_Sort**: Sorting order where newest games (highest year values) appear first
- **Search_Results**: The list of games returned from a BGG search query

## Requirements

### Requirement 1: BGG Cache Sorting

**User Story:** As a user, I want the BGG game list to be sorted by release year descending, so that newer games appear first in search results.

#### Acceptance Criteria

1. WHEN the BGG_Cache is initialized, THE system SHALL sort all games by Release_Year in descending order (newest first)
2. WHEN a game has a null Release_Year, THE system SHALL place it after games with valid years
3. WHEN multiple games have the same Release_Year, THE system SHALL maintain a stable secondary sort order

### Requirement 2: Search Results Sorting

**User Story:** As a user, I want BGG search results to show newest games first, so that I can quickly find recent releases matching my search.

#### Acceptance Criteria

1. WHEN a BGG search is performed, THE Search_Results SHALL be sorted by Release_Year in descending order
2. WHEN the search returns many results, THE system SHALL return the newest matching games within the result limit
3. WHEN a user searches for a game, THE oldest matching games MAY not appear in the visible results if the result count exceeds the display limit

### Requirement 3: Null Year Handling

**User Story:** As a user, I want games without a release year to still appear in search results, so that I don't miss games with incomplete data.

#### Acceptance Criteria

1. WHEN sorting Search_Results, THE system SHALL place games with null Release_Year after all games with valid years
2. WHEN multiple games have null Release_Year, THE system SHALL maintain their relative order

</content>

# Requirements Document

## Introduction

This feature enhances the BoardGameGeek (BGG) data capabilities by importing the complete `boardgames_ranks.csv` file into a database table and providing an API endpoint to enrich individual game entries with additional metadata scraped from BGG pages. The enrichment data includes alternate names (translations), descriptions, designers, artists, publishers, categories, and mechanics.

## Scope

**In Scope:**
- CSV import into database table
- API endpoint to trigger import
- Game enrichment via BGG page scraping
- API endpoint to trigger enrichment for individual games
- Storage of enrichment data (alternate names, metadata)

**Out of Scope:**
- Search functionality using alternate names (future enhancement)
- Automatic/scheduled enrichment
- Bulk enrichment of all games
- Frontend UI for these features

## Glossary

- **BGG**: BoardGameGeek - the board game database website
- **BGG_ID**: Unique numeric identifier for a game on BoardGameGeek
- **BggGame**: Database table storing imported CSV data with rankings and basic info
- **BggGameEnrichment**: Database table/columns storing scraped enrichment data
- **CSV_Importer**: Service that reads and imports the boardgames_ranks.csv file
- **Enrichment_Service**: Service that scrapes BGG pages and extracts metadata
- **ScraperAPI**: Third-party service used to fetch BGG pages without rate limiting
- **GEEK.geekitemPreload**: JavaScript object embedded in BGG HTML containing game metadata

## Requirements

### Requirement 1: CSV Data Import

**User Story:** As a system administrator, I want to import the BGG rankings CSV file into a database table, so that the data is persisted and queryable.

#### Acceptance Criteria

1. THE CSV_Importer SHALL read all columns from the `boardgames_ranks.csv` file: id, name, yearpublished, rank, bayesaverage, average, usersrated, is_expansion, abstracts_rank, cgs_rank, childrensgames_rank, familygames_rank, partygames_rank, strategygames_rank, thematic_rank, wargames_rank
2. THE CSV_Importer SHALL store all rows in the BggGame database table
3. WHEN the import endpoint is called, THE CSV_Importer SHALL process the entire CSV file
4. WHEN a game with the same BGG_ID already exists, THE CSV_Importer SHALL update the existing record (upsert behavior) but SHALL NOT modify the `scraping_done` flag or `enrichment_data`
5. THE CSV_Importer SHALL handle the large file (172,000+ rows) efficiently using batch processing
6. WHEN the import completes, THE CSV_Importer SHALL return a summary with total rows processed and any errors

### Requirement 2: Database Schema for BGG Games

**User Story:** As a developer, I want a database schema that stores all BGG CSV data, so that I can query and extend it.

#### Acceptance Criteria

1. THE BggGame table SHALL have a primary key based on the BGG_ID (integer)
2. THE BggGame table SHALL store all CSV columns with appropriate data types
3. THE BggGame table SHALL include timestamps for created_at and updated_at
4. THE BggGame table SHALL use nullable fields for optional ranking columns

### Requirement 3: Import API Endpoint

**User Story:** As a system administrator, I want an API endpoint to trigger the CSV import, so that I can control when the import runs.

#### Acceptance Criteria

1. WHEN a POST request is made to `/api/bgg/import`, THE System SHALL start the CSV import process in the background and immediately return HTTP 202 with a message indicating import has started
2. THE import endpoint SHALL be internal-only (no authentication required for now, but not exposed in frontend)
3. WHEN the import is already in progress, THE System SHALL return HTTP 409 with a message indicating import is already running
4. WHEN the import completes successfully, THE System SHALL update internal state to reflect completion

### Requirement 3a: Import Status Endpoint

**User Story:** As a system administrator, I want to check the status of the CSV import, so that I can monitor progress.

#### Acceptance Criteria

1. WHEN a GET request is made to `/api/bgg/import/status`, THE System SHALL return the current import status
2. THE status response SHALL include: `running` (boolean), `processed` (number of rows imported so far), `total` (total rows in CSV), `errors` (count of failed rows), `etaSeconds` (estimated seconds remaining)
3. WHEN no import has been run, THE System SHALL return `running: false` with zero counts
4. WHEN import is complete, THE System SHALL return `running: false` with final counts
5. THE import process SHALL calculate ETA based on average processing rate (processed / elapsed time) and remaining items
6. THE import process SHALL log progress updates including ETA (formatted as "Xm Ys" or "Xh Ym")

### Requirement 4: Game Enrichment Service

**User Story:** As a developer, I want to enrich game entries with additional metadata from BGG, so that I can access alternate names and other details.

#### Acceptance Criteria

1. THE Enrichment_Service SHALL fetch the BGG page using ScraperAPI (same pattern as bggImageService)
2. THE Enrichment_Service SHALL extract the GEEK.geekitemPreload JSON from the HTML response
3. THE Enrichment_Service SHALL parse and store the following data:
   - Alternate names (array of translations)
   - Primary name with transliteration
   - Description (full HTML)
   - Short description
   - URL slug (href field)
   - Designers (array)
   - Artists (array)
   - Publishers (array)
   - Categories (array)
   - Mechanics (array)
4. WHEN enrichment data is extracted, THE Enrichment_Service SHALL store it in the database
5. IF the BGG page cannot be fetched, THEN THE Enrichment_Service SHALL return an error without storing partial data

### Requirement 5: Enrichment Data Storage

**User Story:** As a developer, I want enrichment data stored efficiently, so that I can query it alongside base game data.

#### Acceptance Criteria

1. THE BggGame table SHALL include a `scraping_done` boolean column (default false) to track whether enrichment has been completed
2. THE BggGame table SHALL include an `enriched_at` timestamp to track when enrichment occurred
3. THE BggGame table SHALL include an `enrichment_data` column using PostgreSQL JSONB type to store all scraped metadata as a single structured object
4. THE enrichment_data JSON object SHALL contain fields for: alternate_names, primary_name, description, short_description, slug, designers, artists, publishers, categories, mechanics
5. WHEN enrichment succeeds, THE Enrichment_Service SHALL set `scraping_done` to true and update `enriched_at`
6. WHEN querying a game, THE System SHALL be able to access both base CSV data and enrichment data in a single query
7. THE JSONB storage approach SHALL be used instead of separate relational tables because the enrichment data is read-only reference data with variable structure

### Requirement 6: Individual Enrichment API Endpoint

**User Story:** As a developer, I want an API endpoint to enrich a specific game, so that I can trigger enrichment on demand.

#### Acceptance Criteria

1. WHEN a POST request is made to `/api/bgg/enrich/:bggId`, THE System SHALL trigger enrichment for that game
2. WHEN the game is not found in the BggGame table, THE System SHALL return HTTP 404
3. WHEN the game has `scraping_done` set to true, THE System SHALL skip re-fetching unless `force=true` query parameter is provided
4. WHEN enrichment succeeds, THE System SHALL return HTTP 200 with the enriched data
5. IF ScraperAPI fails, THEN THE System SHALL return HTTP 503 with a descriptive error
6. THE enrichment endpoint SHALL be internal-only (not exposed in frontend)

### Requirement 6a: Bulk Enrichment API Endpoint

**User Story:** As a system administrator, I want to start a background process to enrich all non-scraped games, so that I can batch-enrich the database.

#### Acceptance Criteria

1. WHEN a POST request is made to `/api/bgg/enrich`, THE System SHALL start a background process to enrich all games where `scraping_done` is false and immediately return HTTP 202
2. WHEN bulk enrichment is already in progress, THE System SHALL return HTTP 409 with a message indicating enrichment is already running
3. THE bulk enrichment process SHALL process games sequentially to respect ScraperAPI rate limits
4. THE bulk enrichment process SHALL continue processing even if individual games fail (log errors and continue)
5. THE bulk enrichment process SHALL sort games by year_published descending (newest first) before processing, so that newer games are enriched before older ones

### Requirement 6b: Bulk Enrichment Status Endpoint

**User Story:** As a system administrator, I want to check the status of bulk enrichment, so that I can monitor progress.

#### Acceptance Criteria

1. WHEN a GET request is made to `/api/bgg/enrich/status`, THE System SHALL return the current bulk enrichment status
2. THE status response SHALL include: `running` (boolean), `processed` (games enriched so far), `total` (games needing enrichment), `skipped` (games already enriched at start), `errors` (count of failed enrichments), `etaSeconds` (estimated seconds remaining), `stopReason` (reason for stopping if applicable)
3. WHEN no bulk enrichment has been run, THE System SHALL return `running: false` with zero counts
4. WHEN bulk enrichment is complete, THE System SHALL return `running: false` with final counts and `stopReason`
5. THE bulk enrichment process SHALL calculate ETA based on average processing rate and remaining items
6. THE bulk enrichment process SHALL log progress updates every 60 seconds including ETA (formatted as "Xm Ys" or "Xh Ym")

### Requirement 6c: ScraperAPI Data Transfer Tracking

**User Story:** As a system administrator, I want to track how much data is transferred through ScraperAPI, so that I can monitor API usage and costs.

#### Acceptance Criteria

1. THE Enrichment_Service SHALL track the size (in bytes) of each HTML response received from ScraperAPI
2. THE bulk enrichment status endpoint SHALL include `bytesTransferred` (total bytes received during current/last batch)
3. THE bulk enrichment process SHALL log cumulative data transferred every 60 seconds
4. WHEN bulk enrichment completes, THE System SHALL log a final summary including total bytes transferred (formatted as KB/MB)
5. THE data transfer tracking SHALL only count successful responses (not errors or retries)

### Requirement 6d: Stop Bulk Enrichment

**User Story:** As a system administrator, I want to stop a running bulk enrichment process, so that I can cancel it if needed.

#### Acceptance Criteria

1. WHEN a DELETE request is made to `/api/bgg/enrich`, THE System SHALL stop the running bulk enrichment process
2. WHEN bulk enrichment is stopped, THE System SHALL log a summary with statistics (processed, errors, bytes transferred, elapsed time)
3. WHEN bulk enrichment is stopped, THE System SHALL return HTTP 200 with the final status including `stopped: true`
4. WHEN no bulk enrichment is running, THE System SHALL return HTTP 409 with a message indicating no enrichment is running
5. THE stop operation SHALL be graceful - complete the current game before stopping

### Requirement 6e: ScraperAPI Error Handling

**User Story:** As a system administrator, I want the bulk enrichment process to handle ScraperAPI errors gracefully, so that it stops appropriately when credits are exhausted or rate limits are hit.

#### Acceptance Criteria

1. WHEN ScraperAPI returns HTTP 403 (credits exhausted or unauthorized), THE System SHALL immediately stop bulk enrichment and set `stopReason` to indicate credits exhausted
2. WHEN ScraperAPI returns HTTP 429 (rate limit), THE System SHALL wait 5 seconds and retry up to 3 times before counting as an error
3. WHEN ScraperAPI returns HTTP 500 (failed after retries), THE System SHALL count as an error and continue to the next game (ScraperAPI already retried for 70 seconds)
4. WHEN ScraperAPI returns HTTP 400 (malformed request), THE System SHALL count as an error and continue to the next game
5. WHEN 10 consecutive errors occur, THE System SHALL stop bulk enrichment and set `stopReason` to indicate too many consecutive errors
6. THE System SHALL reset the consecutive error counter after each successful enrichment

### Requirement 8: Game Data Retrieval

**User Story:** As a developer, I want to retrieve game data from the database by BGG ID, so that I can verify import/enrichment and use the data in the application.

#### Acceptance Criteria

1. WHEN a GET request is made to `/api/bgg/:bggId`, THE System SHALL return the complete BggGame record including all CSV fields and enrichment data
2. WHEN the game is not found in the database, THE System SHALL return HTTP 404 with a descriptive error
3. THE response SHALL include all base fields (id, name, yearPublished, rank, etc.) and enrichment fields (scrapingDone, enrichedAt, enrichmentData)
4. THE endpoint SHALL be available for internal use to verify data import and enrichment status

### Requirement 7: Enrichment Data Parsing

**User Story:** As a developer, I want robust parsing of BGG page data, so that enrichment handles various data formats.

#### Acceptance Criteria

1. THE Enrichment_Service SHALL handle missing fields gracefully (store null/empty arrays)
2. THE Enrichment_Service SHALL extract alternate names from the `alternatenames` array in the JSON
3. THE Enrichment_Service SHALL extract linked entities (designers, artists, etc.) from the `links` object
4. WHEN the GEEK.geekitemPreload JSON is malformed, THE Enrichment_Service SHALL return an error
5. THE Enrichment_Service SHALL sanitize HTML in description fields before storage

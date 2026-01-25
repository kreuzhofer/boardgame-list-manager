# Implementation Plan: BGG Database Enrichment

## Overview

This implementation adds CSV import and game enrichment capabilities to the BGG data infrastructure. The work is organized into database schema, import service, enrichment service, and API routes.

## Tasks

- [x] 1. Database Schema Setup
  - [x] 1.1 Add BggGame model to Prisma schema
    - Add all CSV columns with appropriate types
    - Add enrichment fields (scraping_done, enriched_at, enrichment_data)
    - Add timestamps (created_at, updated_at)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 5.1, 5.2, 5.3_
  - [x] 1.2 Generate and run Prisma migration
    - Run `npx prisma migrate dev --name add_bgg_games_table`
    - Verify table created in database
    - _Requirements: 2.1_

- [x] 2. CSV Import Service
  - [x] 2.1 Create BggImportService with state management
    - Implement ImportStatus interface (including etaSeconds)
    - Add singleton instance with running state tracking
    - Track startedAt timestamp for ETA calculation
    - Implement startImport() that returns immediately
    - Implement getStatus() to return current progress including ETA
    - Implement calculateEta() and formatDuration() helpers
    - _Requirements: 3.1, 3.3, 3a.1, 3a.2, 3a.3, 3a.4, 3a.5_
  - [x] 2.2 Implement CSV parsing and batch processing
    - Stream CSV file using csv-parse
    - Parse rows with type conversion (handle empty strings as null)
    - Process in batches of 1000 rows
    - Use Prisma upsert to preserve enrichment fields
    - Log progress every 500 rows (include ETA)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 3a.6_
  - [x] 2.3 Write property test for CSV row parsing
    - **Property 1: CSV Row Parsing Completeness**
    - **Validates: Requirements 1.1**
  - [x] 2.4 Write unit tests for import service
    - Test startImport returns correct response
    - Test getStatus returns correct format
    - Test concurrent import returns 409
    - _Requirements: 3.1, 3.3, 3a.2_

- [x] 3. Checkpoint - Import Service Complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Enrichment Service
  - [x] 4.1 Create BggEnrichmentService with state management
    - Implement EnrichmentData and BulkEnrichmentStatus interfaces (including etaSeconds)
    - Add singleton instance with running state tracking
    - Track startedAt timestamp for ETA calculation
    - Add bytesTransferred counter to status
    - Implement startBulkEnrichment() that returns immediately
    - Implement getBulkStatus() to return current progress including bytes transferred and ETA
    - Implement formatBytes(), calculateEta(), and formatDuration() helpers
    - _Requirements: 6a.1, 6a.2, 6b.1, 6b.2, 6b.3, 6b.4, 6b.5, 6c.1, 6c.2_
  - [x] 4.2 Implement BGG page fetching (reuse bggImageService pattern)
    - Use ScraperAPI to fetch BGG page HTML
    - Track response size in bytes for each successful fetch
    - Extract GEEK.geekitemPreload JSON from HTML
    - Handle fetch errors gracefully (don't count failed requests in bytes)
    - _Requirements: 4.1, 4.2, 4.5, 6c.1, 6c.5_
  - [x] 4.3 Implement enrichment data extraction
    - Parse alternate names from alternatenames array
    - Parse designers, artists, publishers from links object
    - Parse categories and mechanics from links object
    - Extract description, short_description, slug
    - Handle missing fields with empty arrays/null
    - Sanitize HTML in description fields
    - _Requirements: 4.3, 7.1, 7.2, 7.3, 7.5_
  - [x] 4.4 Implement single game enrichment
    - Check scraping_done flag, skip if true (unless force)
    - Fetch and parse BGG page
    - Store enrichment_data, set scraping_done=true, update enriched_at
    - _Requirements: 6.1, 6.3, 5.5_
  - [x] 4.5 Implement bulk enrichment background process
    - Query games where scraping_done=false
    - Process sequentially with delay between requests
    - Accumulate bytesTransferred for each successful fetch
    - Continue on individual failures, log errors
    - Log progress every 500 games (include cumulative bytes transferred and ETA)
    - Log final summary with total bytes transferred, elapsed time
    - _Requirements: 6a.3, 6a.4, 6b.6, 6c.3, 6c.4_
  - [x] 4.6 Write property tests for enrichment
    - **Property 5: Missing Fields Robustness**
    - **Property 6: Malformed JSON Error Handling**
    - **Property 7: HTML Sanitization**
    - **Validates: Requirements 7.1, 7.4, 7.5**
  - [x] 4.7 Write unit tests for enrichment service
    - Test extraction from sample BGG HTML
    - Test single game enrichment flow
    - Test skip when scraping_done=true
    - Test force=true overrides skip
    - _Requirements: 4.2, 4.3, 6.3_

- [x] 5. Checkpoint - Enrichment Service Complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. API Routes
  - [x] 6.1 Add import routes to bgg.routes.ts
    - POST /api/bgg/import - Start import, return 202 or 409
    - GET /api/bgg/import/status - Return import status (including etaSeconds)
    - _Requirements: 3.1, 3.2, 3.3, 3a.1, 3a.2_
  - [x] 6.2 Add enrichment routes to bgg.routes.ts
    - POST /api/bgg/enrich - Start bulk enrichment, return 202 or 409
    - GET /api/bgg/enrich/status - Return bulk enrichment status (including bytesTransferred and etaSeconds)
    - POST /api/bgg/enrich/:bggId - Enrich single game
    - Handle 404 for unknown game, 503 for ScraperAPI failure
    - _Requirements: 6.1, 6.2, 6.4, 6.5, 6a.1, 6a.2, 6b.1, 6b.2, 6c.2_
  - [x] 6.3 Write integration tests for API routes
    - Test import endpoint starts background process
    - Test enrichment endpoint with mocked ScraperAPI
    - Test status endpoints return correct format
    - _Requirements: 3.1, 6.1, 6a.1_

- [x] 7. Property Test for Import Idempotency
  - [x] 7.1 Write property test for import preserving enrichment
    - **Property 2: Import Preserves Enrichment Data**
    - **Validates: Requirements 1.4**

- [x] 8. Property Test for Enrichment Idempotency
  - [x] 8.1 Write property test for enrichment idempotency
    - **Property 4: Enrichment Idempotency**
    - **Validates: Requirements 6.3**

- [x] 9. Final Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Export services from index
  - Add bggImportService and bggEnrichmentService to services/index.ts
  - _Requirements: N/A (wiring)_

- [x] 11. Stop Bulk Enrichment Feature
  - [x] 11.1 Add stopBulkEnrichment method to BggEnrichmentService
    - Add stopRequested flag to track stop request
    - Implement graceful stop (complete current game before stopping)
    - Log summary with statistics on stop
    - Return final status with stopped: true
    - _Requirements: 6d.1, 6d.2, 6d.3, 6d.5_
  - [x] 11.2 Add DELETE /api/bgg/enrich route
    - Return 200 with final status when stopped
    - Return 409 when no enrichment is running
    - _Requirements: 6d.1, 6d.3, 6d.4_
  - [x] 11.3 Write tests for stop functionality
    - Test stop returns correct status
    - Test stop when not running returns 409
    - _Requirements: 6d.1, 6d.4_

- [x] 12. Game Data Retrieval Endpoint
  - [x] 12.1 Add GET /api/bgg/:bggId route
    - Return complete BggGame record with all fields
    - Return 404 for unknown game
    - _Requirements: 8.1, 8.2, 8.3_
  - [x] 12.2 Write tests for game data endpoint
    - Test returns complete game data
    - Test returns 404 for unknown game
    - _Requirements: 8.1, 8.2_

- [x] 13. Final Verification
  - Ensure all new tests pass
  - Rebuild Docker container

- [x] 14. Sort Enrichment by Release Year
  - [x] 14.1 Update bulk enrichment query to sort by year_published DESC
    - Order games by year_published descending (newest first)
    - Use NULLS LAST to process games without year at the end
    - _Requirements: 6a.5_
  - [x] 14.2 Write test for enrichment ordering
    - Verify games are processed newest first
    - _Requirements: 6a.5_

## Notes

- All tests are required for comprehensive coverage
- Property tests use `fast-check` with `{ numRuns: 5 }` for DB operations
- Import and enrichment run in background - state is in-memory only
- ScraperAPI key is already configured in .env as SCRAPER_API_KEY

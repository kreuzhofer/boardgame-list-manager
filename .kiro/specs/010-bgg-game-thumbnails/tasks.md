# Implementation Plan: BGG Game Thumbnails

## Overview

This implementation adds BoardGameGeek game thumbnails to the search dropdown and game list views. The backend fetches images via ScraperAPI, caches them locally, and serves them through a dedicated endpoint. The frontend uses a reusable lazy-loading component with shimmer animation and press-to-zoom functionality.

## Tasks

- [x] 1. Backend: Configuration and Infrastructure
  - [x] 1.1 Add environment variables to config
    - Add `scraperApiKey`, `scrapeEnabled`, `cacheDir` to `api/src/config/index.ts`
    - Update `example.env` with new variables
    - _Requirements: 10.1, 10.2, 10.3_
  
  - [x] 1.2 Update Docker configuration
    - Add `bgg_image_cache` volume to `docker-compose.yml`
    - Mount volume to `/app/cache/bgg-images` in api container
    - Add environment variables to api service
    - _Requirements: 10.4_

- [x] 2. Backend: Fetch Queue Service
  - [x] 2.1 Create BggFetchQueue service
    - Create `api/src/services/bggFetchQueue.ts`
    - Implement in-flight request tracking with `Map<number, Promise<void>>`
    - Implement `enqueue(bggId)` that returns existing Promise or creates new one
    - Implement `isInFlight(bggId)` check
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_
  
  - [x] 2.2 Write property tests for BggFetchQueue
    - **Property 4: Request deduplication** - concurrent requests get same Promise
    - **Property 5: Subscriber notification** - all subscribers receive same result
    - **Property 6: Queue cleanup** - BGG ID removed from map after completion
    - **Validates: Requirements 2.3, 2.4, 2.5, 2.6, 2.7**

- [x] 3. Backend: Image Service
  - [x] 3.1 Create BggImageService
    - Create `api/src/services/bggImageService.ts`
    - Implement `getImage(bggId, size)` method
    - Implement file existence check using `{bggId}-{size}.jpg` pattern
    - Implement HTML parsing to extract image URLs from `GEEK.geekitemPreload`
    - Implement image download via ScraperAPI
    - Always download both `micro` and `square200` sizes
    - Create marker file for games without images
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.8, 9.3, 9.4, 9.5_
  
  - [x] 3.2 Write property tests for BggImageService
    - **Property 1: Cache hit returns immediately** - no ScraperAPI calls when cached
    - **Property 2: File naming convention** - files match `{bggId}-{size}.jpg`
    - **Property 3: Dual-size fetch** - both sizes downloaded on cache miss
    - **Property 7: Retry after failure** - new fetch on subsequent request after failure
    - **Property 8: No-image marker** - marker file prevents repeated fetches
    - **Property 9: Cache immutability** - cached files never overwritten
    - **Validates: Requirements 1.1, 1.2, 1.5, 1.6, 9.4, 9.5, 10.5**

- [x] 4. Backend: API Endpoint
  - [x] 4.1 Add image endpoint to BGG routes
    - Add `GET /api/bgg/image/:bggId/:size` to `api/src/routes/bgg.routes.ts`
    - Validate `bggId` is numeric and `size` is 'micro' or 'square200'
    - Return image file with appropriate content-type and cache headers
    - Return 404 with error JSON for missing images
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [x] 4.2 Write unit tests for image endpoint
    - Test returns image with correct content-type
    - Test sets cache headers on cached images
    - Test returns 400 for invalid BGG ID
    - Test returns 404 for missing images
    - _Requirements: 3.1, 3.2_

- [x] 5. Checkpoint - Backend Complete
  - Ensure all backend tests pass
  - Verify image caching works with manual test
  - Ask the user if questions arise

- [x] 6. Frontend: LazyBggImage Component
  - [x] 6.1 Create LazyBggImage component
    - Create `frontend/src/components/LazyBggImage.tsx`
    - Accept props: `bggId`, `size`, `alt`, `className`, `enableZoom`
    - Show shimmer placeholder (Tailwind `animate-pulse` with gradient) while loading
    - Fade in image on successful load
    - Show static placeholder icon on error
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [x] 6.2 Create ImageZoomOverlay component
    - Create `frontend/src/components/ImageZoomOverlay.tsx`
    - Use `createPortal` to render to `document.body`
    - Show `square200` image centered with semi-transparent backdrop
    - Close on mouse up / touch end
    - _Requirements: 5.5, 5.6_
  
  - [x] 6.3 Add zoom interaction to LazyBggImage
    - Handle `mousedown`/`mouseup` for desktop
    - Handle `touchstart`/`touchend` for mobile
    - Show ImageZoomOverlay while pressed
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [x] 6.4 Write unit tests for LazyBggImage
    - Test renders shimmer while loading
    - Test shows image after load
    - Test shows placeholder on error
    - Test zoom appears on mousedown
    - Test zoom disappears on mouseup
    - _Requirements: 4.2, 4.4, 5.1, 5.2_

- [x] 7. Frontend: Search Dropdown Integration
  - [x] 7.1 Add thumbnails to AutocompleteDropdown
    - Update `frontend/src/components/AutocompleteDropdown.tsx`
    - Add `LazyBggImage` with `micro` size as leading element in each result
    - Ensure graceful degradation when images unavailable
    - _Requirements: 6.1, 6.2, 9.1_
  
  - [x] 7.2 Write unit tests for AutocompleteDropdown thumbnails
    - Test thumbnail renders for each result
    - Test dropdown works when image API fails
    - _Requirements: 6.1, 9.1_

- [x] 8. Frontend: Game List Integration (Desktop)
  - [x] 8.1 Add thumbnail column to GameRow (desktop)
    - Update `frontend/src/components/GameRow.tsx`
    - Add `square200` thumbnail in first column (desktop only)
    - Use `LazyBggImage` component
    - Ensure graceful degradation when images unavailable
    - _Requirements: 7.1, 7.2, 9.2_
  
  - [x] 8.2 Add Intersection Observer for lazy loading
    - Implement viewport detection for thumbnail loading
    - Limit concurrent image loads to 10
    - _Requirements: 7.3, 7.4_

- [x] 9. Frontend: Game List Integration (Mobile)
  - [x] 9.1 Add thumbnail column to GameRow (mobile)
    - Add `micro` thumbnail column before "BRINGT MIT" and "MITSPIELER"
    - Adjust column widths to accommodate thumbnail
    - Use `LazyBggImage` component
    - _Requirements: 8.1, 8.2, 8.3_
  
  - [x] 9.2 Add Intersection Observer for mobile lazy loading
    - Implement viewport detection for mobile thumbnails
    - _Requirements: 8.4_

- [x] 10. Checkpoint - Frontend Complete
  - Ensure all frontend tests pass
  - Verify thumbnails display in search dropdown
  - Verify thumbnails display in game list (desktop and mobile)
  - Verify zoom functionality works
  - Ask the user if questions arise

- [x] 11. Integration and Final Testing
  - [x] 11.1 End-to-end manual testing
    - Test search dropdown with thumbnails
    - Test game list with thumbnails (desktop)
    - Test game list with thumbnails (mobile)
    - Test zoom on click/tap
    - Test graceful degradation when ScraperAPI unavailable
    - _Requirements: All_
  
  - [x] 11.2 Docker rebuild and verification
    - Rebuild containers with new volume configuration
    - Verify image cache persists across container restarts
    - _Requirements: 10.4_

## Notes

- All tasks including tests are required for comprehensive coverage
- Property tests use `fast-check` library with `numRuns: 3-5` for I/O-bound tests
- All UI text is in German to match existing application
- The zoom overlay uses `createPortal` per modal-rendering guidelines
- Backend tests use Jest with `--runInBand` flag
- Frontend tests use Vitest

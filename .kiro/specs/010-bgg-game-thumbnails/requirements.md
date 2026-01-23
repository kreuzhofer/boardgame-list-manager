# Requirements Document

## Introduction

This feature adds BoardGameGeek (BGG) game thumbnails to the search dropdown and game list views. Images are fetched from BGG pages using ScraperAPI (for both page scraping and image downloads), stored locally, and served from a persistent file cache. A reusable lazy-loading image component handles loading states with animated placeholders. The UI displays in German to match the existing application language.

## Glossary

- **BGG**: BoardGameGeek, the board game database website
- **Thumbnail_Service**: Backend service responsible for fetching, downloading, and caching BGG images
- **Image_Cache**: Local file storage for downloaded images (persistent volume in Docker)
- **ScraperAPI**: Third-party service used to fetch BGG pages and download images without IP blocking
- **Lazy_Image_Control**: Reusable React component that displays images with animated loading state
- **Search_Dropdown**: Autocomplete dropdown showing game suggestions as user types
- **Game_List**: Component displaying games in card or list format
- **micro**: 64x64 pixel thumbnail size from BGG
- **square200**: 200x200 pixel thumbnail size from BGG
- **Placeholder_Animation**: Gradient shimmer animation indicating content is loading (Tailwind animate-pulse or similar)
- **Fetch_Queue**: A queue that processes image fetch requests sequentially, preventing duplicate fetches for the same BGG ID

## Requirements

### Requirement 1: Image Fetching and File-Based Caching

**User Story:** As a system administrator, I want the backend to fetch BGG images and store them as files, so that thumbnails are served quickly from our own cache without database overhead.

#### Acceptance Criteria

1. WHEN the Thumbnail_Service receives a request for a BGG game ID, THE Thumbnail_Service SHALL check if the image file exists in the Image_Cache directory
2. WHEN the image file exists, THE Thumbnail_Service SHALL immediately return the cached image
3. WHEN the image file does not exist, THE Thumbnail_Service SHALL enqueue a fetch request to the Fetch_Queue
4. WHEN the BGG page HTML is received, THE Thumbnail_Service SHALL extract image URLs from the embedded `GEEK.geekitemPreload` JSON object using the method from bgg-image-test.js
5. WHEN image URLs are extracted, THE Thumbnail_Service SHALL download BOTH `micro` and `square200` images using ScraperAPI
6. THE Thumbnail_Service SHALL name cached files using the pattern `{bggId}-{size}.jpg` (e.g., `12345-micro.jpg`, `12345-square200.jpg`)
7. THE Image_Cache directory SHALL be mounted as a persistent volume in the API container
8. THE Thumbnail_Service SHALL NOT store any image metadata in the database

### Requirement 2: Fetch Queue and Request Deduplication

**User Story:** As a system administrator, I want image fetch requests to be queued and deduplicated, so that we don't waste ScraperAPI calls on duplicate downloads and avoid race conditions.

#### Acceptance Criteria

1. THE Thumbnail_Service SHALL maintain a Fetch_Queue that processes fetch requests
2. THE Fetch_Queue SHALL track in-flight requests using an in-memory map of BGG ID to Promise
3. WHEN a fetch request arrives for a BGG ID that already has an in-flight Promise, THE Fetch_Queue SHALL return the existing Promise instead of starting a new fetch
4. WHEN multiple API requests arrive for the same uncached BGG ID, all requests SHALL subscribe to (await) the same Promise
5. WHEN the fetch Promise resolves (success), all subscribed requests SHALL receive the cached image path
6. WHEN the fetch Promise rejects (failure), all subscribed requests SHALL receive the error
7. WHEN a fetch completes (success or failure), THE Fetch_Queue SHALL remove the BGG ID from the in-flight map

### Requirement 3: Image API Endpoint

**User Story:** As a frontend developer, I want an API endpoint that returns images and waits for them to be fetched if needed, so that the lazy-loading component can reliably display images.

#### Acceptance Criteria

1. WHEN a GET request is made to `/api/bgg/image/:bggId/:size`, THE Thumbnail_Service SHALL return the image file (micro or square200)
2. WHEN the image file exists in the cache, THE Thumbnail_Service SHALL return it immediately with appropriate cache headers
3. WHEN the image file does not exist, THE Thumbnail_Service SHALL enqueue a fetch and wait for completion before returning the image
4. THE Thumbnail_Service SHALL NOT timeout the request - the client will wait until the image is ready
5. WHEN fetching images for a request, THE Thumbnail_Service SHALL download and cache BOTH sizes regardless of which size was requested

### Requirement 4: Lazy Loading Image Component

**User Story:** As a user, I want to see a smooth loading animation while images load, so that I know content is being fetched without seeing jarring spinners.

#### Acceptance Criteria

1. THE Lazy_Image_Control SHALL be a reusable React component accepting `bggId`, `size` (micro or square200), and optional styling props
2. WHILE the image is loading, THE Lazy_Image_Control SHALL display a Placeholder_Animation using Tailwind's gradient shimmer effect (animate-pulse or similar)
3. WHEN the image loads successfully, THE Lazy_Image_Control SHALL fade in the image smoothly
4. IF the image fails to load, THEN THE Lazy_Image_Control SHALL display a static placeholder with a board game icon
5. THE Lazy_Image_Control SHALL wait for the API response without a client-side timeout

### Requirement 5: Image Zoom on Interaction

**User Story:** As a user, I want to see a larger version of the thumbnail when I click or tap on it, so that I can get a better look at the game image.

#### Acceptance Criteria

1. WHEN a user clicks and holds on a thumbnail (desktop), THE Lazy_Image_Control SHALL display a zoomed version of the image
2. WHEN a user releases the mouse button (desktop), THE Lazy_Image_Control SHALL hide the zoomed image
3. WHEN a user taps and holds on a thumbnail (mobile), THE Lazy_Image_Control SHALL display a zoomed version of the image
4. WHEN a user releases their finger (mobile), THE Lazy_Image_Control SHALL hide the zoomed image
5. THE zoomed image SHALL use the `square200` size for better quality
6. THE zoomed image SHALL appear as an overlay centered on the screen with a semi-transparent backdrop

### Requirement 6: Search Dropdown Thumbnails

**User Story:** As a user, I want to see game thumbnails in the search dropdown, so that I can visually identify games while searching.

#### Acceptance Criteria

1. WHEN search results are displayed in the Search_Dropdown, THE Search_Dropdown SHALL display a `micro` (64x64) thumbnail as the leading element of each result item
2. THE Search_Dropdown SHALL use the Lazy_Image_Control for all thumbnails
3. WHEN the user types in the search field, THE Search_Dropdown SHALL debounce search requests by 300ms
4. WHEN a new search query is entered, THE Search_Dropdown SHALL cancel pending requests from the previous query

### Requirement 7: Game List Thumbnails (Desktop)

**User Story:** As a user on desktop, I want to see game thumbnails in the game list, so that I can easily browse and identify games.

#### Acceptance Criteria

1. WHEN displaying games on desktop, THE Game_List SHALL display a `square200` thumbnail in a dedicated first column before the rest of the content
2. THE Game_List SHALL use the Lazy_Image_Control for all thumbnails
3. WHEN game rows scroll into the viewport, THE Game_List SHALL trigger lazy-loading of thumbnails using Intersection Observer
4. THE Game_List SHALL limit concurrent image loads to a maximum of 10

### Requirement 8: Game List Thumbnails (Mobile)

**User Story:** As a user on mobile, I want to see compact game thumbnails in the game list, so that I can browse games efficiently on a smaller screen.

#### Acceptance Criteria

1. WHEN displaying games on mobile, THE Game_List SHALL display a `micro` (64x64) thumbnail in a column before the "BRINGT MIT" and "MITSPIELER" columns
2. THE "BRINGT MIT" and "MITSPIELER" columns SHALL be made tighter to accommodate the thumbnail column
3. THE Game_List SHALL use the Lazy_Image_Control for all thumbnails
4. WHEN list items scroll into the viewport, THE Game_List SHALL trigger lazy-loading of thumbnails using Intersection Observer

### Requirement 9: Error Handling and Graceful Degradation

**User Story:** As a user, I want the application to work smoothly even when thumbnails are unavailable, so that missing images don't disrupt my experience.

#### Acceptance Criteria

1. IF the Thumbnail_Service is unavailable, THEN THE Search_Dropdown SHALL continue to function without thumbnails
2. IF the Thumbnail_Service is unavailable, THEN THE Game_List SHALL continue to function without thumbnails
3. WHEN a scrape fails, THE Thumbnail_Service SHALL log the error for monitoring
4. WHEN a scrape fails, THE Thumbnail_Service SHALL allow retry on the next request
5. IF a BGG game has no images, THEN THE Thumbnail_Service SHALL create a marker file to avoid repeated fetch attempts
6. THE static placeholder SHALL display a generic board game icon

### Requirement 10: Configuration and Storage

**User Story:** As a system administrator, I want configurable settings and persistent storage for the thumbnail service, so that I can adjust behavior and ensure images survive container restarts.

#### Acceptance Criteria

1. THE Thumbnail_Service SHALL read the ScraperAPI key from the `SCRAPER_API_KEY` environment variable
2. THE Thumbnail_Service SHALL read the scraping enabled flag from the `BGG_SCRAPE_ENABLED` environment variable
3. THE Thumbnail_Service SHALL store images in a configurable cache directory (default: `/app/cache/bgg-images`)
4. THE Image_Cache directory SHALL be configured as a Docker volume mount for persistence
5. THE Thumbnail_Service SHALL NOT invalidate or replace cached images - cache is cleared only by manual deletion

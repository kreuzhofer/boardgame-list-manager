# Implementation Plan: Custom Thumbnail Upload

## Overview

This implementation adds custom thumbnail upload functionality for manually added games (non-BGG games) and prototype games. The work is organized into backend service implementation, API routes, frontend components, and integration.

## Tasks

- [x] 1. Backend: ThumbnailService and Configuration
  - [x] 1.1 Add custom thumbnail configuration to `api/src/config/index.ts`
    - Add `customThumbnails.cacheDir` path configuration
    - Add `customThumbnails.maxFileSize` (5 MB)
    - Add `customThumbnails.allowedMimeTypes` array
    - _Requirements: 1.2, 1.3, 2.1_

  - [x] 1.2 Create `api/src/services/thumbnailService.ts`
    - Implement `storeThumbnail(gameId, imageBuffer)` method
    - Use sharp to resize to micro (64x64) and square200 (200x200)
    - Convert all images to JPEG format
    - Store files with pattern `{gameId}-{size}.jpg`
    - Implement `getThumbnailPath(gameId, size)` method
    - Implement `deleteThumbnails(gameId)` method
    - Implement `hasThumbnail(gameId)` method
    - _Requirements: 1.1, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 3.1_

  - [x] 1.3 Write property test for thumbnail storage
    - **Property 1: Upload and Storage Correctness**
    - **Validates: Requirements 1.1, 1.4, 1.5, 2.1, 2.2**

- [x] 2. Backend: Thumbnail API Routes
  - [x] 2.1 Create `api/src/routes/thumbnail.routes.ts`
    - POST `/api/thumbnails/:gameId` - Upload thumbnail with multer middleware
    - Validate file size (max 5 MB)
    - Validate MIME type (JPEG, PNG, WebP, GIF)
    - Validate game exists and has no BGG ID
    - Validate user is game owner
    - GET `/api/thumbnails/:gameId/:size` - Serve thumbnail image
    - Return 404 if thumbnail doesn't exist
    - Set appropriate cache headers
    - _Requirements: 1.1, 1.2, 1.3, 1.6, 1.7, 2.3, 2.4_

  - [x] 2.2 Register thumbnail routes in `api/src/index.ts`
    - Import and mount thumbnail routes at `/api/thumbnails`
    - _Requirements: 1.1_

  - [x] 2.3 Write unit tests for thumbnail routes
    - Test file size validation (5 MB boundary)
    - Test MIME type validation
    - Test BGG game rejection
    - Test ownership validation
    - _Requirements: 1.2, 1.3, 1.6, 1.7_

- [x] 3. Backend: Game Deletion Cleanup
  - [x] 3.1 Update `api/src/services/game.service.ts` deleteGame method
    - Call `thumbnailService.deleteThumbnails(gameId)` before deletion
    - Only call for games without BGG ID
    - Catch and log errors without blocking game deletion
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 3.2 Write unit test for cleanup on deletion
    - Test thumbnails are deleted when game is deleted
    - Test deletion proceeds even if thumbnail deletion fails
    - **Property 6: Cleanup on Deletion**
    - **Validates: Requirements 3.1, 3.3**

- [x] 4. Checkpoint - Backend Complete
  - Ensure all backend tests pass, ask the user if questions arise.

- [x] 5. Frontend: API Client Extension
  - [x] 5.1 Add thumbnails API to `frontend/src/api/client.ts`
    - Add `thumbnailsApi.upload(gameId, file, userId)` method using FormData
    - Add `thumbnailsApi.getUrl(gameId, size)` helper function
    - _Requirements: 1.1, 2.3_

- [x] 6. Frontend: ThumbnailUploadModal Component
  - [x] 6.1 Create `frontend/src/components/ThumbnailUploadModal.tsx`
    - Use createPortal for modal rendering
    - File input accepting JPEG, PNG, WebP, GIF
    - Image preview after file selection
    - File size display with warning if >5 MB
    - Loading indicator during upload
    - Error message display
    - Cancel and Upload buttons (min 44px touch targets)
    - Close on successful upload and call onSuccess callback
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [x] 6.2 Write unit tests for ThumbnailUploadModal
    - Test file input accepts correct types
    - Test preview displays after selection
    - Test size warning appears for large files
    - Test cancel button closes modal
    - _Requirements: 7.1, 7.2, 7.3, 7.7_

- [x] 7. Frontend: DesktopActionsMenu Component
  - [x] 7.1 Create `frontend/src/components/DesktopActionsMenu.tsx`
    - "..." button at end of action buttons row
    - Dropdown menu with "Bild hochladen" option
    - Include PrototypeToggle for non-BGG games owned by user
    - Only render for games owned by current user with no BGG ID
    - Use createPortal for dropdown positioning
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 7.2 Write unit tests for DesktopActionsMenu
    - Test menu only appears for owner's non-BGG games
    - Test "Bild hochladen" option is present
    - **Property 7: Menu Visibility**
    - **Validates: Requirements 5.2, 6.2**

- [x] 8. Frontend: Update MobileActionsMenu
  - [x] 8.1 Update `frontend/src/components/MobileActionsMenu.tsx`
    - Add "Bild hochladen" menu entry
    - Only show for games owned by current user with no BGG ID
    - Add onUploadThumbnail callback prop
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 8.2 Write unit tests for updated MobileActionsMenu
    - Test "Bild hochladen" option appears for owner's non-BGG games
    - Test option is hidden for BGG games
    - _Requirements: 6.1, 6.2_

- [x] 9. Frontend: Update GameRow Component
  - [x] 9.1 Update `frontend/src/components/GameRow.tsx`
    - Add DesktopActionsMenu after existing action buttons
    - Pass onUploadThumbnail callback
    - Manage ThumbnailUploadModal state
    - _Requirements: 5.1, 5.4_

- [x] 10. Frontend: Update GameCard Component
  - [x] 10.1 Update `frontend/src/components/GameCard.tsx`
    - Pass onUploadThumbnail callback to MobileActionsMenu
    - Manage ThumbnailUploadModal state
    - _Requirements: 6.3_

- [x] 11. Frontend: Update LazyBggImage for Custom Thumbnails
  - [x] 11.1 Update `frontend/src/components/LazyBggImage.tsx`
    - Add optional `customThumbnailGameId` prop
    - When customThumbnailGameId is provided, use thumbnail API URL instead of BGG URL
    - Maintain same lazy loading and zoom behavior
    - _Requirements: 8.1, 8.3, 8.4_

  - [x] 11.2 Write unit tests for custom thumbnail display
    - Test custom thumbnail URL is used when prop provided
    - Test lazy loading works for custom thumbnails
    - **Property 9: Display Integration**
    - **Validates: Requirements 8.1**

- [x] 12. Frontend: Update Game Display Components
  - [x] 12.1 Update GameRow and GameCard to pass customThumbnailGameId
    - For games without BGG ID, check if custom thumbnail exists
    - Pass gameId to LazyBggImage when custom thumbnail should be shown
    - _Requirements: 8.1, 8.2_

- [x] 13. Checkpoint - Frontend Complete
  - Ensure all frontend tests pass, ask the user if questions arise.

- [x] 14. Integration: Wire Everything Together
  - [x] 14.1 Update GameTable/GameList parent components
    - Add handleUploadThumbnail callback
    - Refresh game data after successful upload
    - _Requirements: 7.5_

  - [x] 14.2 Write integration tests
    - Test full upload flow from UI to storage
    - Test thumbnail display after upload
    - Test cleanup on game deletion
    - _Requirements: 1.1, 3.1, 8.1_

- [x] 15. SSE Broadcasting and Cache-Busting
  - [x] 15.1 Add ThumbnailUploadedEvent to SSE types
    - Add `'game:thumbnail-uploaded'` to SSEEventType union in `api/src/types/sse.ts`
    - Add ThumbnailUploadedEvent interface with timestamp field
    - Add matching types to `frontend/src/types/sse.ts`
    - _Requirements: 9.1, 9.2_

  - [x] 15.2 Broadcast SSE event on thumbnail upload
    - Update `api/src/routes/thumbnail.routes.ts` to broadcast event after successful upload
    - Include gameId, userId, and timestamp in event
    - _Requirements: 9.1, 9.2_

  - [x] 15.3 Update thumbnail API caching headers
    - Change Cache-Control from 30 days to 60 seconds
    - Add ETag header based on file modification time
    - Add If-None-Match handling for 304 responses
    - _Requirements: 9.5_

  - [x] 15.4 Update frontend SSE handler for thumbnail events
    - Update `frontend/src/hooks/useSSE.ts` to handle `game:thumbnail-uploaded` events
    - Extract timestamp from event for cache-busting
    - _Requirements: 9.3_

  - [x] 15.5 Add cache-busting to LazyBggImage
    - Add `thumbnailTimestamp` prop to LazyBggImage
    - Append timestamp as query parameter to custom thumbnail URLs
    - Reset load state when URL changes
    - Update ImageZoomOverlay to support timestamp prop
    - _Requirements: 9.4_

  - [x] 15.6 Track thumbnail timestamps in HomePage
    - Add `thumbnailTimestamps` state (Record<string, number>)
    - Update timestamp on local upload via handleThumbnailUploaded
    - Update timestamp on SSE event receipt
    - Pass timestamps through GameTable to GameRow/GameCard
    - _Requirements: 9.3, 9.4_

- [x] 16. Final Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks are required for comprehensive coverage
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The backend uses sharp for image processing (already a dependency for BGG images)
- The frontend uses createPortal for modal rendering per steering guidelines
- SSE broadcasting enables real-time thumbnail updates across all connected clients
- Cache-busting via timestamps ensures browsers fetch updated thumbnails immediately

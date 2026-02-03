# Requirements Document

## Introduction

This feature enables users to upload custom thumbnail images for manually added games (non-BGG games) and prototype games. The thumbnails are stored on the server, automatically resized to match BGG thumbnail dimensions for visual consistency, and cleaned up when the associated game is deleted. Users can upload thumbnails during game creation or afterward via a menu interface.

## Glossary

- **Custom_Game**: A game entry without a BGG ID, manually added by a user
- **Prototype_Game**: A custom game marked with the prototype toggle
- **Thumbnail_Service**: The backend service responsible for storing, resizing, and serving custom thumbnails
- **Custom_Thumbnail**: A user-uploaded image file associated with a custom game
- **Micro_Size**: A 64x64 pixel thumbnail size matching BGG micro thumbnails
- **Square200_Size**: A 200x200 pixel thumbnail size matching BGG square200 thumbnails
- **Actions_Menu**: A dropdown menu triggered by a "..." button containing additional game actions
- **Upload_Modal**: A dialog component for selecting and uploading thumbnail images

## Requirements

### Requirement 1: Thumbnail Upload API

**User Story:** As a user, I want to upload a custom thumbnail image for my manually added game, so that my game has a visual representation in the list.

#### Acceptance Criteria

1. WHEN a user uploads an image file for a custom game, THE Thumbnail_Service SHALL accept the file and store it on the server
2. WHEN an uploaded file exceeds 5 MB, THE Thumbnail_Service SHALL reject the upload and return an error message
3. WHEN an uploaded file is not a valid image format (JPEG, PNG, WebP, GIF), THE Thumbnail_Service SHALL reject the upload and return an error message
4. WHEN a valid image is uploaded, THE Thumbnail_Service SHALL generate both Micro_Size (64x64) and Square200_Size (200x200) thumbnails
5. WHEN thumbnails are generated, THE Thumbnail_Service SHALL convert them to JPEG format for consistency with BGG thumbnails
6. IF a user attempts to upload a thumbnail for a game with a BGG ID, THEN THE Thumbnail_Service SHALL reject the upload
7. IF a user attempts to upload a thumbnail for a game they do not own, THEN THE Thumbnail_Service SHALL reject the upload with a forbidden error

### Requirement 2: Thumbnail Storage and Retrieval

**User Story:** As a user, I want my uploaded thumbnails to be stored persistently and served efficiently, so that they display correctly across sessions.

#### Acceptance Criteria

1. THE Thumbnail_Service SHALL store custom thumbnails in a dedicated directory separate from BGG cached images
2. THE Thumbnail_Service SHALL name thumbnail files using the pattern {gameId}-{size}.jpg
3. WHEN a thumbnail is requested for a game, THE Thumbnail_Service SHALL check for custom thumbnails before returning a placeholder
4. WHEN serving a custom thumbnail, THE Thumbnail_Service SHALL return the appropriate size (micro or square200) based on the request

### Requirement 3: Thumbnail Cleanup on Game Deletion

**User Story:** As a system administrator, I want custom thumbnails to be automatically deleted when their associated game is deleted, so that storage is not wasted on orphaned files.

#### Acceptance Criteria

1. WHEN a game with custom thumbnails is deleted, THE Thumbnail_Service SHALL delete both the Micro_Size and Square200_Size thumbnail files
2. IF thumbnail deletion fails, THEN THE Thumbnail_Service SHALL log the error but not prevent game deletion
3. THE Thumbnail_Service SHALL only delete thumbnails for games without a BGG ID (custom games)

### Requirement 4: Thumbnail Upload During Game Creation

**User Story:** As a user, I want to upload a thumbnail while creating a custom game, so that my game has an image from the start.

#### Acceptance Criteria

1. WHEN a user is adding a custom game (no BGG selection), THE System SHALL display an option to upload a thumbnail
2. WHEN a user selects a BGG game from search results, THE System SHALL hide the thumbnail upload option
3. WHEN a thumbnail is uploaded during game creation, THE System SHALL associate the thumbnail with the newly created game
4. IF thumbnail upload fails during game creation, THEN THE System SHALL still create the game and display an error message about the thumbnail

### Requirement 5: Thumbnail Upload After Game Creation (Desktop)

**User Story:** As a desktop user, I want to upload or change a thumbnail for my existing custom game, so that I can add images to games I already created.

#### Acceptance Criteria

1. WHEN viewing a custom game on desktop, THE System SHALL display a "..." Actions_Menu button at the end of the action buttons row
2. THE Actions_Menu SHALL only appear for games owned by the current user that have no BGG ID
3. WHEN the Actions_Menu is opened, THE System SHALL display a "Bild hochladen" (Upload Image) menu entry
4. WHEN the user selects "Bild hochladen", THE System SHALL open the Upload_Modal
5. WHEN a new thumbnail is uploaded for a game that already has one, THE Thumbnail_Service SHALL replace the existing thumbnail

### Requirement 6: Thumbnail Upload After Game Creation (Mobile)

**User Story:** As a mobile user, I want to upload or change a thumbnail for my existing custom game using the existing mobile menu, so that I have a consistent experience.

#### Acceptance Criteria

1. WHEN viewing a custom game on mobile, THE existing Actions_Menu SHALL include a "Bild hochladen" menu entry
2. THE "Bild hochladen" menu entry SHALL only appear for games owned by the current user that have no BGG ID
3. WHEN the user selects "Bild hochladen", THE System SHALL open the Upload_Modal
4. THE Upload_Modal SHALL be touch-friendly with appropriate button sizes (minimum 44px touch targets)

### Requirement 7: Upload Modal Interface

**User Story:** As a user, I want a clear and intuitive interface for uploading thumbnails, so that I can easily add images to my games.

#### Acceptance Criteria

1. THE Upload_Modal SHALL display a file input that accepts image files (JPEG, PNG, WebP, GIF)
2. THE Upload_Modal SHALL display a preview of the selected image before upload
3. THE Upload_Modal SHALL display the file size and warn if it exceeds 5 MB
4. THE Upload_Modal SHALL display a loading indicator during upload
5. IF the upload succeeds, THEN THE Upload_Modal SHALL close and the game display SHALL update to show the new thumbnail
6. IF the upload fails, THEN THE Upload_Modal SHALL display the error message and remain open
7. THE Upload_Modal SHALL have a cancel button to close without uploading

### Requirement 8: Thumbnail Display Integration

**User Story:** As a user, I want custom thumbnails to display in the same way as BGG thumbnails, so that the game list looks consistent.

#### Acceptance Criteria

1. WHEN a custom game has a custom thumbnail, THE System SHALL display it using the same component as BGG thumbnails
2. WHEN a custom game has no thumbnail, THE System SHALL display a placeholder icon (existing behavior)
3. THE custom thumbnail display SHALL support the same zoom functionality as BGG thumbnails
4. THE custom thumbnail display SHALL use lazy loading like BGG thumbnails

### Requirement 9: Real-Time Thumbnail Updates via SSE

**User Story:** As a user, I want to see thumbnail updates from other users in real-time, so that the game list stays current without manual refresh.

#### Acceptance Criteria

1. WHEN a user uploads a thumbnail, THE System SHALL broadcast a `game:thumbnail-uploaded` SSE event to all connected clients
2. THE SSE event SHALL include a timestamp for cache-busting purposes
3. WHEN a client receives a `game:thumbnail-uploaded` event, THE System SHALL update the thumbnail display with the new image
4. THE System SHALL use cache-busting query parameters to ensure browsers fetch the updated thumbnail
5. THE thumbnail API SHALL use short cache duration (60 seconds) with ETag validation to support efficient cache-busting

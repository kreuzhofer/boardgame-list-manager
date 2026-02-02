# Event Management Requirements

## Overview
Enable account owners to create, configure, and manage gaming events. Events are the core entity that attendees interact with, accessible via unique URL slugs.

## User Stories

### 1. Create Event
As an account owner, I want to create a new event so that I can organize a gaming gathering.

#### Acceptance Criteria
- 1.1 User can create an event with required fields: name
- 1.2 Slug is auto-generated from name (kebab-case, lowercase)
- 1.3 Slug can be manually edited before saving
- 1.4 Slug must be globally unique across all accounts
- 1.5 Optional fields: start date, end date, start time, end time, location (address), venue name
- 1.6 New events are created in "draft" status by default
- 1.7 Events can be set as public (no password) or private (with password)

### 2. Edit Event
As an account owner, I want to edit my event details so that I can keep information up to date.

#### Acceptance Criteria
- 2.1 User can edit all event fields except the auto-generated ID
- 2.2 Slug can be changed but must remain globally unique
- 2.3 Changing slug updates the event URL (old slug becomes invalid)
- 2.4 Event password can be changed or removed (making event public)
- 2.5 Changes are saved immediately upon form submission

### 3. Event Status Management
As an account owner, I want to change my event's status so that I can control its visibility and accessibility.

#### Acceptance Criteria
- 3.1 Events have four statuses: draft, published, archived, cancelled
- 3.2 User can change status from any state to any other state
- 3.3 Draft events show "coming soon" page to attendees
- 3.4 Published events are fully accessible to attendees
- 3.5 Archived events show read-only game list to attendees
- 3.6 Cancelled events show cancellation notice to attendees
- 3.7 Status changes take effect immediately

### 4. Event Customization
As an account owner, I want to customize my event's appearance so that it reflects my brand/style.

#### Acceptance Criteria
- 4.1 User can set a welcome message (displayed on event page)
- 4.2 User can set an event description (rich text or plain text)
- 4.3 User can upload a banner image (displayed at top of event page)
- 4.4 User can upload a background image
- 4.5 User can set background color (hex or color picker)
- 4.6 User can set font/text color (hex or color picker)
- 4.7 All customization fields are optional with sensible defaults

### 5. Event List View
As an account owner, I want to see all my events so that I can manage them.

#### Acceptance Criteria
- 5.1 Dashboard at `/manage` shows list of all owned events
- 5.2 List shows: event name, slug, status, dates, attendee count
- 5.3 Events can be sorted by name, date created, start date, status
- 5.4 Events can be filtered by status
- 5.5 Each event has quick actions: edit, view, change status, delete
- 5.6 Clicking an event opens the event management detail view

### 6. Event Dashboard
As an account owner, I want to see detailed information about a specific event so that I can monitor activity.

#### Acceptance Criteria
- 6.1 Event dashboard shows event details and statistics
- 6.2 Shows total attendees, total games, games per attendee average
- 6.3 Shows activity trail (recent actions: attendee joined, game added, etc.)
- 6.4 Provides quick links to edit event, manage games, manage attendees
- 6.5 Shows the public event URL for sharing

### 7. Clone Event
As an account owner, I want to duplicate an event so that I can quickly set up recurring events.

#### Acceptance Criteria
- 7.1 User can clone any of their events
- 7.2 Clone dialog offers options: include games, include attendees
- 7.3 Cloned event gets a new auto-generated slug (original-name-copy)
- 7.4 Cloned event is created in draft status regardless of original status
- 7.5 Cloned event dates are cleared (user must set new dates)
- 7.6 All customization settings are copied

### 8. Delete Event
As an account owner, I want to delete an event so that I can remove events I no longer need.

#### Acceptance Criteria
- 8.1 User can delete any of their events
- 8.2 Deletion requires confirmation dialog
- 8.3 Deleting an event removes all associated data (games, attendees, activity)
- 8.4 Deleted event slug becomes available for reuse
- 8.5 Deletion is permanent (no soft delete for events)

### 9. Manage Event Games
As an account owner, I want to manage games in my event so that I can curate the game list.

#### Acceptance Criteria
- 9.1 User can view all games added to the event
- 9.2 User can add games to the event (same BGG search as attendees)
- 9.3 User can remove any game from the event
- 9.4 User can see which attendee brought each game
- 9.5 User can reassign a game to a different attendee or "no one"

### 10. Manage Event Attendees
As an account owner, I want to manage attendees in my event so that I can control participation.

#### Acceptance Criteria
- 10.1 User can view all attendees in the event
- 10.2 User can see games brought by each attendee
- 10.3 User can remove an attendee (their games become unassigned or deleted - configurable)
- 10.4 User can rename an attendee
- 10.5 User can merge duplicate attendees (combine their games)

## Data Model

### Event Entity
- `id`: UUID, primary key
- `accountId`: UUID, foreign key to Account
- `name`: String, required
- `slug`: String, unique, required
- `status`: Enum (draft, published, archived, cancelled)
- `isPublic`: Boolean, default false
- `passwordHash`: String, nullable (null if public)
- `startDate`: Date, nullable
- `endDate`: Date, nullable
- `startTime`: Time, nullable
- `endTime`: Time, nullable
- `location`: String, nullable (address)
- `venue`: String, nullable (venue name)
- `welcomeMessage`: String, nullable
- `description`: Text, nullable
- `bannerImageUrl`: String, nullable
- `backgroundImageUrl`: String, nullable
- `backgroundColor`: String, nullable (hex color)
- `fontColor`: String, nullable (hex color)
- `createdAt`: DateTime
- `updatedAt`: DateTime

### EventActivity Entity
- `id`: UUID, primary key
- `eventId`: UUID, foreign key to Event
- `activityType`: Enum (attendee_joined, attendee_left, game_added, game_removed, status_changed, etc.)
- `actorName`: String (attendee name or "System" or account owner email)
- `details`: JSON (additional context)
- `createdAt`: DateTime

## API Endpoints

### Event CRUD
- `GET /api/events` - List all events for authenticated account
- `POST /api/events` - Create new event
- `GET /api/events/{id}` - Get event details (by ID, for management)
- `PUT /api/events/{id}` - Update event
- `DELETE /api/events/{id}` - Delete event
- `POST /api/events/{id}/clone` - Clone event

### Event Status
- `PATCH /api/events/{id}/status` - Update event status

### Event Games (Management)
- `GET /api/events/{id}/games` - List games in event
- `POST /api/events/{id}/games` - Add game to event
- `DELETE /api/events/{id}/games/{gameId}` - Remove game
- `PATCH /api/events/{id}/games/{gameId}` - Update game (reassign attendee)

### Event Attendees (Management)
- `GET /api/events/{id}/attendees` - List attendees
- `DELETE /api/events/{id}/attendees/{attendeeId}` - Remove attendee
- `PATCH /api/events/{id}/attendees/{attendeeId}` - Update attendee (rename)
- `POST /api/events/{id}/attendees/merge` - Merge attendees

### Public Event Access
- `GET /api/e/{slug}` - Get event by slug (public info for attendees)
- `GET /api/e/{slug}/games` - Get games for event (attendee view)
- `POST /api/e/{slug}/games` - Add game (attendee action)

## Non-Functional Requirements

- Slug generation must handle unicode characters (transliterate to ASCII)
- Image uploads should be limited to 5MB and common formats (jpg, png, webp)
- Event activity trail should be limited to last 100 entries per event
- Slug uniqueness check must be case-insensitive

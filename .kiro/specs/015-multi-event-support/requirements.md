# Requirements Document

## Introduction

This document records the current, implemented multi-event infrastructure. It focuses on event-scoped data, default event bootstrapping, and event-aware API access. It does not define future event creation, management UI, or advanced organizer workflows.

## Glossary

- **Event**: The parent entity that owns users (participants), games, and activity events.
- **Default_Event**: The single event used when no explicit event id is provided.
- **Event_Scope**: The event id applied to API requests and database queries.
- **Account**: An organizer identity that owns events.
- **Event_Password**: The password stored per event and used for attendee access.

## Requirements

### Requirement 1: Event-Centric Data Model

**User Story:** As a developer, I want data to be scoped to events so that multiple events can coexist safely.

#### Acceptance Criteria

1. THE system SHALL store events in a dedicated `Event` model.
2. THE `Event` model SHALL include metadata fields: name, password hash, optional dates, optional location, optional capacity, optional notes, and optional fees.
3. THE `User`, `Game`, and `ActivityEvent` models SHALL include an optional `eventId` that references `Event`.
4. THE system SHALL enforce uniqueness of user names and game names within an event (eventId + name).
5. THE system SHALL index eventId for event-scoped queries.

### Requirement 2: Default Event Bootstrap and Backfill

**User Story:** As a system operator, I want existing single-event data to work without disruption after enabling events.

#### Acceptance Criteria

1. WHEN the API starts, THE system SHALL ensure a default admin account exists.
2. WHEN the API starts, THE system SHALL ensure a Default_Event exists using the configured event name and password.
3. WHEN a Default_Event is created, THE system SHALL mark it as `isDefault = true`.
4. WHEN existing users/games/activity events have no eventId, THE system SHALL backfill them to the Default_Event.

### Requirement 3: Event Resolution for API Requests

**User Story:** As an API client, I want the backend to resolve the correct event scope for each request.

#### Acceptance Criteria

1. WHEN `x-event-id` header is provided, THE system SHALL use it as the Event_Scope.
2. WHEN `eventId` query parameter is provided (and no header), THE system SHALL use it as the Event_Scope.
3. WHEN neither header nor query parameter is provided, THE system SHALL use the Default_Event id.
4. All game, participant, statistics, and thumbnail operations SHALL use the resolved Event_Scope.

### Requirement 4: Event Password Verification

**User Story:** As an attendee, I want event access protected by the event password.

#### Acceptance Criteria

1. THE system SHALL verify event passwords against the password hash stored on the event.
2. WHEN an explicit event id is provided, THE system SHALL validate against that event's password hash.
3. WHEN no event id is provided, THE system SHALL validate against the Default_Event password hash.
4. WHEN the password is missing, THE system SHALL return a 400 error.
5. WHEN the password is incorrect, THE system SHALL return a 401 error.

## Limitations (Current State)

- No event creation or management UI is defined here.
- No event switching or selection UI is defined here.
- Event metadata fields exist in the data model, but management endpoints/UI are not part of this scope.


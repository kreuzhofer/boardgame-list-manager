# Event Management Requirements

## Overview
Enable account owners to create and manage multiple events with slug-based access for attendees. This spec defines event metadata, ownership, and shareable access while preserving the default-event migration path.

## User Stories

### 1. Create Event
As an account owner, I want to create a new event so that I can organize a gaming gathering.

#### Acceptance Criteria
- 1.1 User can create an event with required fields: name and event password
- 1.2 Slug is auto-generated from the name (kebab-case) and can be edited before saving
- 1.3 Slug must be globally unique
- 1.4 Optional fields: start date, end date, location, capacity, notes, fees
- 1.5 Event is owned by the creating account

### 2. Edit Event
As an account owner, I want to edit my event details so that I can keep information up to date.

#### Acceptance Criteria
- 2.1 User can edit event name, slug, password, and optional metadata
- 2.2 Changes are saved on form submission
- 2.3 Updated event password and slug take effect immediately

### 3. Event List View
As an account owner, I want to see all my events so that I can manage them.

#### Acceptance Criteria
- 3.1 A dashboard lists all events owned by the account
- 3.2 List shows at least: event name, slug, date range (if set), last updated timestamp
- 3.3 Selecting an event opens its settings view

### 4. Attendee Access via Event Slug
As an attendee, I want to access the event via a readable link and password.

#### Acceptance Criteria
- 4.1 The event link is `/{slug}`
- 4.2 The event password gate applies to the resolved slug
- 4.3 If no slug is supplied (root `/`), the system uses the default event during migration

## Data Model

### Event Entity
- `id`: UUID, primary key
- `name`: String
- `slug`: String, unique
- `passwordHash`: String
- `startsAt`: DateTime, optional
- `endsAt`: DateTime, optional
- `location`: String, optional
- `capacity`: Integer, optional
- `notes`: Text, optional
- `fees`: Text, optional
- `ownerAccountId`: UUID, foreign key to Account
- `isDefault`: Boolean

## Out of Scope (Current State)

- Public events (no password)
- Event status workflow (draft/published/archived/cancelled)
- Event customization (banner, colors, themes)
- Event cloning and deletion


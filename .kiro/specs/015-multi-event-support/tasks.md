# Implementation Plan: Multi-Event Support (Current State)

## Overview

This implementation plan records the already-delivered multi-event foundation. All tasks below are completed and reflect the current state of the codebase.

## Tasks

- [x] 1. Event Data Model and Migration
  - [x] 1.1 Add `Event` model with metadata fields and ownership by `Account`
    - _Requirements: 1.1, 1.2_
  - [x] 1.2 Add `eventId` references to `User`, `Game`, and `ActivityEvent`
    - _Requirements: 1.3_
  - [x] 1.3 Add event-scoped uniqueness and indexes for users and games
    - _Requirements: 1.4, 1.5_
  - [x] 1.4 Create migration to add events and event scoping
    - _Requirements: 1.1-1.5_

- [x] 2. Default Event Bootstrap and Backfill
  - [x] 2.1 Create `EventService` for hashing and default event lookup
    - _Requirements: 2.2, 4.1_
  - [x] 2.2 Ensure default admin and default event at startup
    - _Requirements: 2.1-2.3_
  - [x] 2.3 Backfill existing users/games/activity events to default event
    - _Requirements: 2.4_

- [x] 3. Event Resolution in API Requests
  - [x] 3.1 Add middleware to resolve event id from header/query or default
    - _Requirements: 3.1-3.3_
  - [x] 3.2 Update routes and services to use event scope
    - _Requirements: 3.4_
  - [x] 3.3 Update auth verification to validate passwords per event
    - _Requirements: 4.1-4.3_

- [x] 4. Frontend Baseline Behavior
  - [x] 4.1 Keep frontend flows on the default event without explicit event selection
    - _Requirements: 3.3, 4.3_


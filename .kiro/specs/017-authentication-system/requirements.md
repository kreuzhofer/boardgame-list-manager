# Authentication System Requirements

## Overview
Define authentication for two distinct audiences:
1) Account owners/admins (organizers) using JWT-based sessions.
2) Event attendees using a shared event password without accounts.

This spec anticipates event-specific access via slugs (e.g. `/lieberhausen2026`) while maintaining backward compatibility with the default event at `/` during the transition period.

## User Stories

### 1. Account Owner Login
As an account owner, I want to log in so that I can access my profile and management tools.

#### Acceptance Criteria
- 1.1 User can log in with email and password at `/login`
- 1.2 Successful login stores a JWT token in localStorage
- 1.3 Successful login redirects to `/`
- 1.4 Failed login shows an error message for invalid credentials
- 1.5 Deactivated accounts cannot log in and receive a clear error message

### 2. Account Owner Logout
As a logged-in account owner, I want to log out so that my session is terminated on this device.

#### Acceptance Criteria
- 2.1 User can log out via a logout action in the account UI
- 2.2 Logout removes the local JWT token and clears account state
- 2.3 Protected account routes require re-authentication after logout

### 3. Session Management
As an account owner, I want my session to persist so that I don't have to log in repeatedly.

#### Acceptance Criteria
- 3.1 JWT tokens are issued upon successful login
- 3.2 Tokens expire after 7 days
- 3.3 Expired tokens require re-authentication (no refresh tokens)
- 3.4 Each login creates a session record for server-side session tracking
- 3.5 Account session APIs allow listing sessions and invalidating sessions

### 4. Log Out All Devices
As an account owner, I want to log out all my sessions so that I can secure my account.

#### Acceptance Criteria
- 4.1 User can log out all devices from the profile page
- 4.2 All existing sessions for the account are invalidated
- 4.3 User is logged out locally after this action
- 4.4 This action is triggered automatically on password change

### 5. Attendee Event Access (Slug-Based)
As an event attendee, I want to access an event by link and password so that I can participate without an account.

#### Acceptance Criteria
- 5.1 Accessing `/{slug}` prompts for the event password
- 5.2 Correct password grants access to that event
- 5.3 Event access is persisted per event (keyed by slug or event id)
- 5.4 When no slug is present (root `/`), the system uses the default event during migration
- 5.5 Attendees do not need accounts; they enter/select a name after password

### 6. Protected Routes
As the system, I need to protect routes based on authentication status and role.

#### Acceptance Criteria
- 6.1 `/profile` and `/admin` routes require authenticated account access
- 6.2 `/admin` routes require the admin role
- 6.3 Event routes `/{slug}` require event password access
- 6.4 Unauthenticated access to protected routes redirects to login or password prompt

## Data Model

### Session Entity
- `id`: UUID, primary key
- `accountId`: UUID, foreign key to Account
- `userAgent`: String, nullable
- `ipAddress`: String, nullable
- `createdAt`: DateTime
- `lastUsedAt`: DateTime

### Event Access Storage
- Stored per event (by slug or event id)
- Persistence mechanism is implementation-defined (localStorage or sessionStorage)

## API Endpoints

### Account Authentication
- `POST /api/accounts/login` - Account login
- `POST /api/accounts/register` - Account registration
- `GET /api/accounts/me` - Get current account

### Session Management
- `GET /api/sessions` - List sessions for account
- `DELETE /api/sessions` - Logout all sessions
- `DELETE /api/sessions/{id}` - Logout a specific session

### Event Access
- `POST /api/auth/verify` - Verify event password (uses resolved event id)

## Non-Functional Requirements

- JWT secret must be configured via environment variable
- Authentication endpoints must be served over HTTPS in production
- Password comparison must use constant-time comparison
- Failed login attempts should not reveal whether email exists

## Out of Scope (Current State)

- Public events (no password)
- Rate limiting on authentication endpoints
- Email verification and password reset (see spec 021)


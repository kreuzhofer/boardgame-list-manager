# Authentication System Requirements

## Overview
Implement a unified authentication system for Brettspieltreff.app that handles account owner login, attendee event access, and session management with JWT tokens.

## User Stories

### 1. Account Owner Login
As an account owner, I want to log in to my account so that I can access the management dashboard.

#### Acceptance Criteria
- 1.1 User can log in with email and password at `/manage/login`
- 1.2 Successful login redirects to `/manage` (event list dashboard)
- 1.3 Failed login shows appropriate error message (invalid credentials)
- 1.4 Deactivated accounts cannot log in (shown message that account is deactivated)
- 1.5 Admin accounts logging in are redirected to `/admin` instead of `/manage`

Note: Unverified account handling will be added with 021-email-system.

### 2. Account Owner Logout
As a logged-in account owner, I want to log out so that my session is terminated.

#### Acceptance Criteria
- 2.1 User can log out from any page via a logout button
- 2.2 Logout invalidates the current session token
- 2.3 After logout, user is redirected to the landing page
- 2.4 Attempting to access protected routes after logout redirects to login

### 3. Session Management
As an account owner, I want my session to persist so that I don't have to log in repeatedly.

#### Acceptance Criteria
- 3.1 JWT tokens are issued upon successful login
- 3.2 Tokens expire after 7 days
- 3.3 Expired tokens require re-authentication (no refresh token mechanism)
- 3.4 Tokens are stored in httpOnly cookies for security
- 3.5 Each login creates a new session record for "log out all devices" functionality

### 4. Log Out All Devices
As an account owner, I want to log out all my sessions so that I can secure my account.

#### Acceptance Criteria
- 4.1 User can trigger "log out all devices" from profile page
- 4.2 All existing sessions for the account are invalidated
- 4.3 User remains logged in on current device (new session created)
- 4.4 This action is also triggered automatically on password change

### 5. Attendee Event Access
As an event attendee, I want to access an event with a password so that I can participate.

#### Acceptance Criteria
- 5.1 Accessing `/{slug}` for a private event shows a password prompt
- 5.2 Correct password grants access to the event
- 5.3 Access is persisted in localStorage (per-event, keyed by slug)
- 5.4 Persisted access lasts for 7 days
- 5.5 Public events (no password) are accessible without authentication
- 5.6 Attendees do not need an account - they just enter/select a name after password

### 6. Protected Routes
As the system, I need to protect routes based on authentication status and role.

#### Acceptance Criteria
- 6.1 `/manage/*` routes require authenticated account_owner or admin
- 6.2 `/admin/*` routes require authenticated admin role
- 6.3 `/{slug}` routes check event password if event is private
- 6.4 Unauthenticated access to protected routes redirects to appropriate login
- 6.5 Insufficient role access shows 403 forbidden page

### 7. Rate Limiting
As the system, I need to prevent brute force attacks on authentication endpoints.

#### Acceptance Criteria
- 7.1 Login attempts are rate limited to 5 attempts per IP per 15 minutes
- 7.2 Password reset requests are rate limited to 3 per email per hour
- 7.3 Rate limited requests receive 429 Too Many Requests response
- 7.4 Rate limit headers are included in responses (X-RateLimit-*)

## Data Model

### Session Entity
- `id`: UUID, primary key
- `accountId`: UUID, foreign key to Account
- `tokenHash`: String, hashed JWT identifier
- `userAgent`: String, nullable
- `ipAddress`: String, nullable
- `createdAt`: DateTime
- `expiresAt`: DateTime
- `revokedAt`: DateTime, nullable

### EventAccess (localStorage structure)
```json
{
  "eventAccess": {
    "{slug}": {
      "authenticated": true,
      "attendeeName": "string",
      "expiresAt": "ISO datetime"
    }
  }
}
```

## API Endpoints

### Account Authentication
- `POST /api/auth/login` - Account owner login
- `POST /api/auth/logout` - Logout current session
- `POST /api/auth/logout-all` - Logout all sessions
- `GET /api/auth/me` - Get current authenticated user

### Event Access
- `POST /api/events/{slug}/access` - Verify event password
- `GET /api/events/{slug}/public` - Get public event info (for password prompt)

## Non-Functional Requirements

- JWT secret must be configured via environment variable
- All authentication endpoints must be served over HTTPS
- Password comparison must use constant-time comparison to prevent timing attacks
- Session tokens should include minimal claims (accountId, role, sessionId)
- Failed login attempts should not reveal whether email exists

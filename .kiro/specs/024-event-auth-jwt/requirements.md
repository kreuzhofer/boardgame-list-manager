# Requirements Document

## Introduction

The current event login flow validates the shared event password on the server but returns only `{ success: true }` — no token is issued. The frontend stores a plain `'true'` string in `sessionStorage`, which has two problems: (1) auth is lost when the PWA is killed by the OS because `sessionStorage` is cleared, and (2) any user can bypass the gate by manually setting the storage key in dev tools. This feature replaces the plain flag with a server-issued JWT stored in `localStorage`, making event auth persistent across PWA restarts and server-verifiable on protected routes.

## Glossary

- **Event_Token**: A JSON Web Token (JWT) issued by the API upon successful event password verification, containing the `eventId` claim and a configurable expiry.
- **Auth_Verify_Endpoint**: The `POST /api/auth/verify` route that accepts an event password and returns an Event_Token on success.
- **AuthGuard**: The frontend React component that gates access to the application by checking for a valid Event_Token in `localStorage`.
- **PasswordScreen**: The frontend React component that renders the password entry form and calls the Auth_Verify_Endpoint.
- **Event_Token_Service**: The backend service responsible for signing and verifying Event_Tokens using the configured JWT secret.
- **Event_Auth_Middleware**: Express middleware that extracts and validates the Event_Token from incoming requests.
- **Token_Storage**: The `localStorage` entry (keyed by `AUTH_STORAGE_KEY`) where the frontend persists the Event_Token.

## Requirements

### Requirement 1: Issue JWT on Successful Event Password Verification

**User Story:** As a user, I want to receive a signed token when I enter the correct event password, so that my authentication is cryptographically verifiable and not spoofable.

#### Acceptance Criteria

1. WHEN a valid event password is submitted to the Auth_Verify_Endpoint, THE Auth_Verify_Endpoint SHALL return a response containing `success: true` and a signed Event_Token.
2. THE Event_Token_Service SHALL sign the Event_Token using the `JWT_SECRET` environment variable and include the `eventId` as a claim.
3. WHEN an invalid event password is submitted to the Auth_Verify_Endpoint, THE Auth_Verify_Endpoint SHALL return a 401 response without an Event_Token.
4. WHEN the password field is missing or empty, THE Auth_Verify_Endpoint SHALL return a 400 response without an Event_Token.

### Requirement 2: Configurable Token Expiry

**User Story:** As an event organizer, I want to configure how long event tokens remain valid, so that I can control the authentication window for my event.

#### Acceptance Criteria

1. THE Event_Token_Service SHALL read the token expiry duration from the `EVENT_TOKEN_EXPIRY` environment variable.
2. WHEN `EVENT_TOKEN_EXPIRY` is not set, THE Event_Token_Service SHALL default to a 7-day expiry.
3. THE Event_Token SHALL include an `exp` claim matching the configured expiry duration.

### Requirement 3: Server-Side Token Validation Middleware

**User Story:** As a developer, I want the backend to validate event tokens on protected routes, so that unauthenticated requests are rejected at the API level.

#### Acceptance Criteria

1. THE Event_Auth_Middleware SHALL extract the Event_Token from the `Authorization` header using the `Bearer` scheme.
2. WHEN a valid Event_Token is presented, THE Event_Auth_Middleware SHALL allow the request to proceed and attach the decoded `eventId` to the request object.
3. WHEN an expired Event_Token is presented, THE Event_Auth_Middleware SHALL return a 401 response with an appropriate error message.
4. WHEN a malformed or tampered Event_Token is presented, THE Event_Auth_Middleware SHALL return a 401 response with an appropriate error message.
5. WHEN no Event_Token is present in the request, THE Event_Auth_Middleware SHALL return a 401 response.

### Requirement 4: Persistent Frontend Token Storage

**User Story:** As a user on a mobile device, I want my event authentication to survive app restarts, so that I do not have to re-enter the password every time the OS kills the PWA.

#### Acceptance Criteria

1. WHEN the PasswordScreen receives a successful authentication response, THE PasswordScreen SHALL store the Event_Token in Token_Storage using `localStorage`.
2. WHEN the AuthGuard initializes, THE AuthGuard SHALL read the Event_Token from Token_Storage and validate its presence.
3. WHEN a valid Event_Token exists in Token_Storage, THE AuthGuard SHALL render the protected content without showing the PasswordScreen.
4. WHEN no Event_Token exists in Token_Storage, THE AuthGuard SHALL render the PasswordScreen.
5. WHEN the `clearAuthentication` utility is called, THE AuthGuard module SHALL remove the Event_Token from Token_Storage.

### Requirement 5: Frontend Token Expiry Handling

**User Story:** As a user, I want to be prompted to re-authenticate when my token expires, so that I always have a valid session.

#### Acceptance Criteria

1. WHEN the AuthGuard reads an Event_Token from Token_Storage, THE AuthGuard SHALL decode the token and check the `exp` claim against the current time.
2. WHEN the Event_Token has expired, THE AuthGuard SHALL remove the token from Token_Storage and render the PasswordScreen.
3. WHEN an API request returns a 401 response indicating an expired or invalid Event_Token, THE frontend SHALL clear the Token_Storage and redirect the user to the PasswordScreen.

### Requirement 6: Frontend Sends Token on API Requests

**User Story:** As a developer, I want the frontend to attach the event token to outgoing API requests, so that the backend can verify event authentication.

#### Acceptance Criteria

1. WHEN an Event_Token exists in Token_Storage, THE frontend API client SHALL include the Event_Token in the `Authorization` header as a `Bearer` token on all API requests.
2. WHEN no Event_Token exists in Token_Storage, THE frontend API client SHALL send requests without an `Authorization` header (for the event token).

### Requirement 7: Backward-Compatible API Response

**User Story:** As a developer, I want the verify endpoint response to remain backward-compatible, so that existing integrations continue to work.

#### Acceptance Criteria

1. THE Auth_Verify_Endpoint SHALL continue to include the `success` boolean field in the response body.
2. THE Auth_Verify_Endpoint SHALL add the `token` field alongside the existing `success` field in the response body.

# Implementation Plan: Event Auth JWT

## Overview

Replace the plain `sessionStorage` flag with JWT-based event authentication. Backend issues a signed token on password verification; frontend stores it in `localStorage` and attaches it to requests. Implementation proceeds bottom-up: config → service → middleware → route → frontend types → frontend components.

## Tasks

- [x] 1. Add event token config and create EventTokenService
  - [x] 1.1 Add `eventToken.expiresIn` to `api/src/config/index.ts` reading from `EVENT_TOKEN_EXPIRY` env var, defaulting to `'7d'`
    - Add `EVENT_TOKEN_EXPIRY` to `example.env` with a comment
    - _Requirements: 2.1, 2.2_

  - [x] 1.2 Create `api/src/services/event-token.service.ts` with `sign(eventId)` and `verify(token)` methods
    - Sign with `JWT_SECRET`, include `{ eventId, type: 'event' }` claims, use configured expiry
    - `verify()` checks signature, expiry, and `type === 'event'` claim
    - Export singleton instance
    - _Requirements: 1.2, 2.3_

  - [x] 1.3 Write property tests for EventTokenService
    - Create `api/src/services/__tests__/event-token.service.property.test.ts`
    - **Property 1: EventTokenService round-trip** — for any eventId, sign then verify returns same eventId (numRuns: 10)
    - **Validates: Requirements 1.2**
    - **Property 2: Token expiry matches configuration** — for any eventId, token exp ≈ iat + configured duration (numRuns: 5)
    - **Validates: Requirements 2.3**

  - [x] 1.4 Write unit tests for EventTokenService
    - Create `api/src/services/__tests__/event-token.service.test.ts`
    - Test: account token rejected by verify (type mismatch)
    - Test: expired token returns null
    - Test: default expiry is 7 days when env var not set
    - _Requirements: 2.2, 3.3, 3.4_

- [x] 2. Create event auth middleware
  - [x] 2.1 Create `api/src/middleware/event-auth.middleware.ts` with `requireEventAuth` function
    - Extract Bearer token from Authorization header
    - Call `EventTokenService.verify()`
    - On success: attach `eventId` to request, call `next()`
    - On failure: return 401 with `INVALID_EVENT_TOKEN` error code
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 2.2 Write property tests for event auth middleware
    - Create `api/src/middleware/__tests__/event-auth.middleware.property.test.ts`
    - **Property 3: Valid event token passes middleware** — for any signed token, middleware calls next() with correct eventId (numRuns: 5)
    - **Validates: Requirements 3.2**
    - **Property 4: Malformed tokens rejected** — for any arbitrary non-JWT string, middleware returns 401 (numRuns: 10)
    - **Validates: Requirements 3.4**

  - [x] 2.3 Write unit tests for event auth middleware
    - Create `api/src/middleware/__tests__/event-auth.middleware.test.ts`
    - Test: missing Authorization header → 401
    - Test: expired token → 401
    - Test: account token (wrong type) → 401
    - _Requirements: 3.3, 3.5_

- [x] 3. Checkpoint - Backend service and middleware
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Update verify endpoint to return JWT
  - [x] 4.1 Modify `api/src/routes/auth.routes.ts` to import EventTokenService and return `{ success: true, token }` on valid password
    - Keep existing error responses unchanged (backward compatible)
    - _Requirements: 1.1, 1.3, 1.4, 7.1, 7.2_

  - [x] 4.2 Write integration tests for updated verify endpoint
    - Update or create `api/src/routes/__tests__/auth.routes.test.ts`
    - **Property 8: Verify endpoint backward compatibility** — for any valid password, response contains success: true and a decodable JWT token (numRuns: 3)
    - **Validates: Requirements 1.1, 7.1, 7.2**
    - Test: invalid password → 401, no token field
    - Test: missing password → 400, no token field
    - _Requirements: 1.3, 1.4_

- [x] 5. Update frontend types and API client
  - [x] 5.1 Add `token?: string` to `AuthVerifyResponse` in `frontend/src/types/index.ts`
    - _Requirements: 7.2_

  - [x] 5.2 Add event token storage helpers to `frontend/src/api/client.ts`
    - Add `EVENT_TOKEN_KEY = 'boardgame_event_token'` constant
    - Add `getEventToken()`, `setEventToken(token)`, `removeEventToken()` exports
    - Update `fetchApi` to attach event token in Authorization header when no account token is present
    - _Requirements: 6.1, 6.2_

- [x] 6. Update AuthGuard and PasswordScreen
  - [x] 6.1 Update `frontend/src/components/AuthGuard.tsx`
    - Switch from `sessionStorage` to `localStorage` via the new event token helpers
    - Store/read the JWT string instead of `'true'`
    - On init: decode token payload (base64), check `exp` against `Date.now()/1000`
    - If expired or missing: show PasswordScreen
    - Update `clearAuthentication()` to call `removeEventToken()`
    - Update `isEventAuthenticated()` to check token presence and expiry
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2_

  - [x] 6.2 Update `frontend/src/components/PasswordScreen.tsx`
    - Change `onAuthenticated` callback signature to `(token: string) => void`
    - Pass `response.token` from verify response to callback
    - _Requirements: 4.1_

  - [x] 6.3 Write property tests for AuthGuard
    - Create `frontend/src/components/__tests__/AuthGuard.property.test.ts`
    - **Property 5: Valid token renders protected content** — for any non-expired JWT in localStorage, AuthGuard renders children (numRuns: 5)
    - **Validates: Requirements 4.3**
    - **Property 6: Expired token triggers re-authentication** — for any expired JWT in localStorage, AuthGuard shows PasswordScreen (numRuns: 5)
    - **Validates: Requirements 5.2**
    - **Property 7: clearAuthentication removes token** — for any JWT in localStorage, calling clearAuthentication results in null (numRuns: 10)
    - **Validates: Requirements 4.5**

  - [x] 6.4 Write unit tests for AuthGuard
    - Update `frontend/src/components/__tests__/AuthGuard.test.tsx`
    - Test: no token → shows PasswordScreen
    - Test: valid token → renders children
    - Test: clearAuthentication removes token
    - _Requirements: 4.4, 4.5, 5.3_

- [x] 7. Final checkpoint - Full integration
  - Ensure all backend and frontend tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The event auth middleware is created but not applied to existing routes — it provides infrastructure for future route protection
- The existing account auth (`auth_token` in localStorage, `SessionService`) is untouched
- Property tests use `fast-check` (already in both api and frontend dependencies)

# Implementation Plan: Authentication System

## Overview

Implement dual authentication: JWT-based account auth for owners/admins and event-password auth for attendees. The system already has most components in place (AccountService, SessionService, AuthMiddleware, AuthContext, AuthGuard, AccountAuthGuard). Tasks focus on ensuring completeness, wiring, and test coverage.

## Tasks

- [x] 1. Verify and complete backend auth services
  - [x] 1.1 Verify AccountService password validation covers all rules (min 8 chars, at least one letter, at least one number)
    - Ensure `validatePassword` in `api/src/services/account.service.ts` matches requirements
    - Ensure `authenticate` returns generic error for both wrong email and wrong password (requirement 1.4, non-functional)
    - _Requirements: 1.1, 1.4, 1.5_
  - [x] 1.2 Verify SessionService token creation uses 7-day expiry and creates DB session record
    - Confirm `createSession` in `api/src/services/session.service.ts` signs with `expiresIn: '7d'`
    - Confirm `validateToken` checks session existence and updates `lastUsedAt`
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - [x] 1.3 Verify password change invalidates other sessions
    - Confirm `account.routes.ts` PATCH `/me/password` calls `deleteAllSessionsExcept`
    - _Requirements: 4.4_
  - [x] 1.4 Write property test: JWT expiry is 7 days
    - **Property 1: JWT expiry is 7 days from issuance**
    - **Validates: Requirements 3.2**
    - File: `api/src/services/__tests__/session.service.property.test.ts`
  - [x] 1.5 Write property test: Login creates session record
    - **Property 2: Login creates a session record**
    - **Validates: Requirements 3.4**
    - File: `api/src/services/__tests__/session.service.property.test.ts`

- [x] 2. Implement session management endpoints
  - [x] 2.1 Verify session listing returns `isCurrent` flag
    - Confirm GET `/api/sessions` in `api/src/routes/session.routes.ts` adds `isCurrent` to each session
    - _Requirements: 3.5_
  - [x] 2.2 Verify logout-all deletes all sessions for account
    - Confirm DELETE `/api/sessions` calls `deleteAllSessions`
    - _Requirements: 4.1, 4.2_
  - [x] 2.3 Verify single session deletion checks ownership
    - Confirm DELETE `/api/sessions/:id` verifies session belongs to requesting account
    - _Requirements: 3.5_
  - [x] 2.4 Write property test: Logout-all removes all sessions
    - **Property 3: Logout-all removes all sessions**
    - **Validates: Requirements 4.2**
    - File: `api/src/services/__tests__/session.service.property.test.ts`
  - [x] 2.5 Write property test: Password change invalidates other sessions
    - **Property 4: Password change invalidates other sessions**
    - **Validates: Requirements 4.4**
    - File: `api/src/services/__tests__/session.service.property.test.ts`

- [x] 3. Checkpoint - Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Verify event password authentication
  - [x] 4.1 Verify POST `/api/auth/verify` resolves event ID and checks password
    - Confirm `api/src/routes/auth.routes.ts` uses `resolveEventId` and `eventService.verifyEventPassword`
    - _Requirements: 5.1, 5.2, 5.4_
  - [x] 4.2 Verify AuthGuard stores event access in sessionStorage
    - Confirm `frontend/src/components/AuthGuard.tsx` uses `sessionStorage` with `boardgame_event_auth` key
    - _Requirements: 5.3_
  - [x] 4.3 Write property test: Event access isolation
    - **Property 5: Event access isolation**
    - **Validates: Requirements 5.3**
    - File: `frontend/src/components/__tests__/AuthGuard.property.test.ts`

- [x] 5. Verify frontend auth flow and route protection
  - [x] 5.1 Verify AuthContext login stores JWT in localStorage and sets account state
    - Confirm `frontend/src/contexts/AuthContext.tsx` calls `setToken` on login
    - _Requirements: 1.2, 1.3_
  - [x] 5.2 Verify AuthContext logout removes JWT and clears state
    - Confirm `logout` calls `removeToken` and sets account to null
    - _Requirements: 2.1, 2.2_
  - [x] 5.3 Verify AccountAuthGuard redirects unauthenticated users to /login
    - Confirm `frontend/src/components/AccountAuthGuard.tsx` uses `Navigate to="/login"`
    - _Requirements: 6.1, 6.4_
  - [x] 5.4 Verify admin route protection in App.tsx
    - Confirm `/admin` route is wrapped with `AccountAuthGuard` and admin role is checked
    - _Requirements: 6.2_
  - [x] 5.5 Write unit tests for AuthContext login/logout/refresh flows
    - Test login stores token, logout clears token, refresh validates token
    - File: `frontend/src/contexts/__tests__/AuthContext.test.tsx`
    - _Requirements: 1.2, 2.2, 2.3_
  - [x] 5.6 Write unit tests for AccountAuthGuard redirect behavior
    - Test redirect to /login when unauthenticated, render children when authenticated
    - File: `frontend/src/components/__tests__/AccountAuthGuard.test.tsx`
    - _Requirements: 6.1, 6.4_

- [x] 6. Verify auth middleware and role enforcement
  - [x] 6.1 Verify requireAuth rejects invalid/expired tokens and deactivated accounts
    - Confirm `api/src/middleware/auth.middleware.ts` returns 401 for bad tokens, 403 for deactivated
    - _Requirements: 1.5, 3.3_
  - [x] 6.2 Verify requireAdmin rejects non-admin accounts with 403
    - Confirm middleware checks `account.role !== 'admin'` and returns 403
    - _Requirements: 6.2_
  - [x] 6.3 Write unit tests for auth middleware
    - Test requireAuth with valid token, expired token, missing token, deactivated account
    - Test requireAdmin with admin role, non-admin role
    - File: `api/src/middleware/__tests__/auth.middleware.test.ts`
    - _Requirements: 1.5, 3.3, 6.2_

- [x] 7. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Most implementation already exists — tasks focus on verification, gap-filling, and test coverage
- Property tests use `fast-check` with `{ numRuns: 3 }` for DB operations per workspace guidelines
- Each task references specific requirements for traceability

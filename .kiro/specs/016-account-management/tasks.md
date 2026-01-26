# Implementation Plan: Account Management

## Overview

This implementation enables event managers to create and manage accounts for the Brettspieltreff.app platform. Account owners can register, manage their profile, change passwords, and control their account lifecycle. The system uses JWT-based session management with bcrypt password hashing. Email confirmation flows will be added in a later spec (021-email-system).

## Tasks

- [x] 1. Database Schema and Dependencies
  - [x] 1.1 Install backend dependencies (bcryptjs, jsonwebtoken, and their types)
    - `cd api && npm install bcryptjs jsonwebtoken`
    - `cd api && npm install -D @types/bcryptjs @types/jsonwebtoken`
    - _Requirements: Non-functional (bcrypt hashing), Design (JWT tokens)_
  - [x] 1.2 Add Account and Session models to Prisma schema
    - Add `AccountRole` enum (account_owner, admin)
    - Add `AccountStatus` enum (active, deactivated)
    - Add `Account` model with id, email, passwordHash, role, status, timestamps
    - Add `Session` model with id, accountId, userAgent, ipAddress, timestamps
    - Add relation between Account and Session (cascade delete)
    - _Requirements: Data Model (Account Entity), Design (Database Schema)_
  - [x] 1.3 Create and run database migration
    - `cd api && npx prisma migrate dev --name add_account_management`
    - Verify migration creates accounts and sessions tables
    - _Requirements: Data Model_

- [x] 2. Backend Types
  - [x] 2.1 Create account types file
    - Create `api/src/types/account.ts` with AccountRole, AccountStatus, Account, Session interfaces
    - _Requirements: Data Model, Design (TypeScript Types)_

- [x] 3. AccountService Implementation
  - [x] 3.1 Create AccountService with password utilities
    - Create `api/src/services/account.service.ts`
    - Implement `validatePassword()` - min 8 chars, at least one letter, one number
    - Implement `hashPassword()` using bcryptjs (cost factor 12)
    - Implement `verifyPassword()` for password comparison
    - _Requirements: 1.3 (password requirements), Non-functional (bcrypt)_
  - [x] 3.2 Implement account registration
    - Implement `register()` method
    - Validate email uniqueness
    - Hash password and create account with role=account_owner, status=active
    - _Requirements: 1.1, 1.2, 1.4, 5.2_
  - [x] 3.3 Implement account authentication
    - Implement `authenticate()` method
    - Find account by email, verify password, check status is active
    - _Requirements: 4.3 (deactivated accounts cannot login)_
  - [x] 3.4 Implement password change
    - Implement `changePassword()` method
    - Verify current password before allowing change
    - Validate new password meets requirements
    - _Requirements: 2.1, 2.2_
  - [x] 3.5 Implement account deactivation and admin promotion
    - Implement `deactivate()` method with password confirmation
    - Implement `promoteToAdmin()` method (admin-only)
    - Implement `getById()` method
    - _Requirements: 4.1, 4.2, 5.3_

- [x] 4. SessionService Implementation
  - [x] 4.1 Create SessionService with JWT handling
    - Create `api/src/services/session.service.ts`
    - Implement `createSession()` - create session record and return JWT token
    - Implement `validateToken()` - verify JWT and check session exists
    - JWT expires after 7 days, contains accountId and sessionId
    - _Requirements: 2.3 (session invalidation), Design (JWT tokens)_
  - [x] 4.2 Implement session management methods
    - Implement `getSessionsForAccount()` - list all sessions
    - Implement `deleteSession()` - delete single session
    - Implement `deleteAllSessions()` - logout all devices
    - Implement `deleteAllSessionsExcept()` - for password change flow
    - _Requirements: 3.2 (list sessions, logout all devices)_

- [x] 5. Auth Middleware
  - [x] 5.1 Create auth middleware
    - Create `api/src/middleware/auth.middleware.ts`
    - Implement `requireAuth` middleware - validate JWT, attach account to request
    - Implement `requireAdmin` middleware - check account has admin role
    - Define `AuthenticatedRequest` interface extending Express Request
    - _Requirements: 5.1 (role distinction), Design (Auth Middleware)_

- [x] 6. Backend Routes
  - [x] 6.1 Create account routes
    - Create `api/src/routes/account.routes.ts`
    - POST `/api/accounts/register` - registration (returns success message)
    - POST `/api/accounts/login` - authentication (returns JWT token)
    - GET `/api/accounts/me` - get current account (requires auth)
    - PATCH `/api/accounts/me/password` - change password (requires auth, invalidates other sessions)
    - POST `/api/accounts/me/deactivate` - deactivate account (requires auth, password confirmation)
    - POST `/api/accounts/:id/promote` - promote to admin (requires admin)
    - _Requirements: 1.1-1.5, 2.1-2.4, 3.1-3.3, 4.1-4.5, 5.3_
  - [x] 6.2 Create session routes
    - Create `api/src/routes/session.routes.ts`
    - GET `/api/sessions` - list sessions with isCurrent flag (requires auth)
    - DELETE `/api/sessions` - logout all devices (requires auth)
    - DELETE `/api/sessions/:id` - logout specific session (requires auth)
    - _Requirements: 3.2 (session list, logout all)_
  - [x] 6.3 Register routes in main app
    - Update `api/src/index.ts`
    - Import and register account routes at `/api/accounts`
    - Import and register session routes at `/api/sessions`
    - Add JWT_SECRET to config/index.ts
    - _Requirements: All API routes_

- [x] 7. Backend Property-Based Tests
  - [x] 7.1 Write property tests for password validation (Property 1)
    - Create `api/src/services/__tests__/account.service.property.test.ts`
    - Test: password accepted iff ≥8 chars AND has letter AND has number
    - **Validates: Requirements 1.3, 2.2**
  - [x] 7.2 Write property tests for password hash security (Property 3)
    - Test: hash ≠ password, correct password verifies, wrong password fails
    - **Validates: Non-functional (bcrypt)**
  - [x] 7.3 Write property tests for new account defaults (Property 7)
    - Test: new accounts always have role=account_owner, status=active
    - **Validates: Requirements 1.4, 5.2**

- [x] 8. Backend Unit Tests
  - [x] 8.1 Write AccountService unit tests
    - Create `api/src/services/__tests__/account.service.test.ts`
    - Test registration, authentication, password change, deactivation
    - _Requirements: All account operations_
  - [x] 8.2 Write SessionService unit tests
    - Create `api/src/services/__tests__/session.service.test.ts`
    - Test session creation, token validation, session deletion
    - _Requirements: Session management_

- [x] 9. Frontend Types and API Client
  - [x] 9.1 Create frontend account types
    - Create `frontend/src/types/account.ts` with Account, Session interfaces
    - _Requirements: Design (Frontend TypeScript Types)_
  - [x] 9.2 Add account API methods to client
    - Update `frontend/src/api/client.ts`
    - Add register, login, getMe, changePassword, deactivate methods
    - Add getSessions, logoutAll, logoutSession methods
    - _Requirements: All API endpoints_

- [x] 10. AuthContext Implementation
  - [x] 10.1 Create AuthContext and AuthProvider
    - Create `frontend/src/contexts/AuthContext.tsx`
    - Implement AuthProvider with account state, isAuthenticated, isLoading
    - Implement login, register, logout, refreshAccount methods
    - Store JWT token in localStorage
    - _Requirements: Design (AuthContext)_
  - [x] 10.2 Create useAuth hook
    - Export useAuth hook from AuthContext
    - Handle token persistence and auto-login on mount
    - _Requirements: Design (useAuth hook)_

- [x] 11. Frontend Pages
  - [x] 11.1 Create LoginPage
    - Create `frontend/src/pages/LoginPage.tsx`
    - Email and password inputs
    - Submit button, link to registration
    - Error display and loading state
    - Redirect to dashboard on success
    - _Requirements: Design (LoginPage)_
  - [x] 11.2 Create RegisterPage
    - Create `frontend/src/pages/RegisterPage.tsx`
    - Email, password, password confirmation inputs
    - Password requirements display
    - Submit button, link to login
    - Redirect to login with success message after registration
    - _Requirements: 1.1-1.5, Design (RegisterPage)_
  - [x] 11.3 Create ProfilePage
    - Create `frontend/src/pages/ProfilePage.tsx`
    - Account info display (email, created date, status)
    - Password change form (current + new password)
    - Active sessions list with logout buttons
    - "Log out all devices" button
    - Account deactivation section with password confirmation
    - _Requirements: 2.1-2.4, 3.1-3.3, 4.1-4.2, Design (ProfilePage)_

- [x] 12. Frontend Components
  - [x] 12.1 Create AccountAuthGuard component
    - Create `frontend/src/components/AccountAuthGuard.tsx`
    - Check for valid JWT token
    - Redirect to login if not authenticated
    - Show loading state while checking
    - Render children if authenticated
    - _Requirements: Design (AccountAuthGuard)_

- [x] 13. Frontend Routing
  - [x] 13.1 Add account routes to App
    - Update `frontend/src/App.tsx`
    - Wrap app with AuthProvider
    - Add routes for /login, /register, /profile
    - Wrap /profile route with AccountAuthGuard
    - Add navigation links to Header component
    - _Requirements: All frontend pages_

- [x] 14. Frontend Tests
  - [x] 14.1 Write AuthContext tests
    - Create `frontend/src/contexts/__tests__/AuthContext.test.tsx`
    - Test login, logout, register flows
    - Test token persistence
    - _Requirements: Authentication flow_
  - [x] 14.2 Write LoginPage tests
    - Create `frontend/src/pages/__tests__/LoginPage.test.tsx`
    - Test form validation, submission, error display
    - _Requirements: 1.1-1.5_
  - [x] 14.3 Write RegisterPage tests
    - Create `frontend/src/pages/__tests__/RegisterPage.test.tsx`
    - Test form validation, password requirements, submission
    - _Requirements: 1.1-1.5_

- [x] 15. Integration Tests
  - [x] 15.1 Write account routes integration tests
    - Create `api/src/__tests__/account.integration.test.ts`
    - Test full registration → login → profile flow
    - Test password change with session invalidation (Property 4)
    - Test account deactivation blocks login (Property 5)
    - Test email uniqueness (Property 2)
    - Test admin promotion authorization (Property 6)
    - _Requirements: All account operations_

- [x] 16. Environment Configuration
  - [x] 16.1 Add JWT_SECRET to environment files
    - Add JWT_SECRET to `.env` and `example.env`
    - Add JWT_SECRET to `api/src/config/index.ts`
    - Document that JWT_SECRET should be a strong random string (min 32 chars)
    - _Requirements: Security (JWT signing)_

- [x] 17. Docker Rebuild and Verification
  - [x] 17.1 Rebuild containers and verify
    - `docker compose up -d --build`
    - Verify registration flow works
    - Verify login flow works
    - Verify profile page displays correctly
    - Verify password change invalidates other sessions
    - Verify account deactivation blocks login
    - _Requirements: All features working in Docker_

## Notes

- All passwords are hashed using bcryptjs with cost factor 12
- JWT tokens expire after 7 days and contain accountId and sessionId
- Sessions are stored in database for "log out all devices" functionality
- Property-based tests use `fast-check` with `{ numRuns: 3-5 }` for DB operations
- Email verification will be added in spec 021-email-system
- German error messages are used for user-facing errors

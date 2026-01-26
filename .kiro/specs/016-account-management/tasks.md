# Account Management - Implementation Tasks

## Task 1: Database Schema and Dependencies

- [ ] 1.1 Install backend dependencies (bcryptjs, jsonwebtoken, and their types)
  - **Requirement**: Non-functional (bcrypt hashing), Design (JWT tokens)
  - `cd api && npm install bcryptjs jsonwebtoken`
  - `cd api && npm install -D @types/bcryptjs @types/jsonwebtoken`

- [ ] 1.2 Add Account and Session models to Prisma schema
  - **Requirement**: Data Model (Account Entity), Design (Database Schema)
  - Add `AccountRole` enum (account_owner, admin)
  - Add `AccountStatus` enum (active, deactivated)
  - Add `Account` model with id, email, passwordHash, role, status, timestamps
  - Add `Session` model with id, accountId, userAgent, ipAddress, timestamps
  - Add relation between Account and Session (cascade delete)

- [ ] 1.3 Create and run database migration
  - **Requirement**: Data Model
  - `cd api && npx prisma migrate dev --name add_account_management`
  - Verify migration creates accounts and sessions tables

## Task 2: Backend Types

- [ ] 2.1 Create account types file
  - **Requirement**: Data Model, Design (TypeScript Types)
  - Create `api/src/types/account.ts` with AccountRole, AccountStatus, Account, Session interfaces

## Task 3: AccountService Implementation

- [ ] 3.1 Create AccountService with password utilities
  - **Requirement**: 1.3 (password requirements), Non-functional (bcrypt)
  - Create `api/src/services/account.service.ts`
  - Implement `validatePassword()` - min 8 chars, at least one letter, one number
  - Implement `hashPassword()` using bcryptjs (cost factor 12)
  - Implement `verifyPassword()` for password comparison

- [ ] 3.2 Implement account registration
  - **Requirement**: 1.1, 1.2, 1.4, 5.2
  - Implement `register()` method
  - Validate email uniqueness
  - Hash password and create account with role=account_owner, status=active

- [ ] 3.3 Implement account authentication
  - **Requirement**: 4.3 (deactivated accounts cannot login)
  - Implement `authenticate()` method
  - Find account by email, verify password, check status is active

- [ ] 3.4 Implement password change
  - **Requirement**: 2.1, 2.2
  - Implement `changePassword()` method
  - Verify current password before allowing change
  - Validate new password meets requirements

- [ ] 3.5 Implement account deactivation and admin promotion
  - **Requirement**: 4.1, 4.2, 5.3
  - Implement `deactivate()` method with password confirmation
  - Implement `promoteToAdmin()` method (admin-only)
  - Implement `getById()` method

## Task 4: SessionService Implementation

- [ ] 4.1 Create SessionService with JWT handling
  - **Requirement**: 2.3 (session invalidation), Design (JWT tokens)
  - Create `api/src/services/session.service.ts`
  - Implement `createSession()` - create session record and return JWT token
  - Implement `validateToken()` - verify JWT and check session exists
  - JWT expires after 7 days, contains accountId and sessionId

- [ ] 4.2 Implement session management methods
  - **Requirement**: 3.2 (list sessions, logout all devices)
  - Implement `getSessionsForAccount()` - list all sessions
  - Implement `deleteSession()` - delete single session
  - Implement `deleteAllSessions()` - logout all devices
  - Implement `deleteAllSessionsExcept()` - for password change flow

## Task 5: Auth Middleware

- [ ] 5.1 Create auth middleware
  - **Requirement**: 5.1 (role distinction), Design (Auth Middleware)
  - Create `api/src/middleware/auth.middleware.ts`
  - Implement `requireAuth` middleware - validate JWT, attach account to request
  - Implement `requireAdmin` middleware - check account has admin role
  - Define `AuthenticatedRequest` interface extending Express Request

## Task 6: Backend Routes

- [ ] 6.1 Create account routes
  - **Requirement**: 1.1-1.5, 2.1-2.4, 3.1-3.3, 4.1-4.5, 5.3
  - Create `api/src/routes/account.routes.ts`
  - POST `/api/accounts/register` - registration (returns success message, redirects to login)
  - POST `/api/accounts/login` - authentication (returns JWT token)
  - GET `/api/accounts/me` - get current account (requires auth)
  - PATCH `/api/accounts/me/password` - change password (requires auth, invalidates other sessions)
  - POST `/api/accounts/me/deactivate` - deactivate account (requires auth, password confirmation)
  - POST `/api/accounts/:id/promote` - promote to admin (requires admin)

- [ ] 6.2 Create session routes
  - **Requirement**: 3.2 (session list, logout all)
  - Create `api/src/routes/session.routes.ts`
  - GET `/api/sessions` - list sessions with isCurrent flag (requires auth)
  - DELETE `/api/sessions` - logout all devices (requires auth)
  - DELETE `/api/sessions/:id` - logout specific session (requires auth)

- [ ] 6.3 Register routes in main app
  - **Requirement**: All API routes
  - Update `api/src/index.ts`
  - Import and register account routes at `/api/accounts`
  - Import and register session routes at `/api/sessions`
  - Add JWT_SECRET to config/index.ts

## Task 7: Backend Property-Based Tests

- [ ] 7.1 Write property tests for password validation (Property 1)
  - **Validates**: Requirements 1.3, 2.2
  - Create `api/src/services/__tests__/account.service.property.test.ts`
  - Test: password accepted iff ≥8 chars AND has letter AND has number

- [ ] 7.2 Write property tests for password hash security (Property 3)
  - **Validates**: Non-functional (bcrypt)
  - Test: hash ≠ password, correct password verifies, wrong password fails

- [ ] 7.3 Write property tests for new account defaults (Property 7)
  - **Validates**: Requirements 1.4, 5.2
  - Test: new accounts always have role=account_owner, status=active

## Task 8: Backend Unit Tests

- [ ] 8.1 Write AccountService unit tests
  - **Requirement**: All account operations
  - Create `api/src/services/__tests__/account.service.test.ts`
  - Test registration, authentication, password change, deactivation

- [ ] 8.2 Write SessionService unit tests
  - **Requirement**: Session management
  - Create `api/src/services/__tests__/session.service.test.ts`
  - Test session creation, token validation, session deletion

## Task 9: Frontend Types and API Client

- [ ] 9.1 Create frontend account types
  - **Requirement**: Design (Frontend TypeScript Types)
  - Create `frontend/src/types/account.ts` with Account, Session interfaces

- [ ] 9.2 Add account API methods to client
  - **Requirement**: All API endpoints
  - Update `frontend/src/api/client.ts`
  - Add register, login, getMe, changePassword, deactivate methods
  - Add getSessions, logoutAll, logoutSession methods

## Task 10: AuthContext Implementation

- [ ] 10.1 Create AuthContext and AuthProvider
  - **Requirement**: Design (AuthContext)
  - Create `frontend/src/contexts/AuthContext.tsx`
  - Implement AuthProvider with account state, isAuthenticated, isLoading
  - Implement login, register, logout, refreshAccount methods
  - Store JWT token in localStorage

- [ ] 10.2 Create useAuth hook
  - **Requirement**: Design (useAuth hook)
  - Export useAuth hook from AuthContext
  - Handle token persistence and auto-login on mount

## Task 11: Frontend Pages

- [ ] 11.1 Create LoginPage
  - **Requirement**: Design (LoginPage)
  - Create `frontend/src/pages/LoginPage.tsx`
  - Email and password inputs
  - Submit button, link to registration
  - Error display and loading state
  - Redirect to dashboard on success

- [ ] 11.2 Create RegisterPage
  - **Requirement**: 1.1-1.5, Design (RegisterPage)
  - Create `frontend/src/pages/RegisterPage.tsx`
  - Email, password, password confirmation inputs
  - Password requirements display
  - Submit button, link to login
  - Redirect to login with success message after registration

- [ ] 11.3 Create ProfilePage
  - **Requirement**: 2.1-2.4, 3.1-3.3, 4.1-4.2, Design (ProfilePage)
  - Create `frontend/src/pages/ProfilePage.tsx`
  - Account info display (email, created date, status)
  - Password change form (current + new password)
  - Active sessions list with logout buttons
  - "Log out all devices" button
  - Account deactivation section with password confirmation

## Task 12: Frontend Components

- [ ] 12.1 Create AccountAuthGuard component
  - **Requirement**: Design (AccountAuthGuard)
  - Create `frontend/src/components/AccountAuthGuard.tsx`
  - Check for valid JWT token
  - Redirect to login if not authenticated
  - Show loading state while checking
  - Render children if authenticated

## Task 13: Frontend Routing

- [ ] 13.1 Add account routes to App
  - **Requirement**: All frontend pages
  - Update `frontend/src/App.tsx`
  - Wrap app with AuthProvider
  - Add routes for /login, /register, /profile
  - Wrap /profile route with AccountAuthGuard
  - Add navigation links to Header component

## Task 14: Frontend Tests

- [ ] 14.1 Write AuthContext tests
  - **Requirement**: Authentication flow
  - Create `frontend/src/contexts/__tests__/AuthContext.test.tsx`
  - Test login, logout, register flows
  - Test token persistence

- [ ] 14.2 Write LoginPage tests
  - **Requirement**: 1.1-1.5
  - Create `frontend/src/pages/__tests__/LoginPage.test.tsx`
  - Test form validation, submission, error display

- [ ] 14.3 Write RegisterPage tests
  - **Requirement**: 1.1-1.5
  - Create `frontend/src/pages/__tests__/RegisterPage.test.tsx`
  - Test form validation, password requirements, submission

## Task 15: Integration Tests

- [ ] 15.1 Write account routes integration tests
  - **Requirement**: All account operations
  - Create `api/src/__tests__/account.integration.test.ts`
  - Test full registration → login → profile flow
  - Test password change with session invalidation (Property 4)
  - Test account deactivation blocks login (Property 5)
  - Test email uniqueness (Property 2)
  - Test admin promotion authorization (Property 6)


## Task 16: Environment Configuration

- [ ] 16.1 Add JWT_SECRET to environment files
  - **Requirement**: Security (JWT signing)
  - Add JWT_SECRET to `.env` and `example.env`
  - Add JWT_SECRET to `api/src/config/index.ts`
  - Document that JWT_SECRET should be a strong random string (min 32 chars)

## Task 17: Docker Rebuild and Verification

- [ ] 17.1 Rebuild containers and verify
  - **Requirement**: All features working in Docker
  - `docker compose up -d --build`
  - Verify registration flow works
  - Verify login flow works
  - Verify profile page displays correctly
  - Verify password change invalidates other sessions
  - Verify account deactivation blocks login

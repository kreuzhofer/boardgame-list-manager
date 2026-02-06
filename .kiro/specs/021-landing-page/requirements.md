# Landing Page Requirements

## Overview
Provide a public landing page and account entry points without disrupting the event experience. When slug-based events are enabled, `/` becomes the marketing landing page and events move to `/{slug}`.

## User Stories

### 1. Marketing Landing Page
As a visitor, I want to learn about Brettspieltreff.app so that I can decide if I want to use it for my gaming events.

#### Acceptance Criteria
- 1.1 Landing page is accessible at `/`
- 1.2 Page explains what Brettspieltreff.app is and does
- 1.3 Page highlights key features (event management, game coordination, BGG integration)
- 1.4 Page shows how to get started (register, create event, share link)
- 1.5 Prominent calls to action: "Jetzt registrieren" and "Anmelden"
- 1.6 Page is fully in German and responsive

### 2. Event Not Found
As a visitor accessing an invalid event URL, I want a helpful message so that I understand what happened.

#### Acceptance Criteria
- 2.1 Displayed when accessing `/{slug}` for a non-existent event
- 2.2 Explains the event does not exist at this URL
- 2.3 Links back to the landing page and registration

### 3. Account Login Page
As a user, I want a login page so that I can access my account.

#### Acceptance Criteria
- 3.1 Login page is available at `/login`
- 3.2 Page includes email and password fields
- 3.3 Error messages are shown for invalid credentials or deactivated accounts
- 3.4 Successful login redirects to `/`
- 3.5 Page is in German

### 4. Account Registration Page
As a new user, I want a registration page so that I can create an account.

#### Acceptance Criteria
- 4.1 Registration page is available at `/register`
- 4.2 Page includes email and password fields
- 4.3 Password requirements are displayed
- 4.4 Success directs the user to login with a success message
- 4.5 Page is in German

## Non-Functional Requirements

- Pages are responsive on mobile and desktop
- Copy and labels remain consistent with the rest of the application

## Transition Note

- Until slug-based routing is enabled, the root `/` remains the default event experience.

## Out of Scope (Current State)

- Event status pages (draft/archived/cancelled)
- Password reset pages (see spec 021)


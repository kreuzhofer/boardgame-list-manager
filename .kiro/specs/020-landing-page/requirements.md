# Landing Page Requirements

## Overview
Create public-facing pages for Brettspieltreff.app including the main landing page, event status pages, and error pages. All content is in German.

## User Stories

### 1. Main Landing Page
As a visitor, I want to learn about Brettspieltreff.app so that I can decide if I want to use it for my gaming events.

#### Acceptance Criteria
- 1.1 Landing page is accessible at root URL `/`
- 1.2 Page explains what Brettspieltreff.app is and does
- 1.3 Page highlights key features (event management, game tracking, BGG integration)
- 1.4 Page shows how to get started (register, create event, share link)
- 1.5 Prominent call-to-action buttons: "Jetzt registrieren" (Register), "Anmelden" (Login)
- 1.6 Page is fully in German
- 1.7 Page is responsive (mobile, tablet, desktop)
- 1.8 Page includes basic branding (logo, colors consistent with app)

### 2. Event Not Found Page
As a visitor accessing an invalid event URL, I want to see a helpful message so that I understand what happened.

#### Acceptance Criteria
- 2.1 Displayed when accessing `/{slug}` where slug doesn't exist
- 2.2 Friendly message explaining no event exists at this URL
- 2.3 Suggests checking with the event organizer for correct URL
- 2.4 Promotes Brettspieltreff.app: "Möchtest du dein eigenes Event erstellen?"
- 2.5 Link to main landing page
- 2.6 Link to registration page
- 2.7 Page is in German

### 3. Event Draft Page
As an attendee accessing a draft event, I want to know the event is coming soon so that I can return later.

#### Acceptance Criteria
- 3.1 Displayed when accessing `/{slug}` for an event in "draft" status
- 3.2 Shows event name (if configured to be visible)
- 3.3 Message: "Dieses Event wird bald starten. Schau später nochmal vorbei!"
- 3.4 Optional: Shows start date if set
- 3.5 No access to game list or attendee features
- 3.6 Page is in German

### 4. Event Cancelled Page
As an attendee accessing a cancelled event, I want to know the event was cancelled.

#### Acceptance Criteria
- 4.1 Displayed when accessing `/{slug}` for an event in "cancelled" status
- 4.2 Shows event name
- 4.3 Message: "Dieses Event wurde leider abgesagt."
- 4.4 Optional: Shows cancellation reason if provided by organizer
- 4.5 Link to main landing page
- 4.6 Page is in German

### 5. Event Archived Page
As an attendee accessing an archived event, I want to see the game list in read-only mode.

#### Acceptance Criteria
- 5.1 Displayed when accessing `/{slug}` for an event in "archived" status
- 5.2 Shows event name and archive notice
- 5.3 Message: "Dieses Event ist beendet. Die Spieleliste ist nur noch zur Ansicht verfügbar."
- 5.4 Shows full game list with all details (games, who brought them)
- 5.5 No ability to add/remove games or change attendee
- 5.6 Shows event dates if they were set
- 5.7 Page is in German

### 6. Login Page
As a user, I want a login page so that I can access my account or admin panel.

#### Acceptance Criteria
- 6.1 Login page at `/manage/login` (same page for account owners and admins)
- 6.2 Email and password fields
- 6.3 "Anmelden" (Login) button
- 6.4 "Passwort vergessen?" (Forgot password) link
- 6.5 "Noch kein Konto? Jetzt registrieren" (No account? Register now) link
- 6.6 Error messages for invalid credentials, unverified account, deactivated account
- 6.7 Successful login redirects based on role (account_owner → /manage, admin → /admin)
- 6.8 Page is in German

### 7. Registration Page
As a new user, I want a registration page so that I can create an account.

#### Acceptance Criteria
- 7.1 Registration page at `/manage/register`
- 7.2 Email and password fields (password with confirmation)
- 7.3 Password requirements displayed
- 7.4 "Registrieren" (Register) button
- 7.5 "Bereits registriert? Anmelden" (Already registered? Login) link
- 7.6 Success message after registration: "Bestätigungsmail wurde gesendet"
- 7.7 Error messages for invalid email, weak password, email already exists
- 7.8 Page is in German

### 8. Password Reset Request Page
As a user who forgot their password, I want to request a reset so that I can regain access.

#### Acceptance Criteria
- 8.1 Page at `/manage/forgot-password`
- 8.2 Email field
- 8.3 "Link anfordern" (Request link) button
- 8.4 Success message: "Falls ein Konto existiert, wurde eine E-Mail gesendet"
- 8.5 Link back to login page
- 8.6 Page is in German

Note: This page will be functional once 021-email-system is implemented. Initially can show "coming soon" or be hidden.

### 9. Password Reset Page
As a user with a reset link, I want to set a new password.

#### Acceptance Criteria
- 9.1 Page at `/manage/reset-password?token={token}`
- 9.2 New password field (with confirmation)
- 9.3 Password requirements displayed
- 9.4 "Passwort ändern" (Change password) button
- 9.5 Success redirects to login with message
- 9.6 Expired/invalid token shows error with link to request new reset
- 9.7 Page is in German

Note: Password reset and email confirmation pages will be implemented with 021-email-system.

## Page Structure

### Landing Page Sections
1. Hero section with tagline and CTA
2. Features overview (3-4 key features with icons)
3. How it works (3 steps: Register → Create Event → Share)
4. Call to action (Register button)
5. Footer with links

### Common Elements
- Navigation header (Logo, Login, Register buttons)
- Footer (Links, Copyright)
- Consistent styling with main app

## Non-Functional Requirements

- All pages must be SEO-friendly with proper meta tags
- Landing page should load quickly (optimize images, minimal JS)
- Pages must be accessible (WCAG 2.1 AA)
- All text must be in German
- Responsive design for all screen sizes
- Consistent visual design with the main application

# Email System Requirements

## Overview
Implement transactional email for account owners using external SMTP configuration. This spec introduces email confirmation and password reset flows that are not part of the current system but align with organizer account management.

## User Stories

### 1. Email Configuration
As a system administrator, I want to configure email settings via environment variables so that I can use any SMTP provider.

#### Acceptance Criteria
- 1.1 SMTP settings are configured via .env variables:
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`
  - `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME`
- 1.2 Application validates SMTP configuration on startup
- 1.3 If SMTP is not configured, email features return a clear error response
- 1.4 Email configuration status is observable (logs + health indicator)

### 2. Email Templates
As a developer, I want to use Handlebars templates so that emails are maintainable and consistent.

#### Acceptance Criteria
- 2.1 Email templates are stored in `/api/templates/emails/`
- 2.2 Each email type has its own template file
- 2.3 Templates include HTML and plain text versions
- 2.4 Templates are in German

### 3. Email Confirmation Flow
As a new user, I want to verify my email address so that my account is confirmed.

#### Acceptance Criteria
- 3.1 Add `unverified` status to Account and `emailVerifiedAt` field
- 3.2 New registrations are created in `unverified` state
- 3.3 Confirmation email is sent immediately after registration
- 3.4 Confirmation link contains a secure, time-limited token (24 hours)
- 3.5 Successful confirmation sets account to `active`
- 3.6 Unverified accounts cannot access account-protected routes

### 4. Password Reset Flow
As a user who forgot their password, I want to reset it via email.

#### Acceptance Criteria
- 4.1 User can request a password reset email
- 4.2 Reset email includes a secure token link (expires after 1 hour)
- 4.3 Successful reset redirects to login with a success message
- 4.4 Rate limiting applies to reset requests

### 5. Password Change Notification
As a user who changed their password, I want to receive a notification so that I am aware of the change.

#### Acceptance Criteria
- 5.1 Notification is sent after successful password change
- 5.2 Email includes change timestamp and security notice

### 6. Account Deactivated Notification
As a user whose account was deactivated, I want to receive a notification.

#### Acceptance Criteria
- 6.1 Notification is sent when an account is deactivated
- 6.2 Email explains the account is no longer accessible

### 7. Welcome Email
As a newly verified user, I want a welcome email with next steps.

#### Acceptance Criteria
- 7.1 Welcome email is sent after email confirmation
- 7.2 Email includes link to the application

## Data Model Additions

### Account Entity Updates
- Add `status` value: `unverified` (in addition to `active`, `deactivated`)
- Add `emailVerifiedAt`: DateTime, nullable

### EmailVerificationToken Entity
- `id`: UUID, primary key
- `accountId`: UUID, foreign key to Account
- `token`: String, unique
- `expiresAt`: DateTime
- `createdAt`: DateTime

### PasswordResetToken Entity
- `id`: UUID, primary key
- `accountId`: UUID, foreign key to Account
- `token`: String, unique
- `expiresAt`: DateTime
- `usedAt`: DateTime, nullable
- `createdAt`: DateTime

## Email Template Structure

- `layout.hbs`
- `email-confirmation.hbs`
- `password-reset.hbs`
- `password-changed.hbs`
- `account-deactivated.hbs`
- `welcome.hbs`

## Non-Functional Requirements

- Email sending is asynchronous and must not block API responses
- Failed email sends are logged and surfaced through error responses
- Templates must be mobile-responsive and include plain text fallbacks
- SMTP connections should be pooled for efficiency
- Email addresses are validated before sending
- All email content is in German

## Out of Scope (Current State)

- Event-related attendee emails
- Marketing/newsletter emails


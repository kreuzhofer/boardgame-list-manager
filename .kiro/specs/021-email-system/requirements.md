# Email System Requirements

## Overview
Implement a transactional email system for Brettspieltreff.app using Nodemailer with external SMTP configuration. All emails use Handlebars (HBS) templates and are in German. This spec also adds email verification and password reset flows that were deferred from 016-account-management.

## User Stories

### 1. Email Configuration
As a system administrator, I want to configure email settings via environment variables so that I can use any SMTP provider.

#### Acceptance Criteria
- 1.1 SMTP settings configured via .env variables:
  - `SMTP_HOST` - SMTP server hostname
  - `SMTP_PORT` - SMTP server port
  - `SMTP_SECURE` - Use TLS (true/false)
  - `SMTP_USER` - SMTP username
  - `SMTP_PASS` - SMTP password
  - `SMTP_FROM_EMAIL` - Default sender email
  - `SMTP_FROM_NAME` - Default sender name
- 1.2 Application validates SMTP configuration on startup
- 1.3 Missing configuration logs warning but doesn't crash app
- 1.4 Email sending fails gracefully if SMTP not configured

### 2. Email Templates
As a developer, I want to use HBS templates for emails so that they are maintainable and customizable.

#### Acceptance Criteria
- 2.1 Email templates stored in `/api/templates/emails/` directory
- 2.2 Each email type has its own HBS template file
- 2.3 Templates support variables via Handlebars syntax `{{variable}}`
- 2.4 Templates include both HTML and plain text versions
- 2.5 Common layout/wrapper template for consistent styling
- 2.6 Templates are in German

### 3. Email Confirmation Flow
As a new user, I want to verify my email address so that my account is confirmed.

#### Acceptance Criteria
- 3.1 Add "unverified" status to Account entity
- 3.2 New registrations are created in "unverified" state (update from 016)
- 3.3 Confirmation email sent immediately after registration
- 3.4 Subject: "Bestätige deine E-Mail-Adresse - Brettspieltreff.app"
- 3.5 Contains confirmation link with secure token
- 3.6 Link expires after 24 hours
- 3.7 Expired links show error page with "Erneut senden" (Resend) button
- 3.8 Successful confirmation sets account to "active" status
- 3.9 Unverified accounts cannot access management dashboard
- 3.10 Template file: `email-confirmation.hbs`

### 4. Password Reset Flow
As a user who forgot their password, I want to reset it via email.

#### Acceptance Criteria
- 4.1 User can request password reset at `/manage/forgot-password`
- 4.2 Reset email sent with secure token link
- 4.3 Subject: "Passwort zurücksetzen - Brettspieltreff.app"
- 4.4 Link expires after 1 hour
- 4.5 Rate limiting: maximum 3 reset requests per email per hour
- 4.6 Reset page at `/manage/reset-password?token={token}`
- 4.7 Successful reset redirects to login with success message
- 4.8 Template file: `password-reset.hbs`

### 5. Password Changed Notification
As a user who changed their password, I want to receive a notification so that I'm aware of the change.

#### Acceptance Criteria
- 5.1 Sent after successful password change (user-initiated or admin-initiated)
- 5.2 Subject: "Dein Passwort wurde geändert - Brettspieltreff.app"
- 5.3 Confirms password was changed
- 5.4 Includes timestamp of change
- 5.5 Includes security notice (if you didn't do this, contact support)
- 5.6 Template file: `password-changed.hbs`

### 6. Account Deactivated Notification
As a user whose account was deactivated, I want to receive a notification.

#### Acceptance Criteria
- 6.1 Sent when account is deactivated (by user or admin)
- 6.2 Subject: "Dein Konto wurde deaktiviert - Brettspieltreff.app"
- 6.3 Explains account is deactivated and cannot be used
- 6.4 Provides contact information for questions
- 6.5 Template file: `account-deactivated.hbs`

### 7. Welcome Email
As a newly verified user, I want to receive a welcome email with getting started information.

#### Acceptance Criteria
- 7.1 Sent after successful email confirmation
- 7.2 Subject: "Willkommen bei Brettspieltreff.app!"
- 7.3 Thanks user for joining
- 7.4 Brief overview of next steps (create first event)
- 7.5 Link to management dashboard
- 7.6 Template file: `welcome.hbs`

### 8. Admin Password Reset Email
As an admin, I want users to receive a special email when I trigger a password reset.

#### Acceptance Criteria
- 8.1 Sent when admin triggers password reset for a user
- 8.2 Subject: "Passwort zurücksetzen (Admin-Anfrage) - Brettspieltreff.app"
- 8.3 Mentions that an administrator requested this reset
- 8.4 Contains reset link with token
- 8.5 Same expiration as regular reset (1 hour)
- 8.6 Template file: `admin-password-reset.hbs`

## Data Model Additions

### Account Entity Updates
- Add `status` value: `unverified` (in addition to active, deactivated)
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

### Base Layout Template (`layout.hbs`)
```handlebars
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    /* Base email styles */
  </style>
</head>
<body>
  <div class="container">
    <header>
      <!-- Logo -->
    </header>
    <main>
      {{{body}}}
    </main>
    <footer>
      <!-- Footer content -->
    </footer>
  </div>
</body>
</html>
```

### Template Variables (Common)
- `{{appName}}` - "Brettspieltreff.app"
- `{{appUrl}}` - Base URL of the application
- `{{currentYear}}` - For copyright in footer
- `{{supportEmail}}` - Support contact email

### Template Variables (Per Email Type)
- Email Confirmation: `{{confirmationUrl}}`, `{{expiresIn}}`
- Password Reset: `{{resetUrl}}`, `{{expiresIn}}`
- Password Changed: `{{changedAt}}`
- Account Deactivated: `{{deactivatedAt}}`

## API/Service Interface

### EmailService
```typescript
interface EmailService {
  sendEmailConfirmation(to: string, token: string): Promise<void>;
  sendPasswordReset(to: string, token: string): Promise<void>;
  sendPasswordChanged(to: string): Promise<void>;
  sendAccountDeactivated(to: string): Promise<void>;
  sendWelcome(to: string): Promise<void>;
  sendAdminPasswordReset(to: string, token: string): Promise<void>;
}
```

## File Structure

```
api/
├── src/
│   └── services/
│       └── email.service.ts
└── templates/
    └── emails/
        ├── layout.hbs
        ├── email-confirmation.hbs
        ├── password-reset.hbs
        ├── password-changed.hbs
        ├── account-deactivated.hbs
        ├── welcome.hbs
        └── admin-password-reset.hbs
```

## Non-Functional Requirements

- Email sending must be asynchronous (don't block API responses)
- Failed email sends should be logged but not crash the application
- Email templates must be mobile-responsive
- Plain text fallback must be provided for all emails
- SMTP connection should be pooled for efficiency
- Email addresses must be validated before sending
- All email content must be in German
- Templates should be easily editable without code changes

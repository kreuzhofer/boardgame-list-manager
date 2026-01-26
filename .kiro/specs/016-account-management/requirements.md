# Account Management Requirements

## Overview
Enable event managers to create and manage accounts for the Brettspieltreff.app platform. Account owners can register, manage their profile, and control their account lifecycle. Email confirmation flows will be added in a later spec (021-email-system).

## User Stories

### 1. Account Registration
As a prospective event manager, I want to register for an account so that I can create and manage gaming events.

#### Acceptance Criteria
- 1.1 User can register with email address (primary username) and password
- 1.2 Email address must be unique across all accounts
- 1.3 Password must meet minimum security requirements (min 8 characters, at least one number and one letter)
- 1.4 Account is created in "active" state immediately (no email verification initially)
- 1.5 After successful registration, user is redirected to login page with success message

### 2. Password Change
As a logged-in account owner, I want to change my password through my profile so that I can maintain account security.

#### Acceptance Criteria
- 2.1 User must enter current password to change to a new password
- 2.2 New password must meet the same security requirements as registration
- 2.3 Successful password change invalidates all other sessions ("log out all devices")
- 2.4 User receives confirmation message after successful change

### 3. Profile Management
As an account owner, I want to manage my profile information so that my account details are up to date.

#### Acceptance Criteria
- 3.1 User can view their profile with email and account creation date
- 3.2 User can see a list of all active sessions with "log out all devices" option
- 3.3 Profile page shows account status (active, deactivated)

### 4. Account Deactivation
As an account owner, I want to deactivate my account so that I can stop using the service.

#### Acceptance Criteria
- 4.1 User can deactivate their own account from the profile page
- 4.2 Deactivation requires password confirmation
- 4.3 Deactivated accounts cannot log in
- 4.4 All events owned by deactivated accounts become inaccessible to attendees
- 4.5 Deactivated accounts can only be fully deleted by an admin

### 5. Account Roles
As the system, I need to distinguish between account owners and admins so that permissions are properly enforced.

#### Acceptance Criteria
- 5.1 Each account has a role: `account_owner` or `admin`
- 5.2 New registrations are always created as `account_owner`
- 5.3 Only existing admins can promote an account to `admin` role
- 5.4 There is exactly one owner per account (no multi-owner support yet)

## Data Model

### Account Entity
- `id`: UUID, primary key
- `email`: String, unique, required
- `passwordHash`: String, required
- `role`: Enum (account_owner, admin)
- `status`: Enum (active, deactivated)
- `createdAt`: DateTime
- `updatedAt`: DateTime

## Future Enhancements (021-email-system)
The following features will be added when email system is implemented:
- Email verification flow (unverified status, confirmation emails)
- Password reset via email
- EmailVerificationToken and PasswordResetToken entities

## Non-Functional Requirements

- All passwords must be hashed using bcrypt with appropriate cost factor
- All account-related actions must be performed over HTTPS

# Admin Panel Requirements

## Overview
Provide system administrators with basic tools to manage organizer accounts. This spec reflects the current admin capabilities and avoids platform-wide management features that are not yet implemented.

## User Stories

### 1. Admin Access
As an admin, I want to access an admin view so that I can manage organizer accounts.

#### Acceptance Criteria
- 1.1 Admin page is available at `/admin`
- 1.2 Non-admin users are shown an access denied message

### 2. Account List
As an admin, I want to view all accounts so that I can support users.

#### Acceptance Criteria
- 2.1 Admin can load a list of all accounts
- 2.2 List shows: email, role, status, created date

### 3. Role Management
As an admin, I want to change account roles so that I can grant or revoke admin access.

#### Acceptance Criteria
- 3.1 Admin can switch an account role between `admin` and `account_owner`
- 3.2 Role changes take effect immediately

### 4. Status Management
As an admin, I want to activate or deactivate accounts.

#### Acceptance Criteria
- 4.1 Admin can change account status to `active` or `deactivated`
- 4.2 Status changes take effect immediately

### 5. Password Reset
As an admin, I want to reset an account password to help users regain access.

#### Acceptance Criteria
- 5.1 Admin can set a new password for any account
- 5.2 Password reset invalidates all sessions for that account

### 6. Force Logout
As an admin, I want to end all sessions for an account.

#### Acceptance Criteria
- 6.1 Admin can force logout all sessions for an account
- 6.2 Action takes effect immediately

## API Endpoints

- `GET /api/accounts` - List all accounts (admin only)
- `PATCH /api/accounts/{id}/role` - Update account role (admin only)
- `PATCH /api/accounts/{id}/status` - Update account status (admin only)
- `PATCH /api/accounts/{id}/password` - Reset account password (admin only)
- `DELETE /api/accounts/{id}/sessions` - Force logout all sessions (admin only)

## Out of Scope (Current State)

- Admin dashboard statistics
- Account deletion
- Event management across accounts
- Impersonation
- Audit logging
- Email-based admin actions


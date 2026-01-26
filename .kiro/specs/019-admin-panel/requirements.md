# Admin Panel Requirements

## Overview
Provide system administrators with tools to manage accounts, events, and perform administrative actions across the Brettspieltreff.app platform.

## User Stories

### 1. Admin Dashboard
As an admin, I want to see an overview of the platform so that I can monitor system health.

#### Acceptance Criteria
- 1.1 Admin dashboard at `/admin` shows platform statistics
- 1.2 Shows total accounts, active accounts, deactivated accounts
- 1.3 Shows total events, events by status breakdown
- 1.4 Shows total attendees across all events
- 1.5 Shows recent account registrations (last 10)
- 1.6 Shows recent events created (last 10)

### 2. Account Management
As an admin, I want to view and manage all accounts so that I can support users and maintain the platform.

#### Acceptance Criteria
- 2.1 Admin can view list of all accounts with search and filters
- 2.2 List shows: email, role, status, created date, event count
- 2.3 Admin can filter by role (account_owner, admin) and status (unverified, active, deactivated)
- 2.4 Admin can search accounts by email
- 2.5 Clicking an account opens account detail view

### 3. Account Detail View
As an admin, I want to see detailed account information so that I can assist users.

#### Acceptance Criteria
- 3.1 Shows account details: email, role, status, dates, verification status
- 3.2 Shows list of events owned by the account
- 3.3 Shows active sessions for the account
- 3.4 Provides action buttons for account operations

### 4. Change Account Password
As an admin, I want to change an account's password so that I can help users who are locked out.

#### Acceptance Criteria
- 4.1 Admin can set a new password for any account_owner
- 4.2 Password change invalidates all existing sessions for that account
- 4.3 Admin must confirm the action before execution
- 4.4 Action is logged (for future audit trail implementation)

### 5. Send Password Reset Email
As an admin, I want to trigger a password reset email so that users can reset their own password.

#### Acceptance Criteria
- 5.1 Admin can send password reset email to any account
- 5.2 This works even if the user didn't request it (admin-initiated)
- 5.3 Standard password reset flow applies (link expires in 1 hour)
- 5.4 Admin sees confirmation that email was sent

### 6. Account Status Management
As an admin, I want to change account status so that I can activate or deactivate accounts.

#### Acceptance Criteria
- 6.1 Admin can change account status to: active, deactivated
- 6.2 Admin can manually verify an unverified account (set to active)
- 6.3 Deactivating an account invalidates all sessions
- 6.4 Status change takes effect immediately

### 7. Account Deletion
As an admin, I want to permanently delete accounts so that I can clean up the platform.

#### Acceptance Criteria
- 7.1 Admin can delete deactivated accounts only (not active accounts)
- 7.2 Deletion requires double confirmation (type account email to confirm)
- 7.3 Deletion removes: account, all events, all games, all attendees, all activity
- 7.4 This is a "danger zone" action with clear warnings
- 7.5 Deleted account email becomes available for new registration

### 8. Event Transfer
As an admin, I want to transfer events between accounts so that I can help with account migrations.

#### Acceptance Criteria
- 8.1 Admin can transfer any event to a different account
- 8.2 Transfer preserves all event data: games, attendees, activity, customization
- 8.3 Admin selects target account from a searchable dropdown
- 8.4 Transfer requires confirmation
- 8.5 Event slug remains unchanged after transfer

### 9. Admin Impersonation
As an admin, I want to impersonate an account owner so that I can troubleshoot issues from their perspective.

#### Acceptance Criteria
- 9.1 Admin can start impersonation session for any account_owner
- 9.2 During impersonation, admin sees exactly what the account owner sees
- 9.3 Impersonation is indicated by a visible banner at top of page
- 9.4 Admin can perform any action the account owner can perform
- 9.5 Admin can end impersonation at any time via the banner
- 9.6 Impersonation sessions are temporary (end on logout or after 1 hour)
- 9.7 Admin cannot impersonate other admins

### 10. Event Management (Admin View)
As an admin, I want to view and manage any event so that I can assist account owners.

#### Acceptance Criteria
- 10.1 Admin can view list of all events across all accounts
- 10.2 List shows: event name, slug, owner email, status, dates
- 10.3 Admin can filter by status and search by name/slug
- 10.4 Admin can view event details (same as account owner view)
- 10.5 Admin can change event status
- 10.6 Admin can delete any event (with confirmation)

### 11. Role Management
As an admin, I want to promote accounts to admin so that I can add new administrators.

#### Acceptance Criteria
- 11.1 Admin can change an account_owner to admin role
- 11.2 Admin can demote an admin to account_owner (except themselves)
- 11.3 Role change requires confirmation
- 11.4 There must always be at least one admin in the system

## Data Model

No new entities required. Admin actions use existing Account and Event entities.

## API Endpoints

### Admin Dashboard
- `GET /api/admin/stats` - Get platform statistics

### Account Management
- `GET /api/admin/accounts` - List all accounts (with pagination, search, filters)
- `GET /api/admin/accounts/{id}` - Get account details
- `PATCH /api/admin/accounts/{id}/status` - Change account status
- `PATCH /api/admin/accounts/{id}/role` - Change account role
- `POST /api/admin/accounts/{id}/reset-password` - Admin-set new password
- `POST /api/admin/accounts/{id}/send-reset-email` - Trigger password reset email
- `DELETE /api/admin/accounts/{id}` - Delete account (deactivated only)

### Event Management (Admin)
- `GET /api/admin/events` - List all events (with pagination, search, filters)
- `GET /api/admin/events/{id}` - Get event details
- `PATCH /api/admin/events/{id}/status` - Change event status
- `POST /api/admin/events/{id}/transfer` - Transfer event to another account
- `DELETE /api/admin/events/{id}` - Delete event

### Impersonation
- `POST /api/admin/impersonate/{accountId}` - Start impersonation
- `POST /api/admin/impersonate/end` - End impersonation

## Non-Functional Requirements

- All admin actions should be designed for future audit logging
- Admin endpoints must verify admin role on every request
- Impersonation must not allow privilege escalation (admin stays admin level)
- Double confirmation for destructive actions must be enforced server-side
- Admin panel should be responsive but optimized for desktop use

# Requirements Document

## Introduction

This feature adds a maximum length constraint of 30 characters to usernames in the board game event tracking application. The constraint ensures consistent display across the UI and prevents excessively long names that could break layouts or cause usability issues. Validation will be enforced at both the frontend (for immediate user feedback) and backend (for data integrity).

## Glossary

- **User**: A person who uses the application to track board game events
- **Username**: The display name associated with a User, stored in the database and shown throughout the UI
- **Name_Validator**: The component responsible for validating username input against defined rules
- **NamePrompt**: The frontend modal component where users enter or edit their username
- **UserService**: The backend service that handles user creation and updates

## Requirements

### Requirement 1: Frontend Input Validation

**User Story:** As a user, I want to see immediate feedback when my username is too long, so that I can correct it before submitting.

#### Acceptance Criteria

1. WHEN a user types in the name input field, THE NamePrompt component SHALL display a character counter showing current length and maximum (e.g., "15/30")
2. WHEN a user enters a username exceeding 30 characters, THE NamePrompt component SHALL display a validation error message in German: "Der Name darf maximal 30 Zeichen lang sein."
3. WHEN a username exceeds 30 characters, THE NamePrompt component SHALL disable the submit button
4. WHEN a user reduces the username to 30 characters or fewer, THE NamePrompt component SHALL remove the error message and enable the submit button

### Requirement 2: Backend Validation

**User Story:** As a system administrator, I want the backend to enforce username length limits, so that data integrity is maintained regardless of how requests are made.

#### Acceptance Criteria

1. WHEN a createUser request is received with a name exceeding 30 characters, THE UserService SHALL reject the request with a 400 status and German error message: "Der Name darf maximal 30 Zeichen lang sein."
2. WHEN an updateUser request is received with a name exceeding 30 characters, THE UserService SHALL reject the request with a 400 status and German error message: "Der Name darf maximal 30 Zeichen lang sein."
3. THE Name_Validator SHALL validate the trimmed name length (whitespace at start/end should not count toward the limit)

### Requirement 3: Consistent Validation Rules

**User Story:** As a developer, I want validation rules to be consistent between frontend and backend, so that users have a predictable experience.

#### Acceptance Criteria

1. THE System SHALL use the same maximum length constant (30 characters) in both frontend and backend validation
2. THE System SHALL apply length validation after trimming whitespace from both ends of the username
3. THE System SHALL allow usernames that are exactly 30 characters long (inclusive limit)

### Requirement 4: Database Schema Enforcement

**User Story:** As a system administrator, I want the database to enforce the 30-character limit at the schema level, so that data integrity is guaranteed even if application validation is bypassed.

#### Acceptance Criteria

1. THE database schema SHALL define the User.name column as VARCHAR(30)
2. THE migration SHALL truncate any existing usernames longer than 30 characters before applying the constraint
3. THE migration SHALL NOT delete any existing user records

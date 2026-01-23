# Implementation Plan: Username Length Limit

## Overview

This plan implements a 30-character maximum length constraint for usernames with validation at both frontend and backend layers. Tasks are ordered to implement backend validation first (data integrity), then frontend validation (UX).

## Tasks

- [x] 1. Add database schema constraint for username length
  - [x] 1.1 Create Prisma migration to add VARCHAR(30) constraint
    - Create migration that first truncates existing names > 30 chars with `UPDATE users SET name = LEFT(name, 30) WHERE LENGTH(name) > 30`
    - Then alters column to `VARCHAR(30)`
    - Update Prisma schema: `name String @unique @db.VarChar(30)`
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 2. Add backend username length validation
  - [x] 2.1 Add MAX_USERNAME_LENGTH constant and enhance validateName method in UserService
    - Add `const MAX_USERNAME_LENGTH = 30` to `api/src/services/user.service.ts`
    - Extend `validateName()` to check `trimmedName.length > MAX_USERNAME_LENGTH`
    - Throw error with German message: "Der Name darf maximal 30 Zeichen lang sein."
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2_
  - [x] 2.2 Write property test for backend length validation
    - **Property 3: Backend Rejects Oversized Names**
    - Generate strings > 30 chars, verify createUser/updateUser reject with correct error
    - Use `{ numRuns: 5 }` per workspace guidelines for DB operations
    - **Validates: Requirements 2.1, 2.2**
  - [x] 2.3 Write unit tests for backend length validation edge cases
    - Test exactly 30 characters (should pass)
    - Test 31 characters (should fail)
    - Test whitespace padding with valid trimmed length (should pass)
    - Test whitespace padding with invalid trimmed length (should fail)
    - _Requirements: 2.3, 3.2, 3.3_

- [x] 3. Checkpoint - Backend validation complete
  - Ensure all backend tests pass, ask the user if questions arise.

- [x] 4. Add frontend username length validation
  - [x] 4.1 Add character counter to NamePrompt component
    - Add `MAX_USERNAME_LENGTH` constant to component
    - Display character counter below input showing "X/30" format
    - Style counter to change color when approaching/exceeding limit
    - _Requirements: 1.1, 3.1_
  - [x] 4.2 Add length validation and error display to NamePrompt
    - Add validation check for trimmed length > 30
    - Display German error message: "Der Name darf maximal 30 Zeichen lang sein."
    - Disable submit button when validation fails
    - Clear error when input becomes valid
    - _Requirements: 1.2, 1.3, 1.4, 3.2_
  - [x] 4.3 Write unit tests for NamePrompt length validation
    - Test character counter displays correct count
    - Test error message appears for names > 30 chars
    - Test submit button disabled for invalid names
    - Test error clears when name becomes valid
    - Test exactly 30 characters is valid
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.3_

- [x] 5. Final checkpoint - All tests pass
  - Ensure all frontend and backend tests pass, ask the user if questions arise.

## Notes

- All tasks including tests are required for comprehensive coverage
- Database migration runs first to establish the constraint at the data layer
- Backend validation is implemented second to provide clear error messages
- German error messages match existing application conventions
- Property tests use `numRuns: 5` for DB operations per workspace guidelines
- The migration truncates existing long names rather than deleting records

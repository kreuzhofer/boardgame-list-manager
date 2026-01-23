# Implementation Plan: Navigation Statistics Page

## Overview

This implementation plan creates a dedicated Statistics page and redesigns the navigation system with a mobile bottom tab bar replacing the burger menu. The work is organized to build incrementally: first the new page, then the navigation components, then the dialog, and finally cleanup.

## Tasks

- [x] 1. Create StatisticsPage component
  - [x] 1.1 Create `frontend/src/pages/StatisticsPage.tsx` with page title and Statistics component wrapper
    - Import existing Statistics component
    - Add "Statistiken" page heading
    - Handle loading/error states (delegated to Statistics)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 8.2_
  - [x] 1.2 Add route for StatisticsPage in App.tsx
    - Add `/statistics` route
    - Import StatisticsPage component
    - _Requirements: 1.1_
  - [x] 1.3 Write unit tests for StatisticsPage
    - Test page title renders
    - Test Statistics component renders
    - Test loading state
    - Test error state
    - _Requirements: 1.1, 1.2, 1.4, 1.5_

- [x] 2. Create MobileBottomTabs component
  - [x] 2.1 Create `frontend/src/components/MobileBottomTabs.tsx` with 4 tabs
    - Define tab configuration array with paths, labels, icons
    - Implement fixed bottom positioning
    - Add responsive visibility (hidden on md: and above)
    - Use useLocation for active tab detection
    - _Requirements: 3.1, 3.2, 4.1, 4.2, 4.3, 4.4, 4.5, 8.1_
  - [x] 2.2 Implement active tab highlighting styles
    - Blue color for active tab icon and text
    - Gray color for inactive tabs
    - Visual distinction (background or border)
    - _Requirements: 4.6, 5.1, 5.2, 5.3, 5.4_
  - [x] 2.3 Add MobileBottomTabs to App.tsx layout
    - Render after main content
    - Pass user, onUserUpdated, onLogout props
    - Add bottom padding to main content to prevent overlap
    - _Requirements: 3.1, 6.1, 6.4_
  - [x] 2.4 Write property test for tab structure
    - **Property 3: All Tabs Have Icon and Label**
    - **Validates: Requirements 4.1**
  - [x] 2.5 Write property test for active tab highlighting
    - **Property 2: Active Route Highlights Correct Tab**
    - **Validates: Requirements 2.3, 5.1, 5.4**

- [x] 3. Checkpoint - Verify navigation tabs render correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Create UserOptionsDialog component
  - [x] 4.1 Create `frontend/src/components/UserOptionsDialog.tsx`
    - Use createPortal for modal rendering
    - Display UserNameEditor for name changes
    - Display "Abmelden" logout button
    - Add close button
    - Handle no-user state with German message
    - _Requirements: 9.1, 9.2, 9.3, 9.5, 9.6, 9.7, 8.4_
  - [x] 4.2 Integrate UserOptionsDialog with MobileBottomTabs
    - Add dialog open state to MobileBottomTabs
    - Open dialog on Profil tab click
    - Pass user, onUserUpdated, onLogout to dialog
    - _Requirements: 3.4, 9.1_
  - [x] 4.3 Implement name change and logout handlers
    - Close dialog after successful name save
    - Trigger logout on Abmelden click
    - _Requirements: 9.4, 9.5_
  - [x] 4.4 Write unit tests for UserOptionsDialog
    - Test dialog opens/closes
    - Test user name editor renders
    - Test logout button renders
    - Test no-user message
    - _Requirements: 9.1, 9.2, 9.3, 9.6, 9.7_

- [x] 5. Update Header component for desktop navigation
  - [x] 5.1 Add "Statistiken" tab to desktop navigation
    - Add third tab linking to /statistics
    - Maintain existing tab styling
    - _Requirements: 2.1, 2.2, 2.3_
  - [x] 5.2 Remove burger menu and mobile menu from Header
    - Remove isMobileMenuOpen state
    - Remove toggleMobileMenu function
    - Remove mobile menu button
    - Remove mobile menu dropdown
    - _Requirements: 3.5_
  - [x] 5.3 Simplify mobile header display
    - Keep event title
    - Keep desktop user info (hidden on mobile)
    - _Requirements: 3.5_
  - [x] 5.4 Write property test for navigation routing
    - **Property 1: Navigation Tab Click Routes Correctly**
    - **Validates: Requirements 2.2, 3.3**
  - [x] 5.5 Write unit tests for Header changes
    - Test 3 desktop tabs render
    - Test no burger menu on mobile
    - Test Statistiken tab links correctly
    - _Requirements: 2.1, 2.4, 3.5_

- [x] 6. Checkpoint - Verify navigation works end-to-end
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Remove Statistics from HomePage
  - [x] 7.1 Remove Statistics component import and usage from HomePage
    - Remove Statistics import
    - Remove statsRefreshTrigger state
    - Remove refreshStats callback
    - Remove Statistics component from render
    - _Requirements: 7.1_
  - [x] 7.2 Verify HomePage retains all other functionality
    - Game list still renders
    - Filters still work
    - Search still works
    - _Requirements: 7.2_
  - [x] 7.3 Write unit tests for HomePage changes
    - Test Statistics not rendered
    - Test game list still renders
    - _Requirements: 7.1, 7.2_

- [x] 8. Add responsive behavior and final polish
  - [x] 8.1 Verify responsive breakpoint behavior
    - Mobile nav visible below 768px
    - Desktop nav visible at 768px and above
    - Navigation switches on resize
    - _Requirements: 6.1, 6.2, 6.3_
  - [x] 8.2 Write property test for active tab styling
    - **Property 4: Active Tab Icon Styling**
    - **Validates: Requirements 4.6, 5.3**

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks are required (comprehensive testing from start)
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Use `createPortal` for UserOptionsDialog modal (per modal-rendering.md guideline)
- All UI text must be in German

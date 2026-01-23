# Requirements Document

## Introduction

This feature simplifies navigation between main pages and moves the Statistics section into a dedicated page. The current implementation has Statistics embedded within the HomePage, and navigation uses a burger menu on mobile. This feature creates a standalone Statistics page and introduces a mobile-friendly bottom tab bar navigation pattern while adding Statistics as a third tab in the desktop header navigation. The burger menu is replaced entirely with a fourth "Profil" tab that opens a user options dialog.

## Glossary

- **Statistics_Page**: A dedicated page component displaying event statistics dashboard and popular games list
- **Desktop_Navigation**: The horizontal tab navigation displayed in the header on screens ≥768px (md breakpoint)
- **Mobile_Navigation**: A fixed bottom tab bar displayed on screens <768px
- **Tab_Bar**: A horizontal navigation component with icon and text label for each navigation item
- **Active_Tab**: The currently selected navigation tab, visually distinguished from inactive tabs
- **Tab_Icon**: An SVG icon representing each navigation section
- **User_Options_Dialog**: A modal dialog displaying user profile options (name change, logout)

## Requirements

### Requirement 1: Statistics Page Creation

**User Story:** As a user, I want to view statistics on a dedicated page, so that I can focus on event metrics without scrolling through the game list.

#### Acceptance Criteria

1. WHEN a user navigates to the Statistics page, THE Statistics_Page SHALL display the statistics dashboard with total games, participants, available games, and requested games counts
2. WHEN a user navigates to the Statistics page, THE Statistics_Page SHALL display the "Beliebteste Spiele" (most popular games) list
3. WHEN the Statistics page loads, THE Statistics_Page SHALL fetch and display current statistics data from the API
4. IF the statistics data fails to load, THEN THE Statistics_Page SHALL display an error message in German with a retry option
5. WHILE statistics data is loading, THE Statistics_Page SHALL display a loading indicator

### Requirement 2: Desktop Navigation Enhancement

**User Story:** As a desktop user, I want to access Statistics from the header navigation, so that I can quickly switch between main sections.

#### Acceptance Criteria

1. THE Desktop_Navigation SHALL display three tabs: "Spieleliste", "Druckansicht", and "Statistiken" in that order
2. WHEN a user clicks a navigation tab, THE Desktop_Navigation SHALL navigate to the corresponding page
3. WHEN a page is active, THE Desktop_Navigation SHALL visually highlight the corresponding tab with a bottom border
4. THE Desktop_Navigation SHALL only be visible on screens with width ≥768px (md breakpoint)

### Requirement 3: Mobile Bottom Tab Bar Navigation

**User Story:** As a mobile user, I want to navigate using a bottom tab bar, so that I can easily reach all sections with my thumb.

#### Acceptance Criteria

1. THE Mobile_Navigation SHALL be fixed at the bottom of the viewport on screens <768px
2. THE Mobile_Navigation SHALL display four tabs: "Spieleliste", "Druckansicht", "Statistiken", and "Profil"
3. WHEN a user taps a navigation tab (Spieleliste, Druckansicht, Statistiken), THE Mobile_Navigation SHALL navigate to the corresponding page
4. WHEN a user taps the "Profil" tab, THE Mobile_Navigation SHALL open the User_Options_Dialog
5. THE Mobile_Navigation SHALL completely replace the existing burger menu navigation on mobile
6. THE Mobile_Navigation SHALL NOT be visible on screens ≥768px

### Requirement 4: Tab Icons

**User Story:** As a user, I want distinct icons for each navigation tab, so that I can quickly identify sections visually.

#### Acceptance Criteria

1. THE Tab_Bar SHALL display an SVG icon above the text label for each tab
2. THE "Spieleliste" tab SHALL display a game/dice icon
3. THE "Druckansicht" tab SHALL display a printer icon
4. THE "Statistiken" tab SHALL display a chart/statistics icon
5. THE "Profil" tab SHALL display a user/person icon
6. WHEN a tab is active, THE Tab_Icon SHALL be visually distinguished (e.g., different color)

### Requirement 5: Active Tab Highlighting

**User Story:** As a user, I want to see which tab is currently active, so that I know which section I'm viewing.

#### Acceptance Criteria

1. WHEN a page is active, THE Tab_Bar SHALL highlight the corresponding tab
2. THE Active_Tab SHALL have a visually distinct background or border color
3. THE Active_Tab icon and text SHALL have a distinct color (e.g., blue) compared to inactive tabs (e.g., gray)
4. THE Tab_Bar SHALL update the active state when navigation occurs

### Requirement 6: Responsive Behavior

**User Story:** As a user, I want the navigation to adapt to my screen size, so that I have an optimal experience on any device.

#### Acceptance Criteria

1. WHEN the viewport width is <768px, THE system SHALL display the Mobile_Navigation (bottom tab bar)
2. WHEN the viewport width is ≥768px, THE system SHALL display the Desktop_Navigation (header tabs)
3. WHEN the viewport width changes across the 768px breakpoint, THE system SHALL switch between navigation modes
4. THE Mobile_Navigation SHALL NOT overlap with page content (adequate bottom padding required)

### Requirement 7: Statistics Removal from HomePage

**User Story:** As a developer, I want Statistics removed from HomePage, so that the page focuses on the game list functionality.

#### Acceptance Criteria

1. WHEN the HomePage loads, THE HomePage SHALL NOT display the Statistics component
2. THE HomePage SHALL retain all other functionality (game list, filters, search, etc.)

### Requirement 8: German UI Text

**User Story:** As a German-speaking user, I want all navigation text in German, so that I can understand the interface.

#### Acceptance Criteria

1. THE Tab_Bar labels SHALL use German text: "Spieleliste", "Druckansicht", "Statistiken", "Profil"
2. THE Statistics_Page heading SHALL display "Statistiken" as the page title
3. ALL error messages and loading states SHALL be displayed in German
4. THE User_Options_Dialog SHALL display all text in German

### Requirement 9: User Options Dialog

**User Story:** As a mobile user, I want to access my profile options from the tab bar, so that I can change my name or log out without a burger menu.

#### Acceptance Criteria

1. WHEN the user taps the "Profil" tab, THE User_Options_Dialog SHALL open as a modal
2. THE User_Options_Dialog SHALL display the current user name with an option to edit it
3. THE User_Options_Dialog SHALL display a "Abmelden" (logout) button
4. WHEN the user saves a name change, THE User_Options_Dialog SHALL update the user name and close
5. WHEN the user taps "Abmelden", THE system SHALL log out the user
6. THE User_Options_Dialog SHALL have a close button to dismiss without changes
7. IF no user is logged in, THE "Profil" tab SHALL still be visible but display a message indicating no user is logged in

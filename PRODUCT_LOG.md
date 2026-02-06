# Product Log

Last updated: 2026-02-06

This document ties the product vision to our current documented progress and code reality. It is a theory-of-the-product snapshot, not a substitute for validating behavior in the running system.

**Sources**
- Product vision: `PRODUCT_VISION.md`
- Specs history: `.kiro/specs/*`
- Code reality anchors (non-exhaustive): `api/prisma/schema.prisma`, `api/src/index.ts`, `api/src/services/event.service.ts`, `api/src/middleware/event.middleware.ts`, `api/src/routes/*.ts`, `frontend/src/App.tsx`, `frontend/src/api/client.ts`, `frontend/src/pages/*.tsx`

**Vision Summary (from `PRODUCT_VISION.md`)**
- Build an event-centric board game management app that evolves from single-event to multi-event platform.
- Organizers can own multiple events; attendees join via a link and a single event password.
- Default event migration should be silent and backward-compatible.
- Event metadata (dates, location, capacity, notes, fees) becomes part of the event model.
- Preserve low friction for attendees; keep organizer overhead minimal.
- Success focuses on recurring events, event creation to first game, and attendee participation.

**Progress vs Vision (as of 2026-02-06)**
| Vision Area | Current Progress (Observed) | Gaps / Risks |
| --- | --- | --- |
| Event-centric data model and migration | Event, Account, Session models exist; `Event` owns `User`, `Game`, and `ActivityEvent` relations. Default event creation and backfill are performed at boot (default admin + default event, then assign null `eventId` records). Evidence: `api/prisma/schema.prisma`, `api/src/index.ts`, `api/src/services/event.service.ts`, `api/prisma/migrations/20260205121155_add_events/migration.sql`. | Bootstrapping is best-effort and does not fail-fast if initialization fails. Verify migration correctness against existing data volume and uniqueness constraints. |
| Multi-event support | Documented as current state in spec 015. API supports per-event scoping via `x-event-id` header or `eventId` query; services and repositories accept `eventId`. Evidence: `api/src/middleware/event.middleware.ts`, `api/src/routes/game.routes.ts`, `api/src/routes/participant.routes.ts`, `api/src/routes/statistics.routes.ts`. | Frontend does not pass `eventId` or provide event switching/selection. No explicit event CRUD endpoints or UI found. |
| Attendee low-friction access | Event password verification remains in `/api/auth/verify`. Participant selection and name storage remain client-side. Evidence: `api/src/routes/auth.routes.ts`, `frontend/src/App.tsx`. | Event-link based access is not surfaced in UI; assumes default event. |
| Organizer accounts and admin | Account and session management with JWT is implemented; admin UI for account management exists. Evidence: `api/src/routes/account.routes.ts`, `api/src/routes/session.routes.ts`, `api/src/middleware/auth.middleware.ts`, `frontend/src/pages/LoginPage.tsx`, `frontend/src/pages/RegisterPage.tsx`, `frontend/src/pages/ProfilePage.tsx`, `frontend/src/pages/AdminPage.tsx`. | Organizer-to-event ownership UI and workflows are not visible in frontend. |
| Event metadata | Schema includes `startsAt`, `endsAt`, `location`, `capacity`, `notes`, `fees`. Evidence: `api/prisma/schema.prisma`. | No UI or API endpoints for editing event metadata are visible; event management spec is requirements-only. |
| Event-level analytics and print outputs | Statistics and print outputs exist for the event list. Evidence: `api/src/routes/statistics.routes.ts`, `frontend/src/pages/StatisticsPage.tsx`, `frontend/src/pages/PrintPage.tsx`. | Analytics appear limited to per-event stats, not organizer dashboards or cross-event insights. |
| BGG enrichment and discoverability | Extensive BGG static data, thumbnails, enrichment, and alternate name search appear implemented across specs 004, 008, 010, 013, 014, 023. Evidence: `api/src/services/bgg*`, `api/src/routes/bgg.routes.ts`, `frontend/src/api/client.ts`. | Verify operational readiness (scraper config, cache dirs, envs) in deployment. |

**Spec History (Kiro)**
Docs legend: `R` = requirements, `D` = design, `T` = tasks.
Task status reflects checkbox counts inside `tasks.md`; it is not a guarantee that code behavior matches.

| Spec | Title | Docs | Tasks |
| --- | --- | --- | --- |
| 001-board-game-event | Board Game Event Coordination Application | RDT | 47/47 |
| 002-user-management | User Management | RDT | 43/43 |
| 003-logout-and-game-ownership | Logout and Game Ownership | RDT | 41/41 |
| 004-bgg-static-data-integration | BGG Static Data Integration | RDT | 33/33 |
| 005-bgg-rating-badge | BGG Rating Badge | RDT | 15/15 |
| 006-unified-search-add | Unified Search and Add Game | RDT | 36/36 |
| 007-navigation-statistics-page | Navigation Statistics Page | RDT | 31/31 |
| 008-bgg-search-release-year-sorting | BGG Search Release Year Sorting | RDT | 8/8 |
| 009-username-length-limit | Username Length Limit | RDT | 12/12 |
| 010-bgg-game-thumbnails | BGG Game Thumbnails | RDT | 32/32 |
| 011-fuzzy-search | Fuzzy Search | RDT | 26/26 |
| 012-sse-real-time-updates | SSE Real-Time Updates | RDT | 36/36 |
| 013-bgg-database-enrichment | BGG Database Enrichment | RDT | 39/39 |
| 014-alternate-names-search | Alternate Names Search | RDT | 56/56 |
| 015-multi-event-support | Multi-Event Support (Current State) | RDT | 11/11 |
| 016-account-management | Account Management | RDT | 52/52 |
| 017-authentication-system | Authentication System Requirements | R | — |
| 018-event-management | Event Management Requirements | R | — |
| 019-admin-panel | Admin Panel Requirements | R | — |
| 020-email-system | Email System Requirements | R | — |
| 021-landing-page | Landing Page Requirements | R | — |
| 022-prototype-toggle | Prototype Toggle | RDT | 31/31 |
| 023-custom-thumbnail-upload | Custom Thumbnail Upload | RDT | 44/44 |

**Reality Checks to Run When You Need Truth (not just theory)**
- Confirm multi-event in practice: supply `x-event-id` in API calls and ensure data separation.
- Validate default event migration: start with existing data and confirm backfill to the default event.
- Verify attendee flow remains password-only for the event (no account required).
- Validate organizer account flows and admin operations.
- Confirm BGG enrichment and thumbnail pipelines with real data and configured envs.

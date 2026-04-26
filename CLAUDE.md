# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Full-stack board game event management app (TypeScript). Organizers create events, attendees register interest in games. Integrates with BoardGameGeek (BGG) for game data enrichment. Real-time updates via Server-Sent Events (SSE).

**Current transition:** Moving from single default event to multi-event support with slug-based routing. The default event and existing data must remain fully functional throughout this migration. Never delete or orphan existing event-scoped data.

## Design System

This project has a design system. **Read these before touching any UI code:**

- [`docs/design-system.md`](docs/design-system.md) — palette, typography, components, hard rules, "before you ship a screen" checklist
- [`docs/brand/MARK.md`](docs/brand/MARK.md) — the logo / brand mark (single source of truth)

The system is enforced at the Tailwind token level. The pre-system colours
(`bg-blue-*`, `bg-gray-*`, `bg-red-*`, `bg-yellow-*`, `bg-green-*`) **do not exist**
in `tailwind.config.js` — using one is a build error. Use the Würfelglück tokens:

- **`plum` / `plum-deep`** — primary brand
- **`sage`** — verfügbar / success
- **`butter`** — wunsch / donate
- **`ocean`** — prototyp / organizer chrome
- **`blush`** — destructive / error
- **`paper` / `paper-hi` / `paper-lo`** — surfaces (parchment scale)
- **`ink` / `ink-soft` / `ink-mute`** — text
- **`rule` / `rule-soft`** — borders

### Non-negotiable rules

1. **No raw colour utilities.** Use tokens, not `bg-blue-500` etc.
2. **No `text-white` / `bg-white/*` on the plum header chrome.** Use `text-paper-hi`
   (warm cream) and `paper-hi/N` opacities. Pure white reads cold against plum.
3. **Use the layer classes** (`wg-btn-*`, `wg-card`, `wg-tag-*`, `wg-input`, `wg-label`)
   — don't hand-roll button or card styling.
4. **The brand mark is `frontend/public/favicon.svg`.** Never render a `<div>` with a
   literal `W` character as a logo tile. See `docs/brand/MARK.md`.
5. **German copy** for participant-facing strings; participant errors are friendly
   ("Bitte einen Spielnamen eingeben.").
6. **44 px minimum tap targets** on touch surfaces. The `.wg-btn` family enforces this.

When in doubt, open `docs/design-system.md` and run the "Before you ship a screen"
checklist.

## Architecture

Four Docker services orchestrated via `docker-compose.yml`:

- **api/** — Express/Node backend (port 3006). Layered as routes → services → repositories → Prisma ORM → PostgreSQL.
- **frontend/** — React 18 + Vite + Tailwind CSS (port 8086, nginx in production). Feature folders: components, pages, hooks, contexts.
- **services/crawler/** — Puppeteer-based BGG scraper (port 3001/9101). Optional Apify proxy support.
- **postgresql** — PostgreSQL 15 (port 5456 on host, 5432 in container).

### Two independent auth systems

1. **Event auth** — participants enter an event password → event JWT → scoped data access. Middleware: `event-auth.middleware.ts`. Token stored in sessionStorage (`eventToken`). Expiry controlled by `EVENT_TOKEN_EXPIRY` (default 7d).
2. **Account auth** — organizers login with email/password → account JWT + Session DB record → admin features. Middleware: `auth.middleware.ts`. Roles: `admin`, `account_owner`. `requireAdmin` middleware checks role.

### Request flow

Request → Middleware (auth + event resolution) → Route handler → Service (validation, business logic) → Repository (Prisma queries) → Response. Services transform DB entities to API response types.

### Event scoping

Events are the top-level scope. Event ID is resolved from `x-event-id` header or `eventId` query param, with fallback to default event via `EventService.getDefaultEventId()`. All core entities (User/Participant, Game, Player, Bringer, ActivityEvent) are scoped to an Event via `eventId` foreign key.

### SSE (real-time updates)

- `SSEManager` singleton in `api/src/services/sse.service.ts` maintains a Map of `clientId → Response`.
- 30-second heartbeat keeps connections alive through proxies. `X-Accel-Buffering: no` disables nginx buffering.
- Event types defined in `api/src/types/sse.ts`: `game:created`, `game:bringer-added/removed`, `game:player-added/removed`, `game:deleted`, `game:prototype-toggled`, `game:thumbnail-uploaded`.
- Frontend `useSSE` hook implements exponential backoff reconnection (1s→30s max). Filters out self-notifications for toasts.

### BGG integration pipeline

Three stages, each can run independently:

1. **CSV Import** (`BggImportService`) — loads `api/data/boardgames_ranks.csv` in batches of 1000. Uses upsert to never overwrite enrichment data. Endpoint: `POST /api/bgg/import` (returns 202, runs in background).
2. **In-Memory Cache** (`BggCache` singleton) — loads from DB if DB has ≥ CSV row count (indicates enriched data), else from CSV. Supports fuzzy search with alternate-names index. Primary name matches get +10 score bonus.
3. **Web Scraping Enrichment** (`BggEnrichmentService`) — fetches BGG pages, extracts `GEEK.geekitemPreload` JSON for alternate names, designers, categories, mechanics. Endpoint: `POST /api/bgg/enrich` (202, background). Rate-limit handling with 5s delay and 3 retries.

## Build & Run

```bash
# Full stack (Docker) — always use V2 syntax: "docker compose" NOT "docker-compose"
docker compose up -d --build          # build and run all services
docker compose build                  # build only

# API (cd api/)
npm run dev                           # hot reload dev server
npm run build                         # TypeScript compile
npm run prisma:migrate                # apply database migrations
npm run prisma:studio                 # Prisma GUI

# Frontend (cd frontend/)
npm run dev                           # Vite dev server
npm run build                         # production build
npm run lint                          # ESLint
```

### Scoped Docker rebuilds

| Change location | Command |
|-----------------|---------|
| `frontend/**` | `docker compose up -d --build frontend` |
| `api/**` | `docker compose up -d --build api` |
| Both | `docker compose up -d --build` |
| `.env` only | `docker compose up -d` (no rebuild needed) |

Don't assume hot-reload works in Docker. Always rebuild after code changes.

## Testing

Backend tests require a running PostgreSQL instance at `localhost:5456` — run outside sandbox.

```bash
# Backend (Jest) — always use --runInBand to prevent DB conflicts
cd api && npm test -- --runInBand

# Frontend (Vitest)
cd frontend && npm test

# Single backend test file
cd api && npm test -- path/to/file.test.ts --runInBand

# Single frontend test file
cd frontend && npm test -- path/to/file.test.ts
```

### Mandatory test workflow

1. Run tests with output captured: `npm test -- --runInBand > /tmp/bgl-test-output.log 2>&1`
2. Analyze: `grep "FAIL" /tmp/bgl-test-output.log` and `grep "●" /tmp/bgl-test-output.log | head -30`
3. Fix and verify individual files, then re-run full suite.

### Test cleanup rules

- Never `deleteMany({})` without a `where` clause — it deletes ALL data.
- Use `cleanupTestDb` helper from `../helpers/testDb` when available.
- Jest has no `--run` flag (that's Vitest only).

### Property-based testing (fast-check)

Files: `*.property.test.ts`. Default: `{ numRuns: 3 }` unless there's a specific reason for more.

**Use property tests for:** parsers/serializers, mathematical properties, data transformations with many edge cases, complex input validation.

**Don't use for:** authorization checks (binary), CRUD operations (deterministic), API response format validation.

**Rules:**
- Use `testEmailArbitrary()` for emails, not `fc.emailAddress()`
- Use `fc.constantFrom()` for enums, not random strings
- Prefer `it.each` over property tests when 2-3 examples cover all branches

## Environment Setup

Copy `example.env` to `.env`. Key variables: `DATABASE_URL`, `EVENT_PASSWORD`, `JWT_SECRET` (min 32 chars), `VITE_API_URL`, `VITE_EVENT_NAME`, `DEFAULT_ADMIN_EMAIL/PASSWORD`, `CRAWLER_URL` (Docker: `http://crawler:3001`).

## Coding Conventions

- 2-space indentation, semicolons.
- React components/pages: PascalCase filenames. Hooks: `use` prefix.
- Named exports, modules in nearest feature folder.
- Services exported as singletons at module level (e.g., `export const fooService = new FooService()`).
- Participant-facing validation messages are in German (e.g., "Bitte einen Namen eingeben.").
- Commit messages: short, lowercase, often prefixed with spec id (e.g., `016 account management`).

### Modal rendering

Always use `createPortal` from React DOM for modals in nested components — `fixed inset-0` breaks inside parent stacking contexts.

```tsx
import { createPortal } from 'react-dom';

{isOpen && createPortal(
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
      {/* sticky header / scrollable body / sticky footer */}
    </div>
  </div>,
  document.body
)}
```

## Debugging

- `GET /api/health` — returns BGG cache status, game count, data source (csv vs database).
- SSE client count is logged on connect/disconnect.
- Import/enrichment services log progress every 500–1000 records with ETA.
- `ActivityEvent` table provides an audit log of all mutations.

## Frontend routing

- **Event routes** (behind `AuthGuard`, require event password): `/`, `/print`, `/statistics`
- **Account routes** (behind `AccountAuthGuard`): `/login`, `/register`, `/profile`, `/admin`
- Participant selection modal shown after event auth if no participant is stored.

## Deployment

After any code changes, finalize with `docker compose up -d --build`. Scope Docker rebuilds to what changed (frontend-only, api-only, or both).

## Development Principles

1. **Test-Driven Development**: Write or update tests first. Do not claim completion unless tests run and pass, or explicitly state why they could not be run.

2. **Small, Reversible, Observable Changes**: Prefer small diffs and scoped changes. Implement user-testable and visible changes before backend changes wherever feasible. Keep changes reversible where possible. Maintain separation of concerns; avoid mixing orchestration, domain logic, and IO unless trivial.

3. **Fail Fast, No Silent Fallbacks**: Validate inputs at boundaries. Surface errors early and explicitly. Assume dependencies may fail. No silent fallbacks or hidden degradation. Any fallback must be explicit, tested, and observable.

4. **Minimize Complexity (YAGNI, No Premature Optimization)**: Implement the simplest solution that meets current requirements and tests. Do not design for speculative future use cases. Optimize only with evidence.

5. **Deliberate Trade-offs: Reusability vs. Fit (DRY with Restraint)**: Apply DRY only to real, stable duplication. Avoid abstractions that increase cognitive load without clear benefit. Prefer fit-for-purpose code unless a second use case is concrete.

6. **Don't Assume—Ask for Clarification**: If requirements are ambiguous or multiple interpretations exist, ask. If proceeding is necessary, state assumptions explicitly and keep changes localized and reversible.

7. **Confidence-Gated Autonomy**: Proceed end-to-end only when confidence is high. Narrow scope and increase checks when confidence is medium. Stop and ask when confidence is low.

8. **Security-by-Default**: Treat all external input as untrusted. Use safe defaults and least privilege. Do not weaken auth, authz, crypto, or injection defenses without explicit instruction. Never introduce secrets into code. **NEVER modify user credentials, password hashes, auth tokens, or security-sensitive database rows unless the user explicitly instructs you to do so.** When testing requires authentication, check `scripts/` and documentation for test credentials first, then ask the user.

9. **Don't Break Contracts**: Preserve existing public APIs, schemas, and behavioral contracts unless explicitly instructed otherwise. If breaking changes are required, provide migration steps and compatibility tests.

10. **Risk-Scaled Rigor**: Scale rigor with impact: (1) Low risk — unit tests, lint/format. (2) Medium risk — integration tests, edge cases, rollback awareness. (3) High risk (security, auth, money, data loss, core flows) — explicit approval before destructive actions, targeted tests, minimal refactoring.

11. **Protect Production Data**: All schema migrations must be additive (new columns/tables) or backward-compatible. Never drop columns, rename tables, or alter constraints in ways that break existing queries. Test migrations against a database with realistic data. The default event and all its scoped data (participants, games, players, bringers) must remain fully functional at every step.

## Roadmap

Remaining work for the multi-event transition. The admin panel (019) is already implemented.

### Event Management (ex-spec 018)
Organizer dashboard for creating and managing events. The Event model already has all required fields (name, passwordHash, startsAt, endsAt, location, capacity, notes, fees, ownerAccountId, isDefault). What's missing:
- Add `slug` field (unique, kebab-case, auto-generated from name) to Event model
- CRUD API endpoints for events scoped to ownerAccountId
- Event list/settings UI for account owners
- Slug-based event resolution: `/{slug}` resolves to the event, root `/` falls back to default event during migration

### Email System (ex-spec 020)
Transactional email via SMTP (Nodemailer). Not yet started — new service entirely:
- SMTP config via env vars, Handlebars templates in `/api/templates/emails/`, all in German
- Email confirmation flow: `unverified` account status, verification token, 24h expiry
- Password reset flow: reset token, 1h expiry, rate limiting
- Notification emails: password changed, account deactivated, welcome

### Landing Page (ex-spec 021)
Public marketing page at `/` once slug-based routing is active:
- Landing page explaining the app with CTAs (register/login), in German
- Event-not-found page for invalid slugs
- Transition: root `/` remains default event experience until slug routing is enabled

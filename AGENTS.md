# Repository Guidelines

## Project Structure & Module Organization
- `api/`: Node/Express API in TypeScript. Entry point is `api/src/index.ts`. Domain logic is grouped under `api/src/routes`, `api/src/services`, and `api/src/repositories`. Prisma schema and migrations live in `api/prisma/`, and compiled output goes to `api/dist/`. Seed/reference data sits in `api/data/` (for example `boardgames_ranks.csv`).
- `frontend/`: React + Vite + TypeScript app. Source lives in `frontend/src` with feature folders like `components`, `pages`, `hooks`, `contexts`, and `utils`. Static assets live in `frontend/public`, and production builds output to `frontend/dist`.
- `scripts/`: Small utilities such as `scripts/bgg-image-test.js`.

## Build, Test, and Development Commands
- `docker compose up --build`: Runs Postgres, the API, and the frontend using `docker-compose.yml`.
- API (`api/`):
  - `npm run dev`: Start API with hot reload.
  - `npm run build`: TypeScript compile.
  - `npm test` / `npm run test:watch`: Jest test run.
  - `npm run prisma:migrate`: Apply migrations; `npm run prisma:studio` opens Prisma Studio.
- Frontend (`frontend/`):
  - `npm run dev`: Vite dev server.
  - `npm run build`: TypeScript + Vite build.
  - `npm run preview`: Serve production build.
  - `npm run lint`: ESLint check.
  - `npm run test` / `npm run test:watch`: Vitest run.

## Coding Style & Naming Conventions
- Follow existing formatting: 2-space indentation and semicolons (see `api/src/index.ts`, `frontend/src/App.tsx`).
- React components and pages use PascalCase filenames (e.g., `HomePage.tsx`), hooks start with `use` (e.g., `useUser.ts`).
- Keep modules in the nearest feature folder; favor named exports consistent with the surrounding files.

## Testing Guidelines
- API tests live alongside code in `api/src/**/__tests__` and use `*.test.ts` plus `*.property.test.ts` (fast-check).
- Frontend tests live in `frontend/src/**/__tests__` and use `*.test.tsx` / `*.property.test.ts`.
- Add tests close to the feature and run package-local test commands.

## Commit & Pull Request Guidelines
- Commit history favors short, lowercase summaries and often prefixes a spec id (e.g., `016 account management` or `spec 016 ...`). Mirror this style when applicable.
- PRs should describe behavior changes, list commands run, and include screenshots for UI changes.

## Configuration & Security
- Copy `example.env` to `.env` for local/dev. Do not commit secrets; set `EVENT_PASSWORD`, `JWT_SECRET`, and `VITE_API_URL` explicitly for real environments.

## Agent-Specific Instructions
- Follow `.kiro/steering/test-execution.md` for test workflow (mandatory).
  - Always run tests with logs captured to `/tmp/bgl-test-output.log`.
  - Always use `--runInBand` for Jest.
  - Analyze logs with `grep "FAIL"` and `grep "●"` before iterating.
- Backend (Jest): `cd api && npm test -- --runInBand`
- Frontend (Vitest): `cd frontend && npm test`
- Single file: `npm test -- path/to/test.ts --runInBand`
- Backend tests must run outside the sandbox (escalated) to reach the host Postgres at `localhost:5456`.
- If a command needs full network access or would be blocked by sandboxing, ask for permission to run it outside the sandbox instead of working around the restriction.
- After making any frontend or backend changes, build and redeploy with `docker compose up -d --build`.
- Ask before running any long tests.
- Determine Docker scope based on what changed (frontend-only, backend-only, or both) and apply it consistently.
- Finalizing code changes MUST deploy with Docker (build + run). Use:
  - `docker compose up -d --build` (always; this builds and deploys, not just builds).
  - If only checking build artifacts is explicitly requested, use `docker compose build` for the affected services.

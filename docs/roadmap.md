# Roadmap

Source of truth for what's shipped, what's open, and what was deliberately
dropped in the multi-event transition. CLAUDE.md just points here.

Each section refers to the original spec id where one exists (the specs
themselves live as PRs / git history; this doc is the running summary).

---

## Done

### Event Management — ex-spec 018

Multi-event support with slug-based routing. The default event and its
scoped data remain fully functional alongside.

- `Event.slug` (unique, kebab-case, auto-generated) on the model
- CRUD API endpoints scoped to `ownerAccountId`
- `EventsPage` (organizer dashboard) + `EventSettingsPage`
- `/:slug/*` resolution via `EventRoutes`; root `/` falls back to
  `LandingPage` (public marketing page)

### Admin Panel — ex-spec 019

List accounts, set role, set status, reset password, list/revoke
sessions. Implemented in `frontend/src/pages/AdminPage.tsx` with the
matching `requireAdmin` middleware on the backend.

### Email System — ex-spec 020

Transactional email via SMTP (Nodemailer + Handlebars), German
templates, `juice`-inlined CSS at render time. The brand mark is
attached as `cid:wg-logo` so it loads in every client without
depending on a public URL. See `docs/design-system.md` "Email"
section for the rendering rules.

**Templates shipped** (under `api/templates/emails/`):

- `magic-link/de` — login + signup link (15-min TTL)
- `welcome/de` — first activation
- `password-changed/de` — security notice
- `account-deactivated/de` — security notice
- `email-change-confirm/de` — to NEW address with click link
- `email-change-notice/de` — to OLD address as a heads-up

**Trigger wires:**

- `magic-link/consume` route → on `unverified → active` flip → welcome
- `accountService.changePassword` / `resetPassword` → password-changed
- `accountService.deactivate` / `setStatus(_, 'deactivated')` →
  account-deactivated
- `accountService.requestEmailChange` → confirm to NEW + notice to OLD
- `accountService.confirmEmailChange` → swap account.email

**Adapted from the original spec — record for posterity:**

- *"Email confirmation flow: verification token, 24h expiry"* →
  **magic-link doubles as confirmation**, 15-min TTL, no separate
  token. The first click on the magic-link mail flips the account from
  `unverified` to `active` and creates the session.
- *"Password reset flow: reset token, 1h expiry, rate limiting"* →
  **dropped entirely.** Magic-link is the reset. Users who forget
  their password just request a magic link and (optionally) change
  the password from `/profile` once logged in. The "Passwort
  vergessen?" link on the login page was removed.

### Account Management

Not a numbered spec, but worth listing as fully wired:

- Registration (password + magic-link, unified flow)
- Login (password + magic-link, magic-link is primary)
- Email verification via first magic-link click (`unverified → active`)
- Password change (old-password-gated, sends `password-changed` mail)
- **Email change** (two-step: confirm on NEW + notice to OLD; takes
  effect only after click on NEW address)
- Self-deactivation + admin-side status flip
- Admin panel (list/role/status/reset/sessions)

### Event admin "view as" preview

Owner-only top bar on `/{slug}` that previews how the event renders
in `planning` / `active` / `archived` without touching the actual
status. See `frontend/src/components/ViewAsToggle.tsx`.

---

## Open

### Landing Page polish — ex-spec 021

Most of spec 021 is done (`LandingPage` mounted at `/`, slug routing
live). One open item:

- **Event-not-found page** for invalid slugs. Currently a small inline
  card in `EventRoutes.tsx`; should be a full design-system 404 with
  links back to `/` and `/login`.

---

## Potential follow-ups (not committed)

Surfaces where someone might ask "do we want this?" — none of these
are scheduled and we shouldn't build them speculatively.

- **Hard delete** vs. deactivation. Today an account can only be
  deactivated; there's no GDPR-style hard delete that wipes all
  scoped data.
- **Reactivation flow.** A deactivated account currently has no path
  back without admin intervention.
- **2FA.** Magic-link is already a form of email-based 2FA-ish; no
  TOTP / WebAuthn.
- **Multi-account / org membership.** One account = one set of
  events; no shared organizer roles within an event.

---

## How to update this doc

When a feature lands: move the bullet from "Open" to "Done" with a
one-line note on what shipped + a pointer to the relevant code path.

When the spec changed mid-flight: keep the original goal in italics
and add the actual implementation under "Adapted from the original
spec" — future you (and Claude) needs to know *why* something
diverged from the brief.

When something is consciously not built: move it to "Potential
follow-ups" with a one-line reason. This is the difference between
"forgotten" and "decided against".

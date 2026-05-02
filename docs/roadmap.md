# Roadmap

Source of truth for what's shipped, what's open, and what was deliberately
dropped or adapted. CLAUDE.md just points here.

Each spec section refers to the original spec id where one exists (the
specs themselves live as PRs / git history; this doc is the running
summary).

---

## North star

Brettspieltreff is **"Meetup, but for board-game treffs"**: organisers
run events, players attend events from many organisers over time, and
the relationship between a person and the platform should outlast any
single event.

That implies **one identity per real person**, regardless of whether
they're hosting that night or just bringing Cascadia. The whole
identity migration below is the path to making that the data model.

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

### Identity Phase 1 — Email magic-link login

Passwordless login + signup for organizer accounts. Closed out the
Phase 1 of the identity migration plan.

- `email.service.ts` (Nodemailer + Handlebars + juice)
- `LoginToken` table (single-use, time-limited tokens with
  `purpose='login' | 'invite-claim' | 'legacy-claim' | 'reset-password'
  | 'email-change'`)
- `POST /api/auth/magic-link/request` (rate-limited 3/hour) +
  `GET /api/auth/magic-link/consume`
- LoginPage **magic-link as primary path** — not just an alternative.
  Email + button at the top, password login disclosed via a small text
  link. RegisterPage mirrors the same shape.
- New `unverified` AccountStatus; magic-link click flips to `active`.

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

### Identity Phase 2 — Player accounts via `EventParticipation`

Goal: a player-with-an-email becomes a real `Account`, attends events,
has history. Anonymous flow keeps working in parallel.

Today's per-event `User` table (`users.name`, no email, no link to
`Account`) becomes legacy. New attendances live in `EventParticipation`
keyed by `accountId`.

**Scope:**

- New `EventParticipation` table (see *Architecture* section below).
- New event-join flow: enter event password → optional "Konto erstellen
  oder anmelden" step → claims the participation row.
- Account creation lite: just email + displayName, magic-link verifies.
  No password required.
- "Meine Treffs" page for players: list of all events they've joined.
- Old `User` table stays in place; old anonymous flow keeps writing to
  it for backwards-compat for one or two event cycles.
- New `Account.role = 'player'` accounts get this view (today the
  enum is `account_owner | admin`; this phase introduces `'player'`).

**Estimated size:** ~1.5 weeks of focused work.

**Risk:** medium. Two flows running in parallel for 1–2 event cycles.

### Identity Phase 3 — Event invitations + "Vergangene Spieler"

Goal: organizers can invite previous attendees to new events.

- `EventInvitation` table + send flow (organizer-initiated invites
  with token, expiry, `linkedAccountId` set on accept).
- Organizer event-edit page: "Vorherige Teilnehmer einladen" button.
  Aggregates distinct `accountId`s from past `EventParticipation` rows
  where this organizer was host.
- Batch-invite UI: multi-select players, optional personal message,
  generates `EventInvitation` rows + sends emails with magic links.
- Invitee clicks magic link → if they have an account, just signs them
  in and lands on the event; if not, prompts for a displayName, creates
  account, then joins.

**Estimated size:** ~1 week.

**Risk:** medium. Touches email infra heavily; deliverability is the
main concern, but the foundation is in place.

### Lieberhausen-2026 legacy claim flow

One-off migration UX so attendees of the original Lieberhausen-2026
event keep their game history when they create a player account in
the new system. Treat as **temporary**: drop it once the next event
after Lieberhausen-2026 has happened.

**Context:**

- ~70 anonymous `User` rows exist with `displayName` strings ("Hans K.",
  "Lara M.", …), no email.
- We want their `Bringer` / `Player` / `ActivityEvent` rows to follow
  them into their new player account.

**Recommended UX (Option B, "self-claim from a list"):**

1. **Trigger conditions** (all three must hold):
   - Account has `role = 'player'`, created in the last 30 days.
   - There exist legacy `User` rows from Lieberhausen-2026 with no
     `account_id` yet.
   - The account hasn't dismissed this prompt before
     (`legacy_claim_seen_at` timestamp on Account).

2. **Non-blocking banner** at the top of `/{slug}` and `/events`:

   > 🪄 **Warst du beim Lieberhausen-Treff im Februar dabei?** Wir
   > haben deinen Spielverlauf vom letzten Mal aufgehoben. Möchtest du
   > ihn deinem Konto zuordnen? · [Ja, meinen Namen wählen] · [Nein, danke]

3. **Step 1 — pick** (modal):

   > **Wer warst du beim Lieberhausen-Treff?** Wähle deinen damaligen
   > Namen aus. Du kannst diesen Schritt überspringen, wenn du nicht
   > teilgenommen hast.

   Radio list of unclaimed names + "Ich war nicht dabei".

4. **Step 2 — confirm with concrete data** so the user can recognise
   themselves:

   > **Du übernimmst „Hans K." für dein Konto.** Diese Person hat beim
   > Lieberhausen-Treff: 23 Spiele mitgebracht, bei 12 Spielen als
   > Spieler:in zugesagt, 5 Wunsch-Spiele eingetragen, zuletzt aktiv
   > am 22. Februar 2026.
   >
   > ☐ Ja, das war ich · [Zurück] · [Bestätigen]

   The "Ja, das war ich" checkbox must be ticked to enable Bestätigen
   — forces a deliberate confirmation, no fat-finger claims of someone
   else's history.

5. **On confirm:** in a single transaction, `UPDATE users SET
   account_id = $1 WHERE id = $2 AND account_id IS NULL`. If `0 rows`,
   race lost → "Schon vergeben — bitte einen anderen Namen wählen".

**Race / abuse:**
- Single-attempt per Account. Wrong pick → organizer un-links via an
  admin-only endpoint. Closed-group context keeps this rare.
- Two simultaneous logins picking the same name → DB constraint wins,
  later one gets "Schon vergeben".

**End-of-life:** after the next event has happened, drop the banner
code, the migration endpoint, and the `legacy_claim_seen_at` field.
Leave the now-claimed `User.account_id` data — it's part of the normal
data model going forward.

**Why this is OK ethically in your closed-group context:** recipients
are people you personally know; they'll see their own name in a short
list and recognise it; no PII is leaked between players (first names +
last initial only). In a *public* version of the app this UX would be
too risky; for a private migration it's the right level of friction.

---

## Architecture decisions

### One `Account` table for everyone

A single `Account` represents any person who interacts with the
platform. A `role` flag distinguishes capabilities, not identities.

```text
Account                       (one row per real person)
├── id (uuid)
├── email (unique)
├── passwordHash (nullable — magic-link only is fine)
├── displayName (default; per-event overrides allowed)
├── role: 'admin' | 'organizer' | 'player'   (currently 'admin' | 'account_owner')
├── status: 'active' | 'deactivated' | 'unverified'
├── locale (nullable)
├── createdAt, updatedAt
```

**Why not split into `Player` / `Organizer` tables?**

- Roles aren't permanent — a frequent attendee will eventually host a
  treff.
- Forces dual-identity maths in code the moment someone is both.
- Cross-organizer history is trivial when there's only one identity.
- Schema bloat is solved with optional sub-tables (e.g.
  `OrganizerProfile`, see Phase 4 follow-up).

**Naming:** today's `account_owner` role renames to `organizer` in this
model. `'player'` is added in Phase 2. Migration is a single
`UPDATE accounts SET role='organizer' WHERE role='account_owner'` on
the same enum column.

### Target data model (what Phase 2/3 build toward)

```text
Account                       (see above)

OrganizerProfile              optional 1:1, only when role flips to organizer
├── accountId (PK = FK)
├── publicSlug (e.g. brettspieltreff.app/host/lieberhausen-team)
├── bio, photoUrl, defaultLocation, socialLinks
└── stripeConnectId (later, for paid events)

Event                         existing — adds visibility
├── … current fields …
└── visibility: 'private' | 'unlisted' | 'public'
                              private  = password-gated, current behaviour
                              unlisted = link-only, no password
                              public   = listed on discovery page

EventParticipation            replaces today's User table for new flow
├── id
├── eventId, accountId (nullable for legacy anonymous joins)
├── displayName (per-event override; default = account.displayName)
├── role: 'attendee' | 'co-host'
├── status: 'going' | 'interested' | 'declined' | 'waitlist'
├── joinedAt
└── invitedById (organizer who invited, or null for self-join)

EventInvitation               organizer-initiated invites
├── id, eventId, email
├── invitedById (organizer's accountId)
├── token, expiresAt, consumedAt
└── linkedAccountId (set when accepted)

LoginToken                    magic-link auth (already shipped)
├── token (uuid)
├── accountId
├── purpose: 'login' | 'invite-claim' | 'legacy-claim' | 'reset-password' | 'email-change'
├── targetPath, newEmail (for email-change)
├── expiresAt, consumedAt, consumedIp
└── createdAt
```

### Authentication strategy (per role, target state)

| Role | Default mechanism | Optional |
|---|---|---|
| Player | Magic-link by email | — |
| Organizer | Magic-link by email | Password (opt-in for "fast login") |
| Admin | Password | 2FA later |

Magic links are 15-minute single-use, delivered via SMTP.

---

## Potential follow-ups (not committed)

Surfaces where someone might ask "do we want this?" — none of these
are scheduled and we shouldn't build them speculatively.

### Identity Phase 4 — Public events + discovery

Goal: organizers can make events publicly listable; players can browse.

- `Event.visibility` field with three values (private / unlisted / public).
- `/entdecken` page listing public events near the user's location.
- Optional `OrganizerProfile` table + `/host/<slug>` public page.

Growth phase, not core. Out of scope until requested.

### Other follow-ups

- **Hard delete** vs. deactivation. Today an account can only be
  deactivated; there's no GDPR-style hard delete that wipes all
  scoped data.
- **Reactivation flow.** A deactivated account currently has no path
  back without admin intervention.
- **2FA.** Magic-link is already a form of email-based 2FA-ish; no
  TOTP / WebAuthn.
- **Multi-account / org membership.** One account = one set of
  events; no shared organizer roles within an event (Phase 3's
  EventParticipation `role: 'co-host'` is the closest hook).
- **WhatsApp / SMS as auth channel.** Considered and deferred —
  email is the natural fit because the address is the account
  identity. See appendix for the cost / setup analysis.

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

When an architecture decision is made (data model shape, role naming,
auth flow): record it in the *Architecture decisions* section so it
survives the rotating "what we shipped" list.

---

## Appendix — WhatsApp / SMS analysis

Reproduced for the record from the identity-roadmap working session.

**WhatsApp Business** is gated behind:

- BSP onboarding (Twilio / 360dialog / etc.) — multiple days
- Phone number verification + dedicated business number
- Pre-approved message templates (Meta approval, 24–72h per template)
- ~€0.04–0.08 per OTP message in DE
- GDPR data-processor agreement with the BSP

**SMS via Twilio Verify** is faster to set up (no template approval)
but delivery is carrier-dependent and costs ~€0.05–0.10 per message
in DE.

**Email magic links** are sent via plain SMTP through your existing
email provider — no per-message fee, no third-party relay, universal
delivery.

→ Email-first; phone channels later, only if a measurable number of
users ask for them.

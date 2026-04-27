# Identity & Auth Roadmap

> Working document. We will iterate on this together before any code lands.
> Last edited: 2026-04-26.

## North star

Brettspieltreff is **"Meetup, but for board-game treffs"**: organisers run
events, players attend events from many organisers over time, and the
relationship between a person and the platform should outlast any single
event.

That implies one identity per real person, regardless of whether they're
hosting that night or just bringing Cascadia.

## Decision: one `Account` table for everyone

A single `Account` represents any person who interacts with the platform.
A `role` flag distinguishes capabilities, not identities.

```text
Account                       (one row per real person)
├── id (uuid)
├── email (unique)
├── passwordHash (nullable — passwordless via magic link is fine)
├── displayName (default; per-event overrides allowed)
├── role: 'admin' | 'organizer' | 'player'      (default 'player')
├── status, createdAt, lastSeenAt
```

**Why not split into `Player` / `Organizer` tables?**
- Roles aren't permanent — a frequent attendee will eventually host a treff.
- Forces dual-identity maths in code the moment someone is both.
- Cross-organizer history is trivial when there's only one identity.
- Schema bloat is solved with optional sub-tables (see `OrganizerProfile`).

`account_owner` (today's role for organizers) renames to `organizer` in
this model. Existing rows migrate via a `UPDATE accounts SET role='organizer'`
on the same enum column.

## The full data model

```text
Account                       see above

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

LoginToken                    magic-link auth
├── token (uuid)
├── accountId
├── purpose: 'login' | 'invite-claim' | 'legacy-claim'
├── targetUrl (where to land after consumption)
├── expiresAt, consumedAt
└── createdAt
```

## Authentication strategy

| Role | Default mechanism | Optional |
|---|---|---|
| Player | Magic-link by email | — |
| Organizer | Magic-link by email | Password (opt-in for "fast login") |
| Admin | Password | 2FA later |

Magic links are 15-minute single-use, delivered via email. **We send via
SMTP using `nodemailer`** against your existing email provider's SMTP
account — no third-party API service in the loop. Saves the monthly cost,
keeps deliverability under our control, and `nodemailer` is the
standard TypeScript SMTP library (battle-tested, no surprises).

### SMTP config

```
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false       # true for 465, false for STARTTLS on 587
SMTP_USER=…
SMTP_PASS=…
SMTP_FROM="Brettspieltreff <noreply@brettspieltreff.app>"
SMTP_REPLY_TO=organisator@brettspieltreff.app   # optional
```

### Email templating system (no hard-coded templates)

Templates live as files on disk under `api/templates/emails/`, **not** as
strings in TypeScript code. This keeps templates editable without a code
deploy, supports multi-language, and lets non-developers contribute copy
later.

**Layout:**

```
api/templates/emails/
├── _shared/
│   ├── layout.html.hbs          ← header / footer / brand chrome
│   └── layout.txt.hbs           ← plain-text equivalent
├── magic-link/
│   ├── de/
│   │   ├── subject.txt          ← "Dein Anmelde-Link für Brettspieltreff"
│   │   ├── body.html.hbs        ← Handlebars template
│   │   └── body.txt.hbs
│   └── en/                      ← English added later (Phase 4-ish)
│       ├── subject.txt
│       ├── body.html.hbs
│       └── body.txt.hbs
├── invitation/
│   └── de/  …
├── donation-thanks/             ← future (BMC notify-supporter integration)
│   └── de/  …
└── …
```

**Engine: Handlebars** (`handlebars` npm package). Standard, well-known,
supports partials so we can `{{> _shared/layout.html}}`. No JSX-in-email
complications, no MJML build step. We may add MJML later if HTML email
layouts get complex; starting plain keeps the dependency surface tiny.

**Locale resolution:**

```ts
function pickLocale(account: Account): 'de' | 'en' {
  return account.locale ?? 'de';   // default Deutsch
}
```

Account gets a nullable `locale` column (`varchar(8)`, ISO 639-1) added in
Phase 1. UI to set it lands in Phase 2 alongside player accounts. For
Phase 1 / Lieberhausen, every existing organiser account is `de`.

**Service API:**

```ts
import { sendTemplatedEmail } from './email.service';

await sendTemplatedEmail({
  to: 'lara@example.de',
  template: 'magic-link',
  locale: 'de',
  variables: {
    link: 'https://brettspieltreff.app/auth?token=…',
    expiresInMinutes: 15,
    appName: 'Brettspieltreff',
  },
});
```

The service:
1. Loads the template tree for `(template, locale)`. Falls back to `de`
   if the requested locale is missing — Deutsch is the source of truth.
2. Resolves `subject.txt` (single-line, plain text after Handlebars).
3. Renders `body.html.hbs` and `body.txt.hbs` with the same variables,
   inheriting `_shared/layout.{html,txt}.hbs` via Handlebars partials.
4. Sends via `nodemailer` with both `text` and `html` parts.
5. On failure: logs loudly, throws — caller decides how to surface (e.g.
   the magic-link request endpoint always returns 200 to prevent email
   enumeration, but writes a `[error]` log line).

**Why files, not strings:**
- Marketing / organiser can edit copy without a code deploy (later, an
  admin UI could even read/write these files).
- Locales are dropdown additions, not code branches.
- Diffs are tiny when copy changes.
- Easier to preview by opening the rendered output in a browser.

**Sanity rule:** every template ships HTML + plain-text. No HTML-only
emails (Outlook will downrank us). No code-side `string +=` template
construction.

### SMTP connectivity check at startup

`email.service.ts` runs a `transporter.verify()` once during boot, before
the API starts accepting requests. The result is logged loudly so we
catch broken SMTP credentials immediately instead of at the first
magic-link request.

Example log lines (mirrors the BGG-cache "===" block style we already use):

```
=== SMTP Initialization ===
SMTP host: smtp.example.com:587 (STARTTLS, user=noreply@brettspieltreff.app)
Verifying SMTP transport...
✓ SMTP transport ready
=== SMTP Ready ===
```

On failure:

```
=== SMTP Initialization ===
SMTP host: smtp.example.com:587 (STARTTLS, user=noreply@brettspieltreff.app)
Verifying SMTP transport...
✗ SMTP verify FAILED: 535 5.7.8 Authentication credentials invalid
=== SMTP NOT READY — emails will fail ===
```

**Behaviour on failure:** the app boots anyway (we don't want a flaky
SMTP to take the whole API down), but emails will throw at send-time and
we'll see it in logs. A `/api/health` field `smtpReady: boolean` is
added so a future status page can surface it.

For dev environments without SMTP configured (no env vars), the service
logs `SMTP not configured — emails will be no-ops` and short-circuits any
send attempts to a console-print. That keeps local dev frictionless and
makes "did the magic link generate?" debuggable from logs.

WhatsApp / SMS is **not** the primary login channel — see the appendix for
the cost / setup analysis. Email is the natural fit because the address is
the account identity.

## Phased migration

Each phase ships independently and doesn't break the previous phase.

### Phase 1 — Email magic-link login on top of existing Accounts (~1 week)

Goal: get passwordless login working for the existing organizer accounts.
No schema changes for participants yet. SMTP infrastructure lands here.

- Add `email.service.ts` (nodemailer + Handlebars templating, see SMTP
  section above)
- Add `LoginToken` table
- `POST /api/auth/request-magic-link` — body `{ email }`. Always 200.
- `GET /api/auth/consume?token=…` — validates, signs in, redirects.
- LoginPage gets a "Magic-Link senden" alternative below the password form.
- Existing password login keeps working.

Risk: low. Backwards-compatible. Real win: enables future password reset
("send a magic link" *is* the reset flow), donation thank-you emails, and
organizer-to-player communication.

### Phase 2 — `EventParticipation` table + player accounts (~1.5 weeks)

Goal: a player-with-an-email becomes a real `Account`, attends events, has
history. Anonymous flow keeps working in parallel.

- Add `EventParticipation` table.
- New event-join flow: enter event password → optional "Konto erstellen
  oder anmelden" step → claims the participation row.
- Account creation lite: just email + displayName, magic-link verifies.
  No password required.
- "Meine Treffs" page for players: list of all events they've joined.
- Old `User` table stays in place; old anonymous flow keeps writing to it
  for backwards-compat.
- New `Account.role = 'player'` accounts get this view.

Risk: medium. Two flows running in parallel for 1–2 event cycles.

### Phase 3 — Event invitations + "Vergangene Spieler" (~1 week)

Goal: organizers can invite previous attendees to new events.

- `EventInvitation` table + send flow.
- Organizer event-edit page: "Vorherige Teilnehmer einladen" button.
  Aggregates distinct `accountId`s from past `EventParticipation`s where
  this organizer was host.
- Batch-invite UI: multi-select players, optional personal message,
  generates `EventInvitation` rows + sends emails with magic links.
- Invitee clicks magic link → if they have an account, just signs them
  in and lands on the event; if not, prompts for a displayName, creates
  account, then joins.

Risk: medium. Touches email infra heavily; deliverability is the main
concern.

### Phase 4 — Public events + discovery (~1.5 weeks)

Goal: organizers can make events publicly listable; players can browse.

- `Event.visibility` field with three values.
- New `/entdecken` page listing public events near the user's location
  (geographic search optional in v1; v1 just shows all upcoming public
  events).
- Optional `OrganizerProfile` table + `/host/<slug>` public page.

Risk: low (additive). Out of scope for any event-management acceleration —
a "growth" phase, not a "core" phase.

## The Lieberhausen-2026 legacy claim flow

This is the one specific bit you flagged. Treat it as a **one-off
migration UX**, not a permanent feature. Drop it once the next event after
Lieberhausen-2026 has taken place.

### Context

- The Lieberhausen-2026 event ran without identity.
- ~70 anonymous `User` rows exist with `displayName` strings ("Hans K.",
  "Lara M.", …).
- These are people who will receive a private link to the new app.
- We want their game history (which games they brought, voted "Wunsch"
  on, etc.) to follow them into their new player account.

### Two options I considered, plus a third I'd actually ship

**Option A — proactive heuristic match.**
On registration, try to match `account.email` or `account.displayName`
against legacy `User.displayName`. Reject obvious mismatches, ask
confirmation on near-matches.

Verdict: too speculative. We have no email on legacy rows, so the only
match dimension is displayName. "Lara M." appears in 4 of our friend
groups. False-positive risk is real.

**Option B — self-claim from a list.**
After first login, show a one-time dialog:

> Hast du am **Lieberhausen 2026** teilgenommen?
> Wenn ja, wähle deinen Namen aus der Liste, damit dein Spieleverlauf
> erhalten bleibt.
>
> [○ Hans K.]   [○ Lara M.]   [○ Tom B.]   …
> [○ Ich war nicht dabei — überspringen]

Player ticks their name → we set `account_id` on that legacy `User` row +
all its `Bringer` / `Player` / `ActivityEvent` children. Once a name is
claimed, it disappears from the next person's list (so two people can't
both claim "Hans K.").

Verdict: simple, low code, low risk in a closed friend group. **Ship this.**

**Option C — pre-bound magic links from the organizer.**
Organizer (you) builds an `email → legacy User id` mapping ahead of time
in a small admin UI. Then sends each invitee a magic link that's
already pre-bound to their old `User`. Zero work for the player.

Verdict: most accurate, but more code (admin pairing UI) and you have to
remember everyone's email-to-name mapping. Overkill for ~70 people in a
closed circle. Skip.

### Recommended UX (Option B), in detail

**Trigger conditions:**
1. Account has `role = 'player'` and was created in the last 30 days.
2. There exist legacy `User` rows from Lieberhausen-2026 with no
   `account_id` yet (i.e. unclaimed).
3. The account hasn't dismissed this prompt before (`legacy_claim_seen_at`
   timestamp on Account, set on first display).

When all three are true, show a **non-blocking banner** at the top of
`/{slug}` and `/events`:

> 🪄 **Warst du beim Lieberhausen-Treff im Februar dabei?**
> Wir haben deinen Spielverlauf vom letzten Mal aufgehoben. Möchtest du ihn
> deinem Konto zuordnen?
>
> [Ja, meinen Namen wählen]   [Nein, danke]

"Ja" opens a modal with the unclaimed name list. "Nein" sets
`legacy_claim_seen_at = now()` and the banner is gone.

**Step 1 — pick:**

> **Wer warst du beim Lieberhausen-Treff?**
> Wähle deinen damaligen Namen aus. Du kannst diesen Schritt überspringen,
> wenn du nicht teilgenommen hast.
>
> [○ Anatol]   [○ Bernd]   [○ Conny K.]   [○ Daniel G.]   …
> [○ Ich war nicht dabei]
>
> [Abbrechen]   [Weiter →]

**Step 2 — confirm with concrete data so the user can recognise themselves:**

> **Du übernimmst „Hans K." für dein Konto**
>
> Diese Person hat beim Lieberhausen-Treff:
> - **23 Spiele** mitgebracht
> - bei **12 Spielen** als Spieler:in zugesagt
> - **5 Wunsch-Spiele** eingetragen
> - zuletzt aktiv am: **22. Februar 2026**
>
> Klingt das nach dir? Dieser Schritt kann nicht rückgängig gemacht werden —
> wende dich an die Organisator:in, falls du einen Fehler entdeckst.
>
> ☐ Ja, das war ich
>
> [Zurück]   [Bestätigen]

The "Ja, das war ich" checkbox must be ticked before "Bestätigen" enables.
Forces a deliberate confirmation — no fat-finger claims of someone else's
history.

**On confirm:**
1. Server: verify the chosen `User.id` is still unclaimed (race-safe).
2. Server: in a single transaction, `UPDATE users SET account_id = $1
   WHERE id = $2 AND account_id IS NULL` — if `0 rows`, race lost, surface
   "Schon vergeben — bitte einen anderen Namen wählen".
3. Show a small toast: "Verknüpft mit deinem Konto. Spielverlauf wieder
   verfügbar."

**Race / abuse:**
- The pick is single-attempt per Account. If the user picks the wrong
  name despite the confirmation step, the organiser un-links via an
  admin-only endpoint (small Profil-page-or-AdminPage button: "Verknüpfung
  aufheben"). Closed-group context means this stays a rare manual
  intervention.
- Two simultaneous logins picking the same name → DB constraint wins,
  the later one gets the "Schon vergeben" message.

**End-of-life:**
After the next Lieberhausen event has happened (so the prompt has had its
window), drop the banner code, the migration endpoint, and the
`legacy_claim_seen_at` field. Leave the now-claimed `User.account_id` data
alone — it's part of the normal data model going forward.

### Why this is OK ethically in your closed-group context

- Recipients are people you personally know who attended.
- They'll see their own name in a short list and recognise it.
- No PII is leaked from one player to another (the list is just first
  names + last initial).
- Worst case: someone picks the wrong name → organizer can manually un-link
  via admin endpoint.

In a *public* version of the app this UX would be too risky (anyone could
claim "Daniel"), but for a private migration it's the right level of
friction.

## Where Phase 1 starts

If you give the green light, I'd start Phase 1 (magic-link login) next.
That unblocks everything: SMTP infra is the prerequisite for player
account creation, organizer invitations, and the legacy claim flow.

Concrete first task list for Phase 1:

1. Add SMTP env vars (host/port/user/pass/from) to `.env`,
   `example.env`, and `docker-compose.yml`.
2. `npm i nodemailer` + `npm i -D @types/nodemailer` in `api/`.
3. `api/src/services/email.service.ts` — singleton transporter, exposes
   `sendMagicLink({ to, link, purpose })`. HTML + plain-text templates,
   both German. Surface errors loudly (don't swallow SMTP failures).
4. `LoginToken` table + Prisma migration.
5. `POST /api/auth/request-magic-link` (rate-limited per email, e.g.
   max 3/hour) and `GET /api/auth/consume?token=` (validates, marks
   consumed, issues JWT, redirects).
6. LoginPage: alternative "Magic-Link senden" button below the password
   form.
7. RegisterPage stays as is for now (organiser registration); player
   account creation lands in Phase 2.

About **a working day** of code. Most of the time goes into the email
templates (HTML + plain-text in German, brand chrome in `_shared/layout`)
and end-to-end verification against the real SMTP host.

## Open questions

1. **SMTP provider details** — host/port/from-address you'll point at?
   You mentioned you've got an account ready; I'll plug it into env vars
   when we start Phase 1.
2. **Should organizer accounts keep the password option** even after magic
   links work? My default: yes — power users want it.
3. **Magic-link rate limits** — 3 requests / hour / email seems reasonable
   to deter abuse without annoying real users. Any preference?
4. **Magic-link cross-device** — token in URL just works (open the email
   on your laptop, click, signed in there). Any reason to bind the link
   to the requesting browser?
5. **Display name format** for the legacy claim list — name as it is in
   `User.displayName` from 2026-02, which is whatever they typed back
   then. My default: keep it verbatim.
6. **Public organizer pages** (Phase 4) — yes/no/later? My default: later.

## Appendix: WhatsApp / SMS analysis

Reproduced from the chat for the record.

**WhatsApp Business** is gated behind:
- BSP onboarding (Twilio / 360dialog / etc.) — multiple days
- Phone number verification + dedicated business number
- Pre-approved message templates (Meta approval, 24–72h per template)
- ~€0.04–0.08 per OTP message in DE
- GDPR data-processor agreement with the BSP

**SMS via Twilio Verify** is faster to set up (no template approval) but
delivery is carrier-dependent and costs ~€0.05–0.10 per message in DE.

**Email magic links** are sent via plain SMTP through your existing email
provider — no per-message fee, no third-party relay, universal delivery.

→ Email-first; phone channels later, only if a measurable number of users
ask for them.

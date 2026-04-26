# Design System — Gap Inventory

A line-by-line list of differences between the static design mockup at
`frontend/public/Brettspieltreff_Design_System_standalone_.html` and the live app.

**This document is a reference, not a worklist.** Items are tagged with a status
so we can decide each one individually. None are committed to.

Status legend:

- 🟦 **Open** — gap exists, not yet decided
- ✅ **Adopt** — accepted, will implement
- ⛔ **Reject** — examined and chosen to keep current behaviour
- 🟨 **Defer** — known gap, parking for now

Captured: 2026-04-26 against the v1 mockup.

---

## Section 02 — Main screen (HomePage, desktop)

### 02-A · Game-row action buttons render as cryptic "?" badges
**Status:** 🟦 Open
**Severity:** High (looks broken)
**Mockup:** sage `Bringe`/`Bringen` toggle button + soft `Mitspielen` button + small ghost `eye-off` icon button — clear text labels.
**Current:** in the desktop table, action cells render as small circular badges with `?` icons. No labels, unclear affordance.
**Notes:** likely a regression after the Phase 3.5 chrome polish. Verify whether the icon-only fallback is intentional for narrow columns or just broken markup.

### 02-B · Bringer / Mitspieler cells show plain text instead of `PersonChip`
**Status:** 🟦 Open
**Severity:** High
**Mockup:** each name is a chip — small avatar + initial pill, "+N more" overflow chip when many.
**Current:** plain comma-separated strings ("Matthias C, Daniel Gaca").
**Notes:** the `PersonChip` component already exists and is used in the right sidebar. The table cells just need to render with it. Watch column-width/wrap.

### 02-C · Inline action toggles + `+ Hinzufügen` next to the search input
**Status:** 🟦 Open
**Severity:** Medium-High
**Mockup:** the search row contains: `[search input]` `[Mitbringen ✓]` `[Mitspielen]` `[Prototyp]` `[+ Hinzufügen]` — all visible at all times, even before a game is selected.
**Current:** only the input is visible until a game is selected; toggles + "Hinzufügen" appear inside a sub-panel after selection.
**Notes:** discuss UX trade-offs. Always-visible buttons reads cleaner but they're not actionable until a game is chosen, which can be confusing.

### 02-D · Game title uses sans-serif instead of `font-display italic`
**Status:** 🟦 Open
**Severity:** Medium (brand voice)
**Mockup:** game name in `font-display italic` ~19 px, with a status dot (sage/butter) directly before the name.
**Current:** sans-serif title, with a "Verfügbar" pill below the name instead of a leading status dot.
**Notes:** ties together with 02-E.

### 02-E · "Verfügbar" status pill replaced by a leading status dot
**Status:** 🟦 Open
**Severity:** Medium
**Mockup:** small coloured dot (sage = verfügbar, butter = wunsch) immediately before the game title.
**Current:** dedicated "Verfügbar" / "Wunsch" pill chip below the title, taking a row of vertical space.
**Notes:** mockup pattern is denser. Decide whether to drop the pill entirely or keep both.

### 02-F · Missing `Hinzugefügt` (added-date) column
**Status:** 🟦 Open
**Severity:** Low
**Mockup:** left-most column shows the day game was added (`12.04`, `14.04`).
**Current:** the date isn't shown in the row; only the table header is sortable by add date.
**Notes:** small. May not be worth a column on smaller viewports.

### 02-G · Sort segmented control sits inside the filter row
**Status:** 🟦 Open
**Severity:** Low
**Mockup:** a `Hinzugefügt | Name` segmented control sits at the right end of the filter pill row, with a "Sortieren" label.
**Current:** sort UI lives elsewhere (column header click + a sort dropdown).
**Notes:** the existing column-header click is more conventional for a table; the mockup's segmented control reads well in the visual.

### 02-H · BringerSummary missing "Alle anzeigen →" footer link
**Status:** 🟦 Open
**Severity:** Cosmetic
**Mockup:** at the bottom of the BringerSummary card a `Alle anzeigen →` text link in plum.
**Current:** card stops after the four bringer rows.
**Notes:** would need a destination (could open a modal or navigate to a "Bringer" tab).

### 02-I · Game thumbnails: real BGG image vs serif italic monogram
**Status:** ⛔ Reject (current is better)
**Mockup:** stylised tinted square with a 2-letter italic-serif monogram (`DB`, `W`, `BB`).
**Current:** real BGG cover image at the same slot.
**Notes:** real images are richer information and we're keeping them. Monogram is a fallback when no image is available.

---

## Section 03 — Mobile

### 03-A · Mobile bottom tab order/labels
**Status:** 🟦 Open
**Severity:** Medium
**Mockup:** `Liste · Statistik · Spenden · Profil` (4 tabs).
**Current:** `Spieleliste · Druckansicht · Statistiken · Profil` (4 tabs, includes Druckansicht, no Spenden).
**Notes:** the mockup drops Druckansicht (less relevant on mobile) and adds a Spenden tab. Decide whether donate-on-mobile-bottom-nav is right.

### 03-B · Mobile event ribbon density
**Status:** 🟨 Defer
**Mockup:** very dense — date + time + venue inline + 2 mini stat chips on the right.
**Current:** EventBar stacks meta vertically on mobile, stat chips below as 2×2 grid.
**Notes:** ours is more readable. Defer unless a stakeholder pushes for the dense version.

### 03-C · Mobile filter pills horizontal scroll vs wrap
**Status:** 🟦 Open
**Severity:** Low
**Mockup:** filter pills in a horizontally-scrolling row.
**Current:** filter pills wrap to multiple lines.
**Notes:** scrolling preserves the look but hides pills off-screen; wrap shows everything. Trade-off.

### 03-D · Mobile game card action buttons
**Status:** 🟦 Open (depends on 02-A)
**Mockup:** sage `Ich bringe` / soft `Mitspielen` toggles, full width, clear.
**Current:** unclear without testing — likely the same `?` badge issue as 02-A.

---

## Section 04 — Search & add flow

### 04-A · Dropdown section labels
**Status:** 🟦 Open
**Severity:** Low
**Mockup:** uppercase eyebrows with the count inline — e.g. `IN DIESER LISTE · 1`, `BOARDGAMEGEEK · 4 TREFFER`. The BGG section also has a `Mehr anzeigen` link right-aligned.
**Current:** section labels exist (Phase 3.5 dropped emoji from "Schon eingetragen" / "Von BoardGameGeek") but don't follow the count-inline pattern, and there's no `Mehr anzeigen`.

### 04-B · Page-level search-flow header (in design doc)
**Status:** ⛔ Reject (doc-only)
**Notes:** the descriptive subtitle "Eine Eingabe — sucht in der Liste, im BoardGameGeek-Katalog, und legt neue Spiele an." appears in the *mockup* as section context, not necessarily on the actual page. Skipping unless we want it as on-screen helper copy.

---

## Section 05 — Landing

### 05-A · Landing header background
**Status:** 🟦 Open
**Severity:** High (brand framing)
**Mockup:** landing top-bar sits on `bg-plum-deep` (warm dark) with butter chip + cream wordmark + ghost "Anmelden" + butter "Spenden" buttons.
**Current:** landing top-bar sits on `bg-paper` (parchment) with butter chip + plum-deep wordmark + outline buttons.
**Notes:** dark header anchors the page; matches the in-app header chrome. Big visual difference, easy to fix.

### 05-B · Hero, sticker, kaffeekasse
**Status:** ✅ Adopted (already in place)
**Notes:** matches mockup well; no action needed.

---

## Section 06 — Organizer dashboard (`/events`)

### 06-A · Dashboard layout: card grid vs table
**Status:** ✅ Adopted (2026-04-26)
**Severity:** High
**Decision:** rewrote `EventsPage.tsx` as a card grid with status (Aktiv/Planung), italic event name, calendar/pin meta, dotted divider, two stat blocks, `Öffnen ›` button. Active card has sage top accent and uses `wg-btn-primary`; planung uses `wg-btn-secondary`.
**Mockup:** event grid of 3 cards per row. Each card shows: status eyebrow (Aktiv = sage / Planung = grey), italic event name, calendar/pin meta, dotted divider, two big serif-italic stat numbers (Spiele / Teilnehmer), `Öffnen ›` button (filled plum on active, secondary on others).
**Current:** an HTML table with columns Name, Slug, Teilnehmer, Spiele, Zeitraum, Aktionen.
**Notes:** card grid reads warmer and matches the design system; table reads SaaS. Decide which is the right pattern for the use case.

### 06-B · Organizer chrome (header) is light, not plum-deep
**Status:** ✅ Adopted (2026-04-26)
**Decision:** rewrote AccountLayout chrome to `bg-paper-hi` with `border-b border-rule`. Logo lockup uses `<img src="/favicon.svg" />` + `Brettspieltreff` wordmark in `text-plum-deep` + `wg-tag-ocean` "Organisator" tag. Nav links restyled for light bg (`bg-plum-50 text-plum-deep` active state). The `Einstellungen` button from the mockup is **not** added — current "Profil" nav link covers the same ground.

### 06-C · Page title "3 aktive Spielabende"
**Status:** ✅ Adopted (2026-04-26)
**Decision:** title now reads `N aktive Spielabende` (or `Spielabende` if none active) with `DEINE TREFFS` eyebrow above and a sub-line "Verwalte Treffs, Kennwörter und Teilnehmer." Singular form `1 aktiver Spielabend` handled.
**Severity:** Low (until 06-A is decided)
**Mockup:** `DEINE TREFFS` eyebrow + `3 aktive Spielabende` italic display title + sub line "Verwalte Treffs, Kennwörter und Teilnehmer."
**Current:** plain `Meine Events` heading (Tier 2 made it `font-display italic`).
**Notes:** counts are dynamic; need to decide whether title shows count.

### 06-D · Archive ("Letzte Treffs") card
**Status:** ✅ Adopted (2026-04-26)
**Decision:** events whose `endsAt` is in the past are bucketed into an "Archiv" card below the active grid. Each row shows name + meta (Beendet · X Spiele · Y Teilnehmer · Month Year) + `Statistik` (links to `/{slug}/statistics`) + `Duplizieren` (links to event-edit; full duplication flow not yet wired — placeholder).
**Follow-up:** wire actual "Duplizieren" backend action.
**Severity:** Medium
**Mockup:** below the active events grid, a card listing past events (`März-Treff 2026`, `Februar-Treff 2026`, `Januar-Treff 2026`) with `Statistik` and `Duplizieren` buttons.
**Notes:** no archive surface exists today. "Past event" is determined by `endsAt < now`. New backend-fed view.

### 06-E · Organizer-specific donate card
**Status:** ✅ Adopted (2026-04-26, static version)
**Decision:** added a butter-accented `Kaffeekasse fürs Hosting` card next to Archiv (right rail on desktop, stacked on mobile) with a full-width `Selbst spenden` butter button linking to BMC.
**Note:** stats line ("Letzten Monat: X Spenden, Y €") in the mockup is omitted — no donation-stats backend; can wire later if real numbers become available.
**Severity:** Low
**Mockup:** right rail next to Archive: butter card "Kaffeekasse fürs Hosting" with stats ("Letzten Monat: 14 Spenden, 67 €") and a `Selbst spenden` button.
**Notes:** stats line would need data; could ship a static version first.

### 06-F · `Neuer Treff` CTA placement
**Status:** ⛔ Reject (current is fine)
**Notes:** mockup puts it in the title row right side; ours is in the same place. ✅ Already aligned.

### 06-G · Stored event status + welcome page (beyond mockup)
**Status:** ✅ Adopted (2026-04-26)
**Severity:** High (functional)
**Decision:** added `status` column on Event (`planning` / `active` / `archived` — DB names in English; UI labels via `EVENT_STATUS_LABEL`). Default is `planning` for new events. Organizer toggles status from the EventSettingsPage segmented control. Added `description` and `welcomeMessage` columns for the welcome-page content. When `status === 'planning'`, `/{slug}` renders a public `EventWelcomePage` (no password, no participant flow) with the event meta, description, and welcome message. When `status === 'active'`, the normal password-gated game list shows. Archived events still go through the password gate currently — could be made read-only later.
**Backfill:** existing events with `endsAt` in the past are migrated to `archived`; `isDefault` events default to `active`. Other existing events default to `planning`.
**Follow-up ideas:** archived state in the welcome page, interest gathering / pre-registration on the welcome page (per user note about future user-registration model).

---

## Header chrome / nav (cross-cutting)

### NAV-A · Desktop nav labels and order
**Status:** 🟦 Open
**Severity:** Low
**Mockup:** `Spiele` · `Statistik` · `Druckansicht` · `Einstellungen` (4 items, with icons).
**Current:** `Spieleliste` · `Druckansicht` · `Statistiken` (3 items, no icons).
**Notes:** "Einstellungen" is missing entirely as a participant-side tab. Decide whether participants should see settings.

### NAV-B · Desktop nav icons
**Status:** 🟦 Open
**Severity:** Low
**Mockup:** each tab pairs an icon (`list`, `chart`, `print`, `settings`) with the label.
**Current:** text-only.
**Notes:** small inline SVGs would do; avoid bringing in an icon library.

---

## Search bar copy

### COPY-A · Section eyebrow includes section count inline
**Status:** 🟦 Open (see 04-A)

---

## How to use this doc

1. Read top-to-bottom to understand what's outstanding.
2. When picking up a task, change its status badge from 🟦 to ✅/⛔/🟨 and append a `**Decision:**` line summarising why.
3. Implement in a focused commit; reference the gap ID in the commit message (e.g. `style(02-D): game title in font-display italic`).
4. After implementation, leave the entry but move it to a "Done" section at the bottom (or just keep the ✅ inline — your call).

## Out of scope of this doc

- Anything in `PrintList.tsx` (print-only).
- Token-level changes to `tailwind.config.js` or `index.css`. The system is locked at v1.
- New page additions not implied by the mockup.

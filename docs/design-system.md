# Brettspieltreff — Design System

> **The design system is enforced at the Tailwind token level.** Pre-system colours
> (`bg-blue-*`, `bg-gray-*`, `bg-red-*`) no longer exist in `tailwind.config.js`.
> A class like `bg-blue-600` is now a build error.
>
> The internal code-name for the system is **Würfelglück**. You'll see `wg-*`
> prefixes on layer classes (`wg-btn-primary`, `wg-card`, `wg-tag-sage`). The
> *product* is called Brettspieltreff; the *system* is called Würfelglück.

## Voice & feel

Brettspieltreff is **warm, faithful, happy**, built for **families, casual
game nights, and serious hobbyists alike**. Never nerdy, never sterile.
The visual system is **contemporary**: a cool light-grey field, white
cards, and a single brand colour (plum) doing the visual lifting. The
warmth lives in the typography — the whole interface, headlines and
body, is set in **Lora**, a contemporary serif. One family, varied
only by weight and size.

## The palette (memorise these)

| Token            | Hex       | When to use                                                |
| ---------------- | --------- | ---------------------------------------------------------- |
| `paper`          | `#f4f5f7` | App background (light cool grey)                           |
| `paper-hi`       | `#ffffff` | Cards, inputs, raised surfaces                             |
| `paper-lo`       | `#eaecf0` | Sunken areas (table headers, event ribbon, bottom bar)     |
| `rule`           | `#e4e7eb` | Default border                                             |
| `rule-soft`      | `#eef0f3` | Inner row dividers inside a card                           |
| `ink`            | `#1a1d23` | Primary text + headings                                    |
| `ink-soft`       | `#525864` | Secondary text                                             |
| `ink-mute`       | `#8a92a0` | Tertiary, placeholder, captions                            |
| **`plum`**       | `#6b3a5c` | Primary brand: buttons, active nav, links                  |
| `plum-deep`      | `#4a2540` | App header chrome, headlines                               |
| **`sage`**       | `#5f9b6f` | **Verfügbar** status · success · "ich bringe" active state |
| `sage-deep`      | `#3f7d52` | Sage text on light backgrounds                             |
| **`butter`**     | `#f0b942` | **Wunsch** status · **Donate** CTA · all friendly nudges   |
| `butter-deep`    | `#7a5e0f` | Butter text                                                |
| **`blush`**      | `#e07574` | Destructive, **Hide/ausblenden**, errors                   |
| `blush-deep`     | `#a93b3a` | Blush text                                                 |
| **`ocean`**      | `#4a7eb0` | **Prototyp** marker · organizer-mode chrome                |
| `ocean-deep`     | `#2c5680` | Ocean text                                                 |

### Semantic mapping (do not confuse)

- **sage = verfügbar** (game has at least one bringer)
- **butter = wunsch** (no bringer yet) AND **butter = donate** — these share the colour
  intentionally; warmth + invitation
- **ocean = prototyp** AND organizer-mode chrome
- **blush = destructive** (delete, hide, error states)
- **plum = primary brand**; never use it for status

## Typography

Single-family system. **`font-display`** and **`font-sans`** both alias
to **Lora**; the alias names are kept so existing components don't
need a sweep. Hierarchy comes from size + weight, not from a second
family.

- **`font-display`** — Lora, used for headlines (page titles, card
  titles, game titles). Weight `600` (semibold) by default; `700`
  for hero / landing.
- **`font-sans`** — Lora, used for body copy. Weight `400` for
  paragraphs, `600`/`700` for emphasis. Buttons & nav are `font-bold`.
- **`font-mono`** — JetBrains Mono. Reserve for dates in tabular
  contexts, hex tokens, technical badges. Don't use for body copy.

### Scale anchors

| Use                       | Class                                            |
| ------------------------- | ------------------------------------------------ |
| Hero / landing headline   | `font-display text-display-lg`                   |
| Page title                | `font-display text-display`                      |
| Section heading           | `font-display text-2xl`                          |
| Card title                | `font-display text-xl`                           |
| Game title (in row/card)  | `font-display text-lg font-semibold`             |
| Body                      | `font-sans text-sm` (14–15px)                    |
| Section eyebrow           | `wg-label` (11px, uppercase, plum or ink-mute)   |

### Italics rules

Italic is **not** a default. Reserve it for genuine emphasis (`<em>`
in body copy, occasional accent words like *"Endlich klar."* on the
landing). Headlines are upright.

## Components — use the layer classes

Don't hand-roll button or card styling. Use these (defined in `frontend/src/index.css`):

### Buttons

```tsx
<button className="wg-btn-primary">Hinzufügen</button>
<button className="wg-btn-secondary">Abbrechen</button>
<button className="wg-btn-ghost">Mehr</button>
<button className="wg-btn-soft">Filter</button>
<button className="wg-btn-sage">Bestätigen</button>
<button className="wg-btn-donate">Spenden</button>
<button className="wg-btn-danger">Löschen</button>

{/* Toggle pair (Mitbringen / Mitspielen) */}
<button className={isBringing ? 'wg-btn-toggle-active' : 'wg-btn-toggle'}>
  Mitbringen{isBringing ? ' ✓' : ''}
</button>

{/* Prototyp toggle (only on manual entries) */}
<button className={isPrototype ? 'wg-btn-proto-active' : 'wg-btn-proto'}>
  Prototyp{isPrototype ? ' ✓' : ''}
</button>

{/* Sizes */}
<button className="wg-btn-primary wg-btn-lg">…</button>
<button className="wg-btn-soft wg-btn-sm">…</button>
```

Every button has a **44px minimum tap target** baked into `.wg-btn`. Don't override
heights smaller than `wg-btn-sm` (32px) — that's already the floor.

### Cards

```tsx
<div className="wg-card">…</div>
<div className="wg-card-raised">…</div>
<div className="wg-card-raised wg-card-accent-butter">{/* donate prompt */}</div>
<div className="wg-card-raised wg-card-accent-sage">{/* "active event" emphasis */}</div>
```

### Tags / status

```tsx
<span className="wg-tag-sage wg-tag-dot">Verfügbar</span>
<span className="wg-tag-butter wg-tag-dot">Wunsch</span>
<span className="wg-tag-ocean wg-tag-dot">Prototyp</span>
<span className="wg-tag-blush wg-tag-dot">Ausgeblendet</span>
```

### Inputs

```tsx
<input type="text" className="wg-input w-full" placeholder="Spiel suchen…" />
<input className={`wg-input ${error ? 'wg-input-error' : ''}`} />
```

### Section eyebrow + decorative divider

```tsx
<div className="wg-label text-plum">Aktueller Treff</div>
<h2 className="font-display text-display text-plum-deep mt-1">Spieleabend April</h2>

<div className="wg-divider-dotted my-4"></div>
```

## Surfaces & elevation

- **Page background** — `bg-paper`
- **Cards / inputs / dropdowns** — `bg-paper-hi` (raised, slightly brighter)
- **Sunken / table headers / footers / event ribbon** — `bg-paper-lo`
- **App header (participant chrome)** — `bg-plum-deep`, `text-paper-hi` (warm cream, not pure white)
- **App header (organizer chrome)** — `bg-paper-hi` with a `wg-tag-ocean` "Organisator"
  badge — slimmer, more administrative
- Borders — `border-rule` for outer, `border-rule-soft` for inner row dividers
- Shadows — `shadow-raised` for cards; `shadow-floating` for modals/dropdowns; flat by default

## Hard rules (do not break)

1. **Never use `bg-blue-*`, `bg-gray-*`, `bg-red-*`, `bg-yellow-*`, `bg-green-*`** —
   those Tailwind defaults are removed. Use the Würfelglück palette.
2. **Never use raw `text-white` / `bg-white/*` / `border-white` on the plum header chrome.**
   Use `text-paper-hi` (warm cream) and `paper-hi/N` opacities. Pure white reads cold against plum.
3. **Status colors are semantic, not aesthetic.** Don't use sage just because you want
   green. If it's not "verfügbar/success", pick a different token.
4. **Donate prompts always use butter** (warm, inviting). Never plum, never sage.
5. **Header height: 68px desktop / 52–58px mobile.** Don't shrink further.
6. **Tap targets ≥ 44px** on touch surfaces. The `.wg-btn` family enforces this.
7. **Avoid emoji in core UI.** Use the design-system tokens, dotted dividers, and
   subtle line decoration instead. (Single rotated "kostenlos · für alle" badge in
   butter on the landing hero is the one allowed exception.)
8. **Lora upright is the brand voice** for everything user-facing.
   No italic by default; reserve italic for genuine emphasis or
   1–2 decorative accents per page max.
9. **No drop shadows on tags or inline elements.** Reserve elevation for cards/modals.
10. **Modals use `shadow-floating` and a darker scrim** (`bg-ink/40`).
11. **Bring/play state is sage when active, paper when off.** Never invert.
12. **The brand mark is `frontend/public/favicon.svg`** (meeple-stack on butter chip).
    Never render a `<div>` containing a literal `W` character as a logo. See
    [`docs/brand/MARK.md`](./brand/MARK.md).

## "Before you ship a screen" checklist

Run through this for every UI change:

- [ ] No hex codes in JSX (grep `#[0-9a-f]\{3,8\}` — should only appear in
      `tailwind.config.js` and `index.css`)
- [ ] No legacy Tailwind colors (grep `bg-blue|bg-gray|bg-red|bg-yellow|bg-green|text-blue|text-gray|text-red`)
- [ ] No raw `text-white` / `bg-white/*` on header or plum surfaces (use `text-paper-hi`)
- [ ] At least one `font-display` heading on the page — otherwise the brand voice is missing
- [ ] All buttons use `wg-btn-*` classes
- [ ] All cards use `wg-card` or `wg-card-raised`
- [ ] All status indicators use the correct semantic colour (sage/butter/ocean/blush)
- [ ] Touch targets ≥ 44px
- [ ] German copy for participant-facing strings; participant errors are friendly
      ("Bitte einen Spielnamen eingeben.")
- [ ] Donate prompt visible somewhere appropriate (sidebar on desktop, banner/section on
      mobile, footer on landing)

## When to add a new token

If you're tempted to add a new color or font, **stop and ask the maintainer**. The
system is small on purpose. Real reasons to extend:

- A new domain entity needs a status color (rare — discuss first)
- Accessibility — improving contrast on an existing token (do in `tailwind.config.js`)

Not real reasons:

- "I want a different shade of blue here"
- "The card looked plain so I added a gradient"

If the design feels flat, the answer is usually **better composition** (rhythm,
hierarchy, italic accents, dotted dividers, more generous spacing) — not more colour.

## Email

Email lives in a different rendering reality than the web app — clients
strip `<style>`, ignore most CSS, and dark-mode clients apply their own
colour mapping. The email design system answers with a deliberately
narrow rule: **don't paint the surface, don't pick non-monochrome text
colours, let the client decide.**

### No surface backgrounds, black text

We do **not** set any `background-color` on the email surface (field,
card, header, body, footer). Light-mode clients render their default
near-white surface; dark-mode clients render their own dark surface and
cleanly invert the black text. We don't carry the parchment palette or
any other brand colour into email surfaces — the brand expression comes
from typography, the mark, and composition, not from coloured fills.

All text is `#000000`. Dark-mode clients invert it to a readable light
colour using their own heuristics — better than any colour we could
choose, because the inversion is consistent with the surface they paint.
No coloured "muted" or "accent" text either; differentiation uses font
size and weight only.

### Brand expression

| Element | Treatment |
|---|---|
| Mark | `cid:wg-logo` — self-contained butter-chip + plum-meeple SVG/PNG. The only coloured element on the page. |
| Wordmark | Lora upright, weight 600, 22 px, black. |
| Title | Lora upright, weight 600, 30 px, black. |
| Body copy | Lora, 15 px, black. `<strong>` is black + weight 700. |
| Hairlines | 1 px solid black (above and below the body). Dark-mode clients invert to a light hairline. |
| CTA | `plum` `#6b3a5c` background, white bold text — mirrors `wg-btn-primary`. The single coloured surface in the email; visual continuity with the web app. Plum is already dark enough that dark-mode clients leave it alone. |
| Links | Black, with default underline. |

The result is a typewriter-clean, restrained email that looks intentional
in every client and either OS theme — closer in feel to a printed
invitation than a marketing template.

### Typography

Same single-family system as the web app: Lora upright everywhere —
wordmark (`.email-wordmark`), title (`.email-title`), and body copy.
Georgia / Times fallback for clients that strip web fonts. No italic
by default.

### Components — use the email classes

Templates author against semantic classes only. **No inline `style=""`
in `.hbs`.** Tokens come from `api/templates/emails/_shared/email.css`.

```html
<h1 class="email-title">Schön, dich zu sehen</h1>
<p class="email-prose">Klicke auf den Link …</p>
<p class="email-cta-row"><a href="…" class="email-cta">Jetzt anmelden →</a></p>
<p class="email-mute">Der Link ist 15 Minuten gültig.</p>
<p><a href="…" class="email-link">…</a></p>
```

The shared layout (`api/templates/emails/_shared/layout.html.hbs`)
provides `.email-field`, `.email-card`, `.email-header`,
`.email-accent-rule`, `.email-body`, `.email-footer`,
`.email-attribution` — bodies fill the `{{{body}}}` slot and never
touch the chrome.

### Render pipeline

`api/src/services/email.service.ts` runs every mail through this chain:

1. Handlebars renders `body.html.hbs` + `footer.html.hbs` into the
   shared layout.
2. **`juice.inlineContent(html, sharedCss)`** inlines every `class="…"`
   match into a `style="…"` attribute. Clients that strip `<style>`
   (Outlook desktop, some mobile webmail) still receive the styles.
3. The brand mark is attached as `cid:wg-logo` from
   `api/templates/emails/_shared/logo.png` so it renders without
   depending on a public URL — works in dev too.
4. Nodemailer sends multipart `text/html` + `text/plain`.

### Hard rules

1. **No raw hex literals in `.hbs` templates.** Define everything in
   `email.css`, reference by class.
2. **No inline `style=""` in `.hbs` templates.** Juice handles inlining.
3. **No `background-color` on email surfaces.** Field, card, header,
   body, footer — all transparent. Don't paint what the client should.
   The CTA button is the single, deliberate exception: plum bg, white
   text, mirroring `wg-btn-primary`.
4. **Body text is `#000000`. CTA text is `#ffffff`.** No other colour
   tokens for text. Differentiate body copy with font size, weight,
   italics, spacing — not colour.
5. **The brand mark is `cid:wg-logo`** — the only coloured element.
   Don't render a literal "W" or any other glyph as a logo tile.
6. **German copy** for transactional mail, with the same friendly tone
   as the participant-facing UI.

### When the email design needs a new token

Don't introduce one in `email.css` alone. First check if a web token
fits; if not, propose the addition in both `tailwind.config.js` and
`email.css` and document its email role here.

## Reference materials

- **Token source** — `frontend/tailwind.config.js`
- **Component layer** — `frontend/src/index.css` (`@layer components`)
- **Email styles** — `api/templates/emails/_shared/email.css`
- **Brand mark** — [`docs/brand/MARK.md`](./brand/MARK.md)
- **Product context** — [`PRODUCT_VISION.md`](../PRODUCT_VISION.md)

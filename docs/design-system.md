# Brettspieltreff — Design System

> **The design system is enforced at the Tailwind token level.** Pre-system colours
> (`bg-blue-*`, `bg-gray-*`, `bg-red-*`) no longer exist in `tailwind.config.js`.
> A class like `bg-blue-600` is now a build error.
>
> The internal code-name for the system is **Würfelglück**. You'll see `wg-*`
> prefixes on layer classes (`wg-btn-primary`, `wg-card`, `wg-tag-sage`). The
> *product* is called Brettspieltreff; the *system* is called Würfelglück.

## Voice & feel

Brettspieltreff is **warm, faithful, happy**. It's the digital version of a long
wooden table strewn with game boxes, soft lamplight, mugs of tea — built for
**families, casual game nights, and serious hobbyists alike**. Never nerdy, never
cold, never sterile. Display type uses **Playfair Display** italic for a hand-set,
storybook flavour; body uses **Nunito** for friendly, rounded, readable copy.

## The palette (memorise these)

| Token            | Hex       | When to use                                                |
| ---------------- | --------- | ---------------------------------------------------------- |
| `paper`          | `#f7f1e6` | App background                                             |
| `paper-hi`       | `#fdf9ee` | Cards, inputs, raised surfaces                             |
| `paper-lo`       | `#ede4d0` | Sunken areas (table headers, event ribbon, bottom bar)     |
| `rule`           | `#e3d5b8` | Default border                                             |
| `rule-soft`      | `#ecdfc6` | Inner row dividers inside a card                           |
| `ink`            | `#2d2233` | Primary text + headings                                    |
| `ink-soft`       | `#5b4866` | Secondary text                                             |
| `ink-mute`       | `#8c7d92` | Tertiary, placeholder, captions                            |
| **`plum`**       | `#6b3a5c` | Primary brand: buttons, active nav, links                  |
| `plum-deep`      | `#4a2540` | App header chrome, headlines                               |
| **`sage`**       | `#7a9476` | **Verfügbar** status · success · "ich bringe" active state |
| `sage-deep`      | `#5b7458` | Sage text on light backgrounds                             |
| **`butter`**     | `#e8c75c` | **Wunsch** status · **Donate** CTA · all friendly nudges   |
| `butter-deep`    | `#7a5e0f` | Butter text                                                |
| **`blush`**      | `#d97a6c` | Destructive, **Hide/ausblenden**, errors                   |
| `blush-deep`     | `#9c4537` | Blush text                                                 |
| **`ocean`**      | `#3f6f8f` | **Prototyp** marker · organizer-mode chrome                |
| `ocean-deep`     | `#284b62` | Ocean text                                                 |

### Semantic mapping (do not confuse)

- **sage = verfügbar** (game has at least one bringer)
- **butter = wunsch** (no bringer yet) AND **butter = donate** — these share the colour
  intentionally; warmth + invitation
- **ocean = prototyp** AND organizer-mode chrome
- **blush = destructive** (delete, hide, error states)
- **plum = primary brand**; never use it for status

## Typography

- **`font-display`** — Playfair Display. Use for: page titles, card titles ≥ 20px,
  decorative italic accents. Often italic. Letter-spacing slightly tight.
- **`font-sans`** — Nunito. Use for: all body, buttons, labels, inputs.
  - Body weight `400` for paragraphs, `600`/`700` for emphasis.
  - Buttons & nav are always `font-bold` (`700`).
- **`font-mono`** — JetBrains Mono. Reserve for: dates in tabular contexts, hex tokens,
  technical badges. Don't use for body copy.

### Scale anchors

| Use                       | Class                                            |
| ------------------------- | ------------------------------------------------ |
| Hero / landing headline   | `font-display text-display-lg italic`            |
| Page title                | `font-display text-display italic`               |
| Section heading           | `font-display text-2xl`                          |
| Card title                | `font-display text-xl`                           |
| Game title (in row/card)  | `font-display text-lg font-semibold`             |
| Body                      | `font-sans text-sm` (14–15px)                    |
| Section eyebrow           | `wg-label` (11px, uppercase, plum or ink-mute)   |

### Italics rules

- Display headings often italic for warmth.
- Never italicise body copy or buttons.
- Eyebrow labels never italic (use `wg-label`).

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
<h2 className="font-display text-display italic text-plum-deep mt-1">Spieleabend April</h2>

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
8. **Display serif italic is the brand voice.** Use it for the app name, event titles,
   page headlines, and 1–2 decorative accents per page. Don't overuse.
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

## Reference materials

- **Token source** — `frontend/tailwind.config.js`
- **Component layer** — `frontend/src/index.css` (`@layer components`)
- **Brand mark** — [`docs/brand/MARK.md`](./brand/MARK.md)
- **Product context** — [`PRODUCT_VISION.md`](../PRODUCT_VISION.md)

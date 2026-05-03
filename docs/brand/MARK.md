# Brettspieltreff — Brand mark

**Single source of truth for the logo.** All other documents reference this one.
If you think the mark needs to change, **stop**, open an issue, and discuss before
touching anything in this doc.

## The mark

A stacked-meeple silhouette in plum (`#4a2540`) with a butter shadow leg
(`#a07695`) and a butter-deep accent (`#e8c75c`), placed on a butter rounded
square (`#e8c75c`, `rx=96`, viewBox `0 0 512 512`).

**File:** [`frontend/public/favicon.svg`](../../frontend/public/favicon.svg)

The butter chip background is **part of the SVG**. Do not wrap the mark in
another butter-coloured `<div>`.

## Where it appears

| Context | Element | Size |
|---|---|---|
| Browser tab | `<link rel="icon" href="/favicon.svg" />` (wired in `frontend/index.html`) | browser default |
| PWA install | `icon-192.png` / `icon-512.png` (wired in `frontend/public/site.webmanifest`) | device-defined |
| iOS home screen | `apple-touch-icon.png` | device-defined |
| App header (mobile) | `<img src="/favicon.svg" />` | `h-8 w-8` (32 px) |
| App header (desktop) | `<img src="/favicon.svg" />` | `sm:h-10 sm:w-10` (40 px) |
| Landing top-bar | `<img src="/favicon.svg" />` | `w-9 h-9` (36 px) |

That is the entire surface. No other place in the app renders the mark.

## Lockup with wordmark

The mark always pairs with the wordmark "Brettspieltreff" set in
`font-display` (Lora), upright, weight 600.

```
[mark]   Brettspieltreff
         LIEBERHAUSEN 2026     ← header only; event subline
```

- Gap between mark and wordmark: `gap-2` mobile, `sm:gap-3` desktop.
- Wordmark colour:
  - On plum chrome (header): `text-paper-hi`
  - On cream surface (landing top-bar): `text-plum-deep`
- Subline (header only): `text-paper-hi/70 text-[10px] sm:text-xs tracking-wider uppercase font-sans`

## Forbidden

- ❌ A `<div>` or `<span>` containing a literal `"W"` character used as a logo tile.
- ❌ Recolouring the SVG (e.g. via `style="filter: …"`).
- ❌ Wrapping the mark in another rounded butter container — the chip is in the SVG.
- ❌ Using `logo.svg` (transparent silhouette variant) anywhere on-screen. It exists
  only as a no-chip variant for future use; not currently rendered.
- ❌ Replacing the wordmark with the mark alone, or vice versa. The lockup in Header
  and Landing is **mark + wordmark**.

## Allowed

- ✅ `<img src="/favicon.svg" alt="" aria-hidden="true" className="..." />` with size utilities.
- ✅ Wrapping the lockup in a `<Link>` for navigation.
- ✅ Using `aria-hidden="true"` on the `<img>` since the wordmark provides the accessible name.

## Other public assets

| File | Purpose |
|---|---|
| `frontend/public/favicon.svg` | The mark. Source of truth for everything visual. |
| `frontend/public/icon-192.png` | PWA icon (192 px). |
| `frontend/public/icon-512.png` | PWA icon (512 px). |
| `frontend/public/apple-touch-icon.png` | iOS home-screen icon. |
| `frontend/public/logo.svg` | No-chip silhouette variant. **Currently unused.** Reserved for future contexts (e.g. monochrome print, single-colour icon set). |
| `frontend/public/meeple.svg` | Original silhouette source. Not rendered anywhere. |

If you need a new mark variant (e.g. for an email template, social card, or print
asset), generate it from the same artwork; don't draw a new one. Open an issue first
so the variant gets its own row in this table.

## How to verify

After any change that touches the header or landing:

```bash
git grep -nE '>\s*W\s*<' frontend/src/components/Header.tsx frontend/src/pages/LandingPage.tsx
# Expected: empty
```

The literal character `W` must not appear as a child of any element in these two files.
(It legitimately appears in copy elsewhere — "Wechseln", "Wunsch", "Wer bringt was?" —
that's fine.)

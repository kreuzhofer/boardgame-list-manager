/** @type {import('tailwindcss').Config} */
// ─────────────────────────────────────────────────────────────────────
// Würfelglück — Brettspieltreff design system tokens
// See docs/design-system.md and CLAUDE.md (Design System section).
// ─────────────────────────────────────────────────────────────────────
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    // ── Colors: REPLACE Tailwind defaults entirely ────────────────
    // Only the Würfelglück palette + transparent/current/black/white.
    // Do NOT use blue-*, gray-*, red-* etc. — those are pre-system.
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      black: '#000',
      white: '#fff',

      // Surfaces (cool grey family — modern, fresh, neutral)
      paper: {
        DEFAULT: '#f4f5f7',  // primary background (cool light grey)
        hi:      '#ffffff',  // raised cards / inputs (pure white pops on grey)
        lo:      '#eaecf0',  // sunken / table headers
      },
      rule: {
        DEFAULT: '#e4e7eb',  // borders
        soft:    '#eef0f3',  // table row dividers
      },

      // Ink (text) — slight cool tint, near-black
      ink: {
        DEFAULT: '#1a1d23',  // primary text + headings
        soft:    '#525864',  // secondary text
        mute:    '#8a92a0',  // tertiary / placeholder
      },

      // Brand — plum (kept; it's the recognizable Brettspieltreff signature)
      plum: {
        DEFAULT: '#6b3a5c',  // primary brand
        deep:    '#4a2540',  // headlines, header chrome
        soft:    '#a07695',  // muted accents
        50:      '#f4ecf1',
        100:     '#e6d6df',
        500:     '#6b3a5c',
        700:     '#4a2540',
      },

      // Semantics — sage = verfügbar / success (fresher green, less olive)
      sage: {
        DEFAULT: '#5f9b6f',
        deep:    '#3f7d52',
        50:      '#eaf3ec',
        100:     '#cfe3d4',
      },
      // butter = donate / wunsch (cleaner amber, more "highlighter")
      butter: {
        DEFAULT: '#f0b942',
        hi:      '#f5c764',
        deep:    '#7a5e0f',
        50:      '#fdf3d8',
      },
      // blush = destructive / hide (rosier, less brick)
      blush: {
        DEFAULT: '#e07574',
        deep:    '#a93b3a',
        50:      '#fce6e6',
      },
      // ocean = prototyp / organizer chrome (lighter, more contemporary)
      ocean: {
        DEFAULT: '#4a7eb0',
        deep:    '#2c5680',
        50:      '#e3edf6',
      },
    },

    // ── Typography ────────────────────────────────────────────────
    // Single-family system: Lora for both display and body. Modern
    // serif with low stroke contrast — keeps the parchment warmth
    // without the editorial-italic feel of Playfair. The `display`
    // and `sans` aliases both point at Lora so existing
    // `font-display` / `font-sans` usages don't need a sweep.
    fontFamily: {
      display: ['Lora', 'Georgia', '"Times New Roman"', 'serif'],
      sans: ['Lora', 'Georgia', '"Times New Roman"', 'serif'],
      mono: ['"JetBrains Mono"', 'ui-monospace', '"SF Mono"', 'Menlo', 'monospace'],
    },

    extend: {
      borderRadius: {
        sm:   '6px',
        DEFAULT: '10px',
        md:   '10px',
        lg:   '12px',
        xl:   '16px',
        '2xl':'20px',
      },
      boxShadow: {
        flat:    'none',
        raised:  '0 4px 16px rgba(74,37,64,.06), 0 1px 0 rgba(74,37,64,.04)',
        floating:'0 12px 32px rgba(74,37,64,.14), 0 2px 6px rgba(74,37,64,.08)',
        'press-plum':  '0 2px 0 rgba(74,37,64,.22)',
        'press-sage':  '0 2px 0 rgba(91,116,88,.25)',
        'press-butter':'0 2px 0 rgba(122,94,15,.25)',
      },
      backgroundImage: {
        'parchment-dots': 'radial-gradient(rgba(107,58,92,.04) 1.5px, transparent 1.5px)',
      },
      backgroundSize: {
        'parchment': '14px 14px',
      },
      fontSize: {
        'display-xl': ['72px', { lineHeight: '1.05', letterSpacing: '-0.02em', fontWeight: '500' }],
        'display-lg': ['56px', { lineHeight: '1.05', letterSpacing: '-0.02em', fontWeight: '500' }],
        'display':    ['42px', { lineHeight: '1.08', letterSpacing: '-0.01em', fontWeight: '500' }],
        'display-sm': ['28px', { lineHeight: '1.15', fontWeight: '500' }],
      },
      keyframes: {
        'slide-in-right': {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to:   { transform: 'translateX(0)',    opacity: '1' },
        },
        'fade-out-up': {
          from: { transform: 'translateY(0)',     opacity: '1' },
          to:   { transform: 'translateY(-20px)', opacity: '0' },
        },
        'fade-in-up': {
          from: { transform: 'translateX(-50%) translateY(8px)', opacity: '0' },
          to:   { transform: 'translateX(-50%) translateY(0)',   opacity: '1' },
        },
      },
      animation: {
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'fade-out-up':    'fade-out-up 0.3s ease-in forwards',
        'fade-in-up':     'fade-in-up 0.2s ease-out',
      },
    },
  },
  plugins: [],
}

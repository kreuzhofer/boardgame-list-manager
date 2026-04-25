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

      // Surfaces (warm parchment family)
      paper: {
        DEFAULT: '#f7f1e6',  // primary background
        hi:      '#fdf9ee',  // raised cards / inputs
        lo:      '#ede4d0',  // sunken / table headers
      },
      rule: {
        DEFAULT: '#e3d5b8',  // borders
        soft:    '#ecdfc6',  // table row dividers
      },

      // Ink (text)
      ink: {
        DEFAULT: '#2d2233',  // primary text + headings
        soft:    '#5b4866',  // secondary text
        mute:    '#8c7d92',  // tertiary / placeholder
      },

      // Brand — plum
      plum: {
        DEFAULT: '#6b3a5c',  // primary brand
        deep:    '#4a2540',  // headlines, header chrome
        soft:    '#a07695',  // muted accents
        50:      '#f4ecf1',
        100:     '#e6d6df',
        500:     '#6b3a5c',
        700:     '#4a2540',
      },

      // Semantics — sage = verfügbar / success
      sage: {
        DEFAULT: '#7a9476',
        deep:    '#5b7458',
        50:      '#eef3ed',
        100:     '#d6e1d3',
      },
      // butter = donate / wunsch (warm yellow)
      butter: {
        DEFAULT: '#e8c75c',
        hi:      '#f3d97a',
        deep:    '#7a5e0f',
        50:      '#fbf4d8',
      },
      // blush = destructive / hide
      blush: {
        DEFAULT: '#d97a6c',
        deep:    '#9c4537',
        50:      '#fbe8e3',
      },
      // ocean = prototyp / organizer chrome
      ocean: {
        DEFAULT: '#3f6f8f',
        deep:    '#284b62',
        50:      '#e3eef4',
      },
    },

    // ── Typography ────────────────────────────────────────────────
    fontFamily: {
      display: ['"Playfair Display"', '"Cormorant Garamond"', 'Georgia', 'serif'],
      sans: ['Nunito', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'system-ui', 'sans-serif'],
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

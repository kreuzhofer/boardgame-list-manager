import { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface AuthLayoutProps {
  /** Eyebrow above the marketing headline on desktop, e.g. "FÜR ORGANISATOREN" */
  marketingEyebrow: string;
  /** Multi-line italic display headline. Use \n for line breaks. */
  marketingTitle: string;
  /** Body paragraph under the headline */
  marketingBody: string;
  /** Tiny note pinned to the bottom of the dark panel (desktop only) */
  marketingFootnote?: string;
  /** The form / right-column content */
  children: ReactNode;
}

/**
 * Two-column shell shared by /login and /register:
 *  - Desktop (lg+): left plum-deep marketing panel + right paper-hi form
 *  - Mobile: thin plum-deep top strip with logo + wordmark, no marketing copy,
 *    form fills the rest. Keeps the brand surface but doesn't overbloat.
 */
export function AuthLayout({
  marketingEyebrow,
  marketingTitle,
  marketingBody,
  marketingFootnote,
  children,
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-paper grid lg:grid-cols-[1.1fr_1fr]">
      {/* ── Left panel ──────────────────────────────────────────────── */}
      <aside className="bg-plum-deep text-paper-hi flex flex-col justify-between p-5 lg:p-14 lg:min-h-screen">
        {/* Wordmark — same lockup as the app header */}
        <Link
          to="/"
          className="flex items-center gap-2 sm:gap-3 hover:opacity-90 transition-opacity flex-shrink-0"
          aria-label="Brettspieltreff – Startseite"
        >
          <img
            src="/favicon.svg"
            alt=""
            aria-hidden="true"
            className="h-9 w-9 lg:h-11 lg:w-11 flex-shrink-0"
          />
          <span className="font-display text-xl lg:text-2xl text-paper-hi">
            Brettspieltreff
          </span>
        </Link>

        {/* Marketing block — desktop only. Mobile keeps just the wordmark above. */}
        <div className="hidden lg:block max-w-md">
          <div className="wg-label text-paper-hi/70">{marketingEyebrow}</div>
          <h2 className="font-display text-paper-hi mt-4 text-5xl xl:text-6xl leading-[1.05] whitespace-pre-line">
            {marketingTitle}
          </h2>
          <p className="mt-5 text-base text-paper-hi/80 leading-relaxed">
            {marketingBody}
          </p>
        </div>

        <p className="hidden lg:block text-xs text-paper-hi/55 max-w-md">
          {marketingFootnote ?? ''}
        </p>
      </aside>

      {/* ── Right panel: form ───────────────────────────────────────── */}
      <main className="flex items-center justify-center p-5 sm:p-10 lg:p-14">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}

export default AuthLayout;

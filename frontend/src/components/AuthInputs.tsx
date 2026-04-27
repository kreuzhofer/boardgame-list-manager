import { useState, InputHTMLAttributes } from 'react';

function MailIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-ink-mute flex-shrink-0"
      aria-hidden="true"
    >
      <rect x="2" y="3" width="12" height="10" rx="1.5" />
      <path d="M2.5 4.5l5.5 4 5.5-4" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-ink-mute flex-shrink-0"
      aria-hidden="true"
    >
      <rect x="3" y="7" width="10" height="7" rx="1.5" />
      <path d="M5 7V5a3 3 0 016 0v2" />
    </svg>
  );
}

interface AuthFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  label: string;
  id: string;
}

/**
 * Email input with leading mail icon. Styled to match the design mockup:
 * eyebrow label, then a paper-hi pill with icon-prefix.
 */
export function AuthEmailField({ label, id, ...inputProps }: AuthFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="wg-label text-ink-mute">
        {label}
      </label>
      <div className="mt-2 flex items-center gap-2 px-4 h-12 bg-paper-hi border border-rule rounded-xl focus-within:ring-2 focus-within:ring-plum focus-within:border-plum transition">
        <MailIcon />
        <input
          {...inputProps}
          id={id}
          type="email"
          className="flex-1 bg-transparent outline-none text-ink placeholder-ink-mute"
        />
      </div>
    </div>
  );
}

interface AuthPasswordFieldProps extends AuthFieldProps {
  /**
   * If true, render the small "Anzeigen / Verbergen" toggle on the right.
   * Defaults to true.
   */
  withToggle?: boolean;
}

/**
 * Password input with leading lock icon and an "Anzeigen" toggle that
 * flips the input type. Same chrome as AuthEmailField for visual cohesion.
 */
export function AuthPasswordField({
  label,
  id,
  withToggle = true,
  ...inputProps
}: AuthPasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="wg-label text-ink-mute">
        {label}
      </label>
      <div className="mt-2 flex items-center gap-2 px-4 h-12 bg-paper-hi border border-rule rounded-xl focus-within:ring-2 focus-within:ring-plum focus-within:border-plum transition">
        <LockIcon />
        <input
          {...inputProps}
          id={id}
          type={visible ? 'text' : 'password'}
          className="flex-1 bg-transparent outline-none text-ink placeholder-ink-mute"
        />
        {withToggle && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="text-xs font-bold text-plum hover:text-plum-deep transition-colors"
            aria-label={visible ? 'Passwort verbergen' : 'Passwort anzeigen'}
          >
            {visible ? 'Verbergen' : 'Anzeigen'}
          </button>
        )}
      </div>
    </div>
  );
}

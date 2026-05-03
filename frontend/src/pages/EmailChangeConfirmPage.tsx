import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { accountsApi, ApiError } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

type State =
  | { kind: 'loading' }
  | { kind: 'success'; email: string }
  | { kind: 'error'; message: string };

export function EmailChangeConfirmPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { refreshAccount } = useAuth();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const token = params.get('token');
    if (!token) {
      setState({ kind: 'error', message: 'Kein Bestätigungs-Token gefunden.' });
      return;
    }

    (async () => {
      try {
        const result = await accountsApi.confirmEmailChange(token);
        // Refresh the account in context so the profile page shows the new
        // address immediately. The session is unchanged — same accountId.
        await refreshAccount();
        setState({ kind: 'success', email: result.account.email });
        setTimeout(() => {
          navigate('/profile', { replace: true });
        }, 1500);
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : 'Bestätigungs-Link konnte nicht eingelöst werden. Bitte die Änderung erneut anfordern.';
        setState({ kind: 'error', message });
      }
    })();
  }, [params, navigate, refreshAccount]);

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <div className="wg-label text-plum">E-Mail-Änderung</div>
        <h1 className="font-display text-3xl sm:text-4xl text-plum-deep mt-2">
          {state.kind === 'loading' && 'Einen Moment …'}
          {state.kind === 'success' && 'E-Mail geändert'}
          {state.kind === 'error' && 'Hat nicht geklappt'}
        </h1>

        {state.kind === 'loading' && (
          <p className="mt-6 text-ink-soft">
            Wir bestätigen deine neue E-Mail-Adresse.
          </p>
        )}
        {state.kind === 'success' && (
          <p className="mt-6 text-ink-soft">
            Deine Adresse ist jetzt <strong className="text-plum-deep">{state.email}</strong>.
            Du wirst gleich zu deinem Profil weitergeleitet …
          </p>
        )}
        {state.kind === 'error' && (
          <>
            <p className="mt-6 text-blush-deep">{state.message}</p>
            <Link to="/profile" className="wg-btn-primary wg-btn-lg mt-8 inline-flex">
              Zurück zum Profil
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default EmailChangeConfirmPage;

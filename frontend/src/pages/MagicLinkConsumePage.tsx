import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi, setToken, ApiError } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

type State =
  | { kind: 'loading' }
  | { kind: 'success' }
  | { kind: 'error'; message: string };

export function MagicLinkConsumePage() {
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
      setState({ kind: 'error', message: 'Kein Anmelde-Token gefunden.' });
      return;
    }

    (async () => {
      try {
        const result = await authApi.consumeMagicLink(token);
        setToken(result.token);
        await refreshAccount();
        setState({ kind: 'success' });
        // Small delay so the user sees the confirmation, then redirect.
        setTimeout(() => {
          navigate(result.targetPath || '/events', { replace: true });
        }, 700);
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : 'Anmelde-Link konnte nicht eingelöst werden. Bitte einen neuen anfordern.';
        setState({ kind: 'error', message });
      }
    })();
  }, [params, navigate, refreshAccount]);

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <div className="wg-label text-plum">Anmelden</div>
        <h1 className="font-display text-3xl sm:text-4xl text-plum-deep mt-2">
          {state.kind === 'loading' && 'Einen Moment …'}
          {state.kind === 'success' && 'Willkommen zurück'}
          {state.kind === 'error' && 'Hat nicht geklappt'}
        </h1>

        {state.kind === 'loading' && (
          <p className="mt-6 text-ink-soft">
            Wir prüfen deinen Anmelde-Link.
          </p>
        )}
        {state.kind === 'success' && (
          <p className="mt-6 text-ink-soft">
            Du wirst gleich zu deinen Treffs weitergeleitet …
          </p>
        )}
        {state.kind === 'error' && (
          <>
            <p className="mt-6 text-blush-deep">{state.message}</p>
            <Link to="/login" className="wg-btn-primary wg-btn-lg mt-8 inline-flex">
              Neuen Link anfordern
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default MagicLinkConsumePage;

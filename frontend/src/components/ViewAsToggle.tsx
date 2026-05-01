import { useLayoutEffect } from 'react';
import { useEvent } from '../contexts/EventContext';
import { useAuth } from '../contexts/AuthContext';
import { EVENT_STATUSES, EVENT_STATUS_LABEL, type EventStatus } from '../types/event';

const BAR_HEIGHT_PX = 44;

export function ViewAsToggle() {
  const { account } = useAuth();
  const { ownerAccountId, status, previewStatus, setPreviewStatus } = useEvent();

  const isOwner = !!account && !!ownerAccountId && account.id === ownerAccountId;
  const isAdmin = account?.role === 'admin';
  const visible = !!status && (isOwner || isAdmin);

  // Coordinate with fixed Header / Layout padding via a CSS variable.
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (visible) {
      root.style.setProperty('--admin-bar-h', `${BAR_HEIGHT_PX}px`);
      return () => {
        root.style.removeProperty('--admin-bar-h');
      };
    }
    return undefined;
  }, [visible]);

  if (!visible || !status) return null;

  const effective: EventStatus = previewStatus ?? status;
  const isPreviewing = previewStatus !== null && previewStatus !== status;

  const handleSelect = (next: EventStatus) => {
    if (next === status) {
      setPreviewStatus(null);
    } else {
      setPreviewStatus(next);
    }
  };

  return (
    <div
      role="region"
      aria-label="Vorschau-Modus für Event-Admin"
      className="fixed top-0 left-0 right-0 z-[60] bg-ocean-deep text-paper-hi border-b border-ocean-deep/60 shadow-raised"
      style={{ height: `${BAR_HEIGHT_PX}px` }}
    >
      <div className="container mx-auto h-full px-4 flex items-center gap-x-4 overflow-x-auto">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide font-bold">
          <span aria-hidden="true">👁</span>
          <span>Vorschau</span>
        </div>

        <div role="group" aria-label="Status-Vorschau" className="flex items-center gap-1">
          {EVENT_STATUSES.map((s) => {
            const active = effective === s;
            const isActual = status === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => handleSelect(s)}
                aria-pressed={active}
                title={isActual ? `${EVENT_STATUS_LABEL[s]} (aktueller Status)` : `Vorschau: ${EVENT_STATUS_LABEL[s]}`}
                className={
                  'inline-flex items-center h-8 min-h-[32px] px-3 rounded-full text-xs font-bold tracking-wide transition-colors ' +
                  (active
                    ? 'bg-paper-hi text-ocean-deep'
                    : 'bg-paper-hi/10 text-paper-hi hover:bg-paper-hi/20')
                }
              >
                {EVENT_STATUS_LABEL[s]}
                {isActual ? <span aria-hidden="true" className="ml-1.5 opacity-70">●</span> : null}
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-3 text-xs text-paper-hi/85">
          {isPreviewing ? (
            <>
              <span>
                Tatsächlich: <strong className="font-bold">{EVENT_STATUS_LABEL[status]}</strong>
              </span>
              <button
                type="button"
                onClick={() => setPreviewStatus(null)}
                className="underline underline-offset-2 hover:text-paper-hi"
              >
                Vorschau beenden
              </button>
            </>
          ) : (
            <span aria-hidden="true">● = aktueller Status</span>
          )}
        </div>
      </div>
    </div>
  );
}

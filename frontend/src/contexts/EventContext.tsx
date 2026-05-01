import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { eventsApi, setActiveEventSlug } from '../api/client';
import type { EventPublicInfo, EventStatus } from '../types/event';

interface EventContextValue {
  slug: string | undefined;
  eventId: string | undefined;
  eventName: string | undefined;
  status: EventStatus | undefined;
  ownerAccountId: string | undefined;
  description: string | null;
  welcomeMessage: string | null;
  startsAt: string | null;
  endsAt: string | null;
  location: string | null;
  loading: boolean;
  error: string | null;
  /** Status the UI should render with — equals previewStatus if set, otherwise actual status. */
  effectiveStatus: EventStatus | undefined;
  /** Owner-only "view as" preview override. Null when not previewing. */
  previewStatus: EventStatus | null;
  setPreviewStatus: (status: EventStatus | null) => void;
}

const EventContext = createContext<EventContextValue>({
  slug: undefined,
  eventId: undefined,
  eventName: undefined,
  status: undefined,
  ownerAccountId: undefined,
  description: null,
  welcomeMessage: null,
  startsAt: null,
  endsAt: null,
  location: null,
  loading: false,
  error: null,
  effectiveStatus: undefined,
  previewStatus: null,
  setPreviewStatus: () => {},
});

export function useEvent() {
  return useContext(EventContext);
}

interface EventProviderProps {
  slug: string;
  children: ReactNode;
}

export function EventProvider({ slug, children }: EventProviderProps) {
  const [event, setEvent] = useState<EventPublicInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewStatus, setPreviewStatusState] = useState<EventStatus | null>(null);

  // Set active slug synchronously during render so child effects
  // (e.g. useParticipant validation) use the correct event token.
  setActiveEventSlug(slug);

  useEffect(() => {
    let cancelled = false;

    const resolve = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await eventsApi.getBySlug(slug);
        if (!cancelled) {
          setEvent(response.event);
        }
      } catch {
        if (!cancelled) {
          setError('Event nicht gefunden.');
          setEvent(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    resolve();
    return () => {
      cancelled = true;
      setActiveEventSlug(undefined);
    };
  }, [slug]);

  // Reset preview when slug changes — preview is per-event.
  useEffect(() => {
    setPreviewStatusState(null);
  }, [slug]);

  const setPreviewStatus = useCallback((status: EventStatus | null) => {
    setPreviewStatusState(status);
  }, []);

  const actualStatus = event?.status;
  const effectiveStatus = previewStatus ?? actualStatus;

  return (
    <EventContext.Provider
      value={{
        slug,
        eventId: event?.id,
        eventName: event?.name,
        status: actualStatus,
        ownerAccountId: event?.ownerAccountId,
        description: event?.description ?? null,
        welcomeMessage: event?.welcomeMessage ?? null,
        startsAt: event?.startsAt ?? null,
        endsAt: event?.endsAt ?? null,
        location: event?.location ?? null,
        loading,
        error,
        effectiveStatus,
        previewStatus,
        setPreviewStatus,
      }}
    >
      {children}
    </EventContext.Provider>
  );
}

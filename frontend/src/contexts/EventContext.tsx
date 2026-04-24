import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { eventsApi, setActiveEventSlug } from '../api/client';
import type { EventPublicInfo } from '../types/event';

interface EventContextValue {
  slug: string | undefined;
  eventId: string | undefined;
  eventName: string | undefined;
  loading: boolean;
  error: string | null;
}

const EventContext = createContext<EventContextValue>({
  slug: undefined,
  eventId: undefined,
  eventName: undefined,
  loading: false,
  error: null,
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

  return (
    <EventContext.Provider
      value={{
        slug,
        eventId: event?.id,
        eventName: event?.name,
        loading,
        error,
      }}
    >
      {children}
    </EventContext.Provider>
  );
}

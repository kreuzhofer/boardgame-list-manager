import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { eventsApi, ApiError } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import type { Event, CreateEventRequest, UpdateEventRequest } from '../types/event';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function EventSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { account } = useAuth();
  const isEditMode = !!id;

  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [password, setPassword] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState('');
  const [notes, setNotes] = useState('');
  const [fees, setFees] = useState('');

  const loadEvent = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const response = await eventsApi.getById(id);
      const event: Event = response.event;
      setName(event.name);
      setSlug(event.slug);
      setSlugManuallyEdited(true); // Don't auto-generate in edit mode
      setStartsAt(event.startsAt ? event.startsAt.slice(0, 16) : '');
      setEndsAt(event.endsAt ? event.endsAt.slice(0, 16) : '');
      setLocation(event.location || '');
      setCapacity(event.capacity?.toString() || '');
      setNotes(event.notes || '');
      setFees(event.fees || '');
      setPassword(event.password || '');
      setError(null);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Event konnte nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (isEditMode) {
      loadEvent();
    }
  }, [isEditMode, loadEvent]);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugManuallyEdited) {
      setSlug(slugify(value));
    }
  };

  const handleSlugChange = (value: string) => {
    setSlugManuallyEdited(true);
    setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      if (isEditMode) {
        if (!password) {
          setError('Passwort ist erforderlich.');
          setSaving(false);
          return;
        }
        const data: UpdateEventRequest = {
          name,
          slug,
          password,
          startsAt: startsAt ? new Date(startsAt).toISOString() : null,
          endsAt: endsAt ? new Date(endsAt).toISOString() : null,
          location: location || null,
          capacity: capacity ? parseInt(capacity, 10) : null,
          notes: notes || null,
          fees: fees || null,
        };
        await eventsApi.update(id!, data);
        setSuccess('Event erfolgreich aktualisiert.');
      } else {
        if (!password) {
          setError('Passwort ist erforderlich.');
          setSaving(false);
          return;
        }
        const data: CreateEventRequest = {
          name,
          slug: slug || undefined,
          password,
          startsAt: startsAt ? new Date(startsAt).toISOString() : undefined,
          endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
          location: location || undefined,
          capacity: capacity ? parseInt(capacity, 10) : undefined,
          notes: notes || undefined,
          fees: fees || undefined,
        };
        const response = await eventsApi.create(data);
        navigate(`/events/${response.event.id}`, { replace: true });
      }
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Ein Fehler ist aufgetreten.');
    } finally {
      setSaving(false);
    }
  };

  if (!account) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <p className="text-sm text-gray-600">Bitte melde dich an.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <p className="text-sm text-gray-500">Lade Event...</p>
      </div>
    );
  }

  const shareableLink = slug ? `${window.location.origin}/${slug}` : '';

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/events')}
          className="text-gray-500 hover:text-gray-700"
        >
          &larr; Zurück
        </button>
        <h2 className="text-2xl font-bold text-gray-800">
          {isEditMode ? 'Event bearbeiten' : 'Neues Event erstellen'}
        </h2>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded p-3">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded p-3">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
        {/* Name */}
        <div>
          <label htmlFor="event-name" className="block text-sm font-medium text-gray-700 mb-1">
            Name *
          </label>
          <input
            id="event-name"
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="z.B. Brettspielabend März"
          />
        </div>

        {/* Slug */}
        <div>
          <label htmlFor="event-slug" className="block text-sm font-medium text-gray-700 mb-1">
            Slug (URL-Pfad)
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">/</span>
            <input
              id="event-slug"
              type="text"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="brettspielabend-maerz"
            />
          </div>
          {shareableLink && (
            <p className="mt-1 text-xs text-gray-500">
              Teilnehmer-Link:{' '}
              <a href={shareableLink} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                {shareableLink}
              </a>
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="event-password" className="block text-sm font-medium text-gray-700 mb-1">
            Passwort {isEditMode ? '' : '*'}
          </label>
          <input
            id="event-password"
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Passwort für Teilnehmer"
          />
        </div>

        {/* Date range */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="event-starts" className="block text-sm font-medium text-gray-700 mb-1">
              Startdatum
            </label>
            <input
              id="event-starts"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="event-ends" className="block text-sm font-medium text-gray-700 mb-1">
              Enddatum
            </label>
            <input
              id="event-ends"
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Location */}
        <div>
          <label htmlFor="event-location" className="block text-sm font-medium text-gray-700 mb-1">
            Ort
          </label>
          <input
            id="event-location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="z.B. Vereinsheim, Musterstr. 1"
          />
        </div>

        {/* Capacity */}
        <div>
          <label htmlFor="event-capacity" className="block text-sm font-medium text-gray-700 mb-1">
            Kapazität
          </label>
          <input
            id="event-capacity"
            type="number"
            min="1"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Max. Teilnehmerzahl"
          />
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="event-notes" className="block text-sm font-medium text-gray-700 mb-1">
            Notizen
          </label>
          <textarea
            id="event-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Zusätzliche Informationen..."
          />
        </div>

        {/* Fees */}
        <div>
          <label htmlFor="event-fees" className="block text-sm font-medium text-gray-700 mb-1">
            Gebühren
          </label>
          <textarea
            id="event-fees"
            value={fees}
            onChange={(e) => setFees(e.target.value)}
            rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="z.B. 5€ pro Person"
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving || !name}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Speichern...' : isEditMode ? 'Speichern' : 'Erstellen'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default EventSettingsPage;

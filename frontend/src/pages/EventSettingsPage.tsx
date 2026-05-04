import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { eventsApi, ApiError } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ToastProvider';
import { DeleteEventModal } from '../components/DeleteEventModal';
import type { Event, CreateEventRequest, UpdateEventRequest, EventStatus, EventDeletionPreview } from '../types/event';
import { EVENT_STATUS_LABEL } from '../types/event';

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
  const { showToast } = useToast();
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
  const [status, setStatus] = useState<EventStatus>('planning');
  const [description, setDescription] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState('');
  const [notes, setNotes] = useState('');
  const [fees, setFees] = useState('');

  // Read-only flags used by the danger zone — the form doesn't touch
  // these but the bottom section needs them to decide visibility.
  const [isDefault, setIsDefault] = useState(false);
  const [deletedAt, setDeletedAt] = useState<string | null>(null);

  // Danger zone state
  const [deletePreview, setDeletePreview] = useState<EventDeletionPreview | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadEvent = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const response = await eventsApi.getById(id);
      const event: Event = response.event;
      setName(event.name);
      setSlug(event.slug);
      setSlugManuallyEdited(true); // Don't auto-generate in edit mode
      setStatus(event.status);
      setDescription(event.description || '');
      setWelcomeMessage(event.welcomeMessage || '');
      setStartsAt(event.startsAt ? event.startsAt.slice(0, 16) : '');
      setEndsAt(event.endsAt ? event.endsAt.slice(0, 16) : '');
      setLocation(event.location || '');
      setCapacity(event.capacity?.toString() || '');
      setNotes(event.notes || '');
      setFees(event.fees || '');
      setPassword(event.password || '');
      setIsDefault(event.isDefault);
      setDeletedAt(event.deletedAt);
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

  // ─── Danger zone (delete) ──────────────────────────────────────────
  const canShowDangerZone = isEditMode && !isDefault && !deletedAt;

  const requestDelete = async () => {
    if (!id) return;
    try {
      const { preview } = await eventsApi.getDeletionPreview(id);
      setDeletePreview(preview);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Vorschau fehlgeschlagen.';
      showToast(`Fehler: ${message}`);
    }
  };

  const cancelDelete = () => {
    if (isDeleting) return;
    setDeletePreview(null);
  };

  const confirmDelete = async () => {
    if (!id) return;
    setIsDeleting(true);
    try {
      const result = await eventsApi.deleteEvent(id);
      showToast(result.message);
      setDeletePreview(null);
      navigate('/events');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Löschen fehlgeschlagen.';
      showToast(`Fehler: ${message}`);
    } finally {
      setIsDeleting(false);
    }
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
          status,
          description: description || null,
          welcomeMessage: welcomeMessage || null,
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
          status,
          description: description || undefined,
          welcomeMessage: welcomeMessage || undefined,
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
        <p className="text-sm text-ink-soft">Bitte melde dich an.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <p className="text-sm text-ink-mute">Lade Event...</p>
      </div>
    );
  }

  const shareableLink = slug ? `${window.location.origin}/${slug}` : '';

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/events')}
          className="text-ink-mute hover:text-ink-soft"
        >
          &larr; Zurück
        </button>
        <h2 className="font-display text-3xl text-plum-deep">
          {isEditMode ? 'Event bearbeiten' : 'Neues Event erstellen'}
        </h2>
      </div>

      {error && (
        <div className="bg-blush-50 border border-blush-50 text-blush-deep text-sm rounded p-3">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-sage-50 border border-sage-100 text-sage-deep text-sm rounded p-3">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
        {/* Name */}
        <div>
          <label htmlFor="event-name" className="block text-sm font-medium text-ink-soft mb-1">
            Name *
          </label>
          <input
            id="event-name"
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
            className="w-full border border-rule rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-plum focus:border-plum"
            placeholder="z.B. Brettspielabend März"
          />
        </div>

        {/* Slug */}
        <div>
          <label htmlFor="event-slug" className="block text-sm font-medium text-ink-soft mb-1">
            Slug (URL-Pfad)
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-ink-mute">/</span>
            <input
              id="event-slug"
              type="text"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              className="flex-1 border border-rule rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-plum focus:border-plum"
              placeholder="brettspielabend-maerz"
            />
          </div>
          {shareableLink && (
            <p className="mt-1 text-xs text-ink-mute">
              Teilnehmer-Link:{' '}
              <a href={shareableLink} target="_blank" rel="noreferrer" className="text-plum hover:underline">
                {shareableLink}
              </a>
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="event-password" className="block text-sm font-medium text-ink-soft mb-1">
            Passwort {isEditMode ? '' : '*'}
          </label>
          <input
            id="event-password"
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full border border-rule rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-plum focus:border-plum"
            placeholder="Passwort für Teilnehmer"
          />
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-ink-soft mb-1">
            Status
          </label>
          <div className="inline-flex rounded-lg border border-rule overflow-hidden bg-paper-lo">
            {(['planning', 'active', 'archived'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  status === s
                    ? 'bg-plum text-paper-hi'
                    : 'text-ink-soft hover:bg-rule'
                }`}
              >
                {EVENT_STATUS_LABEL[s]}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-ink-mute">
            <strong>Planung:</strong> Teilnehmer sehen eine Vorschau-Seite mit Beschreibung und Begrüßung statt der Spieleliste.
            {' '}<strong>Aktiv:</strong> Spieleliste ist freigeschaltet.
            {' '}<strong>Archiviert:</strong> Treff ist beendet, nur lesbar.
          </p>
        </div>

        {/* Date range */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="event-starts" className="block text-sm font-medium text-ink-soft mb-1">
              Startdatum
            </label>
            <input
              id="event-starts"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="w-full border border-rule rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-plum focus:border-plum"
            />
          </div>
          <div>
            <label htmlFor="event-ends" className="block text-sm font-medium text-ink-soft mb-1">
              Enddatum
            </label>
            <input
              id="event-ends"
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="w-full border border-rule rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-plum focus:border-plum"
            />
          </div>
        </div>

        {/* Location */}
        <div>
          <label htmlFor="event-location" className="block text-sm font-medium text-ink-soft mb-1">
            Ort
          </label>
          <input
            id="event-location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full border border-rule rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-plum focus:border-plum"
            placeholder="z.B. Vereinsheim, Musterstr. 1"
          />
        </div>

        {/* Capacity */}
        <div>
          <label htmlFor="event-capacity" className="block text-sm font-medium text-ink-soft mb-1">
            Kapazität
          </label>
          <input
            id="event-capacity"
            type="number"
            min="1"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            className="w-full border border-rule rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-plum focus:border-plum"
            placeholder="Max. Teilnehmerzahl"
          />
        </div>

        {/* Description (public — shown on welcome page) */}
        <div>
          <label htmlFor="event-description" className="block text-sm font-medium text-ink-soft mb-1">
            Beschreibung
          </label>
          <textarea
            id="event-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full border border-rule rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-plum focus:border-plum"
            placeholder="Was erwartet die Teilnehmer? (Wird auf der Willkommens-Seite angezeigt)"
          />
        </div>

        {/* Welcome message (public — shown on welcome page) */}
        <div>
          <label htmlFor="event-welcome" className="block text-sm font-medium text-ink-soft mb-1">
            Begrüßung
          </label>
          <textarea
            id="event-welcome"
            value={welcomeMessage}
            onChange={(e) => setWelcomeMessage(e.target.value)}
            rows={3}
            className="w-full border border-rule rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-plum focus:border-plum"
            placeholder="Persönliche Nachricht an deine Teilnehmer (optional)"
          />
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="event-notes" className="block text-sm font-medium text-ink-soft mb-1">
            Notizen <span className="text-ink-mute font-normal">(intern, nur für dich)</span>
          </label>
          <textarea
            id="event-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full border border-rule rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-plum focus:border-plum"
            placeholder="Zusätzliche Informationen, die nur du siehst..."
          />
        </div>

        {/* Fees */}
        <div>
          <label htmlFor="event-fees" className="block text-sm font-medium text-ink-soft mb-1">
            Gebühren
          </label>
          <textarea
            id="event-fees"
            value={fees}
            onChange={(e) => setFees(e.target.value)}
            rows={2}
            className="w-full border border-rule rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-plum focus:border-plum"
            placeholder="z.B. 5€ pro Person"
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving || !name}
            className="wg-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Speichern...' : isEditMode ? 'Speichern' : 'Erstellen'}
          </button>
        </div>
      </form>

      {/* Danger zone — destructive, owner-only, separated visually */}
      {canShowDangerZone && (
        <div className="bg-paper-hi border border-rule border-t-[3px] border-t-blush rounded-xl p-6 shadow-raised mt-8">
          <div className="wg-label text-blush-deep">Gefahrenzone</div>
          <h3 className="font-display text-xl text-ink mt-2">Treff löschen</h3>
          <p className="text-sm text-ink-soft mt-2">
            Leere Treffs werden sofort entfernt. Treffs mit Spielen oder
            Teilnehmer:innen werden 30 Tage lang in „Gelöschte Treffs"
            aufbewahrt und können dort wiederhergestellt werden.
          </p>
          <div className="mt-4">
            <button
              type="button"
              onClick={requestDelete}
              className="wg-btn-danger"
            >
              Treff löschen
            </button>
          </div>
        </div>
      )}

      <DeleteEventModal
        isOpen={!!deletePreview}
        preview={deletePreview}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}

export default EventSettingsPage;

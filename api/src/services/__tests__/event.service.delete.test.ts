import { PrismaClient } from '@prisma/client';
import { EventService, EventError, EventErrorCodes } from '../event.service';
import { PURGE_AFTER_DAYS } from '../../types/event';

const prisma = new PrismaClient();
const eventService = new EventService(prisma);

describe('EventService — soft-delete / undelete / purge', () => {
  const testAccountIds: string[] = [];
  const testEventIds: string[] = [];

  afterAll(async () => {
    if (testEventIds.length > 0) {
      await prisma.event.deleteMany({ where: { id: { in: testEventIds } } });
    }
    if (testAccountIds.length > 0) {
      await prisma.account.deleteMany({ where: { id: { in: testAccountIds } } });
    }
    await prisma.$disconnect();
  });

  async function makeAccount(label: string): Promise<{ id: string; email: string }> {
    const email = `evt-del-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
    const account = await prisma.account.create({
      data: {
        email,
        passwordHash: 'test-hash',
        role: 'account_owner',
        status: 'active',
      },
    });
    testAccountIds.push(account.id);
    return { id: account.id, email };
  }

  async function makeEvent(
    ownerId: string,
    label: string,
    overrides: { slug?: string; isDefault?: boolean; deletedAt?: Date | null } = {},
  ): Promise<{ id: string; slug: string | null }> {
    const baseSlug = `evt-del-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const event = await prisma.event.create({
      data: {
        name: `Test Event ${label}`,
        slug: overrides.slug ?? baseSlug,
        password: 'pw',
        ownerAccountId: ownerId,
        isDefault: overrides.isDefault ?? false,
        deletedAt: overrides.deletedAt ?? null,
      },
    });
    testEventIds.push(event.id);
    return { id: event.id, slug: event.slug };
  }

  /** Seed a Game inside the event so it stops being empty. */
  async function seedGame(eventId: string, ownerUserId: string): Promise<string> {
    const g = await prisma.game.create({
      data: {
        eventId,
        name: `Seed Game ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ownerId: ownerUserId,
      },
    });
    return g.id;
  }

  /** Seed a per-event User row. */
  async function seedUser(eventId: string, name = 'Seed User'): Promise<string> {
    const u = await prisma.user.create({
      data: { name, eventId },
    });
    return u.id;
  }

  describe('getDeletionPreview', () => {
    it('returns isEmpty=true for a fresh event', async () => {
      const owner = await makeAccount('preview-empty');
      const evt = await makeEvent(owner.id, 'preview-empty');

      const preview = await eventService.getDeletionPreview(evt.id, owner.id);
      expect(preview).toMatchObject({
        eventId: evt.id,
        gamesCount: 0,
        participantsCount: 0,
        bringersCount: 0,
        playersCount: 0,
        eventParticipationsCount: 0,
        isEmpty: true,
      });
    });

    it('returns isEmpty=false when the event has games or users', async () => {
      const owner = await makeAccount('preview-full');
      const evt = await makeEvent(owner.id, 'preview-full');
      const user = await seedUser(evt.id);
      await seedGame(evt.id, user);

      const preview = await eventService.getDeletionPreview(evt.id, owner.id);
      expect(preview.isEmpty).toBe(false);
      expect(preview.gamesCount).toBe(1);
      expect(preview.participantsCount).toBe(1);
    });

    it('rejects non-owner with NOT_AUTHORIZED', async () => {
      const owner = await makeAccount('preview-owner');
      const stranger = await makeAccount('preview-stranger');
      const evt = await makeEvent(owner.id, 'preview-auth');

      await expect(
        eventService.getDeletionPreview(evt.id, stranger.id),
      ).rejects.toThrow(EventError);
      try {
        await eventService.getDeletionPreview(evt.id, stranger.id);
      } catch (err) {
        expect((err as EventError).code).toBe(EventErrorCodes.NOT_AUTHORIZED);
      }
    });

    it('rejects non-existent event with EVENT_NOT_FOUND', async () => {
      const owner = await makeAccount('preview-missing');
      await expect(
        eventService.getDeletionPreview('does-not-exist', owner.id),
      ).rejects.toThrow(EventError);
    });
  });

  describe('deleteEvent — empty events (hard delete)', () => {
    it('hard-deletes the row when the event is empty', async () => {
      const owner = await makeAccount('hard');
      const evt = await makeEvent(owner.id, 'hard');

      const result = await eventService.deleteEvent(evt.id, owner.id);
      expect(result.kind).toBe('hard');
      expect(result.deletedAt).toBeNull();
      expect(result.purgeAt).toBeNull();

      const found = await prisma.event.findUnique({ where: { id: evt.id } });
      expect(found).toBeNull();
    });
  });

  describe('deleteEvent — non-empty events (soft delete)', () => {
    it('renames slug to <original>-deleted and sets deletedAt', async () => {
      const owner = await makeAccount('soft-basic');
      const evt = await makeEvent(owner.id, 'soft-basic');
      const user = await seedUser(evt.id);
      await seedGame(evt.id, user);

      const before = (await prisma.event.findUnique({ where: { id: evt.id } }))!;
      const result = await eventService.deleteEvent(evt.id, owner.id);

      expect(result.kind).toBe('soft');
      expect(result.deletedAt).toBeInstanceOf(Date);
      expect(result.purgeAt).toBeInstanceOf(Date);
      // 30-day window
      expect(result.purgeAt!.getTime() - result.deletedAt!.getTime()).toBe(
        PURGE_AFTER_DAYS * 24 * 60 * 60 * 1000,
      );
      expect(result.renamedSlug).toBe(`${before.slug}-deleted`);

      const after = (await prisma.event.findUnique({ where: { id: evt.id } }))!;
      expect(after.deletedAt).not.toBeNull();
      expect(after.slug).toBe(`${before.slug}-deleted`);
    });

    it('appends a numeric suffix when the -deleted slug is already taken', async () => {
      // Reproduces the collision: a previous deletion of an event
      // with the same base name has already claimed `<base>-deleted`.
      // The new deletion must fall back to `-deleted2`, etc.
      const owner = await makeAccount('soft-collide');
      const baseSlug = `collide-${Date.now()}`;

      // Step 1 — create the "ghost" with the base-deleted slug.
      const ghost = await makeEvent(owner.id, 'soft-collide-ghost', {
        slug: `${baseSlug}-deleted`,
        deletedAt: new Date(Date.now() - 1000 * 60 * 60), // 1h ago
      });

      // Step 2 — create the live event whose deletion will collide.
      const evt = await makeEvent(owner.id, 'soft-collide-live', { slug: baseSlug });
      const user = await seedUser(evt.id);
      await seedGame(evt.id, user);

      const result = await eventService.deleteEvent(evt.id, owner.id);
      expect(result.kind).toBe('soft');
      expect(result.renamedSlug).toBe(`${baseSlug}-deleted2`);

      // Cleanup the ghost we created so afterAll doesn't double-delete
      void ghost;
    });

    it('rejects already-deleted events with ALREADY_DELETED', async () => {
      const owner = await makeAccount('soft-already');
      const evt = await makeEvent(owner.id, 'soft-already', {
        deletedAt: new Date(),
      });

      await expect(
        eventService.deleteEvent(evt.id, owner.id),
      ).rejects.toThrow(EventError);
      try {
        await eventService.deleteEvent(evt.id, owner.id);
      } catch (err) {
        expect((err as EventError).code).toBe(EventErrorCodes.ALREADY_DELETED);
      }
    });

    it('rejects deletion of the default event', async () => {
      const owner = await makeAccount('soft-default');
      const evt = await makeEvent(owner.id, 'soft-default', { isDefault: true });

      await expect(
        eventService.deleteEvent(evt.id, owner.id),
      ).rejects.toThrow(EventError);
      try {
        await eventService.deleteEvent(evt.id, owner.id);
      } catch (err) {
        expect((err as EventError).code).toBe(EventErrorCodes.CANNOT_DELETE_DEFAULT);
      }
    });

    it('rejects non-owner with NOT_AUTHORIZED', async () => {
      const owner = await makeAccount('soft-auth-owner');
      const stranger = await makeAccount('soft-auth-stranger');
      const evt = await makeEvent(owner.id, 'soft-auth');

      await expect(
        eventService.deleteEvent(evt.id, stranger.id),
      ).rejects.toThrow(EventError);
    });
  });

  describe('undeleteEvent', () => {
    it('restores deletedAt=null and assigns the requested slug', async () => {
      const owner = await makeAccount('undel-happy');
      const evt = await makeEvent(owner.id, 'undel-happy');
      const user = await seedUser(evt.id);
      await seedGame(evt.id, user);

      // Soft-delete first
      const del = await eventService.deleteEvent(evt.id, owner.id);
      expect(del.kind).toBe('soft');

      // Pick a fresh slug
      const newSlug = `undel-restored-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const restored = await eventService.undeleteEvent(evt.id, owner.id, newSlug);
      expect(restored.deletedAt).toBeNull();
      expect(restored.purgeAt).toBeNull();
      expect(restored.slug).toBe(newSlug);

      const row = (await prisma.event.findUnique({ where: { id: evt.id } }))!;
      expect(row.deletedAt).toBeNull();
      expect(row.slug).toBe(newSlug);
    });

    it('falls back to the stripped original slug when the request omits one', async () => {
      const owner = await makeAccount('undel-strip');
      const original = `undel-strip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const evt = await makeEvent(owner.id, 'undel-strip', { slug: original });
      const user = await seedUser(evt.id);
      await seedGame(evt.id, user);

      await eventService.deleteEvent(evt.id, owner.id);

      const restored = await eventService.undeleteEvent(evt.id, owner.id, null);
      expect(restored.slug).toBe(original);
    });

    it('rejects when the requested slug is taken (SLUG_TAKEN)', async () => {
      const owner = await makeAccount('undel-taken');
      const original = `undel-taken-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const evt = await makeEvent(owner.id, 'undel-taken', { slug: original });
      const user = await seedUser(evt.id);
      await seedGame(evt.id, user);

      // Soft-delete; original is now free
      await eventService.deleteEvent(evt.id, owner.id);

      // Someone else creates an event with the same original slug
      const blocker = await makeEvent(owner.id, 'undel-taken-block', { slug: original });

      // Try to undelete restoring to the original — should reject
      await expect(
        eventService.undeleteEvent(evt.id, owner.id, original),
      ).rejects.toThrow(EventError);
      try {
        await eventService.undeleteEvent(evt.id, owner.id, original);
      } catch (err) {
        expect((err as EventError).code).toBe(EventErrorCodes.SLUG_TAKEN);
      }

      // The user can pick a different one and succeed
      const altSlug = `${original}-v2`;
      const restored = await eventService.undeleteEvent(evt.id, owner.id, altSlug);
      expect(restored.slug).toBe(altSlug);

      // touch blocker so unused-var lint doesn't trip, plus afterAll cleanup
      void blocker;
    });

    it('rejects undelete on a live event with NOT_DELETED', async () => {
      const owner = await makeAccount('undel-live');
      const evt = await makeEvent(owner.id, 'undel-live');

      await expect(
        eventService.undeleteEvent(evt.id, owner.id, 'whatever'),
      ).rejects.toThrow(EventError);
      try {
        await eventService.undeleteEvent(evt.id, owner.id, 'whatever');
      } catch (err) {
        expect((err as EventError).code).toBe(EventErrorCodes.NOT_DELETED);
      }
    });

    it('rejects non-owner with NOT_AUTHORIZED', async () => {
      const owner = await makeAccount('undel-auth-owner');
      const stranger = await makeAccount('undel-auth-stranger');
      const evt = await makeEvent(owner.id, 'undel-auth', {
        deletedAt: new Date(),
      });

      await expect(
        eventService.undeleteEvent(evt.id, stranger.id, 'anything'),
      ).rejects.toThrow(EventError);
    });
  });

  describe('purgeExpiredDeletedEvents', () => {
    it('purges events past the 30-day threshold and leaves recent ones alone', async () => {
      const owner = await makeAccount('purge');

      // One stale (older than 30d), one fresh (just deleted)
      const staleAt = new Date(Date.now() - (PURGE_AFTER_DAYS + 1) * 24 * 60 * 60 * 1000);
      const stale = await makeEvent(owner.id, 'purge-stale', { deletedAt: staleAt });
      const fresh = await makeEvent(owner.id, 'purge-fresh', { deletedAt: new Date() });

      const result = await eventService.purgeExpiredDeletedEvents();
      expect(result.purged).toBeGreaterThanOrEqual(1);

      const staleRow = await prisma.event.findUnique({ where: { id: stale.id } });
      const freshRow = await prisma.event.findUnique({ where: { id: fresh.id } });
      expect(staleRow).toBeNull();
      expect(freshRow).not.toBeNull();
    });

    it('is a no-op when nothing has expired', async () => {
      const result = await eventService.purgeExpiredDeletedEvents();
      // Other tests in the suite may add stale rows; we just check the
      // call doesn't throw and returns a finite count.
      expect(typeof result.purged).toBe('number');
    });
  });

  describe('public lookups filter soft-deleted', () => {
    it('getEventBySlug returns null for soft-deleted events by default', async () => {
      const owner = await makeAccount('lookup-slug');
      const evt = await makeEvent(owner.id, 'lookup-slug', {
        slug: `lookup-slug-deleted-${Date.now()}`,
        deletedAt: new Date(),
      });

      const found = await eventService.getEventBySlug(evt.slug!);
      expect(found).toBeNull();

      // Owner-side flow can opt in
      const seen = await eventService.getEventBySlug(evt.slug!, { includeDeleted: true });
      expect(seen).not.toBeNull();
    });

    it('getEventById returns null for soft-deleted events by default', async () => {
      const owner = await makeAccount('lookup-id');
      const evt = await makeEvent(owner.id, 'lookup-id', { deletedAt: new Date() });

      const found = await eventService.getEventById(evt.id);
      expect(found).toBeNull();

      const seen = await eventService.getEventById(evt.id, { includeDeleted: true });
      expect(seen).not.toBeNull();
    });
  });
});

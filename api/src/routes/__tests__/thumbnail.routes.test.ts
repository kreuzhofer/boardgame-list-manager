/**
 * Unit tests for Thumbnail routes
 * 
 * Tests the /api/thumbnails endpoints
 * 
 * Requirements: 1.2, 1.3, 1.6, 1.7, 2.3, 2.4
 */

import express from 'express';
import request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock the thumbnailService
const mockStoreThumbnail = jest.fn();
const mockGetThumbnailPath = jest.fn();
const mockHasThumbnail = jest.fn();
jest.mock('../../services/thumbnailService', () => ({
  thumbnailService: {
    storeThumbnail: mockStoreThumbnail,
    getThumbnailPath: mockGetThumbnailPath,
    hasThumbnail: mockHasThumbnail,
  },
}));

// Mock the gameRepository
const mockFindById = jest.fn();
jest.mock('../../repositories', () => ({
  gameRepository: {
    findById: mockFindById,
  },
}));

// Mock resolveEventId to avoid DB access
jest.mock('../../middleware/event.middleware', () => ({
  resolveEventId: jest.fn().mockResolvedValue('test-event-id'),
}));

import thumbnailRoutes from '../thumbnail.routes';

describe('Thumbnail Routes', () => {
  let app: express.Application;
  let tempDir: string;

  beforeAll(() => {
    app = express();
    app.use('/api/thumbnails', thumbnailRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'thumbnail-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('POST /api/thumbnails/:gameId', () => {
    const gameId = '123e4567-e89b-12d3-a456-426614174000';
    const participantId = '123e4567-e89b-12d3-a456-426614174001';

    it('should return 400 when no participant ID header provided', async () => {
      const response = await request(app)
        .post(`/api/thumbnails/${gameId}`)
        .attach('thumbnail', Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]), 'test.jpg')
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when no file uploaded', async () => {
      const response = await request(app)
        .post(`/api/thumbnails/${gameId}`)
        .set('x-participant-id', participantId)
        .expect(400);

      expect(response.body.error.code).toBe('NO_FILE');
    });

    it('should return 404 when game not found', async () => {
      mockFindById.mockResolvedValueOnce(null);

      const response = await request(app)
        .post(`/api/thumbnails/${gameId}`)
        .set('x-participant-id', participantId)
        .attach('thumbnail', Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]), {
          filename: 'test.jpg',
          contentType: 'image/jpeg',
        })
        .expect(404);

      expect(response.body.error.code).toBe('GAME_NOT_FOUND');
    });

    it('should return 400 when game has BGG ID (Requirement 1.6)', async () => {
      mockFindById.mockResolvedValueOnce({
        id: gameId,
        ownerId: participantId,
        bggId: 12345, // Has BGG ID
      });

      const response = await request(app)
        .post(`/api/thumbnails/${gameId}`)
        .set('x-participant-id', participantId)
        .attach('thumbnail', Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]), {
          filename: 'test.jpg',
          contentType: 'image/jpeg',
        })
        .expect(400);

      expect(response.body.error.code).toBe('BGG_GAME');
    });

    it('should return 403 when user is not the owner (Requirement 1.7)', async () => {
      mockFindById.mockResolvedValueOnce({
        id: gameId,
        ownerId: 'different-user-id',
        bggId: null,
      });

      const response = await request(app)
        .post(`/api/thumbnails/${gameId}`)
        .set('x-participant-id', participantId)
        .attach('thumbnail', Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]), {
          filename: 'test.jpg',
          contentType: 'image/jpeg',
        })
        .expect(403);

      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('should return 400 for invalid file type (Requirement 1.3)', async () => {
      mockFindById.mockResolvedValueOnce({
        id: gameId,
        ownerId: participantId,
        bggId: null,
      });

      const response = await request(app)
        .post(`/api/thumbnails/${gameId}`)
        .set('x-participant-id', participantId)
        .attach('thumbnail', Buffer.from('not an image'), {
          filename: 'test.txt',
          contentType: 'text/plain',
        })
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_FILE_TYPE');
    });

    it('should successfully upload thumbnail for valid request', async () => {
      mockFindById.mockResolvedValueOnce({
        id: gameId,
        ownerId: participantId,
        bggId: null,
      });
      mockStoreThumbnail.mockResolvedValueOnce(undefined);

      const response = await request(app)
        .post(`/api/thumbnails/${gameId}`)
        .set('x-participant-id', participantId)
        .attach('thumbnail', Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]), {
          filename: 'test.jpg',
          contentType: 'image/jpeg',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockStoreThumbnail).toHaveBeenCalledWith(gameId, expect.any(Buffer));
    });

    it('should accept PNG files', async () => {
      mockFindById.mockResolvedValueOnce({
        id: gameId,
        ownerId: participantId,
        bggId: null,
      });
      mockStoreThumbnail.mockResolvedValueOnce(undefined);

      const response = await request(app)
        .post(`/api/thumbnails/${gameId}`)
        .set('x-participant-id', participantId)
        .attach('thumbnail', Buffer.from([0x89, 0x50, 0x4E, 0x47]), {
          filename: 'test.png',
          contentType: 'image/png',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should accept WebP files', async () => {
      mockFindById.mockResolvedValueOnce({
        id: gameId,
        ownerId: participantId,
        bggId: null,
      });
      mockStoreThumbnail.mockResolvedValueOnce(undefined);

      const response = await request(app)
        .post(`/api/thumbnails/${gameId}`)
        .set('x-participant-id', participantId)
        .attach('thumbnail', Buffer.from([0x52, 0x49, 0x46, 0x46]), {
          filename: 'test.webp',
          contentType: 'image/webp',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should accept GIF files', async () => {
      mockFindById.mockResolvedValueOnce({
        id: gameId,
        ownerId: participantId,
        bggId: null,
      });
      mockStoreThumbnail.mockResolvedValueOnce(undefined);

      const response = await request(app)
        .post(`/api/thumbnails/${gameId}`)
        .set('x-participant-id', participantId)
        .attach('thumbnail', Buffer.from([0x47, 0x49, 0x46, 0x38]), {
          filename: 'test.gif',
          contentType: 'image/gif',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/thumbnails/:gameId/:size', () => {
    const gameId = '123e4567-e89b-12d3-a456-426614174000';

    it('should return 400 for invalid size parameter', async () => {
      const response = await request(app)
        .get(`/api/thumbnails/${gameId}/large`)
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_SIZE');
    });

    it('should return 404 when thumbnail not found', async () => {
      mockGetThumbnailPath.mockReturnValueOnce(null);

      const response = await request(app)
        .get(`/api/thumbnails/${gameId}/micro`)
        .expect(404);

      expect(response.body.error.code).toBe('THUMBNAIL_NOT_FOUND');
    });

    it('should return image with correct content-type for micro size', async () => {
      const imagePath = path.join(tempDir, `${gameId}-micro.jpg`);
      fs.writeFileSync(imagePath, Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]));
      mockGetThumbnailPath.mockReturnValueOnce(imagePath);

      const response = await request(app)
        .get(`/api/thumbnails/${gameId}/micro`)
        .expect(200);

      expect(response.headers['content-type']).toBe('image/jpeg');
      expect(mockGetThumbnailPath).toHaveBeenCalledWith(gameId, 'micro');
    });

    it('should return image with correct content-type for square200 size', async () => {
      const imagePath = path.join(tempDir, `${gameId}-square200.jpg`);
      fs.writeFileSync(imagePath, Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]));
      mockGetThumbnailPath.mockReturnValueOnce(imagePath);

      const response = await request(app)
        .get(`/api/thumbnails/${gameId}/square200`)
        .expect(200);

      expect(response.headers['content-type']).toBe('image/jpeg');
      expect(mockGetThumbnailPath).toHaveBeenCalledWith(gameId, 'square200');
    });

    it('should set cache headers on successful response', async () => {
      const imagePath = path.join(tempDir, `${gameId}-micro.jpg`);
      fs.writeFileSync(imagePath, Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]));
      mockGetThumbnailPath.mockReturnValueOnce(imagePath);

      const response = await request(app)
        .get(`/api/thumbnails/${gameId}/micro`)
        .expect(200);

      // Short cache with ETag for cache-busting on thumbnail updates
      expect(response.headers['cache-control']).toBe('public, max-age=60');
      expect(response.headers['etag']).toBeDefined();
    });
  });

  describe('GET /api/thumbnails/:gameId/exists', () => {
    const gameId = '123e4567-e89b-12d3-a456-426614174000';

    it('should return exists: true when thumbnail exists', async () => {
      mockHasThumbnail.mockReturnValueOnce(true);

      const response = await request(app)
        .get(`/api/thumbnails/${gameId}/exists`)
        .expect(200);

      expect(response.body.exists).toBe(true);
    });

    it('should return exists: false when thumbnail does not exist', async () => {
      mockHasThumbnail.mockReturnValueOnce(false);

      const response = await request(app)
        .get(`/api/thumbnails/${gameId}/exists`)
        .expect(200);

      expect(response.body.exists).toBe(false);
    });
  });
});

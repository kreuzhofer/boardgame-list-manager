/**
 * Thumbnail Routes - API endpoints for custom game thumbnails
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.6, 1.7, 2.3, 2.4
 * 
 * This module handles uploading, serving, and deleting custom thumbnails
 * for non-BGG games.
 */

import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import multer from 'multer';
import { thumbnailService } from '../services/thumbnailService';
import { gameRepository } from '../repositories';
import { config } from '../config';
import { sseManager } from '../services/sse.service';
import type { ImageSize } from '../services/thumbnailService';
import type { ThumbnailUploadedEvent } from '../types/sse';

const router = Router();

// Configure multer for memory storage (we'll process with sharp)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.customThumbnails.maxFileSize,
  },
  fileFilter: (_req, file, cb) => {
    if (config.customThumbnails.allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('INVALID_FILE_TYPE'));
    }
  },
});

/**
 * POST /api/thumbnails/:gameId
 * Upload a custom thumbnail for a game.
 * 
 * Path parameters:
 *   - gameId: Game ID (UUID)
 * 
 * Headers:
 *   - x-user-id: User ID (required for ownership validation)
 * 
 * Body: multipart/form-data with 'thumbnail' file field
 * 
 * Response: { success: true }
 * 
 * Error responses:
 *   - 400 if file too large, invalid type, or game has BGG ID
 *   - 403 if user is not the game owner
 *   - 404 if game not found
 *   - 500 if image processing fails
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.6, 1.7
 */
router.post('/:gameId', (req: Request, res: Response) => {
  upload.single('thumbnail')(req, res, async (err) => {
    try {
      const { gameId } = req.params;
      const userId = req.headers['x-user-id'] as string;

      // Validate user ID header
      if (!userId || typeof userId !== 'string') {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Benutzer-ID erforderlich.',
          },
        });
      }

      // Handle multer errors
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            error: {
              code: 'FILE_TOO_LARGE',
              message: 'Datei zu groß. Maximal 5 MB erlaubt.',
            },
          });
        }
        if (err.message === 'INVALID_FILE_TYPE') {
          return res.status(400).json({
            error: {
              code: 'INVALID_FILE_TYPE',
              message: 'Ungültiger Dateityp. Erlaubt: JPEG, PNG, WebP, GIF.',
            },
          });
        }
        throw err;
      }

      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({
          error: {
            code: 'NO_FILE',
            message: 'Keine Datei hochgeladen.',
          },
        });
      }

      // Find the game
      const game = await gameRepository.findById(gameId);
      
      if (!game) {
        return res.status(404).json({
          error: {
            code: 'GAME_NOT_FOUND',
            message: 'Spiel nicht gefunden.',
          },
        });
      }

      // Check that game has no BGG ID (Requirement 1.6)
      if (game.bggId !== null) {
        return res.status(400).json({
          error: {
            code: 'BGG_GAME',
            message: 'Nur Spiele ohne BGG-Eintrag können ein Bild haben.',
          },
        });
      }

      // Check ownership (Requirement 1.7)
      if (game.ownerId !== userId) {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Du bist nicht berechtigt, dieses Spiel zu bearbeiten.',
          },
        });
      }

      // Store the thumbnail
      await thumbnailService.storeThumbnail(gameId, req.file.buffer);

      // Broadcast SSE event to notify other clients (with timestamp for cache-busting)
      const event: ThumbnailUploadedEvent = {
        type: 'game:thumbnail-uploaded',
        gameId,
        userId,
        timestamp: Date.now(),
      };
      sseManager.broadcast(event);

      return res.json({ success: true });
    } catch (error) {
      console.error('Error uploading thumbnail:', error);
      return res.status(500).json({
        error: {
          code: 'PROCESSING_ERROR',
          message: 'Bildverarbeitung fehlgeschlagen.',
        },
      });
    }
  });
});

/**
 * GET /api/thumbnails/:gameId/exists
 * Check if a game has a custom thumbnail.
 * 
 * Path parameters:
 *   - gameId: Game ID (UUID)
 * 
 * Response: { exists: boolean }
 */
router.get('/:gameId/exists', async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const exists = thumbnailService.hasThumbnail(gameId);
    return res.json({ exists });
  } catch (error) {
    console.error('Error checking thumbnail:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Ein Fehler ist aufgetreten.',
      },
    });
  }
});

/**
 * GET /api/thumbnails/:gameId/:size
 * Get a custom thumbnail image.
 * 
 * Path parameters:
 *   - gameId: Game ID (UUID)
 *   - size: Image size ('micro' for 64x64 or 'square200' for 200x200)
 * 
 * Response: Image file (JPEG) with appropriate cache headers
 * 
 * Error responses:
 *   - 400 if invalid size parameter
 *   - 404 if thumbnail not found
 * 
 * Requirements: 2.3, 2.4
 */
router.get('/:gameId/:size', async (req: Request, res: Response) => {
  try {
    const { gameId, size } = req.params;

    // Validate size parameter
    if (size !== 'micro' && size !== 'square200') {
      return res.status(400).json({
        error: {
          code: 'INVALID_SIZE',
          message: 'Ungültige Bildgröße. Muss "micro" oder "square200" sein.',
        },
      });
    }

    // Get the thumbnail path
    const imagePath = thumbnailService.getThumbnailPath(gameId, size as ImageSize);

    if (!imagePath) {
      return res.status(404).json({
        error: {
          code: 'THUMBNAIL_NOT_FOUND',
          message: 'Bild nicht gefunden.',
        },
      });
    }

    // Get file stats for ETag
    const stats = fs.statSync(imagePath);
    const etag = `"${stats.mtime.getTime().toString(16)}-${stats.size.toString(16)}"`;

    // Check if client has cached version
    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch === etag) {
      return res.status(304).end();
    }

    // Set headers and stream the file
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=60'); // Short cache, rely on ETag for validation
    res.setHeader('ETag', etag);

    const fileStream = fs.createReadStream(imagePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error getting thumbnail:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Ein Fehler ist aufgetreten.',
      },
    });
  }
});

export default router;

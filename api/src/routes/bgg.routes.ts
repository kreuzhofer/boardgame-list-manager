/**
 * BGG Routes - API endpoints for BoardGameGeek data
 * 
 * Requirements: 2.1, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import { bggService, bggImageService } from '../services';
import type { ImageSize } from '../services/bggImageService';

const router = Router();

/**
 * GET /api/bgg/search
 * Search for games in the BGG database by name.
 * 
 * Query parameters:
 *   - q: Search query string (required, min 2 characters for results)
 * 
 * Response: { results: BggSearchResult[] }
 * 
 * Requirements: 2.1, 2.4, 2.5
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string || '';
    
    const { results, hasMore } = bggService.searchGames(query);
    
    return res.json({ results, hasMore });
  } catch (error) {
    console.error('Error searching BGG games:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Suche fehlgeschlagen. Bitte später erneut versuchen.',
      },
    });
  }
});

/**
 * GET /api/bgg/status
 * Get the status of the BGG cache.
 * 
 * Response: { loaded: boolean, gameCount: number }
 */
router.get('/status', async (_req: Request, res: Response) => {
  try {
    return res.json({
      loaded: bggService.isReady(),
      gameCount: bggService.getGameCount(),
    });
  } catch (error) {
    console.error('Error getting BGG status:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Ein Fehler ist aufgetreten.',
      },
    });
  }
});

/**
 * GET /api/bgg/image/:bggId/:size
 * Get a BGG game thumbnail image.
 * 
 * Path parameters:
 *   - bggId: BoardGameGeek game ID (numeric)
 *   - size: Image size ('micro' for 64x64 or 'square200' for 200x200)
 * 
 * Response: Image file (JPEG) with appropriate cache headers
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */
router.get('/image/:bggId/:size', async (req: Request, res: Response) => {
  try {
    const { bggId, size } = req.params;
    
    // Validate bggId is numeric
    const bggIdNum = parseInt(bggId, 10);
    if (isNaN(bggIdNum) || bggIdNum <= 0) {
      return res.status(400).json({
        error: {
          code: 'INVALID_BGG_ID',
          message: 'Ungültige BGG ID. Muss eine positive Zahl sein.',
        },
      });
    }
    
    // Validate size
    if (size !== 'micro' && size !== 'square200') {
      return res.status(400).json({
        error: {
          code: 'INVALID_SIZE',
          message: 'Ungültige Bildgröße. Muss "micro" oder "square200" sein.',
        },
      });
    }
    
    // Get the image (will fetch if not cached)
    // Requirement 3.3: Wait for fetch completion if not cached
    // Requirement 3.4: No timeout - client waits until ready
    const imagePath = await bggImageService.getImage(bggIdNum, size as ImageSize);
    
    if (!imagePath) {
      return res.status(404).json({
        error: {
          code: 'IMAGE_NOT_FOUND',
          message: 'Bild nicht gefunden.',
        },
      });
    }
    
    // Requirement 3.2: Return with appropriate cache headers
    // Get the content type from the stored metadata
    const contentType = bggImageService.getContentType(bggIdNum);
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=2592000'); // 30 days
    
    // Stream the file
    const fileStream = fs.createReadStream(imagePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error getting BGG image:', error);
    return res.status(503).json({
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Bildservice nicht verfügbar. Bitte später erneut versuchen.',
      },
    });
  }
});

export default router;

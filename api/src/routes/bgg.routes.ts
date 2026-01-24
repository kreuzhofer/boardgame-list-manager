/**
 * BGG Routes - API endpoints for BoardGameGeek data
 * 
 * Requirements: 2.1, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5
 * Import Requirements: 3.1, 3.2, 3.3, 3a.1, 3a.2
 * Enrichment Requirements: 6.1, 6.2, 6.4, 6.5, 6a.1, 6a.2, 6b.1, 6b.2, 6c.2, 6d.1-6d.5
 * Game Data Requirements: 8.1, 8.2, 8.3, 8.4
 */

import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import { bggService, bggImageService } from '../services';
import { bggImportService } from '../services/bggImportService';
import { bggEnrichmentService } from '../services/bggEnrichmentService';
import { prisma } from '../lib/prisma';
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

/**
 * POST /api/bgg/import
 * Start CSV import process.
 * 
 * Response: 202 if started, 409 if already running
 * 
 * Requirements: 3.1, 3.3
 */
router.post('/import', async (_req: Request, res: Response) => {
  try {
    const result = bggImportService.startImport();
    
    if (result.started) {
      return res.status(202).json({ message: result.message });
    } else {
      return res.status(409).json({
        error: {
          code: 'IMPORT_IN_PROGRESS',
          message: result.message,
        },
      });
    }
  } catch (error) {
    console.error('Error starting import:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Import konnte nicht gestartet werden.',
      },
    });
  }
});

/**
 * GET /api/bgg/import/status
 * Get current import status.
 * 
 * Response: ImportStatus object
 * 
 * Requirements: 3a.1, 3a.2
 */
router.get('/import/status', async (_req: Request, res: Response) => {
  try {
    const status = bggImportService.getStatus();
    return res.json(status);
  } catch (error) {
    console.error('Error getting import status:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Status konnte nicht abgerufen werden.',
      },
    });
  }
});

/**
 * POST /api/bgg/enrich
 * Start bulk enrichment process.
 * 
 * Response: 202 if started, 409 if already running
 * 
 * Requirements: 6a.1, 6a.2
 */
router.post('/enrich', async (_req: Request, res: Response) => {
  try {
    const result = bggEnrichmentService.startBulkEnrichment();
    
    if (result.started) {
      return res.status(202).json({ message: result.message });
    } else {
      return res.status(409).json({
        error: {
          code: 'ENRICHMENT_IN_PROGRESS',
          message: result.message,
        },
      });
    }
  } catch (error) {
    console.error('Error starting enrichment:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Enrichment konnte nicht gestartet werden.',
      },
    });
  }
});

/**
 * GET /api/bgg/enrich/status
 * Get current bulk enrichment status.
 * 
 * Response: BulkEnrichmentStatus object
 * 
 * Requirements: 6b.1, 6b.2, 6c.2
 */
router.get('/enrich/status', async (_req: Request, res: Response) => {
  try {
    const status = bggEnrichmentService.getBulkStatus();
    return res.json(status);
  } catch (error) {
    console.error('Error getting enrichment status:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Status konnte nicht abgerufen werden.',
      },
    });
  }
});

/**
 * POST /api/bgg/enrich/:bggId
 * Enrich a single game.
 * 
 * Path parameters:
 *   - bggId: BoardGameGeek game ID (numeric)
 * 
 * Query parameters:
 *   - force: If 'true', re-enrich even if already done
 * 
 * Response: EnrichmentData object
 * 
 * Requirements: 6.1, 6.2, 6.4, 6.5
 */
router.post('/enrich/:bggId', async (req: Request, res: Response) => {
  try {
    const { bggId } = req.params;
    const force = req.query.force === 'true';
    
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
    
    const enrichmentData = await bggEnrichmentService.enrichGame(bggIdNum, force);
    return res.json(enrichmentData);
  } catch (error) {
    const errorMessage = (error as Error).message;
    
    if (errorMessage.includes('not found')) {
      return res.status(404).json({
        error: {
          code: 'GAME_NOT_FOUND',
          message: 'Spiel nicht in der Datenbank gefunden. Bitte zuerst importieren.',
        },
      });
    }
    
    if (errorMessage.includes('Failed to fetch')) {
      return res.status(503).json({
        error: {
          code: 'SCRAPER_ERROR',
          message: 'BGG-Seite konnte nicht abgerufen werden. Bitte später erneut versuchen.',
        },
      });
    }
    
    console.error('Error enriching game:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Enrichment fehlgeschlagen.',
      },
    });
  }
});

/**
 * DELETE /api/bgg/enrich
 * Stop bulk enrichment process.
 * 
 * Response: 200 with final status if stopped, 409 if not running
 * 
 * Requirements: 6d.1, 6d.3, 6d.4
 */
router.delete('/enrich', async (_req: Request, res: Response) => {
  try {
    const result = bggEnrichmentService.stopBulkEnrichment();
    
    if (result.stopped) {
      return res.status(200).json({
        message: result.message,
        stopped: true,
        status: result.status,
      });
    } else {
      return res.status(409).json({
        error: {
          code: 'NO_ENRICHMENT_RUNNING',
          message: result.message,
        },
      });
    }
  } catch (error) {
    console.error('Error stopping enrichment:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Enrichment konnte nicht gestoppt werden.',
      },
    });
  }
});

/**
 * GET /api/bgg/:bggId
 * Get game data by BGG ID.
 * 
 * Path parameters:
 *   - bggId: BoardGameGeek game ID (numeric)
 * 
 * Response: Complete BggGame record
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */
router.get('/:bggId', async (req: Request, res: Response) => {
  try {
    const { bggId } = req.params;
    
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
    
    const game = await prisma.bggGame.findUnique({
      where: { id: bggIdNum },
    });
    
    if (!game) {
      return res.status(404).json({
        error: {
          code: 'GAME_NOT_FOUND',
          message: 'Spiel nicht in der Datenbank gefunden.',
        },
      });
    }
    
    return res.json(game);
  } catch (error) {
    console.error('Error getting game data:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Spieldaten konnten nicht abgerufen werden.',
      },
    });
  }
});

export default router;

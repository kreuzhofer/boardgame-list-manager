/**
 * BGG Routes - API endpoints for BoardGameGeek data
 * 
 * Requirements: 2.1, 2.5
 */

import { Router, Request, Response } from 'express';
import { bggService } from '../services';

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

export default router;

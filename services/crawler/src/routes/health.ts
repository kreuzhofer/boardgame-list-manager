import { Router, Request, Response } from 'express';
import browserManager from '../services/browserManager';
import logger from '../utils/logger';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Track service start time for uptime calculation
const startTime = Date.now();

/**
 * GET /health
 * 
 * Health check endpoint that reports service status and browser availability.
 * 
 * Response (healthy):
 * {
 *   status: 'healthy',
 *   browser: {
 *     connected: true,
 *     version: string
 *   },
 *   uptime: number,
 *   timestamp: string
 * }
 * 
 * Response (unhealthy):
 * {
 *   status: 'unhealthy',
 *   browser: {
 *     connected: false,
 *     version: null
 *   },
 *   uptime: number,
 *   timestamp: string
 * }
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  try {
    // Set a timeout to ensure we respond within 1 second
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Health check timeout')), 1000);
    });
    
    // Check browser connection status
    const isConnected = browserManager.isConnected();
    
    // Get browser version (only if connected)
    const versionPromise = isConnected ? browserManager.getVersion() : Promise.resolve(null);
    
    // Race between getting version and timeout
    let version: string | null = null;
    try {
      version = await Promise.race([versionPromise, timeoutPromise]) as string | null;
    } catch (error) {
      // Timeout or error getting version
      version = null;
    }
    
    // Calculate uptime in seconds
    const uptime = Math.floor((Date.now() - startTime) / 1000);
    
    // Determine health status
    const status = isConnected ? 'healthy' : 'unhealthy';
    const statusCode = isConnected ? 200 : 503;
    
    // Build response
    const response = {
      status,
      browser: {
        connected: isConnected,
        version
      },
      uptime,
      timestamp: new Date().toISOString()
    };
    
    return res.status(statusCode).json(response);
    
  } catch (error: any) {
    // Handle unexpected errors
    logger.error('Error in /health endpoint', { 
      error: error.message,
      stack: error.stack
    });
    
    const uptime = Math.floor((Date.now() - startTime) / 1000);
    
    return res.status(503).json({
      status: 'unhealthy',
      browser: {
        connected: false,
        version: null
      },
      uptime,
      timestamp: new Date().toISOString()
    });
  }
}));

export default router;

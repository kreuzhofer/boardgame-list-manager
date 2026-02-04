import { Router, Request, Response } from 'express';
import { RequestValidator } from '../utils/validator';
import pageFetcher from '../services/pageFetcher';
import logger from '../utils/logger';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
const validator = new RequestValidator();

/**
 * POST /fetch
 * 
 * Fetch a web page using the headless browser and return its HTML content.
 * 
 * Request body:
 * {
 *   url: string,              // Required: URL to fetch
 *   options?: {
 *     timeout?: number,       // Optional: Timeout in ms (1000-60000)
 *     waitForSelector?: string, // Optional: CSS selector to wait for
 *     waitForNavigation?: boolean // Optional: Wait for navigation (default: true)
 *   }
 * }
 * 
 * Response (success):
 * {
 *   success: true,
 *   statusCode: number,
 *   html: string,
 *   headers: Record<string, string>,
 *   url: string,
 *   loadTime: number
 * }
 * 
 * Response (error):
 * {
 *   success: false,
 *   error: string,
 *   errorType: 'TIMEOUT' | 'NAVIGATION_ERROR' | 'INVALID_URL' | 'BROWSER_ERROR' | 'UNKNOWN',
 *   url: string
 * }
 */
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const requestId = Math.random().toString(36).substring(7);
  
  try {
    const { url, options } = req.body;
    
    logger.debug('Received fetch request', { requestId, url, options });
    
    // Validate the request
    const validationResult = validator.validateRequest(url, options);
    
    if (!validationResult.valid) {
      logger.warn('Request validation failed', { 
        requestId, 
        url, 
        error: validationResult.error 
      });
      
      // Return 400 Bad Request for validation errors
      return res.status(400).json({
        success: false,
        error: validationResult.error,
        errorType: 'INVALID_URL',
        url: url || ''
      });
    }
    
    // Fetch the page
    const result = await pageFetcher.fetchPage(url, options);
    
    if (result.success) {
      logger.info('Fetch request completed successfully', { 
        requestId, 
        url, 
        statusCode: result.statusCode,
        loadTime: result.loadTime
      });
      
      // Return 200 OK with the fetch result
      return res.status(200).json(result);
    } else {
      logger.warn('Fetch request failed', { 
        requestId, 
        url, 
        errorType: result.errorType,
        error: result.error
      });
      
      // Determine HTTP status code based on error type
      let statusCode = 500; // Default to Internal Server Error
      
      if (result.errorType === 'INVALID_URL') {
        statusCode = 400; // Bad Request
      } else if (result.errorType === 'BROWSER_ERROR') {
        statusCode = 503; // Service Unavailable
      }
      
      return res.status(statusCode).json(result);
    }
    
  } catch (error: any) {
    // Handle unexpected errors
    logger.error('Unexpected error in /fetch endpoint', { 
      requestId,
      url: req.body?.url,
      error: error.message,
      stack: error.stack
    });
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      errorType: 'UNKNOWN',
      url: req.body?.url || ''
    });
  }
}));

export default router;

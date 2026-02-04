import express, { Express, Request, Response } from 'express';
import browserManager from './services/browserManager';
import fetchRouter from './routes/fetch';
import healthRouter from './routes/health';
import logger from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

/**
 * Main Express server for the crawler service
 * 
 * Responsibilities:
 * - Initialize Express app with middleware
 * - Mount API routes (/fetch, /health)
 * - Initialize browser on startup
 * - Handle graceful shutdown
 * - Provide error handling middleware
 */

// Configuration
const PORT = process.env.CRAWLER_PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Initialize Express app
const app: Express = express();

// Middleware
app.use(express.json()); // Parse JSON request bodies

// Health check route (mounted first for quick access)
app.use('/health', healthRouter);

// Main fetch route
app.use('/fetch', fetchRouter);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'crawler-service',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: 'GET /health',
      fetch: 'POST /fetch'
    }
  });
});

// 404 handler for unknown routes (must be before error handler)
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

/**
 * Start the server and initialize the browser
 */
async function startServer() {
  try {
    logger.info('Starting crawler service...', { 
      environment: NODE_ENV, 
      port: PORT,
      logLevel: process.env.LOG_LEVEL || 'info'
    });
    
    // Initialize browser on startup
    logger.info('Initializing browser...');
    await browserManager.launchBrowser();
    logger.info('Browser initialized successfully');
    
    // Start HTTP server
    const server = app.listen(PORT, () => {
      logger.info(`Crawler service listening on port ${PORT}`, {
        healthCheck: `http://localhost:${PORT}/health`,
        fetchEndpoint: `http://localhost:${PORT}/fetch`
      });
    });
    
    // Graceful shutdown handler
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      
      // Stop accepting new connections
      server.close(() => {
        logger.info('HTTP server closed');
      });
      
      // Close browser (handled by BrowserManager's shutdown handlers)
      await browserManager.close();
      
      logger.info('Shutdown complete');
      process.exit(0);
    };
    
    // Register shutdown handlers
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', { 
        error: error.message,
        stack: error.stack 
      });
      shutdown('uncaughtException');
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection', { 
        reason: reason instanceof Error ? reason.message : reason,
        stack: reason instanceof Error ? reason.stack : undefined
      });
      shutdown('unhandledRejection');
    });
    
  } catch (error) {
    logger.error('Failed to start server', { 
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined
    });
    process.exit(1);
  }
}

// Start the server
startServer();

// Export app for testing
export default app;

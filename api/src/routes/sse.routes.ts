import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { sseManager } from '../services';

const router = Router();

// Heartbeat interval in milliseconds (30 seconds)
const HEARTBEAT_INTERVAL = 30000;

/**
 * GET /api/events
 * Establishes an SSE connection with the client.
 * 
 * Response headers:
 *   - Content-Type: text/event-stream
 *   - Cache-Control: no-cache
 *   - Connection: keep-alive
 * 
 * Sends heartbeat every 30 seconds to keep connection alive.
 * Broadcasts game events to all connected clients.
 */
router.get('/', (req: Request, res: Response) => {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  
  // Flush headers immediately
  res.flushHeaders();

  // Generate unique client ID
  const clientId = uuidv4();
  
  // Add client to SSE manager
  sseManager.addClient(clientId, res);
  
  console.log(`SSE client connected: ${clientId} (total: ${sseManager.getClientCount()})`);

  // Send initial connection confirmation
  res.write(`data: ${JSON.stringify({ type: 'connected', clientId })}\n\n`);

  // Set up heartbeat to keep connection alive
  const heartbeatInterval = setInterval(() => {
    try {
      res.write(`: heartbeat\n\n`);
    } catch {
      // Client disconnected, cleanup will happen in close handler
      clearInterval(heartbeatInterval);
    }
  }, HEARTBEAT_INTERVAL);

  // Handle client disconnect
  req.on('close', () => {
    clearInterval(heartbeatInterval);
    sseManager.removeClient(clientId);
    console.log(`SSE client disconnected: ${clientId} (total: ${sseManager.getClientCount()})`);
  });
});

export default router;

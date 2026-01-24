import { Response } from 'express';
import { GameEvent } from '../types';

interface SSEClient {
  id: string;
  response: Response;
}

/**
 * SSEManager - Singleton service for managing Server-Sent Events connections
 * Handles client connection management and event broadcasting
 */
class SSEManager {
  private clients: Map<string, SSEClient> = new Map();

  /**
   * Add a new client connection
   */
  addClient(id: string, response: Response): void {
    this.clients.set(id, { id, response });
  }

  /**
   * Remove a client connection
   */
  removeClient(id: string): void {
    this.clients.delete(id);
  }

  /**
   * Broadcast an event to all connected clients
   */
  broadcast(event: GameEvent): void {
    const data = JSON.stringify(event);
    const message = `data: ${data}\n\n`;

    const disconnectedClients: string[] = [];

    this.clients.forEach((client) => {
      try {
        client.response.write(message);
      } catch {
        // Client disconnected, mark for removal
        disconnectedClients.push(client.id);
      }
    });

    // Clean up disconnected clients
    disconnectedClients.forEach((id) => this.removeClient(id));
  }

  /**
   * Get count of connected clients (for monitoring)
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Check if a client is connected
   */
  hasClient(id: string): boolean {
    return this.clients.has(id);
  }

  /**
   * Clear all clients (useful for testing)
   */
  clearClients(): void {
    this.clients.clear();
  }
}

// Export singleton instance
export const sseManager = new SSEManager();

// Export class for testing
export { SSEManager };

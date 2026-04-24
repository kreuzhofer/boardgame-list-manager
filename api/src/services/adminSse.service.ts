import { Response } from 'express';
import { AdminSSEEvent } from '../types';

interface SSEClient {
  id: string;
  response: Response;
}

class AdminSSEManager {
  private clients: Map<string, SSEClient> = new Map();

  addClient(id: string, response: Response): void {
    this.clients.set(id, { id, response });
  }

  removeClient(id: string): void {
    this.clients.delete(id);
  }

  broadcast(event: AdminSSEEvent): void {
    const data = JSON.stringify(event);
    const message = `data: ${data}\n\n`;

    const disconnectedClients: string[] = [];

    this.clients.forEach((client) => {
      try {
        client.response.write(message);
      } catch {
        disconnectedClients.push(client.id);
      }
    });

    disconnectedClients.forEach((id) => this.removeClient(id));
  }

  getClientCount(): number {
    return this.clients.size;
  }

  clearClients(): void {
    this.clients.clear();
  }
}

export const adminSseManager = new AdminSSEManager();
export { AdminSSEManager };

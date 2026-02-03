import { SSEManager } from '../sse.service';
import { GameEvent } from '../../types';

// Mock Response object
const createMockResponse = () => {
  const writtenData: string[] = [];
  return {
    write: jest.fn((data: string) => {
      writtenData.push(data);
      return true;
    }),
    writtenData,
  };
};

describe('SSEManager', () => {
  let sseManager: SSEManager;

  beforeEach(() => {
    sseManager = new SSEManager();
  });

  describe('addClient', () => {
    it('should add a client to the manager', () => {
      const mockResponse = createMockResponse();
      sseManager.addClient('client-1', mockResponse as any);

      expect(sseManager.getClientCount()).toBe(1);
      expect(sseManager.hasClient('client-1')).toBe(true);
    });

    it('should allow adding multiple clients', () => {
      const mockResponse1 = createMockResponse();
      const mockResponse2 = createMockResponse();

      sseManager.addClient('client-1', mockResponse1 as any);
      sseManager.addClient('client-2', mockResponse2 as any);

      expect(sseManager.getClientCount()).toBe(2);
      expect(sseManager.hasClient('client-1')).toBe(true);
      expect(sseManager.hasClient('client-2')).toBe(true);
    });

    it('should replace existing client with same id', () => {
      const mockResponse1 = createMockResponse();
      const mockResponse2 = createMockResponse();

      sseManager.addClient('client-1', mockResponse1 as any);
      sseManager.addClient('client-1', mockResponse2 as any);

      expect(sseManager.getClientCount()).toBe(1);
    });
  });

  describe('removeClient', () => {
    it('should remove a client from the manager', () => {
      const mockResponse = createMockResponse();
      sseManager.addClient('client-1', mockResponse as any);
      sseManager.removeClient('client-1');

      expect(sseManager.getClientCount()).toBe(0);
      expect(sseManager.hasClient('client-1')).toBe(false);
    });

    it('should handle removing non-existent client gracefully', () => {
      expect(() => sseManager.removeClient('non-existent')).not.toThrow();
    });
  });

  describe('broadcast', () => {
    it('should broadcast event to all connected clients', () => {
      const mockResponse1 = createMockResponse();
      const mockResponse2 = createMockResponse();

      sseManager.addClient('client-1', mockResponse1 as any);
      sseManager.addClient('client-2', mockResponse2 as any);

      const event: GameEvent = {
        type: 'game:created',
        gameId: 'game-123',
        userId: 'user-456',
        userName: 'Test User',
        gameName: 'Test Game',
        isBringing: true,
      };

      sseManager.broadcast(event);

      expect(mockResponse1.write).toHaveBeenCalledTimes(1);
      expect(mockResponse2.write).toHaveBeenCalledTimes(1);

      const expectedData = `data: ${JSON.stringify(event)}\n\n`;
      expect(mockResponse1.write).toHaveBeenCalledWith(expectedData);
      expect(mockResponse2.write).toHaveBeenCalledWith(expectedData);
    });

    it('should handle disconnected clients during broadcast', () => {
      const mockResponse1 = createMockResponse();
      const mockResponse2 = {
        write: jest.fn(() => {
          throw new Error('Client disconnected');
        }),
      };

      sseManager.addClient('client-1', mockResponse1 as any);
      sseManager.addClient('client-2', mockResponse2 as any);

      const event: GameEvent = {
        type: 'game:deleted',
        gameId: 'game-123',
        userId: 'user-456',
      };

      // Should not throw
      expect(() => sseManager.broadcast(event)).not.toThrow();

      // Disconnected client should be removed
      expect(sseManager.getClientCount()).toBe(1);
      expect(sseManager.hasClient('client-1')).toBe(true);
      expect(sseManager.hasClient('client-2')).toBe(false);
    });

    it('should broadcast different event types correctly', () => {
      const mockResponse = createMockResponse();
      sseManager.addClient('client-1', mockResponse as any);

      const events: GameEvent[] = [
        {
          type: 'game:created',
          gameId: 'g1',
          userId: 'u1',
          userName: 'User',
          gameName: 'Game',
          isBringing: false,
        },
        {
          type: 'game:bringer-added',
          gameId: 'g2',
          userId: 'u2',
          userName: 'User2',
          gameName: 'Game2',
        },
        { type: 'game:bringer-removed', gameId: 'g3', userId: 'u3' },
        { type: 'game:player-added', gameId: 'g4', userId: 'u4', userName: 'User4', gameName: 'Game4' },
        { type: 'game:player-removed', gameId: 'g5', userId: 'u5' },
        { type: 'game:deleted', gameId: 'g6', userId: 'u6' },
        { type: 'game:prototype-toggled', gameId: 'g7', userId: 'u7', isPrototype: true },
      ];

      events.forEach((event) => sseManager.broadcast(event));

      expect(mockResponse.write).toHaveBeenCalledTimes(7);
    });

    /**
     * Test prototype-toggled event broadcast
     * Validates: Requirement 022-prototype-toggle 1.4
     */
    it('should broadcast prototype-toggled event with correct payload', () => {
      const mockResponse = createMockResponse();
      sseManager.addClient('client-1', mockResponse as any);

      const event: GameEvent = {
        type: 'game:prototype-toggled',
        gameId: 'game-123',
        userId: 'user-456',
        isPrototype: true,
      };

      sseManager.broadcast(event);

      expect(mockResponse.write).toHaveBeenCalledTimes(1);
      const expectedData = `data: ${JSON.stringify(event)}\n\n`;
      expect(mockResponse.write).toHaveBeenCalledWith(expectedData);
    });
  });

  describe('getClientCount', () => {
    it('should return 0 when no clients connected', () => {
      expect(sseManager.getClientCount()).toBe(0);
    });

    it('should return correct count after adding clients', () => {
      sseManager.addClient('c1', createMockResponse() as any);
      sseManager.addClient('c2', createMockResponse() as any);
      sseManager.addClient('c3', createMockResponse() as any);

      expect(sseManager.getClientCount()).toBe(3);
    });
  });

  describe('clearClients', () => {
    it('should remove all clients', () => {
      sseManager.addClient('c1', createMockResponse() as any);
      sseManager.addClient('c2', createMockResponse() as any);

      sseManager.clearClients();

      expect(sseManager.getClientCount()).toBe(0);
    });
  });
});

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { GameService } from '../game.service';
import { GameRepository } from '../../repositories/game.repository';
import type { GameEntity, PlayerEntity, BringerEntity, UserEntity } from '../../types';

/**
 * Unit tests for Game Service - Delete functionality
 * Tests validation logic and error handling for game deletion
 *
 * Validates: Requirements 3.2, 3.5, 3.6, 3.7
 */
describe('GameService', () => {
  let gameService: GameService;
  let mockRepository: jest.Mocked<GameRepository>;

  // Helper to create a mock UserEntity
  const createMockUserEntity = (id: string, name: string): UserEntity => ({
    id,
    name,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  });

  // Helper to create a mock PlayerEntity
  const createMockPlayerEntity = (id: string, gameId: string, userId: string, userName: string): PlayerEntity => ({
    id,
    gameId,
    userId,
    addedAt: new Date('2024-01-01T00:00:00Z'),
    user: createMockUserEntity(userId, userName),
  });

  // Helper to create a mock BringerEntity
  const createMockBringerEntity = (id: string, gameId: string, userId: string, userName: string): BringerEntity => ({
    id,
    gameId,
    userId,
    addedAt: new Date('2024-01-01T00:00:00Z'),
    user: createMockUserEntity(userId, userName),
  });

  // Helper to create a mock GameEntity
  const createMockGameEntity = (
    id: string,
    name: string,
    ownerId: string | null,
    ownerName: string | null,
    players: PlayerEntity[] = [],
    bringers: BringerEntity[] = [],
    bggId: number | null = null,
    yearPublished: number | null = null,
    bggRating: number | null = null,
    addedAsAlternateName: string | null = null,
    alternateNames: string[] = [],
    isPrototype: boolean = false
  ): GameEntity => ({
    id,
    name,
    ownerId,
    bggId,
    yearPublished,
    bggRating,
    addedAsAlternateName,
    alternateNames,
    isPrototype,
    owner: ownerId && ownerName ? createMockUserEntity(ownerId, ownerName) : null,
    players,
    bringers,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  });

  beforeEach(() => {
    // Create mock repository with all methods
    mockRepository = {
      findAll: jest.fn<() => Promise<GameEntity[]>>(),
      findById: jest.fn<(id: string) => Promise<GameEntity | null>>(),
      findByName: jest.fn<(name: string) => Promise<GameEntity | null>>(),
      create: jest.fn<(data: { name: string; userId: string; isBringing: boolean; isPlaying: boolean; isPrototype?: boolean }) => Promise<GameEntity>>(),
      addPlayer: jest.fn<(gameId: string, userId: string) => Promise<GameEntity>>(),
      removePlayer: jest.fn<(gameId: string, userId: string) => Promise<GameEntity>>(),
      addBringer: jest.fn<(gameId: string, userId: string) => Promise<GameEntity>>(),
      removeBringer: jest.fn<(gameId: string, userId: string) => Promise<GameEntity>>(),
      delete: jest.fn<(id: string) => Promise<boolean>>(),
    } as unknown as jest.Mocked<GameRepository>;

    // Create service with mocked repository
    gameService = new GameService(mockRepository);
  });

  describe('deleteGame', () => {
    /**
     * Test successful deletion by owner of empty game
     * Validates: Requirement 3.5
     */
    it('should delete game successfully when owner and game is empty', async () => {
      const ownerId = 'owner-123';
      const gameId = 'game-123';
      const mockGame = createMockGameEntity(gameId, 'Test Game', ownerId, 'Owner Name', [], []);
      
      mockRepository.findById.mockResolvedValue(mockGame);
      mockRepository.delete.mockResolvedValue(true);

      await expect(gameService.deleteGame(gameId, ownerId)).resolves.toBeUndefined();
      
      expect(mockRepository.findById).toHaveBeenCalledWith(gameId);
      expect(mockRepository.delete).toHaveBeenCalledWith(gameId);
    });

    /**
     * Test 404 when game not found
     * Validates: Requirement 3.5 (implicit - game must exist)
     */
    it('should throw "Spiel nicht gefunden." when game does not exist', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(gameService.deleteGame('non-existent', 'user-123')).rejects.toThrow(
        'Spiel nicht gefunden.'
      );
      
      expect(mockRepository.findById).toHaveBeenCalledWith('non-existent');
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });

    /**
     * Test 403 when non-owner attempts deletion
     * Validates: Requirement 3.6
     */
    it('should throw "Du bist nicht berechtigt, dieses Spiel zu löschen." when user is not owner', async () => {
      const ownerId = 'owner-123';
      const nonOwnerId = 'other-user-456';
      const gameId = 'game-123';
      const mockGame = createMockGameEntity(gameId, 'Test Game', ownerId, 'Owner Name', [], []);
      
      mockRepository.findById.mockResolvedValue(mockGame);

      await expect(gameService.deleteGame(gameId, nonOwnerId)).rejects.toThrow(
        'Du bist nicht berechtigt, dieses Spiel zu löschen.'
      );
      
      expect(mockRepository.findById).toHaveBeenCalledWith(gameId);
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });

    /**
     * Test 400 when game has players
     * Validates: Requirement 3.2, 3.7
     */
    it('should throw error when game has players', async () => {
      const ownerId = 'owner-123';
      const gameId = 'game-123';
      const players = [createMockPlayerEntity('player-1', gameId, 'user-1', 'Player 1')];
      const mockGame = createMockGameEntity(gameId, 'Test Game', ownerId, 'Owner Name', players, []);
      
      mockRepository.findById.mockResolvedValue(mockGame);

      await expect(gameService.deleteGame(gameId, ownerId)).rejects.toThrow(
        'Das Spiel kann nicht gelöscht werden, solange noch andere Mitspieler oder Mitbringer eingetragen sind.'
      );
      
      expect(mockRepository.findById).toHaveBeenCalledWith(gameId);
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });

    /**
     * Test 400 when game has bringers
     * Validates: Requirement 3.2, 3.7
     */
    it('should throw error when game has bringers', async () => {
      const ownerId = 'owner-123';
      const gameId = 'game-123';
      const bringers = [createMockBringerEntity('bringer-1', gameId, 'user-1', 'Bringer 1')];
      const mockGame = createMockGameEntity(gameId, 'Test Game', ownerId, 'Owner Name', [], bringers);
      
      mockRepository.findById.mockResolvedValue(mockGame);

      await expect(gameService.deleteGame(gameId, ownerId)).rejects.toThrow(
        'Das Spiel kann nicht gelöscht werden, solange noch andere Mitspieler oder Mitbringer eingetragen sind.'
      );
      
      expect(mockRepository.findById).toHaveBeenCalledWith(gameId);
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });

    /**
     * Test 400 when game has both players and bringers
     * Validates: Requirement 3.2, 3.7
     */
    it('should throw error when game has both players and bringers', async () => {
      const ownerId = 'owner-123';
      const gameId = 'game-123';
      const players = [createMockPlayerEntity('player-1', gameId, 'user-1', 'Player 1')];
      const bringers = [createMockBringerEntity('bringer-1', gameId, 'user-2', 'Bringer 1')];
      const mockGame = createMockGameEntity(gameId, 'Test Game', ownerId, 'Owner Name', players, bringers);
      
      mockRepository.findById.mockResolvedValue(mockGame);

      await expect(gameService.deleteGame(gameId, ownerId)).rejects.toThrow(
        'Das Spiel kann nicht gelöscht werden, solange noch andere Mitspieler oder Mitbringer eingetragen sind.'
      );
      
      expect(mockRepository.findById).toHaveBeenCalledWith(gameId);
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });

    /**
     * Test that error has correct code for GAME_NOT_FOUND
     */
    it('should set error code to GAME_NOT_FOUND when game does not exist', async () => {
      mockRepository.findById.mockResolvedValue(null);

      try {
        await gameService.deleteGame('non-existent', 'user-123');
        fail('Expected error to be thrown');
      } catch (error) {
        expect((error as Error & { code: string }).code).toBe('GAME_NOT_FOUND');
      }
    });

    /**
     * Test that error has correct code for FORBIDDEN
     */
    it('should set error code to FORBIDDEN when user is not owner', async () => {
      const mockGame = createMockGameEntity('game-123', 'Test Game', 'owner-123', 'Owner', [], []);
      mockRepository.findById.mockResolvedValue(mockGame);

      try {
        await gameService.deleteGame('game-123', 'other-user');
        fail('Expected error to be thrown');
      } catch (error) {
        expect((error as Error & { code: string }).code).toBe('FORBIDDEN');
      }
    });

    /**
     * Test that error has correct code for GAME_NOT_EMPTY
     */
    it('should set error code to GAME_NOT_EMPTY when game has players', async () => {
      const players = [createMockPlayerEntity('player-1', 'game-123', 'user-1', 'Player 1')];
      const mockGame = createMockGameEntity('game-123', 'Test Game', 'owner-123', 'Owner', players, []);
      mockRepository.findById.mockResolvedValue(mockGame);

      try {
        await gameService.deleteGame('game-123', 'owner-123');
        fail('Expected error to be thrown');
      } catch (error) {
        expect((error as Error & { code: string }).code).toBe('GAME_NOT_EMPTY');
      }
    });
  });

  describe('createGame', () => {
    /**
     * Test that createGame sets owner correctly
     * Validates: Requirement 2.2
     */
    it('should create game with owner set to creating user', async () => {
      const userId = 'user-123';
      const gameName = 'New Game';
      const mockGame = createMockGameEntity('game-123', gameName, userId, 'User Name', [], []);
      
      mockRepository.findByName.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(mockGame);

      const result = await gameService.createGame(gameName, userId, false, false, false);

      expect(result.owner).toEqual({ id: userId, name: 'User Name' });
      expect(mockRepository.create).toHaveBeenCalledWith({
        name: gameName,
        userId,
        isBringing: false,
        isPlaying: false,
        isPrototype: false,
        bggId: undefined,
        yearPublished: undefined,
        bggRating: undefined,
        addedAsAlternateName: undefined,
        alternateNames: undefined,
      });
    });

    /**
     * Test that createGame stores BGG data when provided
     * Validates: Requirement 4.3
     */
    it('should create game with BGG data when provided', async () => {
      const userId = 'user-123';
      const gameName = 'Catan';
      const bggId = 13;
      const yearPublished = 1995;
      const mockGame = createMockGameEntity('game-123', gameName, userId, 'User Name', [], [], bggId, yearPublished);
      
      mockRepository.findByName.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(mockGame);

      const result = await gameService.createGame(gameName, userId, false, false, false, bggId, yearPublished);

      expect(result.bggId).toBe(bggId);
      expect(result.yearPublished).toBe(yearPublished);
      expect(mockRepository.create).toHaveBeenCalledWith({
        name: gameName,
        userId,
        isBringing: false,
        isPlaying: false,
        isPrototype: false,
        bggId,
        yearPublished,
        bggRating: undefined,
        addedAsAlternateName: undefined,
        alternateNames: undefined,
      });
    });

    /**
     * Test that createGame stores null for BGG data when not provided
     * Validates: Requirement 4.4
     */
    it('should create game with null BGG data when not provided', async () => {
      const userId = 'user-123';
      const gameName = 'Custom Game';
      const mockGame = createMockGameEntity('game-123', gameName, userId, 'User Name', [], [], null, null);
      
      mockRepository.findByName.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(mockGame);

      const result = await gameService.createGame(gameName, userId, false, false, false);

      expect(result.bggId).toBeNull();
      expect(result.yearPublished).toBeNull();
    });
  });

  describe('getAllGames', () => {
    /**
     * Test that getAllGames includes owner in response
     * Validates: Requirement 2.3
     */
    it('should include owner in game response', async () => {
      const mockGames = [
        createMockGameEntity('game-1', 'Game 1', 'owner-1', 'Owner 1', [], []),
        createMockGameEntity('game-2', 'Game 2', null, null, [], []),
      ];
      mockRepository.findAll.mockResolvedValue(mockGames);

      const result = await gameService.getAllGames();

      expect(result[0].owner).toEqual({ id: 'owner-1', name: 'Owner 1' });
      expect(result[1].owner).toBeNull();
    });

    /**
     * Test that getAllGames includes BGG data in response
     * Validates: Requirement 4.3, 4.4
     */
    it('should include BGG data in game response', async () => {
      const mockGames = [
        createMockGameEntity('game-1', 'Catan', 'owner-1', 'Owner 1', [], [], 13, 1995),
        createMockGameEntity('game-2', 'Custom Game', 'owner-2', 'Owner 2', [], [], null, null),
      ];
      mockRepository.findAll.mockResolvedValue(mockGames);

      const result = await gameService.getAllGames();

      expect(result[0].bggId).toBe(13);
      expect(result[0].yearPublished).toBe(1995);
      expect(result[1].bggId).toBeNull();
      expect(result[1].yearPublished).toBeNull();
    });
  });
});

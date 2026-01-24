/**
 * Integration tests for BGG import and enrichment routes
 * 
 * Requirements: 3.1, 6.1, 6a.1
 */

import express from 'express';
import request from 'supertest';
import bggRoutes from '../bgg.routes';
import { bggImportService } from '../../services/bggImportService';
import { bggEnrichmentService } from '../../services/bggEnrichmentService';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/bgg', bggRoutes);

// Mock the services
jest.mock('../../services/bggImportService', () => ({
  bggImportService: {
    startImport: jest.fn(),
    getStatus: jest.fn(),
  },
}));

jest.mock('../../services/bggEnrichmentService', () => ({
  bggEnrichmentService: {
    startBulkEnrichment: jest.fn(),
    getBulkStatus: jest.fn(),
    enrichGame: jest.fn(),
    stopBulkEnrichment: jest.fn(),
  },
}));

jest.mock('../../lib/prisma', () => ({
  prisma: {
    bggGame: {
      findUnique: jest.fn(),
    },
  },
}));

import { prisma } from '../../lib/prisma';

describe('BGG Import Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/bgg/import', () => {
    it('should return 202 when import starts successfully', async () => {
      (bggImportService.startImport as jest.Mock).mockReturnValue({
        started: true,
        message: 'Import started',
      });

      const response = await request(app).post('/api/bgg/import');

      expect(response.status).toBe(202);
      expect(response.body.message).toBe('Import started');
    });

    it('should return 409 when import is already running', async () => {
      (bggImportService.startImport as jest.Mock).mockReturnValue({
        started: false,
        message: 'Import already in progress',
      });

      const response = await request(app).post('/api/bgg/import');

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('IMPORT_IN_PROGRESS');
    });
  });

  describe('GET /api/bgg/import/status', () => {
    it('should return import status', async () => {
      const mockStatus = {
        running: true,
        processed: 1000,
        total: 172000,
        errors: 5,
        etaSeconds: 3600,
        startedAt: new Date(),
      };

      (bggImportService.getStatus as jest.Mock).mockReturnValue(mockStatus);

      const response = await request(app).get('/api/bgg/import/status');

      expect(response.status).toBe(200);
      expect(response.body.running).toBe(true);
      expect(response.body.processed).toBe(1000);
      expect(response.body.total).toBe(172000);
      expect(response.body.etaSeconds).toBe(3600);
    });

    it('should return idle status when not running', async () => {
      const mockStatus = {
        running: false,
        processed: 0,
        total: 0,
        errors: 0,
        etaSeconds: null,
      };

      (bggImportService.getStatus as jest.Mock).mockReturnValue(mockStatus);

      const response = await request(app).get('/api/bgg/import/status');

      expect(response.status).toBe(200);
      expect(response.body.running).toBe(false);
      expect(response.body.etaSeconds).toBeNull();
    });
  });
});

describe('BGG Enrichment Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/bgg/enrich', () => {
    it('should return 202 when bulk enrichment starts successfully', async () => {
      (bggEnrichmentService.startBulkEnrichment as jest.Mock).mockReturnValue({
        started: true,
        message: 'Bulk enrichment started',
      });

      const response = await request(app).post('/api/bgg/enrich');

      expect(response.status).toBe(202);
      expect(response.body.message).toBe('Bulk enrichment started');
    });

    it('should return 409 when enrichment is already running', async () => {
      (bggEnrichmentService.startBulkEnrichment as jest.Mock).mockReturnValue({
        started: false,
        message: 'Bulk enrichment already in progress',
      });

      const response = await request(app).post('/api/bgg/enrich');

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('ENRICHMENT_IN_PROGRESS');
    });
  });

  describe('GET /api/bgg/enrich/status', () => {
    it('should return enrichment status with bytes transferred', async () => {
      const mockStatus = {
        running: true,
        processed: 500,
        total: 5000,
        skipped: 10,
        errors: 2,
        bytesTransferred: 125000000,
        etaSeconds: 7200,
        startedAt: new Date(),
      };

      (bggEnrichmentService.getBulkStatus as jest.Mock).mockReturnValue(mockStatus);

      const response = await request(app).get('/api/bgg/enrich/status');

      expect(response.status).toBe(200);
      expect(response.body.running).toBe(true);
      expect(response.body.bytesTransferred).toBe(125000000);
      expect(response.body.etaSeconds).toBe(7200);
    });
  });

  describe('POST /api/bgg/enrich/:bggId', () => {
    it('should return enrichment data for valid game', async () => {
      const mockEnrichmentData = {
        alternateNames: [{ name: 'Test Name', language: 'German' }],
        primaryName: 'Test Game',
        description: '<p>Description</p>',
        shortDescription: 'Short desc',
        slug: '/boardgame/123/test-game',
        designers: ['Designer 1'],
        artists: ['Artist 1'],
        publishers: ['Publisher 1'],
        categories: ['Strategy'],
        mechanics: ['Hand Management'],
      };

      (bggEnrichmentService.enrichGame as jest.Mock).mockResolvedValue(mockEnrichmentData);

      const response = await request(app).post('/api/bgg/enrich/123');

      expect(response.status).toBe(200);
      expect(response.body.primaryName).toBe('Test Game');
      expect(response.body.designers).toEqual(['Designer 1']);
    });

    it('should return 404 for unknown game', async () => {
      (bggEnrichmentService.enrichGame as jest.Mock).mockRejectedValue(
        new Error('Game with BGG ID 999999 not found')
      );

      const response = await request(app).post('/api/bgg/enrich/999999');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('GAME_NOT_FOUND');
    });

    it('should return 503 on ScraperAPI failure', async () => {
      (bggEnrichmentService.enrichGame as jest.Mock).mockRejectedValue(
        new Error('Failed to fetch BGG page: 503 Service Unavailable')
      );

      const response = await request(app).post('/api/bgg/enrich/123');

      expect(response.status).toBe(503);
      expect(response.body.error.code).toBe('SCRAPER_ERROR');
    });

    it('should return 400 for invalid bggId', async () => {
      const response = await request(app).post('/api/bgg/enrich/invalid');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_BGG_ID');
    });

    it('should pass force parameter to service', async () => {
      (bggEnrichmentService.enrichGame as jest.Mock).mockResolvedValue({
        alternateNames: [],
        primaryName: 'Test',
        description: '',
        shortDescription: '',
        slug: '',
        designers: [],
        artists: [],
        publishers: [],
        categories: [],
        mechanics: [],
      });

      await request(app).post('/api/bgg/enrich/123?force=true');

      expect(bggEnrichmentService.enrichGame).toHaveBeenCalledWith(123, true);
    });
  });

  describe('DELETE /api/bgg/enrich', () => {
    it('should return 200 when enrichment is stopped successfully', async () => {
      const mockStatus = {
        running: false,
        processed: 500,
        total: 5000,
        skipped: 0,
        errors: 2,
        bytesTransferred: 125000000,
        etaSeconds: null,
        completedAt: new Date(),
      };

      (bggEnrichmentService.stopBulkEnrichment as jest.Mock).mockReturnValue({
        stopped: true,
        message: 'Stop requested - will complete current game and stop',
        status: mockStatus,
      });

      const response = await request(app).delete('/api/bgg/enrich');

      expect(response.status).toBe(200);
      expect(response.body.stopped).toBe(true);
      expect(response.body.status.processed).toBe(500);
    });

    it('should return 409 when no enrichment is running', async () => {
      (bggEnrichmentService.stopBulkEnrichment as jest.Mock).mockReturnValue({
        stopped: false,
        message: 'No bulk enrichment is running',
        status: {
          running: false,
          processed: 0,
          total: 0,
          skipped: 0,
          errors: 0,
          bytesTransferred: 0,
          etaSeconds: null,
        },
      });

      const response = await request(app).delete('/api/bgg/enrich');

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('NO_ENRICHMENT_RUNNING');
    });
  });
});

describe('BGG Game Data Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/bgg/:bggId', () => {
    it('should return complete game data for valid bggId', async () => {
      const mockGame = {
        id: 224517,
        name: 'Brass: Birmingham',
        yearPublished: 2018,
        rank: 1,
        bayesAverage: 8.3974,
        average: 8.56858,
        usersRated: 56355,
        isExpansion: false,
        abstractsRank: null,
        cgsRank: null,
        childrensGamesRank: null,
        familyGamesRank: null,
        partyGamesRank: null,
        strategyGamesRank: 1,
        thematicRank: null,
        warGamesRank: null,
        scrapingDone: true,
        enrichedAt: new Date(),
        enrichmentData: {
          primaryName: 'Brass: Birmingham',
          designers: ['Gavan Brown', 'Matt Tolman', 'Martin Wallace'],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.bggGame.findUnique as jest.Mock).mockResolvedValue(mockGame);

      const response = await request(app).get('/api/bgg/224517');

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(224517);
      expect(response.body.name).toBe('Brass: Birmingham');
      expect(response.body.scrapingDone).toBe(true);
      expect(response.body.enrichmentData.primaryName).toBe('Brass: Birmingham');
    });

    it('should return 404 for unknown game', async () => {
      (prisma.bggGame.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get('/api/bgg/999999');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('GAME_NOT_FOUND');
    });

    it('should return 400 for invalid bggId', async () => {
      const response = await request(app).get('/api/bgg/invalid');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_BGG_ID');
    });

    it('should return game without enrichment data if not enriched', async () => {
      const mockGame = {
        id: 123456,
        name: 'Test Game',
        yearPublished: 2020,
        rank: 100,
        scrapingDone: false,
        enrichedAt: null,
        enrichmentData: null,
      };

      (prisma.bggGame.findUnique as jest.Mock).mockResolvedValue(mockGame);

      const response = await request(app).get('/api/bgg/123456');

      expect(response.status).toBe(200);
      expect(response.body.scrapingDone).toBe(false);
      expect(response.body.enrichmentData).toBeNull();
    });
  });
});

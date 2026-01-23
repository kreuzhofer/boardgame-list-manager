/**
 * Unit tests for BGG image endpoint
 * 
 * Tests the /api/bgg/image/:bggId/:size endpoint
 * 
 * Requirements: 3.1, 3.2
 */

import express from 'express';
import request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock the bggImageService before importing routes
const mockGetImage = jest.fn();
const mockGetContentType = jest.fn();
jest.mock('../../services', () => ({
  ...jest.requireActual('../../services'),
  bggImageService: {
    getImage: mockGetImage,
    getContentType: mockGetContentType,
  },
}));

import bggRoutes from '../bgg.routes';

describe('BGG Image Endpoint', () => {
  let app: express.Application;
  let tempDir: string;

  beforeAll(() => {
    app = express();
    app.use('/api/bgg', bggRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bgg-image-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('GET /api/bgg/image/:bggId/:size', () => {
    it('should return 400 for invalid BGG ID (non-numeric)', async () => {
      const response = await request(app)
        .get('/api/bgg/image/abc/micro')
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_BGG_ID');
    });

    it('should return 400 for invalid BGG ID (negative)', async () => {
      const response = await request(app)
        .get('/api/bgg/image/-123/micro')
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_BGG_ID');
    });

    it('should return 400 for invalid BGG ID (zero)', async () => {
      const response = await request(app)
        .get('/api/bgg/image/0/micro')
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_BGG_ID');
    });

    it('should return 400 for invalid size', async () => {
      const response = await request(app)
        .get('/api/bgg/image/12345/large')
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_SIZE');
    });

    it('should return 404 when image not found', async () => {
      mockGetImage.mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/api/bgg/image/12345/micro')
        .expect(404);

      expect(response.body.error.code).toBe('IMAGE_NOT_FOUND');
      expect(mockGetImage).toHaveBeenCalledWith(12345, 'micro');
    });

    it('should return image with correct content-type for micro size', async () => {
      // Create a fake image file
      const imagePath = path.join(tempDir, '12345-micro.jpg');
      fs.writeFileSync(imagePath, Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]));
      
      mockGetImage.mockResolvedValueOnce(imagePath);
      mockGetContentType.mockReturnValueOnce('image/jpeg');

      const response = await request(app)
        .get('/api/bgg/image/12345/micro')
        .expect(200);

      expect(response.headers['content-type']).toBe('image/jpeg');
      expect(mockGetImage).toHaveBeenCalledWith(12345, 'micro');
    });

    it('should return image with correct content-type for square200 size', async () => {
      // Create a fake image file
      const imagePath = path.join(tempDir, '12345-square200.jpg');
      fs.writeFileSync(imagePath, Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]));
      
      mockGetImage.mockResolvedValueOnce(imagePath);
      mockGetContentType.mockReturnValueOnce('image/jpeg');

      const response = await request(app)
        .get('/api/bgg/image/12345/square200')
        .expect(200);

      expect(response.headers['content-type']).toBe('image/jpeg');
      expect(mockGetImage).toHaveBeenCalledWith(12345, 'square200');
    });

    it('should set cache headers on successful response', async () => {
      // Create a fake image file
      const imagePath = path.join(tempDir, '12345-micro.jpg');
      fs.writeFileSync(imagePath, Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]));
      
      mockGetImage.mockResolvedValueOnce(imagePath);
      mockGetContentType.mockReturnValueOnce('image/jpeg');

      const response = await request(app)
        .get('/api/bgg/image/12345/micro')
        .expect(200);

      expect(response.headers['cache-control']).toBe('public, max-age=2592000');
    });

    it('should return 503 when service throws error', async () => {
      mockGetImage.mockRejectedValueOnce(new Error('Service error'));

      const response = await request(app)
        .get('/api/bgg/image/12345/micro')
        .expect(503);

      expect(response.body.error.code).toBe('SERVICE_UNAVAILABLE');
    });

    it('should accept valid BGG IDs', async () => {
      const imagePath = path.join(tempDir, '174430-micro.jpg');
      fs.writeFileSync(imagePath, Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]));
      
      mockGetImage.mockResolvedValueOnce(imagePath);
      mockGetContentType.mockReturnValueOnce('image/jpeg');

      await request(app)
        .get('/api/bgg/image/174430/micro')
        .expect(200);

      expect(mockGetImage).toHaveBeenCalledWith(174430, 'micro');
    });

    it('should return webp content-type when image is webp', async () => {
      const imagePath = path.join(tempDir, '12345-micro.jpg');
      fs.writeFileSync(imagePath, Buffer.from([0x52, 0x49, 0x46, 0x46])); // RIFF header
      
      mockGetImage.mockResolvedValueOnce(imagePath);
      mockGetContentType.mockReturnValueOnce('image/webp');

      const response = await request(app)
        .get('/api/bgg/image/12345/micro')
        .expect(200);

      expect(response.headers['content-type']).toBe('image/webp');
    });
  });
});

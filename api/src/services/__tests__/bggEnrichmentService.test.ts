/**
 * Unit tests for BggEnrichmentService
 * 
 * Requirements: 4.2, 4.3, 6.3
 */

import { BggEnrichmentService } from '../bggEnrichmentService';

describe('BggEnrichmentService Unit Tests', () => {
  const service = new BggEnrichmentService();

  // Sample BGG HTML with GEEK.geekitemPreload (simplified)
  const sampleBggHtml = `
    <html>
    <script>
    GEEK.geekitemPreload = {
      "item": {
        "name": "Brass: Birmingham",
        "href": "/boardgame/224517/brass-birmingham",
        "description": "<p>Brass: Birmingham is an economic strategy game.</p>",
        "short_description": "Build networks and industries in Birmingham.",
        "alternatenames": [
          {"name": "工業革命：伯明翰", "language": "Chinese"},
          {"name": "ブラス：バーミンガム", "language": "Japanese"}
        ],
        "links": {
          "boardgamedesigner": [
            {"name": "Gavan Brown"},
            {"name": "Matt Tolman"},
            {"name": "Martin Wallace"}
          ],
          "boardgameartist": [
            {"name": "Lina Cossette"},
            {"name": "David Forest"}
          ],
          "boardgamepublisher": [
            {"name": "Roxley"},
            {"name": "Funforge"}
          ],
          "boardgamecategory": [
            {"name": "Economic"},
            {"name": "Industry / Manufacturing"}
          ],
          "boardgamemechanic": [
            {"name": "Hand Management"},
            {"name": "Network and Route Building"}
          ]
        }
      }
    };
    GEEK.geekitemSettings = {};
    </script>
    </html>
  `;

  describe('extractEnrichmentData', () => {
    it('should extract all fields from valid BGG HTML', () => {
      const result = service.extractEnrichmentData(sampleBggHtml);

      expect(result.primaryName).toBe('Brass: Birmingham');
      expect(result.slug).toBe('/boardgame/224517/brass-birmingham');
      expect(result.description).toContain('economic strategy game');
      expect(result.shortDescription).toBe('Build networks and industries in Birmingham.');
    });

    it('should extract alternate names correctly', () => {
      const result = service.extractEnrichmentData(sampleBggHtml);

      expect(result.alternateNames).toHaveLength(2);
      expect(result.alternateNames[0].name).toBe('工業革命：伯明翰');
      expect(result.alternateNames[1].name).toBe('ブラス：バーミンガム');
    });

    it('should extract designers correctly', () => {
      const result = service.extractEnrichmentData(sampleBggHtml);

      expect(result.designers).toEqual(['Gavan Brown', 'Matt Tolman', 'Martin Wallace']);
    });

    it('should extract artists correctly', () => {
      const result = service.extractEnrichmentData(sampleBggHtml);

      expect(result.artists).toEqual(['Lina Cossette', 'David Forest']);
    });

    it('should extract publishers correctly', () => {
      const result = service.extractEnrichmentData(sampleBggHtml);

      expect(result.publishers).toEqual(['Roxley', 'Funforge']);
    });

    it('should extract categories correctly', () => {
      const result = service.extractEnrichmentData(sampleBggHtml);

      expect(result.categories).toEqual(['Economic', 'Industry / Manufacturing']);
    });

    it('should extract mechanics correctly', () => {
      const result = service.extractEnrichmentData(sampleBggHtml);

      expect(result.mechanics).toEqual(['Hand Management', 'Network and Route Building']);
    });

    it('should handle page with no alternate names', () => {
      const html = `
        <html><script>
        GEEK.geekitemPreload = {
          "item": {
            "name": "Simple Game",
            "links": {}
          }
        };
        GEEK.geekitemSettings = {};
        </script></html>
      `;
      const result = service.extractEnrichmentData(html);

      expect(result.alternateNames).toEqual([]);
      expect(result.primaryName).toBe('Simple Game');
    });

    it('should handle page with no designers', () => {
      const html = `
        <html><script>
        GEEK.geekitemPreload = {
          "item": {
            "name": "No Designer Game",
            "links": {
              "boardgamecategory": [{"name": "Card Game"}]
            }
          }
        };
        GEEK.geekitemSettings = {};
        </script></html>
      `;
      const result = service.extractEnrichmentData(html);

      expect(result.designers).toEqual([]);
      expect(result.categories).toEqual(['Card Game']);
    });

    it('should throw error for invalid HTML', () => {
      expect(() => service.extractEnrichmentData('<html></html>')).toThrow();
    });
  });

  describe('getBulkStatus', () => {
    it('should return correct initial status format', () => {
      const status = service.getBulkStatus();

      expect(status).toHaveProperty('running');
      expect(status).toHaveProperty('processed');
      expect(status).toHaveProperty('total');
      expect(status).toHaveProperty('skipped');
      expect(status).toHaveProperty('errors');
      expect(status).toHaveProperty('bytesTransferred');
      expect(status).toHaveProperty('etaSeconds');

      expect(status.running).toBe(false);
      expect(status.processed).toBe(0);
      expect(status.bytesTransferred).toBe(0);
    });
  });

  describe('formatBytes', () => {
    it('should format bytes correctly', () => {
      expect(service.formatBytes(0)).toBe('0 B');
      expect(service.formatBytes(512)).toBe('512 B');
      expect(service.formatBytes(1024)).toBe('1.0 KB');
      expect(service.formatBytes(1024 * 1024)).toBe('1.0 MB');
      expect(service.formatBytes(1024 * 1024 * 1024)).toBe('1.00 GB');
      expect(service.formatBytes(1536)).toBe('1.5 KB');
    });
  });
});

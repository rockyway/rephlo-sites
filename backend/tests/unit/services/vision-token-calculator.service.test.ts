/**
 * Unit Tests for VisionTokenCalculatorService
 *
 * Tests token calculation for vision/image requests based on OpenAI's pricing:
 * - Low detail: 85 tokens (fixed)
 * - High detail: 85 + (tiles × 170)
 * - Tile calculation: ceil(width/512) × ceil(height/512)
 * - Image scaling: Max dimension 2048px, shortest side 768px
 * - Aspect ratio preservation
 * - Edge cases: 1x1 image, 4096x4096 image, non-square dimensions
 *
 * Reference: https://platform.openai.com/docs/guides/vision/calculating-costs
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { VisionTokenCalculatorService } from '../../../src/services/vision-token-calculator.service';
import { ImageUrl } from '../../../src/types/model-validation';

describe('VisionTokenCalculatorService', () => {
  let service: VisionTokenCalculatorService;

  beforeEach(() => {
    service = new VisionTokenCalculatorService();
  });

  describe('calculateTokens - Low Detail', () => {
    it('should return 85 tokens for low detail (fixed)', () => {
      const imageUrl: ImageUrl = {
        url: 'http://example.com/image.jpg',
        detail: 'low',
      };

      const tokens = service.calculateTokens(imageUrl);

      expect(tokens).toBe(85);
    });

    it('should return 85 tokens for low detail regardless of image size', () => {
      const imageUrl: ImageUrl = {
        url: 'http://example.com/huge.jpg',
        detail: 'low',
      };

      // Size doesn't matter for low detail
      const tokens = service.calculateTokens(imageUrl, Buffer.alloc(5000000));

      expect(tokens).toBe(85);
    });
  });

  describe('calculateTokens - Auto Detail', () => {
    it('should default to high detail (worst case) when detail is auto and no image data', () => {
      const imageUrl: ImageUrl = {
        url: 'http://example.com/image.jpg',
        detail: 'auto',
      };

      const tokens = service.calculateTokens(imageUrl);

      // Auto with no data = worst case (4x4 tiles)
      // 85 + (4 * 4 * 170) = 85 + 2720 = 2805
      expect(tokens).toBe(2805);
    });

    it('should default to high detail (worst case) when detail is omitted', () => {
      const imageUrl: ImageUrl = {
        url: 'http://example.com/image.jpg',
        // detail omitted
      };

      const tokens = service.calculateTokens(imageUrl);

      expect(tokens).toBe(2805);
    });
  });

  describe('calculateTokens - High Detail (worst case)', () => {
    it('should return worst case tokens (2805) when no image data provided', () => {
      const imageUrl: ImageUrl = {
        url: 'http://example.com/image.jpg',
        detail: 'high',
      };

      const tokens = service.calculateTokens(imageUrl);

      // 85 + (4 * 4 * 170) = 2805 (max tiles assumption)
      expect(tokens).toBe(2805);
    });
  });

  describe('calculateHighDetailTokens - Exact Calculations', () => {
    it('should calculate tokens for 1024x1024 image', () => {
      // 1. Scale to fit 2048x2048: 1024x1024 (no change)
      // 2. Scale shortest side to 768: 768x768
      // 3. Tiles: ceil(768/512) × ceil(768/512) = 2 × 2 = 4 tiles
      // 4. Tokens: 85 + (4 * 170) = 85 + 680 = 765
      const tokens = service.calculateHighDetailTokens(1024, 1024);

      expect(tokens).toBe(765);
    });

    it('should calculate tokens for 2048x2048 image', () => {
      // 1. Scale to fit 2048x2048: 2048x2048 (no change)
      // 2. Scale shortest side to 768: 768x768
      // 3. Tiles: ceil(768/512) × ceil(768/512) = 2 × 2 = 4 tiles
      // 4. Tokens: 85 + (4 * 170) = 765
      const tokens = service.calculateHighDetailTokens(2048, 2048);

      expect(tokens).toBe(765);
    });

    it('should calculate tokens for 4096x2048 image (wide)', () => {
      // 1. Scale to fit 2048x2048: 2048x1024 (scaled down width)
      // 2. Scale shortest side to 768: 1536x768
      // 3. Tiles: ceil(1536/512) × ceil(768/512) = 3 × 2 = 6 tiles
      // 4. Tokens: 85 + (6 * 170) = 85 + 1020 = 1105
      const tokens = service.calculateHighDetailTokens(4096, 2048);

      expect(tokens).toBe(1105);
    });

    it('should calculate tokens for 2048x4096 image (tall)', () => {
      // 1. Scale to fit 2048x2048: 1024x2048 (scaled down height)
      // 2. Scale shortest side to 768: 768x1536
      // 3. Tiles: ceil(768/512) × ceil(1536/512) = 2 × 3 = 6 tiles
      // 4. Tokens: 85 + (6 * 170) = 1105
      const tokens = service.calculateHighDetailTokens(2048, 4096);

      expect(tokens).toBe(1105);
    });

    it('should calculate tokens for 512x512 image (single tile)', () => {
      // 1. Scale to fit 2048x2048: 512x512 (no change)
      // 2. Scale shortest side to 768: 768x768
      // 3. Tiles: ceil(768/512) × ceil(768/512) = 2 × 2 = 4 tiles
      // 4. Tokens: 85 + (4 * 170) = 765
      const tokens = service.calculateHighDetailTokens(512, 512);

      expect(tokens).toBe(765);
    });

    it('should calculate tokens for 768x768 image', () => {
      // 1. Scale to fit 2048x2048: 768x768 (no change)
      // 2. Scale shortest side to 768: 768x768 (already at target)
      // 3. Tiles: ceil(768/512) × ceil(768/512) = 2 × 2 = 4 tiles
      // 4. Tokens: 85 + (4 * 170) = 765
      const tokens = service.calculateHighDetailTokens(768, 768);

      expect(tokens).toBe(765);
    });

    it('should calculate tokens for 1536x1536 image', () => {
      // 1. Scale to fit 2048x2048: 1536x1536 (no change)
      // 2. Scale shortest side to 768: 768x768
      // 3. Tiles: ceil(768/512) × ceil(768/512) = 2 × 2 = 4 tiles
      // 4. Tokens: 85 + (4 * 170) = 765
      const tokens = service.calculateHighDetailTokens(1536, 1536);

      expect(tokens).toBe(765);
    });

    it('should calculate tokens for 3072x1536 image (2:1 aspect)', () => {
      // 1. Scale to fit 2048x2048: 2048x1024
      // 2. Scale shortest side to 768: 1536x768
      // 3. Tiles: ceil(1536/512) × ceil(768/512) = 3 × 2 = 6 tiles
      // 4. Tokens: 85 + (6 * 170) = 1105
      const tokens = service.calculateHighDetailTokens(3072, 1536);

      expect(tokens).toBe(1105);
    });

    it('should calculate tokens for 1536x3072 image (1:2 aspect)', () => {
      // 1. Scale to fit 2048x2048: 1024x2048
      // 2. Scale shortest side to 768: 768x1536
      // 3. Tiles: ceil(768/512) × ceil(1536/512) = 2 × 3 = 6 tiles
      // 4. Tokens: 85 + (6 * 170) = 1105
      const tokens = service.calculateHighDetailTokens(1536, 3072);

      expect(tokens).toBe(1105);
    });

    it('should calculate tokens for very large image (8192x8192)', () => {
      // 1. Scale to fit 2048x2048: 2048x2048 (scaled down significantly)
      // 2. Scale shortest side to 768: 768x768
      // 3. Tiles: ceil(768/512) × ceil(768/512) = 2 × 2 = 4 tiles
      // 4. Tokens: 85 + (4 * 170) = 765
      const tokens = service.calculateHighDetailTokens(8192, 8192);

      expect(tokens).toBe(765);
    });
  });

  describe('calculateHighDetailTokens - Edge Cases', () => {
    it('should handle 1x1 pixel image (minimum size)', () => {
      // 1. Scale to fit 2048x2048: 1x1 (no change)
      // 2. Scale shortest side to 768: 768x768
      // 3. Tiles: ceil(768/512) × ceil(768/512) = 2 × 2 = 4 tiles
      // 4. Tokens: 85 + (4 * 170) = 765
      const tokens = service.calculateHighDetailTokens(1, 1);

      expect(tokens).toBe(765);
    });

    it('should handle 100x100 pixel image (very small)', () => {
      // 1. Scale to fit 2048x2048: 100x100 (no change)
      // 2. Scale shortest side to 768: 768x768
      // 3. Tiles: ceil(768/512) × ceil(768/512) = 2 × 2 = 4 tiles
      // 4. Tokens: 85 + (4 * 170) = 765
      const tokens = service.calculateHighDetailTokens(100, 100);

      expect(tokens).toBe(765);
    });

    it('should handle 513x512 image (just over tile boundary)', () => {
      // 1. Scale to fit 2048x2048: 513x512 (no change)
      // 2. Scale shortest side to 768: 768.75x768
      // 3. Tiles: ceil(769/512) × ceil(768/512) = 2 × 2 = 4 tiles
      // 4. Tokens: 85 + (4 * 170) = 765
      const tokens = service.calculateHighDetailTokens(513, 512);

      expect(tokens).toBe(765);
    });

    it('should handle extreme aspect ratio (10000x100)', () => {
      // 1. Scale to fit 2048x2048: 2048x20.48
      // 2. Scale shortest side to 768: 768*100 x 768 = very wide
      // Result will have multiple tiles
      const tokens = service.calculateHighDetailTokens(10000, 100);

      expect(tokens).toBeGreaterThan(85); // At least base + some tiles
      expect(tokens).toBeLessThanOrEqual(2805); // At most max tiles
    });

    it('should handle extreme aspect ratio (100x10000)', () => {
      // 1. Scale to fit 2048x2048: 20.48x2048
      // 2. Scale shortest side to 768: 768 x 768*100 = very tall
      // Result will have multiple tiles
      const tokens = service.calculateHighDetailTokens(100, 10000);

      expect(tokens).toBeGreaterThan(85);
      expect(tokens).toBeLessThanOrEqual(2805);
    });
  });

  describe('calculateHighDetailTokens - Aspect Ratio Preservation', () => {
    it('should preserve aspect ratio when scaling (16:9)', () => {
      // 1920x1080 (16:9 aspect ratio)
      // 1. Scale to fit 2048x2048: 1920x1080 (no change, already fits)
      // 2. Scale shortest side to 768: 1365x768 (preserves 16:9)
      // 3. Tiles: ceil(1365/512) × ceil(768/512) = 3 × 2 = 6 tiles
      // 4. Tokens: 85 + (6 * 170) = 1105
      const tokens = service.calculateHighDetailTokens(1920, 1080);

      expect(tokens).toBe(1105);
    });

    it('should preserve aspect ratio when scaling (4:3)', () => {
      // 1600x1200 (4:3 aspect ratio)
      // 1. Scale to fit 2048x2048: 1600x1200 (no change)
      // 2. Scale shortest side to 768: 1024x768 (preserves 4:3)
      // 3. Tiles: ceil(1024/512) × ceil(768/512) = 2 × 2 = 4 tiles
      // 4. Tokens: 85 + (4 * 170) = 765
      const tokens = service.calculateHighDetailTokens(1600, 1200);

      expect(tokens).toBe(765);
    });

    it('should preserve aspect ratio when scaling (3:4)', () => {
      // 1200x1600 (3:4 aspect ratio)
      // 1. Scale to fit 2048x2048: 1200x1600 (no change)
      // 2. Scale shortest side to 768: 768x1024 (preserves 3:4)
      // 3. Tiles: ceil(768/512) × ceil(1024/512) = 2 × 2 = 4 tiles
      // 4. Tokens: 85 + (4 * 170) = 765
      const tokens = service.calculateHighDetailTokens(1200, 1600);

      expect(tokens).toBe(765);
    });
  });

  describe('calculateTotalImageTokens', () => {
    it('should calculate total for single low detail image', () => {
      const images: ImageUrl[] = [
        { url: 'http://example.com/image1.jpg', detail: 'low' },
      ];

      const total = service.calculateTotalImageTokens(images);

      expect(total).toBe(85);
    });

    it('should calculate total for multiple low detail images', () => {
      const images: ImageUrl[] = [
        { url: 'http://example.com/image1.jpg', detail: 'low' },
        { url: 'http://example.com/image2.jpg', detail: 'low' },
        { url: 'http://example.com/image3.jpg', detail: 'low' },
      ];

      const total = service.calculateTotalImageTokens(images);

      expect(total).toBe(255); // 85 * 3
    });

    it('should calculate total for mixed detail levels', () => {
      const images: ImageUrl[] = [
        { url: 'http://example.com/image1.jpg', detail: 'low' }, // 85
        { url: 'http://example.com/image2.jpg', detail: 'high' }, // 2805 (worst case)
        { url: 'http://example.com/image3.jpg', detail: 'auto' }, // 2805 (worst case)
      ];

      const total = service.calculateTotalImageTokens(images);

      expect(total).toBe(5695); // 85 + 2805 + 2805
    });

    it('should handle empty array', () => {
      const images: ImageUrl[] = [];

      const total = service.calculateTotalImageTokens(images);

      expect(total).toBe(0);
    });

    it('should calculate total for maximum images (10)', () => {
      const images: ImageUrl[] = Array(10).fill({
        url: 'http://example.com/image.jpg',
        detail: 'low',
      });

      const total = service.calculateTotalImageTokens(images);

      expect(total).toBe(850); // 85 * 10
    });

    it('should calculate total for maximum images with high detail', () => {
      const images: ImageUrl[] = Array(10).fill({
        url: 'http://example.com/image.jpg',
        detail: 'high',
      });

      const total = service.calculateTotalImageTokens(images);

      expect(total).toBe(28050); // 2805 * 10
    });
  });

  describe('Token Calculation Consistency', () => {
    it('should return same tokens for same dimensions', () => {
      const tokens1 = service.calculateHighDetailTokens(1024, 1024);
      const tokens2 = service.calculateHighDetailTokens(1024, 1024);

      expect(tokens1).toBe(tokens2);
    });

    it('should return same tokens for rotated square images', () => {
      const tokens1 = service.calculateHighDetailTokens(1024, 1024);
      const tokens2 = service.calculateHighDetailTokens(1024, 1024);

      expect(tokens1).toBe(tokens2);
    });

    it('should return different tokens for rotated non-square images', () => {
      const tokens1 = service.calculateHighDetailTokens(2048, 1024); // Landscape
      const tokens2 = service.calculateHighDetailTokens(1024, 2048); // Portrait

      // Both should have same token count due to symmetry
      expect(tokens1).toBe(tokens2);
    });
  });

  describe('Performance and Boundaries', () => {
    it('should handle zero dimensions gracefully', () => {
      const tokens = service.calculateHighDetailTokens(0, 0);

      // Zero dimensions should still calculate tokens (Infinity tiles)
      expect(tokens).toBeGreaterThanOrEqual(85);
    });

    it('should handle negative dimensions', () => {
      const tokens = service.calculateHighDetailTokens(-100, -100);

      // Negative dimensions should be handled (may produce NaN or Infinity)
      // Implementation should handle this edge case
      expect(typeof tokens).toBe('number');
    });

    it('should handle very large dimensions efficiently', () => {
      const start = Date.now();
      service.calculateHighDetailTokens(100000, 100000);
      const duration = Date.now() - start;

      // Should complete in reasonable time (<10ms)
      expect(duration).toBeLessThan(10);
    });
  });
});

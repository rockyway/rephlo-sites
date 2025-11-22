/**
 * Vision Token Calculator Service
 *
 * Calculates token cost for vision/image requests based on OpenAI's pricing model.
 * - Low detail: 85 tokens (fixed)
 * - High detail: 85 + (tiles × 170)
 *   - Tiles = ceil(width/512) × ceil(height/512)
 *   - Images scaled to fit 2048px max dimension (aspect ratio preserved)
 *
 * Reference:
 * - OpenAI Vision Token Calculation: https://platform.openai.com/docs/guides/vision/calculating-costs
 * - Plan 204 (Vision/Image Support) - Phase 1
 */

import { injectable } from 'tsyringe';
import { ImageUrl } from '../types/model-validation';
import logger from '../utils/logger';

@injectable()
export class VisionTokenCalculatorService {
  /**
   * Calculates tokens for a single image
   *
   * @param imageUrl - Image URL object with detail level
   * @param imageData - Optional buffer for dimension extraction (future enhancement)
   * @returns Token count
   */
  calculateTokens(
    imageUrl: ImageUrl,
    imageData?: Buffer
  ): number {
    const detail = imageUrl.detail || 'auto';

    // Low detail: Fixed 85 tokens regardless of size
    if (detail === 'low') {
      return 85;
    }

    // Auto: Default to high detail for accurate calculation
    const effectiveDetail = detail === 'auto' ? 'high' : detail;

    // High detail: Calculate based on tiles
    if (effectiveDetail === 'high') {
      // If dimensions unknown, assume worst case (max tiles)
      // Future enhancement: Extract dimensions from imageData buffer
      if (!imageData) {
        logger.warn('VisionTokenCalculator: Missing image data for high detail, assuming max tiles');
        return 85 + (4 * 4 * 170);  // 85 + 2720 = 2805 tokens (worst case)
      }

      // Future: Extract dimensions from buffer and calculate tiles
      // For now, return worst case
      return 85 + (4 * 4 * 170);
    }

    // Fallback
    return 85;
  }

  /**
   * Calculates tokens for high detail image with known dimensions
   *
   * @param width - Image width in pixels
   * @param height - Image height in pixels
   * @returns Token count
   */
  calculateHighDetailTokens(width: number, height: number): number {
    // 1. Scale image to fit within 2048 x 2048, preserving aspect ratio
    const maxDimension = 2048;
    let scaledWidth = width;
    let scaledHeight = height;

    if (width > maxDimension || height > maxDimension) {
      const scale = Math.min(maxDimension / width, maxDimension / height);
      scaledWidth = Math.floor(width * scale);
      scaledHeight = Math.floor(height * scale);
    }

    // 2. Scale shortest side to 768px
    const targetShortSide = 768;
    const shortSide = Math.min(scaledWidth, scaledHeight);
    const scaleToTarget = targetShortSide / shortSide;

    scaledWidth = Math.floor(scaledWidth * scaleToTarget);
    scaledHeight = Math.floor(scaledHeight * scaleToTarget);

    // 3. Calculate number of 512px tiles
    const tileSize = 512;
    const tilesWidth = Math.ceil(scaledWidth / tileSize);
    const tilesHeight = Math.ceil(scaledHeight / tileSize);
    const totalTiles = tilesWidth * tilesHeight;

    // 4. Calculate tokens: 85 base + (tiles * 170)
    const tokens = 85 + (totalTiles * 170);

    logger.debug('VisionTokenCalculator: Image token calculation', {
      originalSize: { width, height },
      scaledSize: { width: scaledWidth, height: scaledHeight },
      tiles: { width: tilesWidth, height: tilesHeight, total: totalTiles },
      tokens,
    });

    return tokens;
  }

  /**
   * Calculates total tokens for all images in a request
   *
   * @param images - Array of image URLs with detail levels
   * @returns Total token count
   */
  calculateTotalImageTokens(images: ImageUrl[]): number {
    return images.reduce((total, imageUrl) => {
      return total + this.calculateTokens(imageUrl);
    }, 0);
  }
}

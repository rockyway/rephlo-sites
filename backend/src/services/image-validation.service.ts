/**
 * Image Validation Service
 *
 * Validates image URLs and base64 data URIs for vision/image processing.
 * - Validates HTTP(S) URLs with HEAD request (checks size, content-type)
 * - Validates base64 data URIs (checks format, size, decoding)
 * - SSRF protection: Blocks private IP ranges
 * - Enforces 20MB image size limit
 * - Supports JPEG, PNG, GIF, WebP formats
 *
 * Reference: Plan 204 (Vision/Image Support) - Phase 1
 */

import { injectable } from 'tsyringe';
import axios from 'axios';
import logger from '../utils/logger';

export interface ImageValidationResult {
  valid: boolean;
  sizeBytes?: number;
  format?: string;
  width?: number;
  height?: number;
  error?: string;
}

@injectable()
export class ImageValidationService {
  /**
   * Validates an image URL or data URI
   * For URLs: performs HTTP HEAD to check size/format
   * For data URIs: decodes and validates base64
   */
  async validateImage(imageUrl: string, maxSizeBytes: number = 20971520): Promise<ImageValidationResult> {
    if (imageUrl.startsWith('data:image/')) {
      return this.validateDataUri(imageUrl, maxSizeBytes);
    }
    return this.validateHttpUrl(imageUrl, maxSizeBytes);
  }

  /**
   * Validates HTTP(S) image URL
   * Checks: accessibility, content-type, size
   * Prevents SSRF by blocking private IP ranges
   */
  private async validateHttpUrl(url: string, maxSizeBytes: number): Promise<ImageValidationResult> {
    try {
      // SSRF Protection: Block private IP ranges
      const parsedUrl = new URL(url);
      if (this.isPrivateIp(parsedUrl.hostname)) {
        return {
          valid: false,
          error: 'Private IP addresses are not allowed',
        };
      }

      // HTTP HEAD request to check size/type without downloading
      const response = await axios.head(url, {
        timeout: 2000,  // 2-second timeout
        maxRedirects: 3,
      });

      const contentType = response.headers['content-type'];
      const contentLength = parseInt(response.headers['content-length'] || '0', 10);

      // Validate content type
      if (!contentType?.startsWith('image/')) {
        return {
          valid: false,
          error: `Invalid content type: ${contentType}. Expected image/*`,
        };
      }

      // Validate size
      if (contentLength > maxSizeBytes) {
        return {
          valid: false,
          error: `Image size ${contentLength} bytes exceeds maximum ${maxSizeBytes} bytes`,
        };
      }

      // Extract format from content-type
      const format = contentType.split('/')[1]?.split(';')[0];

      return {
        valid: true,
        sizeBytes: contentLength,
        format,
      };
    } catch (error) {
      logger.error('ImageValidationService: HTTP URL validation failed', {
        url,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Failed to validate image URL',
      };
    }
  }

  /**
   * Validates data URI (base64-encoded image)
   * Format: data:image/png;base64,iVBORw0KG...
   */
  private validateDataUri(dataUri: string, maxSizeBytes: number): ImageValidationResult {
    try {
      // Parse data URI
      const matches = dataUri.match(/^data:image\/([a-z]+);base64,(.+)$/i);
      if (!matches) {
        return {
          valid: false,
          error: 'Invalid data URI format',
        };
      }

      const format = matches[1].toLowerCase();
      const base64Data = matches[2];

      // Decode base64 to check size
      const buffer = Buffer.from(base64Data, 'base64');
      const sizeBytes = buffer.length;

      if (sizeBytes > maxSizeBytes) {
        return {
          valid: false,
          error: `Image size ${sizeBytes} bytes exceeds maximum ${maxSizeBytes} bytes`,
        };
      }

      // Validate format
      const supportedFormats = ['jpeg', 'jpg', 'png', 'gif', 'webp'];
      if (!supportedFormats.includes(format)) {
        return {
          valid: false,
          error: `Unsupported format: ${format}. Supported: ${supportedFormats.join(', ')}`,
        };
      }

      return {
        valid: true,
        sizeBytes,
        format,
      };
    } catch (error) {
      logger.error('ImageValidationService: Data URI validation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        valid: false,
        error: 'Failed to decode data URI',
      };
    }
  }

  /**
   * SSRF Protection: Check if hostname is a private IP
   */
  private isPrivateIp(hostname: string): boolean {
    const privateRanges = [
      /^127\./,           // 127.0.0.0/8 (loopback)
      /^10\./,            // 10.0.0.0/8 (private)
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12 (private)
      /^192\.168\./,      // 192.168.0.0/16 (private)
      /^169\.254\./,      // 169.254.0.0/16 (link-local)
      /^localhost$/i,     // localhost
    ];

    return privateRanges.some(range => range.test(hostname));
  }
}

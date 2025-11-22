# Plan 204: Vision/Image Support in Chat Completions API

**Status**: Draft
**Created**: 2025-01-19
**Category**: Feature Implementation
**Priority**: Medium
**Complexity**: High

---

## Executive Summary

Implement vision/image processing capabilities in the Chat Completions API to enable users to send images alongside text prompts. This aligns with OpenAI's Chat Completions API standard for multimodal interactions.

**Key Capabilities**:
- Support up to 10 images per request
- Accept images via URLs or base64-encoded data
- Maximum 20MB per image
- Compatible with vision-capable models (GPT-4 Vision, GPT-4o, Claude 3, Gemini Pro Vision)
- Accurate token/credit calculation for vision requests

---

## Background

### Current State

**Message Content Format** (backend/src/types/model-validation.ts:115-125):
```typescript
export const chatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'function']),
  content: z.string().min(1, 'Message content cannot be empty'),  // ❌ String only
  name: z.string().optional(),
  function_call: z.object({
    name: z.string(),
    arguments: z.string(),
  }).optional(),
});
```

**Limitation**: Current schema only supports string content, cannot process images.

### OpenAI Chat Completions Vision API Standard

**Message Content Types**:
```typescript
type MessageContent =
  | string                           // Text-only (current support)
  | Array<ContentPart>;              // Multimodal (new)

type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: ImageUrl };

interface ImageUrl {
  url: string;           // HTTP(S) URL or data URI (base64)
  detail?: 'auto' | 'low' | 'high';  // Resolution for token calculation
}
```

**Example Request**:
```json
{
  "model": "gpt-4o",
  "messages": [
    {
      "role": "user",
      "content": [
        { "type": "text", "text": "What's in this image?" },
        {
          "type": "image_url",
          "image_url": {
            "url": "https://example.com/image.jpg",
            "detail": "high"
          }
        }
      ]
    }
  ]
}
```

### Vision-Capable Models

| Provider   | Model                  | Max Images | Token Calculation Method         |
|-----------|------------------------|------------|----------------------------------|
| OpenAI    | gpt-4o                 | 10         | Fixed tokens by detail level     |
| OpenAI    | gpt-4-turbo            | 10         | Fixed tokens by detail level     |
| Anthropic | claude-3-opus          | 20         | Image size in MB × 1450 tokens   |
| Anthropic | claude-3-sonnet        | 20         | Image size in MB × 1450 tokens   |
| Google    | gemini-pro-vision      | 16         | Variable by resolution           |

**OpenAI Token Calculation** (per image):
- `detail: 'low'` → 85 tokens (fixed)
- `detail: 'high'` → 85 base + (tiles × 170) tokens
  - Tiles = ceil(width/512) × ceil(height/512)
  - Max dimension scaled to fit 2048px, aspect ratio preserved

---

## Requirements

### Functional Requirements

**FR1**: Accept Message Content Arrays
- Support both `string` and `Array<ContentPart>` for message content
- Validate content part types: `text` or `image_url`
- Enforce maximum 10 images per request (OpenAI limit)
- Reject requests with images for non-vision models

**FR2**: Image URL Validation
- Accept HTTP(S) URLs and data URIs (base64)
- Validate URL format and accessibility (HTTP HEAD request)
- Enforce 20MB maximum per image
- Support common image formats: JPEG, PNG, GIF, WebP

**FR3**: Image Detail Level Control
- Support `detail` parameter: `auto`, `low`, `high`
- Default to `auto` if not specified
- Use detail level for accurate token estimation

**FR4**: Token/Credit Calculation
- Calculate image tokens based on detail level and dimensions
- Add image tokens to text tokens for total cost
- Store image token count in usage_history
- Display vision token breakdown in API response

**FR5**: Provider Delegation
- Pass image content to OpenAI/Anthropic/Google providers unchanged
- Handle provider-specific image limits (20 for Claude, 16 for Gemini)
- Translate errors from provider (e.g., "image too large")

### Non-Functional Requirements

**NFR1**: Performance
- Image URL validation should complete within 2 seconds
- Base64 decoding should handle up to 20MB efficiently
- Token calculation should not add >100ms to request time

**NFR2**: Security
- Validate image URLs to prevent SSRF attacks
- Reject data URIs exceeding 30MB (base64 overhead)
- Sanitize error messages to prevent information leakage

**NFR3**: Compatibility
- Backward compatible with existing text-only requests
- Desktop client should work with/without vision support
- Graceful degradation for non-vision models

---

## Data Model Changes

### 1. Message Schema Update

**File**: `backend/src/types/model-validation.ts`

**New Types**:
```typescript
// Content part types
export const textContentPartSchema = z.object({
  type: z.literal('text'),
  text: z.string().min(1, 'Text content cannot be empty'),
});

export const imageUrlSchema = z.object({
  url: z.string().url('Invalid image URL').or(
    z.string().startsWith('data:image/', 'Invalid data URI')
  ),
  detail: z.enum(['auto', 'low', 'high']).optional().default('auto'),
});

export const imageContentPartSchema = z.object({
  type: z.literal('image_url'),
  image_url: imageUrlSchema,
});

export const contentPartSchema = z.union([
  textContentPartSchema,
  imageContentPartSchema,
]);

// Updated message schema
export const chatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'function']),
  content: z.union([
    z.string().min(1, 'Message content cannot be empty'),  // Text-only
    z.array(contentPartSchema).min(1, 'Content array cannot be empty'),  // Multimodal
  ]),
  name: z.string().optional(),
  function_call: z.object({
    name: z.string(),
    arguments: z.string(),
  }).optional(),
});

export type TextContentPart = z.infer<typeof textContentPartSchema>;
export type ImageContentPart = z.infer<typeof imageContentPartSchema>;
export type ContentPart = z.infer<typeof contentPartSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
```

**Validation Rules**:
```typescript
// Custom validator for image limits
export const chatCompletionSchema = z.object({
  model: z.string(),
  messages: z.array(chatMessageSchema)
    .min(1, 'At least one message is required')
    .refine(
      (messages) => {
        const imageCount = messages.reduce((count, msg) => {
          if (Array.isArray(msg.content)) {
            return count + msg.content.filter(part => part.type === 'image_url').length;
          }
          return count;
        }, 0);
        return imageCount <= 10;
      },
      { message: 'Maximum 10 images per request' }
    ),
  // ... other fields
});
```

### 2. Database Schema Changes

**File**: `backend/prisma/schema.prisma`

**Update `usage_history` table**:
```prisma
model usage_history {
  id                   String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  user_id              String   @db.Uuid
  model_id             String   @db.VarChar(100)
  endpoint             String   @db.VarChar(100)
  request_timestamp    DateTime @default(now())
  prompt_tokens        Int
  completion_tokens    Int
  total_tokens         Int
  image_tokens         Int      @default(0)  // NEW: Tokens from image processing
  image_count          Int      @default(0)  // NEW: Number of images in request
  credits_consumed     Decimal  @db.Decimal(15, 8)
  status               String   @db.VarChar(50)
  error_message        String?

  // ... existing fields and relations
}
```

**Migration**:
```sql
-- Migration: 20250119000000_add_vision_tracking_fields
ALTER TABLE usage_history
  ADD COLUMN image_tokens INT NOT NULL DEFAULT 0,
  ADD COLUMN image_count INT NOT NULL DEFAULT 0;

CREATE INDEX idx_usage_history_image_count ON usage_history(image_count)
  WHERE image_count > 0;  -- Partial index for vision requests only
```

### 3. Model Metadata for Vision Support

**Update `models.meta` JSONB field**:
```typescript
interface ModelMeta {
  // ... existing fields
  vision?: {
    supported: boolean;
    maxImages: number;           // e.g., 10 for OpenAI, 20 for Claude
    maxImageSize: number;        // In bytes (20MB = 20971520)
    supportedFormats: string[];  // ['jpeg', 'png', 'gif', 'webp']
    tokenCalculation: 'fixed' | 'dynamic';  // OpenAI=fixed, Anthropic=dynamic
  };
}
```

**Example for GPT-4o**:
```json
{
  "vision": {
    "supported": true,
    "maxImages": 10,
    "maxImageSize": 20971520,
    "supportedFormats": ["jpeg", "png", "gif", "webp"],
    "tokenCalculation": "fixed"
  }
}
```

---

## Backend Implementation

### 1. Image Validation Service

**File**: `backend/src/services/imageValidation.service.ts` (NEW)

```typescript
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
```

### 2. Vision Token Calculator

**File**: `backend/src/utils/visionTokenCalculator.ts` (NEW)

```typescript
import logger from './logger';

/**
 * Calculates token cost for vision requests based on OpenAI's pricing model
 * Reference: https://platform.openai.com/docs/guides/vision/calculating-costs
 */
export class VisionTokenCalculator {
  /**
   * Calculates tokens for a single image
   *
   * @param detail - Image detail level: 'low' | 'high' | 'auto'
   * @param width - Image width in pixels (optional for 'low' detail)
   * @param height - Image height in pixels (optional for 'low' detail)
   * @returns Token count
   */
  static calculateImageTokens(
    detail: 'low' | 'high' | 'auto',
    width?: number,
    height?: number
  ): number {
    // Low detail: Fixed 85 tokens regardless of size
    if (detail === 'low') {
      return 85;
    }

    // Auto: Default to high detail for accurate calculation
    if (detail === 'auto') {
      detail = 'high';
    }

    // High detail: Calculate based on tiles
    if (!width || !height) {
      // If dimensions unknown, assume worst case (max tiles)
      logger.warn('VisionTokenCalculator: Missing dimensions for high detail, assuming max tiles');
      return 85 + (4 * 4 * 170);  // 85 + 2720 = 2805 tokens (worst case)
    }

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
   */
  static calculateTotalImageTokens(images: Array<{
    detail: 'low' | 'high' | 'auto';
    width?: number;
    height?: number;
  }>): number {
    return images.reduce((total, img) => {
      return total + this.calculateImageTokens(img.detail, img.width, img.height);
    }, 0);
  }
}
```

### 3. Update LLM Service

**File**: `backend/src/services/llm.service.ts`

**Add Vision Message Processing**:
```typescript
import { ImageValidationService } from './imageValidation.service';
import { VisionTokenCalculator } from '../utils/visionTokenCalculator';

@injectable()
export class LLMService {
  constructor(
    // ... existing dependencies
    @inject(ImageValidationService) private imageValidationService: ImageValidationService
  ) {}

  /**
   * Validates vision request and calculates image tokens
   * Called before chat completion
   */
  private async processVisionRequest(
    request: ChatCompletionRequest,
    modelMeta: any
  ): Promise<{
    imageCount: number;
    imageTokens: number;
    validationErrors: string[];
  }> {
    const images: Array<{ detail: 'low' | 'high' | 'auto'; width?: number; height?: number }> = [];
    const validationErrors: string[] = [];

    // Check if model supports vision
    if (!modelMeta?.vision?.supported) {
      const hasImages = request.messages.some(msg =>
        Array.isArray(msg.content) && msg.content.some(part => part.type === 'image_url')
      );

      if (hasImages) {
        throw validationError(`Model '${request.model}' does not support vision/image processing`);
      }

      return { imageCount: 0, imageTokens: 0, validationErrors: [] };
    }

    // Extract and validate all images
    for (const message of request.messages) {
      if (!Array.isArray(message.content)) continue;

      for (const part of message.content) {
        if (part.type !== 'image_url') continue;

        const imageUrl = part.image_url.url;
        const detail = part.image_url.detail || 'auto';

        // Validate image
        const validation = await this.imageValidationService.validateImage(
          imageUrl,
          modelMeta.vision.maxImageSize
        );

        if (!validation.valid) {
          validationErrors.push(`Image validation failed: ${validation.error}`);
          continue;
        }

        images.push({
          detail,
          width: validation.width,
          height: validation.height,
        });
      }
    }

    // Check image count limit
    if (images.length > modelMeta.vision.maxImages) {
      throw validationError(
        `Too many images: ${images.length} exceeds maximum ${modelMeta.vision.maxImages}`
      );
    }

    // Calculate image tokens
    const imageTokens = VisionTokenCalculator.calculateTotalImageTokens(images);

    logger.debug('LLMService: Vision request processed', {
      model: request.model,
      imageCount: images.length,
      imageTokens,
      validationErrors,
    });

    return {
      imageCount: images.length,
      imageTokens,
      validationErrors,
    };
  }

  /**
   * Updated chat completion with vision support
   */
  async chatCompletion(
    request: ChatCompletionRequest,
    modelProvider: string,
    userId: string
  ): Promise<ChatCompletionResponse> {
    // Get model metadata
    const modelInfo = await this.modelService.getModelForInference(request.model);
    const modelMeta = modelInfo.meta as any;

    // Process vision request (validation + token calculation)
    const visionInfo = await this.processVisionRequest(request, modelMeta);

    if (visionInfo.validationErrors.length > 0) {
      logger.warn('LLMService: Vision validation warnings', {
        model: request.model,
        errors: visionInfo.validationErrors,
      });
    }

    // Calculate total tokens (text + images)
    const textTokens = countChatTokens(request.messages, request.model);
    const totalInputTokens = textTokens.promptTokens + visionInfo.imageTokens;

    // ... existing credit check with updated totalInputTokens

    // Delegate to provider
    const result = await provider.chatCompletion(request);

    // Record usage with image metrics
    await this.usageHistoryService.createUsageRecord({
      userId,
      modelId: request.model,
      endpoint: '/v1/chat/completions',
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens,
      totalTokens: result.usage.totalTokens,
      imageTokens: visionInfo.imageTokens,      // NEW
      imageCount: visionInfo.imageCount,        // NEW
      creditsConsumed,
      status: 'completed',
    });

    return result.response;
  }
}
```

### 4. Update Providers

**File**: `backend/src/providers/openai.provider.ts`

**No Changes Required**: OpenAI provider already passes messages unchanged. Vision content arrays will be forwarded directly to OpenAI API.

**Verification**:
```typescript
// Existing code already supports vision (no changes needed)
const params: any = {
  model: request.model,
  messages: request.messages,  // ✅ Already passes arrays unchanged
  // ... other params
};

const completion = await clientForModel.chat.completions.create(params);
```

---

## Frontend/Desktop Client Changes

### 1. Update API Client Types

**File**: `desktop-client/src/types/api.types.ts` (or equivalent)

```typescript
// Message content types
export type TextContentPart = {
  type: 'text';
  text: string;
};

export type ImageContentPart = {
  type: 'image_url';
  image_url: {
    url: string;
    detail?: 'auto' | 'low' | 'high';
  };
};

export type ContentPart = TextContentPart | ImageContentPart;

// Updated message type
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string | ContentPart[];  // ✅ Now supports both
  name?: string;
  function_call?: {
    name: string;
    arguments: string;
  };
}
```

### 2. Image Upload UI Component

**Conceptual Component** (framework-agnostic):
```typescript
// Image upload component for chat interface
interface ImageUploadProps {
  onImageAdd: (imageUrl: string, detail: 'auto' | 'low' | 'high') => void;
  maxImages: number;
  currentImageCount: number;
}

// Features:
// - Drag-and-drop or file picker
// - Image preview with remove option
// - Base64 encoding for local files
// - Detail level selector (low/high)
// - Size validation (max 20MB)
// - Format validation (JPEG, PNG, GIF, WebP)
```

### 3. Message Builder with Vision

```typescript
// Build message with images
function buildChatMessage(
  text: string,
  images: Array<{ url: string; detail: 'auto' | 'low' | 'high' }>
): ChatMessage {
  // Text-only message
  if (images.length === 0) {
    return {
      role: 'user',
      content: text,
    };
  }

  // Multimodal message
  const contentParts: ContentPart[] = [
    { type: 'text', text },
    ...images.map(img => ({
      type: 'image_url' as const,
      image_url: {
        url: img.url,
        detail: img.detail,
      },
    })),
  ];

  return {
    role: 'user',
    content: contentParts,
  };
}
```

---

## Admin UI Changes

### 1. Model Vision Configuration

**File**: `frontend/src/components/admin/AddModelDialog.tsx`

**Add Vision Settings Section**:
```typescript
// Add to meta fields configuration UI
interface VisionSettings {
  supported: boolean;
  maxImages: number;
  maxImageSize: number;  // In MB
  supportedFormats: string[];
  tokenCalculation: 'fixed' | 'dynamic';
}

// UI Component (pseudo-code)
<Section title="Vision Configuration">
  <Checkbox
    label="Supports Vision/Images"
    checked={visionSettings.supported}
    onChange={(val) => setVisionSettings({ ...visionSettings, supported: val })}
  />

  {visionSettings.supported && (
    <>
      <NumberInput
        label="Max Images per Request"
        value={visionSettings.maxImages}
        min={1}
        max={20}
      />

      <NumberInput
        label="Max Image Size (MB)"
        value={visionSettings.maxImageSize}
        min={1}
        max={20}
      />

      <Select
        label="Token Calculation Method"
        value={visionSettings.tokenCalculation}
        options={[
          { value: 'fixed', label: 'Fixed (OpenAI)' },
          { value: 'dynamic', label: 'Dynamic (Anthropic)' },
        ]}
      />
    </>
  )}
</Section>
```

### 2. Usage History with Vision Metrics

**File**: `frontend/src/components/admin/UsageHistoryTable.tsx`

**Add Image Columns**:
```typescript
// Add columns to usage history table
const columns = [
  // ... existing columns
  {
    header: 'Images',
    accessor: 'imageCount',
    cell: (row) => row.imageCount > 0 ? row.imageCount : '-',
  },
  {
    header: 'Image Tokens',
    accessor: 'imageTokens',
    cell: (row) => row.imageTokens > 0 ? row.imageTokens.toLocaleString() : '-',
  },
  {
    header: 'Text Tokens',
    accessor: 'textTokens',
    cell: (row) => (row.totalTokens - row.imageTokens).toLocaleString(),
  },
  // ... total tokens column
];
```

---

## Migration Strategy

### Phase 1: Backend Foundation (Week 1)

**Tasks**:
1. Update message schema validation (model-validation.ts)
2. Create ImageValidationService
3. Create VisionTokenCalculator
4. Database migration for image tracking fields
5. Update seed data with vision metadata for GPT-4o

**Testing**:
- Unit tests for image validation (HTTP URLs, data URIs, SSRF protection)
- Unit tests for token calculation (various image sizes)
- Integration test for vision message validation

**Deliverables**:
- ✅ Backend accepts vision messages
- ✅ Image validation working
- ✅ Token calculation accurate

### Phase 2: Provider Integration (Week 2)

**Tasks**:
1. Update LLMService with processVisionRequest()
2. Test with OpenAI GPT-4o (vision-capable)
3. Add vision metadata for Claude 3 models
4. Add vision metadata for Gemini Pro Vision
5. Usage tracking with image metrics

**Testing**:
- Integration test: Send vision request to GPT-4o
- Verify usage_history records image_count and image_tokens
- Test multi-provider support (OpenAI, Anthropic, Google)

**Deliverables**:
- ✅ Vision requests work end-to-end
- ✅ Accurate credit consumption
- ✅ Usage tracking includes image metrics

### Phase 3: Desktop Client UI (Week 3)

**Tasks**:
1. Update client types (api.types.ts)
2. Build image upload component
3. Integrate with chat interface
4. Add image preview and removal
5. Detail level selector (low/high)

**Testing**:
- Manual testing: Upload images and send chat
- Test base64 encoding for local files
- Test image size/format validation
- Test max 10 images limit

**Deliverables**:
- ✅ Desktop client can send images
- ✅ User-friendly image upload UI
- ✅ Validation feedback

### Phase 4: Admin UI (Week 4)

**Tasks**:
1. Add vision configuration to AddModelDialog
2. Add vision configuration to EditModelDialog
3. Update UsageHistoryTable with image columns
4. Add vision filter to usage history
5. Dashboard metrics for vision usage

**Testing**:
- Test adding new vision-capable model
- Test editing vision settings
- Verify usage history displays image metrics

**Deliverables**:
- ✅ Admin can configure vision settings
- ✅ Vision usage visible in analytics

---

## Testing Strategy

### 1. Unit Tests

**ImageValidationService** (`tests/unit/services/imageValidation.service.test.ts`):
```typescript
describe('ImageValidationService', () => {
  it('should validate HTTP image URL', async () => {
    // Mock axios.head to return valid image response
    const result = await service.validateImage('https://example.com/image.jpg');
    expect(result.valid).toBe(true);
    expect(result.format).toBe('jpeg');
  });

  it('should reject oversized image', async () => {
    // Mock axios.head with content-length > 20MB
    const result = await service.validateImage('https://example.com/huge.jpg');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('exceeds maximum');
  });

  it('should validate data URI', () => {
    const dataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA...';
    const result = service.validateDataUri(dataUri, 20971520);
    expect(result.valid).toBe(true);
    expect(result.format).toBe('png');
  });

  it('should reject private IP (SSRF protection)', async () => {
    const result = await service.validateImage('http://127.0.0.1/image.jpg');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Private IP');
  });
});
```

**VisionTokenCalculator** (`tests/unit/utils/visionTokenCalculator.test.ts`):
```typescript
describe('VisionTokenCalculator', () => {
  it('should return 85 tokens for low detail', () => {
    const tokens = VisionTokenCalculator.calculateImageTokens('low');
    expect(tokens).toBe(85);
  });

  it('should calculate tokens for high detail 1024x1024 image', () => {
    const tokens = VisionTokenCalculator.calculateImageTokens('high', 1024, 1024);
    // Expected: 85 + (2x2 tiles * 170) = 85 + 680 = 765
    expect(tokens).toBe(765);
  });

  it('should calculate tokens for high detail 2048x2048 image', () => {
    const tokens = VisionTokenCalculator.calculateImageTokens('high', 2048, 2048);
    // Expected: 85 + (4x4 tiles * 170) = 85 + 2720 = 2805
    expect(tokens).toBe(2805);
  });
});
```

### 2. Integration Tests

**Vision Chat Completion** (`tests/integration/vision-chat-completion.test.ts`):
```typescript
describe('POST /v1/chat/completions (Vision)', () => {
  it('should accept vision request with image URL', async () => {
    const response = await request(app)
      .post('/v1/chat/completions')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: "What's in this image?" },
              {
                type: 'image_url',
                image_url: { url: 'https://example.com/test.jpg', detail: 'high' }
              },
            ],
          },
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body.choices[0].message.content).toBeDefined();
  });

  it('should reject vision request for non-vision model', async () => {
    const response = await request(app)
      .post('/v1/chat/completions')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        model: 'gpt-3.5-turbo',  // ❌ No vision support
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Hello' },
              { type: 'image_url', image_url: { url: 'https://example.com/test.jpg' } },
            ],
          },
        ],
      });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toContain('does not support vision');
  });

  it('should track image tokens in usage history', async () => {
    // Send vision request
    await request(app)
      .post('/v1/chat/completions')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Describe this' },
              { type: 'image_url', image_url: { url: 'https://example.com/test.jpg', detail: 'low' } },
            ],
          },
        ],
      });

    // Check usage history
    const usageRecord = await prisma.usage_history.findFirst({
      where: { user_id: testUserId },
      orderBy: { request_timestamp: 'desc' },
    });

    expect(usageRecord?.image_count).toBe(1);
    expect(usageRecord?.image_tokens).toBe(85);  // Low detail = 85 tokens
  });
});
```

### 3. E2E Tests

**Desktop Client Vision Flow** (manual testing checklist):
```
✅ Upload single image (JPEG)
✅ Upload multiple images (up to 10)
✅ Remove uploaded image
✅ Select detail level (low/high)
✅ Send chat with images
✅ Receive response from vision model
✅ Verify credit consumption
✅ Test max image limit (11th image rejected)
✅ Test oversized image (>20MB rejected)
✅ Test unsupported format (.bmp rejected)
```

---

## Security Considerations

### 1. SSRF (Server-Side Request Forgery) Protection

**Risk**: Attacker provides malicious image URL to probe internal network
**Mitigation**: Block private IP ranges in ImageValidationService

```typescript
// Blocked ranges:
// - 127.0.0.0/8 (loopback)
// - 10.0.0.0/8 (private)
// - 172.16.0.0/12 (private)
// - 192.168.0.0/16 (private)
// - 169.254.0.0/16 (link-local)
// - localhost
```

### 2. Data URI Payload Size

**Risk**: Attacker sends 100MB base64-encoded image to exhaust memory
**Mitigation**:
- Enforce 20MB limit on decoded buffer size
- Add 30MB limit on data URI string length (base64 overhead)
- Decode in streaming mode for large payloads

### 3. Image Format Validation

**Risk**: Attacker sends executable disguised as image
**Mitigation**:
- Validate content-type header (for URLs)
- Validate data URI MIME type
- Whitelist formats: JPEG, PNG, GIF, WebP only

### 4. Credit Exhaustion Attack

**Risk**: Attacker sends maximum images (10 × high detail) to drain credits
**Mitigation**:
- Existing rate limiting applies (tier-based)
- Accurate token calculation prevents undercharging
- Admin can monitor vision usage via analytics

---

## Cost Analysis

### Token Costs (OpenAI GPT-4o)

| Scenario | Images | Detail | Tokens per Image | Total Image Tokens | Credit Impact |
|---------|--------|--------|------------------|--------------------|--------------------|
| Single low-res | 1 | low | 85 | 85 | +0.5% |
| Single high-res (1024px) | 1 | high | 765 | 765 | +5% |
| Max images low-res | 10 | low | 85 | 850 | +6% |
| Max images high-res | 10 | high | 2805 | 28,050 | +180% |

**Recommendation**: Default to `detail: 'auto'` (OpenAI auto-optimizes) or `detail: 'low'` for cost-sensitive users.

### Storage Considerations

**Data URIs**: No backend storage required (images encoded in request)
**HTTP URLs**: No backend storage (images hosted externally)

**Conclusion**: Vision feature adds zero storage costs.

---

## Rollout Plan

### Week 1: Soft Launch (Internal Testing)

**Scope**: Backend + basic desktop client
**Users**: Internal team only
**Models**: GPT-4o only

**Success Criteria**:
- ✅ 100 vision requests processed without errors
- ✅ Token calculation matches OpenAI billing
- ✅ No SSRF vulnerabilities detected

### Week 2: Beta Launch (Early Adopters)

**Scope**: Full desktop client + admin UI
**Users**: 50 beta testers
**Models**: GPT-4o, Claude 3 Opus, Gemini Pro Vision

**Success Criteria**:
- ✅ 1,000 vision requests processed
- ✅ <1% error rate
- ✅ User satisfaction >4/5

### Week 3: Public Launch

**Scope**: All users
**Documentation**: User guide, API reference, examples

**Announcement**:
- Blog post: "Introducing Vision Support"
- Email to existing users
- Social media campaign

---

## Documentation Requirements

### 1. API Reference

**File**: `docs/reference/xxx-vision-api-reference.md`

**Content**:
- Message content format (string vs array)
- Image URL requirements (HTTP/HTTPS, data URIs)
- Detail level options (auto, low, high)
- Token calculation methodology
- Error codes and messages
- Examples (text-only, single image, multiple images)

### 2. User Guide

**File**: `docs/guides/xxx-using-vision-in-desktop-client.md`

**Content**:
- How to upload images
- Supported formats and sizes
- Detail level recommendations
- Credit cost estimates
- Troubleshooting common issues

### 3. Admin Guide

**File**: `docs/guides/xxx-vision-admin-configuration.md`

**Content**:
- Adding vision-capable models
- Configuring vision metadata
- Monitoring vision usage
- Adjusting limits (max images, max size)

---

## Success Metrics

### Adoption Metrics
- **Vision Request Volume**: Track daily vision requests vs text-only requests
- **User Adoption Rate**: % of users who try vision feature within 30 days
- **Vision-Capable Model Usage**: Growth in GPT-4o/Claude 3/Gemini usage

### Performance Metrics
- **Image Validation Latency**: <2 seconds for HTTP URLs, <100ms for data URIs
- **Token Calculation Accuracy**: ±5% vs actual provider billing
- **Error Rate**: <1% for valid vision requests

### Business Metrics
- **Credit Consumption**: Average credits per vision request
- **Revenue Impact**: Increased usage of premium models
- **User Retention**: Vision users vs non-vision users retention rate

---

## Risks and Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| SSRF attacks via malicious URLs | High | Medium | IP range blocking, URL validation |
| Credit exhaustion via max images | Medium | Low | Rate limiting, usage monitoring |
| Token calculation errors | High | Low | Extensive unit tests, provider verification |
| Desktop client performance (large images) | Medium | Medium | Base64 size limits, compression guidance |
| Provider API changes | Medium | Low | Regular testing, version monitoring |

---

## Future Enhancements

### Phase 2 Features (Q2 2026)

1. **Image Upload to CDN**: Store images on S3/CDN instead of base64 encoding
2. **Image Preprocessing**: Auto-resize, compress before sending to provider
3. **Vision Model Comparison**: Side-by-side results from GPT-4o vs Claude 3 vs Gemini
4. **OCR Extraction**: Extract text from images for indexing/search
5. **Vision Analytics**: Track most common image types, average size, format distribution

### Phase 3 Features (Q3 2026)

1. **Video Frame Analysis**: Extract frames from videos for vision processing
2. **Batch Vision Processing**: Process multiple images in parallel
3. **Vision Workflows**: Chain vision → text analysis → action
4. **Custom Vision Models**: Fine-tuned vision models for specific use cases

---

## Appendices

### A. OpenAI Vision API Example

**Request**:
```bash
curl https://api.openai.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d '{
    "model": "gpt-4o",
    "messages": [
      {
        "role": "user",
        "content": [
          {
            "type": "text",
            "text": "What is in this image?"
          },
          {
            "type": "image_url",
            "image_url": {
              "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/2560px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg",
              "detail": "high"
            }
          }
        ]
      }
    ]
  }'
```

**Response**:
```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1677652288,
  "model": "gpt-4o",
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": "This image shows a beautiful nature boardwalk..."
    },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 850,    // Text (15) + Image (835)
    "completion_tokens": 45,
    "total_tokens": 895
  }
}
```

### B. Base64 Image Encoding Example

**JavaScript (Desktop Client)**:
```typescript
// Convert File to base64 data URI
async function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);  // data:image/jpeg;base64,/9j/4AAQSkZJRg...
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Usage
const file = event.target.files[0];
const dataUri = await fileToDataUri(file);

const message: ChatMessage = {
  role: 'user',
  content: [
    { type: 'text', text: 'Analyze this image' },
    { type: 'image_url', image_url: { url: dataUri, detail: 'high' } },
  ],
};
```

### C. Vision Token Calculation Examples

**Example 1**: 1024x1024 image, high detail
```
1. Scale to fit 2048x2048: 1024x1024 (no change, already fits)
2. Scale shortest side to 768: 768x768
3. Tiles: ceil(768/512) × ceil(768/512) = 2 × 2 = 4 tiles
4. Tokens: 85 + (4 × 170) = 85 + 680 = 765 tokens
```

**Example 2**: 4096x2048 image, high detail
```
1. Scale to fit 2048x2048: 2048x1024 (scaled down)
2. Scale shortest side to 768: 1536x768
3. Tiles: ceil(1536/512) × ceil(768/512) = 3 × 2 = 6 tiles
4. Tokens: 85 + (6 × 170) = 85 + 1020 = 1105 tokens
```

**Example 3**: Any size, low detail
```
Tokens: 85 (fixed, regardless of size)
```

---

## References

- **OpenAI Vision Guide**: https://platform.openai.com/docs/guides/vision
- **Anthropic Claude Vision**: https://docs.anthropic.com/claude/docs/vision
- **Google Gemini Vision**: https://ai.google.dev/gemini-api/docs/vision
- **OpenAI Token Pricing**: https://platform.openai.com/docs/guides/vision/calculating-costs
- **OWASP SSRF Prevention**: https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html

---

**Document Version**: 1.0
**Last Updated**: 2025-01-19
**Next Review**: After Phase 1 completion (Week 1)

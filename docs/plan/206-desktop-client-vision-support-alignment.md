# Plan 206: Desktop Client Vision Support Alignment

**Status**: Draft
**Created**: 2025-01-19
**Category**: Desktop Client Implementation
**Priority**: High (Critical for Vision Support)
**Complexity**: Medium
**Dependency**: Plan 204 (Backend Vision Support)
**Target**: Desktop Client Team

---

## Executive Summary

Update the Desktop Client's vision/image implementation to align with the backend's OpenAI Chat Completions Vision API standard (Plan 204). The current implementation uses a JSON string serialization workaround that will fail when the backend enforces proper content array validation.

**Key Objectives**:
- Fix content serialization to use proper content arrays (not JSON strings)
- Add support for `detail` parameter (`auto`, `low`, `high`) for accurate token estimation
- Implement HTTP(S) URL image support (currently only base64)
- Fetch model capabilities dynamically from backend API
- Add client-side image validation (size, format)
- Ensure backward compatibility with text-only requests

**Timeline**: 2-3 sprints (2-6 weeks)
**Effort**: 16-24 developer hours
**Risk Level**: Medium (Breaking change, requires coordination with backend deployment)

---

## Background

### Current State Analysis

**Reference**: `docs/analysis/087-desktop-client-vision-support-alignment-analysis.md`

The Desktop Client currently has:
- ✅ Basic multimodal method: `RewriteWithImageAsync()` (lines 156-196)
- ✅ Base64 image support
- ⚠️ **Non-standard content serialization** (JSON string workaround)
- ❌ Missing `detail` parameter support
- ❌ Missing HTTP(S) URL support
- ❌ Hardcoded model capability detection

**Critical Issue**: Content arrays are serialized to JSON strings, which will be rejected by OpenAI API:

```csharp
// Current (WRONG):
Content = JsonSerializer.Serialize(contentParts)  // Creates string: "[{\"type\":\"text\",...}]"

// Expected (CORRECT):
Content = contentParts  // Creates array: [{type: "text", ...}]
```

### Backend Changes (Plan 204)

The backend will implement:
1. Content union type: `content: string | ContentPart[]`
2. Image validation service (SSRF protection, size limits)
3. Vision token calculation (OpenAI tile-based algorithm)
4. Database tracking (`image_count`, `image_tokens` fields)

**Deployment Strategy**: Backend deploys first (backward compatible), then Desktop Client updates.

---

## Requirements

### Functional Requirements

**FR1**: Content Array Support (Critical)
- Update `ChatMessage.Content` from `string` to `object` type
- Remove `JsonSerializer.Serialize()` call in `RewriteWithImageAsync()`
- Ensure proper JSON serialization of content arrays vs. strings

**FR2**: Detail Parameter Support (High Priority)
- Add `imageDetail` parameter to `RewriteWithImageAsync()` method
- Support values: `auto`, `low`, `high`
- Default to `auto` if not specified
- Include detail in `ImageUrl` object

**FR3**: HTTP(S) URL Image Support (Medium Priority)
- Accept image URLs in addition to base64
- Validate URL format (HTTP/HTTPS only)
- Add client-side size check (HEAD request, max 20MB)
- Timeout HEAD requests after 2 seconds

**FR4**: Dynamic Model Capability Detection (Medium Priority)
- Replace hardcoded string matching with API query
- Call `GET /v1/models/:modelId` to fetch capabilities
- Cache model capabilities (5-minute TTL)
- Fallback to hardcoded list if API unavailable

**FR5**: Client-Side Image Validation (Medium Priority)
- Validate image size < 20MB (before sending to backend)
- Validate image format (JPEG, PNG, GIF, WebP)
- Show user-friendly error messages
- Prevent sending invalid requests

**FR6**: Backward Compatibility (Critical)
- Text-only requests must continue to work unchanged
- Support both `string` and `ContentPart[]` content types
- No breaking changes to existing method signatures (add optional parameters only)

### Non-Functional Requirements

**NFR1**: Performance
- Image validation should complete within 1 second
- HTTP HEAD requests should timeout after 2 seconds
- Model capability API calls should be cached (5-minute TTL)

**NFR2**: Error Handling
- Show user-friendly error messages for validation failures
- Log detailed error information for debugging
- Handle network errors gracefully (offline mode)

**NFR3**: Code Quality
- Follow C# coding standards and conventions
- Add XML documentation comments to all public methods
- Write unit tests for all new methods (80% coverage minimum)
- Update integration tests for multimodal scenarios

---

## Implementation Plan

### Phase 1: Critical Fixes (Sprint 1 - Week 1-2)

**Priority**: 🔴 Critical
**Effort**: 8-12 hours
**Goal**: Fix content serialization to align with backend schema

#### Task 1.1: Update DTO Models

**File**: `DedicatedAPIService.cs` (lines 676-703)

**Changes**:

```csharp
// ============================================================================
// DTOs for Multimodal Content Support
// ============================================================================

/// <summary>
/// Chat message with support for text-only or multimodal content.
/// Content can be a string (text-only) or ContentPart[] (multimodal).
/// </summary>
private class ChatMessage
{
    [JsonPropertyName("role")]
    public string Role { get; set; } = string.Empty;

    /// <summary>
    /// Message content. Can be:
    /// - string: Text-only message
    /// - List&lt;ContentPart&gt;: Multimodal message (text + images)
    /// </summary>
    [JsonPropertyName("content")]
    public object Content { get; set; } = string.Empty;  // ✅ Changed from string to object

    [JsonPropertyName("name")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Name { get; set; }
}

/// <summary>
/// Content part for multimodal messages.
/// Can be either text or image_url.
/// </summary>
private class ContentPart
{
    /// <summary>
    /// Content type: "text" or "image_url"
    /// </summary>
    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    /// <summary>
    /// Text content (only for type="text")
    /// </summary>
    [JsonPropertyName("text")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Text { get; set; }

    /// <summary>
    /// Image URL content (only for type="image_url")
    /// </summary>
    [JsonPropertyName("image_url")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public ImageUrl? ImageUrl { get; set; }
}

/// <summary>
/// Image URL with detail level for vision token calculation.
/// </summary>
private class ImageUrl
{
    /// <summary>
    /// Image URL (HTTP/HTTPS or data URI with base64)
    /// </summary>
    [JsonPropertyName("url")]
    public string Url { get; set; } = string.Empty;

    /// <summary>
    /// Detail level for token calculation: "auto", "low", or "high"
    /// Default: "auto"
    /// </summary>
    [JsonPropertyName("detail")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Detail { get; set; }
}
```

**Testing**:
```csharp
// Unit test: Verify JSON serialization
var message = new ChatMessage
{
    Role = "user",
    Content = new List<ContentPart>
    {
        new ContentPart { Type = "text", Text = "Test" },
        new ContentPart { Type = "image_url", ImageUrl = new ImageUrl { Url = "data:image/png;base64,..." } }
    }
};

var json = JsonSerializer.Serialize(message);
Assert.Contains("\"content\":[{\"type\":\"text\"", json);  // Array, not string
```

#### Task 1.2: Fix RewriteWithImageAsync Method

**File**: `DedicatedAPIService.cs` (lines 156-196)

**Changes**:

```csharp
/// <summary>
/// Performs multimodal rewrite with text and optional image.
/// Supports base64 images via data URIs.
/// </summary>
/// <param name="inputText">Input text to rewrite</param>
/// <param name="instruction">System instruction for rewriting</param>
/// <param name="imageBase64">Optional base64-encoded image (without data URI prefix)</param>
/// <param name="imageDetail">Image detail level for token calculation: "auto", "low", "high". Default: "auto"</param>
/// <param name="onTokenReceived">Optional callback for streaming tokens</param>
/// <param name="cancellationToken">Cancellation token</param>
/// <returns>Rewritten text</returns>
public async Task<string> RewriteWithImageAsync(
    string inputText,
    string instruction,
    string? imageBase64 = null,
    string imageDetail = "auto",  // ✅ NEW: Detail parameter
    Action<string>? onTokenReceived = null,
    CancellationToken cancellationToken = default)
{
    _logger.LogInformation("Dedicated API multimodal request (image + text), detail level: {Detail}", imageDetail);

    // Validate detail level
    if (imageDetail != "auto" && imageDetail != "low" && imageDetail != "high")
    {
        _logger.LogWarning("Invalid image detail level '{Detail}', defaulting to 'auto'", imageDetail);
        imageDetail = "auto";
    }

    var messages = new List<ChatMessage>
    {
        new ChatMessage
        {
            Role = "system",
            Content = instruction  // ✅ Text-only content (string)
        }
    };

    // Build multimodal message content
    var contentParts = new List<ContentPart>
    {
        new ContentPart
        {
            Type = "text",
            Text = inputText
        }
    };

    if (!string.IsNullOrEmpty(imageBase64))
    {
        // ✅ Client-side validation (optional, backend will also validate)
        if (EstimateBase64Size(imageBase64) > 20_000_000)  // 20MB limit
        {
            _logger.LogError("Image exceeds 20MB size limit");
            throw new ArgumentException("Image size exceeds 20MB limit. Please use a smaller image.");
        }

        contentParts.Add(new ContentPart
        {
            Type = "image_url",
            ImageUrl = new ImageUrl
            {
                Url = $"data:image/png;base64,{imageBase64}",
                Detail = imageDetail  // ✅ Include detail level
            }
        });
    }

    messages.Add(new ChatMessage
    {
        Role = "user",
        Content = contentParts  // ✅ FIXED: Pass array directly, not JSON string
    });

    return await ChatCompletionAsync(messages, onTokenReceived, cancellationToken);
}

/// <summary>
/// Estimates the size of a base64-encoded image in bytes.
/// Base64 encoding adds ~33% overhead.
/// </summary>
private long EstimateBase64Size(string base64String)
{
    // Remove padding characters
    var padding = base64String.EndsWith("==") ? 2 : (base64String.EndsWith("=") ? 1 : 0);
    return (base64String.Length * 3L / 4L) - padding;
}
```

**Testing**:
```csharp
// Unit test: Verify content array structure
var result = await service.RewriteWithImageAsync(
    "Analyze this",
    "You are a helpful assistant",
    "iVBORw0KGgo...",  // Sample base64
    "high"
);

// Verify request structure in logs or mock
Assert.Contains("content\":[{\"type\":\"text\"", capturedRequest);
Assert.Contains("\"detail\":\"high\"", capturedRequest);
```

#### Task 1.3: Update ChatCompletionAsync to Handle Both Content Types

**File**: `DedicatedAPIService.cs` (lines 242-292)

**Changes**: No changes needed! The method already uses `JsonContent.Create()`, which will correctly serialize `object` content as either string or array.

**Verification**:
```csharp
// Ensure JsonSerializerOptions are correct
private static class ApiJsonSerializerOptions
{
    public static readonly JsonSerializerOptions Default = new JsonSerializerOptions
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        WriteIndented = false
    };
}
```

---

### Phase 2: Enhanced Features (Sprint 2 - Week 3-4)

**Priority**: 🟡 High
**Effort**: 6-10 hours
**Goal**: Add HTTP URL support and dynamic model capability detection

#### Task 2.1: Add HTTP(S) URL Image Support

**File**: `DedicatedAPIService.cs` (new method)

**Implementation**:

```csharp
/// <summary>
/// Performs multimodal rewrite with text and image from HTTP(S) URL.
/// Validates URL accessibility and size before sending to backend.
/// </summary>
/// <param name="inputText">Input text to rewrite</param>
/// <param name="instruction">System instruction for rewriting</param>
/// <param name="imageUrl">HTTP(S) URL of the image</param>
/// <param name="imageDetail">Image detail level: "auto", "low", "high". Default: "auto"</param>
/// <param name="onTokenReceived">Optional callback for streaming tokens</param>
/// <param name="cancellationToken">Cancellation token</param>
/// <returns>Rewritten text</returns>
public async Task<string> RewriteWithImageUrlAsync(
    string inputText,
    string instruction,
    string imageUrl,
    string imageDetail = "auto",
    Action<string>? onTokenReceived = null,
    CancellationToken cancellationToken = default)
{
    _logger.LogInformation("Dedicated API multimodal request with HTTP URL: {Url}", imageUrl);

    // Validate URL format
    if (!Uri.TryCreate(imageUrl, UriKind.Absolute, out var uri))
    {
        throw new ArgumentException("Invalid image URL format");
    }

    if (uri.Scheme != "http" && uri.Scheme != "https")
    {
        throw new ArgumentException("Image URL must use HTTP or HTTPS protocol");
    }

    // Client-side validation: Check image size and accessibility
    await ValidateImageUrlAsync(imageUrl, cancellationToken);

    var messages = new List<ChatMessage>
    {
        new ChatMessage
        {
            Role = "system",
            Content = instruction
        }
    };

    var contentParts = new List<ContentPart>
    {
        new ContentPart { Type = "text", Text = inputText },
        new ContentPart
        {
            Type = "image_url",
            ImageUrl = new ImageUrl
            {
                Url = imageUrl,  // ✅ HTTP(S) URL
                Detail = imageDetail
            }
        }
    };

    messages.Add(new ChatMessage
    {
        Role = "user",
        Content = contentParts
    });

    return await ChatCompletionAsync(messages, onTokenReceived, cancellationToken);
}

/// <summary>
/// Validates image URL accessibility and size via HTTP HEAD request.
/// </summary>
/// <param name="imageUrl">Image URL to validate</param>
/// <param name="cancellationToken">Cancellation token</param>
/// <exception cref="HttpRequestException">If validation fails</exception>
private async Task ValidateImageUrlAsync(string imageUrl, CancellationToken cancellationToken)
{
    try
    {
        var client = _httpClientFactory.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(2);  // 2-second timeout

        var request = new HttpRequestMessage(HttpMethod.Head, imageUrl);
        var response = await client.SendAsync(request, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("Image URL returned status {StatusCode}: {Url}", response.StatusCode, imageUrl);
            throw new HttpRequestException($"Image URL returned status {response.StatusCode}");
        }

        // Check Content-Length header
        if (response.Content.Headers.ContentLength.HasValue)
        {
            var sizeInMB = response.Content.Headers.ContentLength.Value / (1024.0 * 1024.0);
            _logger.LogDebug("Image size: {Size:F2} MB", sizeInMB);

            if (response.Content.Headers.ContentLength.Value > 20_000_000)  // 20MB
            {
                throw new HttpRequestException($"Image size ({sizeInMB:F2} MB) exceeds 20MB limit");
            }
        }
        else
        {
            _logger.LogWarning("Image URL did not return Content-Length header, skipping size check");
        }

        _logger.LogInformation("Image URL validation successful: {Url}", imageUrl);
    }
    catch (TaskCanceledException)
    {
        _logger.LogError("Image URL validation timed out (2 seconds): {Url}", imageUrl);
        throw new HttpRequestException("Image URL validation timed out. Please check the URL.");
    }
}
```

**Testing**:
```csharp
// Unit test: Valid HTTP URL
await service.RewriteWithImageUrlAsync(
    "Describe this",
    "You are a helpful assistant",
    "https://example.com/image.jpg",
    "high"
);

// Unit test: Invalid URL (should throw)
await Assert.ThrowsAsync<ArgumentException>(() =>
    service.RewriteWithImageUrlAsync("text", "instruction", "not-a-url")
);

// Unit test: Image too large (mock HEAD response with 25MB Content-Length)
await Assert.ThrowsAsync<HttpRequestException>(() =>
    service.RewriteWithImageUrlAsync("text", "instruction", "https://example.com/large.jpg")
);
```

#### Task 2.2: Dynamic Model Capability Detection

**File**: `DedicatedAPIService.cs` (lines 217-236)

**Changes**:

```csharp
// ============================================================================
// Model Capability Detection
// ============================================================================

/// <summary>
/// Cache for model capabilities (5-minute TTL)
/// </summary>
private static readonly Dictionary<string, (bool SupportsVision, DateTime CachedAt)> _modelCapabilityCache = new();
private static readonly TimeSpan _cacheExpiration = TimeSpan.FromMinutes(5);
private static readonly object _cacheLock = new object();

/// <summary>
/// Checks if the current model supports multimodal (vision) input.
/// Queries the backend API for model capabilities and caches the result.
/// Falls back to hardcoded list if API is unavailable.
/// </summary>
/// <returns>True if model supports vision, false otherwise</returns>
public async Task<bool> SupportsMultimodalAsync()
{
    var modelName = GetModelName();
    if (string.IsNullOrEmpty(modelName))
    {
        _logger.LogWarning("No model name available for capability check");
        return false;
    }

    // Check cache first
    lock (_cacheLock)
    {
        if (_modelCapabilityCache.TryGetValue(modelName, out var cached))
        {
            if (DateTime.UtcNow - cached.CachedAt < _cacheExpiration)
            {
                _logger.LogDebug("Using cached capability for {Model}: {Supports}", modelName, cached.SupportsVision);
                return cached.SupportsVision;
            }
            else
            {
                // Expired, remove from cache
                _modelCapabilityCache.Remove(modelName);
            }
        }
    }

    // Query API for model capabilities
    try
    {
        var client = _httpClientFactory.CreateClient(HttpClientName);
        var config = _environmentService.CurrentConfiguration;
        var url = $"{config.ApiBaseUrl.TrimEnd('/')}/models/{Uri.EscapeDataString(modelName)}";

        var request = new HttpRequestMessage(HttpMethod.Get, url);
        var response = await SendAuthenticatedRequestAsync(client, request, CancellationToken.None);

        var modelDetails = await response.Content.ReadFromJsonAsync<ModelDetailsResponse>(
            ApiJsonSerializerOptions.Default);

        var supportsVision = modelDetails?.Capabilities?.Contains("vision") ?? false;

        // Cache result
        lock (_cacheLock)
        {
            _modelCapabilityCache[modelName] = (supportsVision, DateTime.UtcNow);
        }

        _logger.LogInformation("Model {Model} vision support: {Supports} (from API)", modelName, supportsVision);
        return supportsVision;
    }
    catch (Exception ex)
    {
        _logger.LogWarning(ex, "Failed to fetch model capabilities from API for {Model}, using fallback detection", modelName);

        // Fallback to hardcoded detection
        return SupportsMultimodalFallback(modelName);
    }
}

/// <summary>
/// Fallback method for model capability detection using hardcoded patterns.
/// Used when API is unavailable.
/// </summary>
private bool SupportsMultimodalFallback(string modelName)
{
    modelName = modelName.ToLowerInvariant();

    // Known vision-capable models (as of Jan 2025)
    var visionPatterns = new[]
    {
        "gpt-4o",
        "gpt-4-turbo",
        "gpt-4-vision",
        "gpt-5",  // GPT-5 models support vision
        "claude-3",  // Claude 3 family
        "claude-3.5-sonnet",
        "claude-3.5-haiku",
        "gemini-pro-vision",
        "gemini-1.5-pro",
        "gemini-2.0-pro"
    };

    var supportsVision = visionPatterns.Any(pattern => modelName.Contains(pattern));
    _logger.LogDebug("Model {Model} vision support (fallback): {Supports}", modelName, supportsVision);

    return supportsVision;
}

/// <summary>
/// Gets list of known multimodal models.
/// This is a static list for UI display purposes.
/// For runtime checks, use SupportsMultimodalAsync().
/// </summary>
public List<string> GetMultimodalModels()
{
    return new List<string>
    {
        "gpt-4o",
        "gpt-4-turbo",
        "gpt-5",
        "claude-3.5-sonnet",
        "claude-3.5-haiku",
        "gemini-2.0-pro",
        "gemini-1.5-pro"
    };
}

/// <summary>
/// Response model for GET /v1/models/:modelId API
/// </summary>
private class ModelDetailsResponse
{
    [JsonPropertyName("id")]
    public string? Id { get; set; }

    [JsonPropertyName("capabilities")]
    public List<string>? Capabilities { get; set; }

    [JsonPropertyName("object")]
    public string? Object { get; set; }
}
```

**Testing**:
```csharp
// Unit test: API returns vision capability
var supports = await service.SupportsMultimodalAsync();
Assert.True(supports);

// Unit test: API unavailable, fallback to hardcoded
// (Mock API to throw exception)
var supports = await service.SupportsMultimodalAsync();
Assert.True(supports);  // For gpt-4o model

// Unit test: Cache works (second call should not hit API)
await service.SupportsMultimodalAsync();
await service.SupportsMultimodalAsync();
// Verify only 1 API call was made
```

---

### Phase 3: Enhanced Validation & UX (Sprint 3 - Week 5-6)

**Priority**: 🟢 Medium
**Effort**: 4-6 hours
**Goal**: Add client-side validation and user experience improvements

#### Task 3.1: Image Format Validation

**File**: `DedicatedAPIService.cs` (new method)

**Implementation**:

```csharp
/// <summary>
/// Validates base64 image format by checking magic bytes.
/// Supports JPEG, PNG, GIF, WebP.
/// </summary>
/// <param name="base64Image">Base64-encoded image</param>
/// <returns>Image format (jpeg, png, gif, webp) or null if invalid</returns>
private string? ValidateImageFormat(string base64Image)
{
    try
    {
        // Decode first 12 bytes to check magic bytes
        var bytes = Convert.FromBase64String(base64Image.Substring(0, Math.Min(16, base64Image.Length)));

        // PNG: 89 50 4E 47 0D 0A 1A 0A
        if (bytes.Length >= 8 &&
            bytes[0] == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47)
        {
            return "png";
        }

        // JPEG: FF D8 FF
        if (bytes.Length >= 3 &&
            bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF)
        {
            return "jpeg";
        }

        // GIF: 47 49 46 38 (GIF8)
        if (bytes.Length >= 4 &&
            bytes[0] == 0x47 && bytes[1] == 0x49 && bytes[2] == 0x46 && bytes[3] == 0x38)
        {
            return "gif";
        }

        // WebP: 52 49 46 46 (RIFF) ... 57 45 42 50 (WEBP)
        if (bytes.Length >= 12 &&
            bytes[0] == 0x52 && bytes[1] == 0x49 && bytes[2] == 0x46 && bytes[3] == 0x46 &&
            bytes[8] == 0x57 && bytes[9] == 0x45 && bytes[10] == 0x42 && bytes[11] == 0x50)
        {
            return "webp";
        }

        _logger.LogWarning("Unsupported image format (magic bytes: {Bytes})",
            BitConverter.ToString(bytes.Take(4).ToArray()));
        return null;
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Failed to validate image format");
        return null;
    }
}
```

**Update RewriteWithImageAsync**:

```csharp
if (!string.IsNullOrEmpty(imageBase64))
{
    // Validate format
    var format = ValidateImageFormat(imageBase64);
    if (format == null)
    {
        _logger.LogError("Unsupported image format");
        throw new ArgumentException("Unsupported image format. Please use JPEG, PNG, GIF, or WebP.");
    }

    _logger.LogDebug("Image format validated: {Format}", format);

    // Validate size
    if (EstimateBase64Size(imageBase64) > 20_000_000)
    {
        _logger.LogError("Image exceeds 20MB size limit");
        throw new ArgumentException("Image size exceeds 20MB limit. Please use a smaller image.");
    }

    contentParts.Add(new ContentPart
    {
        Type = "image_url",
        ImageUrl = new ImageUrl
        {
            Url = $"data:image/{format};base64,{imageBase64}",  // ✅ Use detected format
            Detail = imageDetail
        }
    });
}
```

#### Task 3.2: Add Vision Token Estimation (Optional)

**File**: `DedicatedAPIService.cs` (new method)

**Implementation**:

```csharp
/// <summary>
/// Estimates vision tokens for an image based on OpenAI's algorithm.
/// This is a rough estimate for UI display purposes.
/// Actual token count is calculated by the backend.
/// </summary>
/// <param name="imageDetail">Detail level: "low", "high", or "auto"</param>
/// <param name="imageWidthPx">Image width in pixels (optional)</param>
/// <param name="imageHeightPx">Image height in pixels (optional)</param>
/// <returns>Estimated token count</returns>
public int EstimateVisionTokens(string imageDetail, int? imageWidthPx = null, int? imageHeightPx = null)
{
    if (imageDetail == "low")
    {
        return 85;  // Fixed tokens for low detail
    }

    // High detail or auto (assume high for safety)
    const int baseTokens = 85;
    const int tokensPerTile = 170;

    if (imageWidthPx.HasValue && imageHeightPx.HasValue)
    {
        // Scale image to fit within 2048x2048 (maintaining aspect ratio)
        var maxDimension = Math.Max(imageWidthPx.Value, imageHeightPx.Value);
        if (maxDimension > 2048)
        {
            var scale = 2048.0 / maxDimension;
            imageWidthPx = (int)(imageWidthPx.Value * scale);
            imageHeightPx = (int)(imageHeightPx.Value * scale);
        }

        // Calculate tiles (512x512 each)
        var tilesX = (int)Math.Ceiling(imageWidthPx.Value / 512.0);
        var tilesY = (int)Math.Ceiling(imageHeightPx.Value / 512.0);
        var totalTiles = tilesX * tilesY;

        _logger.LogDebug("Vision token estimation: {Width}x{Height} → {Tiles} tiles → {Tokens} tokens",
            imageWidthPx, imageHeightPx, totalTiles, baseTokens + (totalTiles * tokensPerTile));

        return baseTokens + (totalTiles * tokensPerTile);
    }

    // No dimensions provided, assume average (4 tiles)
    return baseTokens + (4 * tokensPerTile);  // ~765 tokens
}
```

---

## Testing Strategy

### Unit Tests

**File**: `TextAssistant.Tests/Services/DedicatedAPIServiceTests.cs`

```csharp
public class DedicatedAPIServiceVisionTests
{
    [Fact]
    public async Task RewriteWithImageAsync_SendsContentArray_NotJsonString()
    {
        // Arrange
        var mockHandler = new MockHttpMessageHandler();
        var service = CreateService(mockHandler);

        // Act
        await service.RewriteWithImageAsync(
            "Analyze this",
            "You are helpful",
            "iVBORw0KGgo...",  // Base64 image
            "high"
        );

        // Assert
        var request = mockHandler.CapturedRequests.Last();
        var body = await request.Content.ReadAsStringAsync();

        // Verify content is array, not JSON string
        Assert.Contains("\"content\":[{\"type\":\"text\"", body);
        Assert.Contains("\"type\":\"image_url\"", body);
        Assert.Contains("\"detail\":\"high\"", body);
        Assert.DoesNotContain("\\\"type\\\":\\\"text\\\"", body);  // No escaped quotes
    }

    [Fact]
    public async Task RewriteWithImageAsync_ValidatesImageSize()
    {
        // Arrange
        var service = CreateService();
        var largeImage = new string('A', 30_000_000);  // 30MB

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(() =>
            service.RewriteWithImageAsync("text", "instruction", largeImage)
        );
    }

    [Fact]
    public async Task RewriteWithImageAsync_ValidatesImageFormat()
    {
        // Arrange
        var service = CreateService();
        var invalidImage = Convert.ToBase64String(new byte[] { 0x00, 0x00, 0x00 });

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(() =>
            service.RewriteWithImageAsync("text", "instruction", invalidImage)
        );
    }

    [Fact]
    public async Task SupportsMultimodalAsync_CachesApiResponse()
    {
        // Arrange
        var mockHandler = new MockHttpMessageHandler();
        mockHandler.AddResponse("/models/gpt-4o", new ModelDetailsResponse
        {
            Capabilities = new List<string> { "vision", "text" }
        });
        var service = CreateService(mockHandler);

        // Act
        var result1 = await service.SupportsMultimodalAsync();
        var result2 = await service.SupportsMultimodalAsync();

        // Assert
        Assert.True(result1);
        Assert.True(result2);
        Assert.Single(mockHandler.CapturedRequests);  // Only 1 API call (cached)
    }

    [Fact]
    public async Task RewriteWithImageUrlAsync_ValidatesUrl()
    {
        // Arrange
        var service = CreateService();

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(() =>
            service.RewriteWithImageUrlAsync("text", "instruction", "not-a-url")
        );

        await Assert.ThrowsAsync<ArgumentException>(() =>
            service.RewriteWithImageUrlAsync("text", "instruction", "ftp://example.com/image.jpg")
        );
    }

    [Fact]
    public async Task EstimateVisionTokens_CalculatesCorrectly()
    {
        // Arrange
        var service = CreateService();

        // Act & Assert
        Assert.Equal(85, service.EstimateVisionTokens("low"));  // Low detail
        Assert.Equal(85 + (4 * 170), service.EstimateVisionTokens("high", 1024, 1024));  // 1024x1024 → 4 tiles
        Assert.Equal(85 + (1 * 170), service.EstimateVisionTokens("high", 512, 512));    // 512x512 → 1 tile
    }
}
```

### Integration Tests

**File**: `TextAssistant.IntegrationTests/DedicatedAPIVisionIntegrationTests.cs`

```csharp
public class DedicatedAPIVisionIntegrationTests : IClassFixture<TestServerFixture>
{
    [Fact]
    public async Task RewriteWithImageAsync_SendsToBackend_ReturnsResponse()
    {
        // Arrange
        var service = CreateService();
        var sampleImage = LoadSampleImageBase64("test-image.png");

        // Act
        var result = await service.RewriteWithImageAsync(
            "Describe this image",
            "You are a helpful assistant",
            sampleImage,
            "high"
        );

        // Assert
        Assert.NotEmpty(result);
        _output.WriteLine($"Response: {result}");
    }

    [Fact]
    public async Task RewriteWithImageUrlAsync_FetchesFromUrl_ReturnsResponse()
    {
        // Arrange
        var service = CreateService();
        var imageUrl = "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Cat03.jpg/200px-Cat03.jpg";

        // Act
        var result = await service.RewriteWithImageUrlAsync(
            "What animal is this?",
            "You are a helpful assistant",
            imageUrl,
            "low"
        );

        // Assert
        Assert.Contains("cat", result, StringComparison.OrdinalIgnoreCase);
    }
}
```

---

## Deployment Strategy

### Pre-Deployment Checklist

**Backend Requirements** (Must be deployed FIRST):
- ✅ Plan 204 Phase 1 implemented (schema, validation, token calculation)
- ✅ Backend API accepts `content: string | ContentPart[]`
- ✅ Backend deployed to production environment
- ✅ Backward compatibility verified (text-only requests still work)

**Desktop Client Requirements**:
- ✅ All unit tests passing (80%+ coverage)
- ✅ Integration tests passing against staging backend
- ✅ Code review completed
- ✅ XML documentation complete

### Deployment Phases

**Phase 1**: Backend Deployment (Week 1-2)
1. Backend team deploys Plan 204 Phase 1
2. Verify backward compatibility with current Desktop Client
3. Monitor logs for any issues

**Phase 2**: Desktop Client Deployment (Week 3-4)
1. Desktop Client team deploys updated code
2. Users receive update via auto-update mechanism
3. Monitor error logs for vision request failures

**Phase 3**: Validation (Week 4-5)
1. Verify vision requests work end-to-end
2. Check token calculation accuracy
3. Monitor credit usage for vision requests

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| **Breaking change breaks existing users** | 🟡 Medium | 🔴 High | Deploy backend first with backward compatibility, phased client rollout |
| **Image validation false positives** | 🟢 Low | 🟡 Medium | Add bypass option for validation, log all validation failures |
| **API capability endpoint unavailable** | 🟢 Low | 🟡 Medium | Fallback to hardcoded model detection |
| **20MB images cause timeouts** | 🟡 Medium | 🟡 Medium | Add client-side size check, show progress indicator |
| **Users confused by detail parameter** | 🟢 Low | 🟢 Low | Default to "auto", add tooltip explaining options |

---

## Success Metrics

### Functional Metrics

- ✅ 100% of vision requests use content arrays (not JSON strings)
- ✅ 0% increase in request failures after deployment
- ✅ Vision token calculation accuracy within 5% of actual tokens
- ✅ Model capability cache hit rate > 90%

### Performance Metrics

- ✅ Image validation completes in < 1 second (95th percentile)
- ✅ HTTP HEAD requests timeout after 2 seconds (no hangs)
- ✅ Model capability API calls cached for 5 minutes

### Quality Metrics

- ✅ Unit test coverage > 80% for new code
- ✅ All integration tests passing
- ✅ 0 P1/P0 bugs reported in first 2 weeks

---

## Documentation Updates

### User Documentation

**File**: `Desktop Client User Guide`

**New Section**: "Using Vision (Image) Features"

```markdown
## Using Vision (Image) Features

Text Assistant supports vision-capable AI models that can analyze images alongside text.

### Supported Models

The following models support vision features:
- GPT-4o
- GPT-4 Turbo
- GPT-5
- Claude 3.5 Sonnet
- Claude 3.5 Haiku
- Gemini 2.0 Pro

### Sending Images

1. **From File** (Recommended):
   - Click "Attach Image" button
   - Select image file (JPEG, PNG, GIF, WebP)
   - Maximum size: 20MB
   - The image will be converted to base64 automatically

2. **From URL**:
   - Paste image URL (HTTP or HTTPS)
   - Click "Attach URL" button
   - The system will validate the URL before sending

### Image Detail Level

Choose the detail level for image analysis:
- **Auto** (Default): Automatic detail level
- **Low**: Faster, uses 85 tokens, suitable for small images or quick analysis
- **High**: More detailed analysis, uses 85-1000+ tokens depending on image size

### Cost Considerations

Vision requests consume more credits than text-only requests:
- Low detail images: +85 tokens (~17 credits)
- High detail images: +85-1000 tokens (~17-200 credits)

Estimated credits are shown before sending the request.
```

### Developer Documentation

**File**: `Desktop Client Developer Guide`

**New Section**: "Vision API Implementation"

```markdown
## Vision API Implementation

### Architecture

Vision support follows OpenAI's Chat Completions Vision API standard:

- **Content Union Type**: `content: string | ContentPart[]`
- **Content Parts**: `{ type: "text", text: string }` or `{ type: "image_url", image_url: ImageUrl }`
- **Image Detail**: `auto`, `low`, `high`

### Usage Example

```csharp
// Base64 image
var result = await dedicatedApiService.RewriteWithImageAsync(
    inputText: "Describe this image",
    instruction: "You are a helpful assistant",
    imageBase64: imageBase64String,
    imageDetail: "high"
);

// HTTP URL image
var result = await dedicatedApiService.RewriteWithImageUrlAsync(
    inputText: "What's in this image?",
    instruction: "You are a helpful assistant",
    imageUrl: "https://example.com/image.jpg",
    imageDetail: "auto"
);
```

### Token Estimation

```csharp
var estimatedTokens = dedicatedApiService.EstimateVisionTokens(
    imageDetail: "high",
    imageWidthPx: 1024,
    imageHeightPx: 768
);
// Returns: 85 + (tiles × 170)
```

### Model Capability Check

```csharp
var supportsVision = await dedicatedApiService.SupportsMultimodalAsync();
if (supportsVision)
{
    // Show "Attach Image" button
}
```
```

---

## Conclusion

This plan provides a comprehensive roadmap for updating the Desktop Client to align with the backend's OpenAI Chat Completions Vision API standard (Plan 204).

**Key Takeaways**:
1. **Critical Fix**: Update `ChatMessage.Content` from `string` to `object` and remove JSON serialization
2. **Enhanced Features**: Add HTTP URL support, dynamic model detection, detail parameter
3. **Phased Deployment**: Backend first (backward compatible), then Desktop Client
4. **Timeline**: 2-3 sprints (2-6 weeks)
5. **Effort**: 16-24 developer hours

**Next Steps**:
1. Backend team deploys Plan 204 Phase 1
2. Desktop Client team implements Phase 1 (critical fixes)
3. Joint testing and validation
4. Phased rollout to users

---

**References**:
- Plan 204: Backend Vision Support (`docs/plan/204-vision-image-support-chat-completions.md`)
- Analysis 087: Desktop Client Vision Alignment (`docs/analysis/087-desktop-client-vision-support-alignment-analysis.md`)
- OpenAI Vision API: https://platform.openai.com/docs/guides/vision
- Desktop Client Source: `D:\sources\demo\text-assistant\TextAssistant.Core\Services\LLM\Providers\DedicatedAPIService.cs`

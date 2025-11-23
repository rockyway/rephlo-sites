# Admin Model Management API Documentation

**API Version**: v1
**Base URL**: `http://localhost:7150` (development)
**Authentication**: Required (Admin role)
**Last Updated**: 2025-11-19

---

## Overview

The Admin Model Management API allows administrators to perform full CRUD operations on LLM models, including creating, reading, updating, archiving, and managing model lifecycle states.

**Key Features**:
- Full model editing (name, pricing, metadata, capabilities)
- Atomic updates of model and pricing records
- Lifecycle management (active, legacy, archived)
- Tier access control configuration
- Provider-specific metadata management
- Audit trail for all admin actions

---

## Authentication

All endpoints require:
1. **Bearer Token**: Valid JWT access token
2. **Admin Role**: User must have `role: 'admin'`

**Header**:
```http
Authorization: Bearer <access_token>
```

**Error Responses**:
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: User is not an admin

---

## Endpoints

### 1. Get Model Details

Retrieve detailed information about a specific model.

**Endpoint**: `GET /admin/models/:id`

**Parameters**:
- `id` (path): Model ID (e.g., `gpt-5-chat`)

**Request**:
```http
GET /admin/models/gpt-5-chat HTTP/1.1
Host: localhost:7150
Authorization: Bearer <admin_token>
```

**Response** (200 OK):
```json
{
  "status": "success",
  "message": "Model details retrieved successfully",
  "data": {
    "id": "gpt-5-chat",
    "name": "gpt-5-chat",
    "provider": "openai",
    "isAvailable": true,
    "isLegacy": false,
    "isArchived": false,
    "meta": {
      "displayName": "GPT-5 Chat",
      "description": "Next-generation conversational AI model with advanced reasoning",
      "contextLength": 128000,
      "maxOutputTokens": 32768,
      "inputCostPerMillionTokens": 125000,
      "outputCostPerMillionTokens": 1000000,
      "creditsPer1kTokens": 120,
      "capabilities": ["chat", "completion", "vision", "function_calling"],
      "version": "2025-11-01",
      "isVisionCapable": true,
      "supportsStreaming": true,
      "supportsFunctionCalling": true,
      "supportsJsonMode": true
    },
    "createdAt": "2025-11-15T10:30:00.000Z",
    "updatedAt": "2025-11-19T14:25:00.000Z"
  }
}
```

**Error Responses**:
- `404 Not Found`: Model does not exist
  ```json
  {
    "error": {
      "code": "not_found",
      "message": "Model 'gpt-5-chat' not found"
    }
  }
  ```

---

### 2. Update Model (Full Edit)

Update a model's complete configuration including pricing, metadata, and capabilities. This endpoint performs atomic updates to both the `models` table and `model_provider_pricing` table.

**Endpoint**: `PUT /admin/models/:id`

**Parameters**:
- `id` (path): Model ID (e.g., `gpt-5-chat`)

**Request Body**:
```typescript
{
  name?: string;                    // Model name (optional)
  meta?: {                          // Partial meta updates
    displayName?: string;
    description?: string;
    contextLength?: number;
    maxOutputTokens?: number;
    inputCostPerMillionTokens?: number;   // In cents (USD)
    outputCostPerMillionTokens?: number;  // In cents (USD)
    creditsPer1kTokens?: number;          // Auto-calculated if pricing changes
    capabilities?: string[];
    version?: string;
    isVisionCapable?: boolean;
    supportsStreaming?: boolean;
    supportsFunctionCalling?: boolean;
    supportsJsonMode?: boolean;
    // Provider-specific fields
    anthropicModelTier?: string;
    googleSafetySettings?: any;
    openaiResponseFormat?: any;
  };
  reason?: string;                  // Admin reason for audit trail (max 1000 chars)
}
```

**Request Example**:
```http
PUT /admin/models/gpt-5-chat HTTP/1.1
Host: localhost:7150
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "gpt-5-chat",
  "meta": {
    "displayName": "GPT-5 Chat (Updated)",
    "description": "Enhanced GPT-5 with improved reasoning capabilities",
    "inputCostPerMillionTokens": 150000,
    "outputCostPerMillionTokens": 1200000,
    "contextLength": 256000,
    "maxOutputTokens": 65536,
    "capabilities": ["chat", "completion", "vision", "function_calling", "web_search"]
  },
  "reason": "Price adjustment and capability update for Q4 2025"
}
```

**Response** (200 OK):
```json
{
  "status": "success",
  "message": "Model 'gpt-5-chat' updated successfully",
  "data": {
    "id": "gpt-5-chat",
    "name": "gpt-5-chat",
    "provider": "openai",
    "isAvailable": true,
    "isLegacy": false,
    "isArchived": false,
    "meta": {
      "displayName": "GPT-5 Chat (Updated)",
      "description": "Enhanced GPT-5 with improved reasoning capabilities",
      "contextLength": 256000,
      "maxOutputTokens": 65536,
      "inputCostPerMillionTokens": 150000,
      "outputCostPerMillionTokens": 1200000,
      "creditsPer1kTokens": 144,
      "capabilities": ["chat", "completion", "vision", "function_calling", "web_search"],
      "version": "2025-11-01",
      "isVisionCapable": true,
      "supportsStreaming": true,
      "supportsFunctionCalling": true,
      "supportsJsonMode": true
    },
    "createdAt": "2025-11-15T10:30:00.000Z",
    "updatedAt": "2025-11-19T16:45:00.000Z"
  }
}
```

**Important Notes**:
1. **Partial Updates**: Only fields provided in the request are updated; omitted fields remain unchanged
2. **Pricing Units**: All pricing fields are in **cents** (multiply USD by 100)
   - Example: $1.25 = 125000 cents per million tokens
3. **Auto-calculation**: If `inputCostPerMillionTokens` or `outputCostPerMillionTokens` changes but `creditsPer1kTokens` is not provided, it will be automatically calculated
4. **Atomic Transaction**: Updates to `models.meta` and `model_provider_pricing` table happen atomically
5. **Cache Invalidation**: Model cache is cleared after successful update
6. **Audit Trail**: If `reason` is provided, it's logged in the audit log for admin action tracking

**Error Responses**:
- `404 Not Found`: Model does not exist
  ```json
  {
    "error": {
      "code": "not_found",
      "message": "Model 'gpt-5-chat' not found"
    }
  }
  ```

- `400 Bad Request`: Validation error
  ```json
  {
    "error": {
      "code": "validation_error",
      "message": "Invalid meta.contextLength: must be a positive integer"
    }
  }
  ```

- `500 Internal Server Error`: Update failed
  ```json
  {
    "error": {
      "code": "update_failed",
      "message": "Failed to update model"
    }
  }
  ```

---

### 3. Mark Model as Legacy

Mark a model as legacy (deprecated but still functional).

**Endpoint**: `PATCH /admin/models/:id/legacy`

**Parameters**:
- `id` (path): Model ID

**Request Body**:
```json
{
  "reason": "Model has been superseded by GPT-6"
}
```

**Response** (200 OK):
```json
{
  "status": "success",
  "message": "Model 'gpt-5-chat' marked as legacy",
  "data": {
    "id": "gpt-5-chat",
    "isLegacy": true,
    "isArchived": false
  }
}
```

---

### 4. Unmark Model as Legacy

Remove legacy status from a model.

**Endpoint**: `DELETE /admin/models/:id/legacy`

**Parameters**:
- `id` (path): Model ID

**Request Body**:
```json
{
  "reason": "Re-instated after performance improvements"
}
```

**Response** (200 OK):
```json
{
  "status": "success",
  "message": "Model 'gpt-5-chat' unmarked as legacy",
  "data": {
    "id": "gpt-5-chat",
    "isLegacy": false,
    "isArchived": false
  }
}
```

---

### 5. Archive Model

Archive a model (removes from active use).

**Endpoint**: `PATCH /admin/models/:id/archive`

**Parameters**:
- `id` (path): Model ID

**Request Body**:
```json
{
  "reason": "End of life - no longer supported by provider"
}
```

**Response** (200 OK):
```json
{
  "status": "success",
  "message": "Model 'gpt-5-chat' archived",
  "data": {
    "id": "gpt-5-chat",
    "isLegacy": false,
    "isArchived": true
  }
}
```

---

### 6. Unarchive Model

Restore an archived model to active status.

**Endpoint**: `DELETE /admin/models/:id/archive`

**Parameters**:
- `id` (path): Model ID

**Request Body**:
```json
{
  "reason": "Provider resumed support"
}
```

**Response** (200 OK):
```json
{
  "status": "success",
  "message": "Model 'gpt-5-chat' unarchived",
  "data": {
    "id": "gpt-5-chat",
    "isLegacy": false,
    "isArchived": false
  }
}
```

---

### 7. Update Model Tier Configuration

Update tier access control for a model (which tiers can access it).

**Endpoint**: `PATCH /admin/models/:id/tier`

**Request Body**:
```json
{
  "requiredTier": "pro",
  "tierRestrictionMode": "minimum",
  "allowedTiers": ["pro", "pro_max", "enterprise_pro", "enterprise_max"],
  "reason": "Premium model - requires Pro tier or higher"
}
```

**Response** (200 OK):
```json
{
  "status": "success",
  "message": "Tier configuration updated for 'gpt-5-chat'",
  "data": {
    "id": "gpt-5-chat",
    "requiredTier": "pro",
    "tierRestrictionMode": "minimum",
    "allowedTiers": ["pro", "pro_max", "enterprise_pro", "enterprise_max"]
  }
}
```

---

## Model Metadata Schema

### Core Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `displayName` | string | Yes | Human-readable model name |
| `description` | string | No | Model description (max 1000 chars) |
| `contextLength` | number | Yes | Maximum context window size |
| `maxOutputTokens` | number | No | Maximum output tokens per request |
| `inputCostPerMillionTokens` | number | Yes | Input cost in cents |
| `outputCostPerMillionTokens` | number | Yes | Output cost in cents |
| `creditsPer1kTokens` | number | No | Auto-calculated if not provided |
| `capabilities` | string[] | Yes | Model capabilities (chat, vision, etc.) |
| `version` | string | No | Model version identifier |

### Capability Flags

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `isVisionCapable` | boolean | false | Supports image inputs |
| `supportsStreaming` | boolean | true | Supports streaming responses |
| `supportsFunctionCalling` | boolean | false | Supports function/tool calling |
| `supportsJsonMode` | boolean | false | Supports JSON output mode |

### Provider-Specific Fields

#### OpenAI

| Field | Type | Description |
|-------|------|-------------|
| `openaiResponseFormat` | object | Response format configuration |

#### Anthropic

| Field | Type | Description |
|-------|------|-------------|
| `anthropicModelTier` | string | Claude model tier (e.g., "opus", "sonnet") |

#### Google AI

| Field | Type | Description |
|-------|------|-------------|
| `googleSafetySettings` | object | Safety filter configuration |

---

## Pricing Calculation

### Credits Per 1K Tokens Formula

When `inputCostPerMillionTokens` or `outputCostPerMillionTokens` changes:

```typescript
creditsPer1kTokens = Math.ceil(
  (inputCostPerMillionTokens / 1_000_000 * 1000) +
  (outputCostPerMillionTokens / 1_000_000 * 1000)
);
```

**Example**:
- Input: $1.50 per 1M tokens = 150,000 cents
- Output: $12.00 per 1M tokens = 1,200,000 cents
- Credits per 1K tokens: ceil((150000/1000000 * 1000) + (1200000/1000000 * 1000)) = ceil(1.35) = **2 credits**

**Note**: If you explicitly provide `creditsPer1kTokens`, the auto-calculation is skipped.

---

## Atomic Transaction Behavior

The `PUT /admin/models/:id` endpoint performs atomic updates:

1. **Transaction Begins**
2. Update `models` table:
   - `name` field
   - `meta` JSONB column
   - `updated_at` timestamp
3. **If pricing changed**:
   - Look up provider ID
   - Update `model_provider_pricing` table:
     - `input_price_per_1k` (converted from cents per million)
     - `output_price_per_1k` (converted from cents per million)
     - `updated_at` timestamp
4. **Transaction Commits** (all-or-nothing)
5. Clear model cache
6. Return updated model details

**Rollback Scenarios**:
- Invalid pricing values → No changes persisted
- Provider not found → No changes persisted
- Database constraint violation → No changes persisted

---

## Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|------------|-------------|
| `not_found` | 404 | Model does not exist |
| `validation_error` | 400 | Invalid request body or parameters |
| `update_failed` | 500 | Failed to update model |
| `provider_not_found` | 404 | Provider does not exist (for pricing updates) |
| `unauthorized` | 401 | Missing or invalid token |
| `forbidden` | 403 | User is not an admin |

---

## Examples

### cURL Examples

#### Get Model Details
```bash
curl -X GET http://localhost:7150/admin/models/gpt-5-chat \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

#### Update Model (Full Edit)
```bash
curl -X PUT http://localhost:7150/admin/models/gpt-5-chat \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "meta": {
      "displayName": "GPT-5 Chat Pro",
      "inputCostPerMillionTokens": 175000,
      "outputCostPerMillionTokens": 1400000,
      "contextLength": 512000
    },
    "reason": "Price increase and context window expansion"
  }'
```

#### Mark as Legacy
```bash
curl -X PATCH http://localhost:7150/admin/models/gpt-4-turbo/legacy \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Superseded by GPT-5"}'
```

#### Archive Model
```bash
curl -X PATCH http://localhost:7150/admin/models/gpt-3.5-turbo/archive \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "End of life"}'
```

#### Update Tier Configuration
```bash
curl -X PATCH http://localhost:7150/admin/models/gpt-5-chat/tier \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "requiredTier": "enterprise_pro",
    "tierRestrictionMode": "minimum",
    "allowedTiers": ["enterprise_pro", "enterprise_max"],
    "reason": "Premium enterprise-only model"
  }'
```

---

### JavaScript/TypeScript Examples

#### Using Axios

```typescript
import axios from 'axios';

const API_BASE = 'http://localhost:7150';
const adminToken = 'your-admin-token';

// Get model details
const getModelDetails = async (modelId: string) => {
  const response = await axios.get(`${API_BASE}/admin/models/${modelId}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  return response.data.data;
};

// Update model (full edit)
const updateModel = async (
  modelId: string,
  updates: {
    name?: string;
    meta?: Record<string, any>;
    reason?: string;
  }
) => {
  const response = await axios.put(
    `${API_BASE}/admin/models/${modelId}`,
    updates,
    { headers: { Authorization: `Bearer ${adminToken}` } }
  );
  return response.data.data;
};

// Mark as legacy
const markAsLegacy = async (modelId: string, reason: string) => {
  const response = await axios.patch(
    `${API_BASE}/admin/models/${modelId}/legacy`,
    { reason },
    { headers: { Authorization: `Bearer ${adminToken}` } }
  );
  return response.data.data;
};

// Archive model
const archiveModel = async (modelId: string, reason: string) => {
  const response = await axios.patch(
    `${API_BASE}/admin/models/${modelId}/archive`,
    { reason },
    { headers: { Authorization: `Bearer ${adminToken}` } }
  );
  return response.data.data;
};

// Example: Update pricing and capabilities
const updateGPT5Pricing = async () => {
  await updateModel('gpt-5-chat', {
    meta: {
      displayName: 'GPT-5 Chat Advanced',
      inputCostPerMillionTokens: 200000,  // $2.00
      outputCostPerMillionTokens: 1600000, // $16.00
      contextLength: 1000000,
      capabilities: ['chat', 'vision', 'function_calling', 'web_search', 'code_interpreter'],
    },
    reason: 'Q1 2026 pricing update with expanded capabilities',
  });
};
```

---

## Frontend Integration

### EditModelDialog Component

The `EditModelDialog` component (`frontend/src/components/admin/EditModelDialog.tsx`) provides a comprehensive UI for editing models:

**Features**:
- Pre-filled form values from existing model
- USD input with automatic conversion to cents
- Provider-specific metadata fields
- Capabilities multi-select
- Tier access configuration
- Change detection (only sends modified fields)
- Real-time validation
- Read-only model ID and provider fields

**Usage**:
```tsx
import EditModelDialog from '@/components/admin/EditModelDialog';

<EditModelDialog
  model={selectedModel}
  isOpen={isDialogOpen}
  onConfirm={handleSaveModel}
  onCancel={() => setIsDialogOpen(false)}
  isSaving={isSaving}
/>
```

**Props**:
- `model`: ModelInfo object with current values
- `isOpen`: Dialog visibility state
- `onConfirm`: Callback with updates `(updates: UpdateModelRequest) => Promise<void>`
- `onCancel`: Close dialog callback
- `isSaving`: Loading state for save button

---

## Related Documentation

- [Model Tier Access Control Schema](/docs/reference/016-model-tier-access-control-schema.md)
- [Model Tier Access API](/docs/reference/017-model-tier-access-api.md)
- [Admin Settings API](/docs/reference/admin-settings-api.md)
- [Model Service Implementation](/backend/src/services/model.service.ts)
- [Admin Models Controller](/backend/src/controllers/admin-models.controller.ts)
- [EditModelDialog Component](/frontend/src/components/admin/EditModelDialog.tsx)
- [ModelManagement Page](/frontend/src/pages/admin/ModelManagement.tsx)

---

## Best Practices

1. **Partial Updates**: Only send fields that have changed to minimize database writes
2. **Pricing Units**: Always convert USD to cents before sending (multiply by 100)
3. **Audit Trail**: Always provide a `reason` field for admin actions
4. **Validation**: Validate input on frontend before API call to catch errors early
5. **Atomic Updates**: Use the PUT endpoint for simultaneous model + pricing updates
6. **Cache Awareness**: Updates automatically invalidate model cache
7. **Lifecycle Management**: Use proper workflow: Active → Legacy → Archived
8. **Provider Metadata**: Include provider-specific fields only for relevant providers

---

## Rate Limiting

Admin endpoints are subject to tier-based rate limiting:

- **Free Tier**: 10 requests/minute
- **Pro Tier**: 60 requests/minute
- **Enterprise Tier**: 300 requests/minute

**Rate Limit Headers**:
```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 1700000000
```

---

**API Version**: v1
**Last Updated**: 2025-11-19
**Maintained By**: Rephlo Backend Team

---

**End of Documentation**

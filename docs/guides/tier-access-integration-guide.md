# Model Tier Access Control - Developer Integration Guide

**Document Type**: Integration Guide
**Target Audience**: Frontend Developers, SDK Developers, API Integrators
**Created**: 2025-11-08
**Last Updated**: 2025-11-08

## Table of Contents

1. [Overview](#overview)
2. [Client Integration](#client-integration)
3. [Testing](#testing)
4. [Error Handling](#error-handling)
5. [Best Practices](#best-practices)
6. [Code Examples](#code-examples)

---

## Overview

### What Changed

The Rephlo API now includes tier-based access control for LLM models. This affects how you:

1. **List models** - Now includes tier metadata and access status
2. **Handle errors** - New 403 error for tier restrictions
3. **Display UI** - Show upgrade prompts when users lack access

### Backward Compatibility

**All changes are backward compatible**. Existing clients will continue to work, but won't take advantage of new tier features unless updated.

**New fields added** (optional to use):
- `required_tier`
- `tier_restriction_mode`
- `allowed_tiers`
- `access_status`
- `user_tier`
- `upgrade_info`

---

## Client Integration

### 1. Fetching Models with Tier Information

#### API Call

```javascript
// GET /v1/models
const response = await fetch('https://api.rephlo.com/v1/models', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
  }
});

const data = await response.json();
```

#### Response Structure

```typescript
interface ModelListResponse {
  models: Model[];
  total: number;
  user_tier?: 'free' | 'pro' | 'enterprise';
}

interface Model {
  id: string;
  name: string;
  provider: string;
  description?: string;
  capabilities: string[];
  context_length: number;
  max_output_tokens?: number;
  credits_per_1k_tokens: number;
  is_available: boolean;
  version?: string;

  // NEW: Tier access fields
  required_tier: 'free' | 'pro' | 'enterprise';
  tier_restriction_mode: 'minimum' | 'exact' | 'whitelist';
  allowed_tiers: ('free' | 'pro' | 'enterprise')[];
  access_status: 'allowed' | 'upgrade_required';
}
```

#### Processing Response

```javascript
const { models, user_tier } = data;

// Separate accessible and restricted models
const accessibleModels = models.filter(m => m.access_status === 'allowed');
const restrictedModels = models.filter(m => m.access_status === 'upgrade_required');

console.log(`You can access ${accessibleModels.length} models`);
console.log(`${restrictedModels.length} models require upgrade`);
```

---

### 2. Displaying Models in UI

#### React Component Example

```tsx
import React from 'react';
import { Lock } from 'lucide-react';

interface ModelCardProps {
  model: Model;
  onSelect: (modelId: string) => void;
  onUpgrade: () => void;
}

const ModelCard: React.FC<ModelCardProps> = ({ model, onSelect, onUpgrade }) => {
  const isAccessible = model.access_status === 'allowed';

  return (
    <div className={`model-card ${!isAccessible ? 'restricted' : ''}`}>
      <div className="model-header">
        <h3>{model.name}</h3>
        {!isAccessible && <Lock size={16} />}
      </div>

      <p className="model-description">{model.description}</p>

      <div className="model-details">
        <span className="model-provider">{model.provider}</span>
        <span className="model-cost">{model.credits_per_1k_tokens} credits/1k tokens</span>
      </div>

      {isAccessible ? (
        <button onClick={() => onSelect(model.id)}>
          Use Model
        </button>
      ) : (
        <div className="upgrade-prompt">
          <p className="tier-requirement">
            Requires {model.required_tier} tier
          </p>
          <button onClick={onUpgrade} className="upgrade-button">
            Upgrade to {model.required_tier}
          </button>
        </div>
      )}
    </div>
  );
};
```

#### CSS Styling

```css
.model-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 16px;
  transition: all 0.3s;
}

.model-card.restricted {
  opacity: 0.6;
  background: #f5f5f5;
}

.model-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.upgrade-prompt {
  margin-top: 12px;
  padding: 12px;
  background: #fff3cd;
  border-radius: 4px;
}

.tier-requirement {
  font-size: 14px;
  color: #856404;
  margin-bottom: 8px;
}

.upgrade-button {
  width: 100%;
  padding: 8px;
  background: #ffc107;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.upgrade-button:hover {
  background: #e0a800;
}
```

---

### 3. Filtering Models by Access

#### Show Only Accessible Models

```javascript
function getAccessibleModels(models) {
  return models.filter(model => model.access_status === 'allowed');
}

// Usage in UI
const accessibleModels = getAccessibleModels(data.models);
```

#### Group Models by Tier

```javascript
function groupModelsByTier(models) {
  return models.reduce((groups, model) => {
    const tier = model.required_tier;
    if (!groups[tier]) {
      groups[tier] = [];
    }
    groups[tier].push(model);
    return groups;
  }, {});
}

// Usage
const grouped = groupModelsByTier(data.models);
// { free: [...], pro: [...], enterprise: [...] }
```

---

### 4. Handling Model Selection

```javascript
async function selectModel(modelId, accessToken) {
  // First, check if model is accessible
  const modelsResponse = await fetch('https://api.rephlo.com/v1/models', {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  const { models } = await modelsResponse.json();
  const model = models.find(m => m.id === modelId);

  if (!model) {
    throw new Error('Model not found');
  }

  if (model.access_status === 'upgrade_required') {
    // Show upgrade prompt
    return {
      success: false,
      reason: 'upgrade_required',
      requiredTier: model.required_tier,
      upgradeUrl: '/subscriptions/upgrade'
    };
  }

  // Model is accessible, proceed with selection
  return {
    success: true,
    model: model
  };
}
```

---

## Testing

### 1. Creating Test Users

#### Via API (if available)

```bash
# Create free tier test user
curl -X POST "https://api.rephlo.com/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-free@example.com",
    "password": "SecurePassword123!",
    "tier": "free"
  }'

# Create pro tier test user
curl -X POST "https://api.rephlo.com/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-pro@example.com",
    "password": "SecurePassword123!",
    "tier": "pro"
  }'
```

#### Via Database (for development)

```sql
-- Create test user with free tier
INSERT INTO users (id, email, email_verified, password_hash)
VALUES (gen_random_uuid(), 'dev-free@test.local', true, '$2b$10$...');

-- Get user ID
SELECT id FROM users WHERE email = 'dev-free@test.local';

-- Create free subscription
INSERT INTO subscriptions (user_id, tier, status, credits_per_month, price_cents, billing_interval, current_period_start, current_period_end)
VALUES (
  '<user_id>',
  'free',
  'active',
  2000,
  0,
  'monthly',
  NOW(),
  NOW() + INTERVAL '30 days'
);
```

---

### 2. Generating JWT Tokens for Testing

#### Using Login Endpoint

```javascript
async function getTestToken(email, password) {
  const response = await fetch('https://api.rephlo.com/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();
  return data.access_token;
}

// Usage
const freeUserToken = await getTestToken('test-free@example.com', 'SecurePassword123!');
const proUserToken = await getTestToken('test-pro@example.com', 'SecurePassword123!');
```

#### Manual JWT Generation (for testing)

```javascript
const jwt = require('jsonwebtoken');

const payload = {
  sub: 'user-uuid-here',
  email: 'test-free@example.com',
  scope: 'models.read llm.inference',
  aud: 'https://api.rephlo.com',
  iss: 'https://auth.rephlo.com',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
};

const token = jwt.sign(payload, process.env.JWT_PRIVATE_KEY, {
  algorithm: 'RS256'
});

console.log(token);
```

---

### 3. Sample API Calls with curl/Postman

#### Test 1: List Models (Free User)

```bash
FREE_TOKEN="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X GET "https://api.rephlo.com/v1/models" \
  -H "Authorization: Bearer $FREE_TOKEN" \
  | jq '.models[] | {id: .id, name: .name, access_status: .access_status}'
```

**Expected Output**:
```json
{"id": "gpt-5", "name": "GPT-5", "access_status": "upgrade_required"}
{"id": "claude-3.5-sonnet", "name": "Claude 3.5 Sonnet", "access_status": "upgrade_required"}
```

#### Test 2: Attempt Inference (Free User, Pro Model)

```bash
curl -i -X POST "https://api.rephlo.com/v1/chat/completions" \
  -H "Authorization: Bearer $FREE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-3.5-sonnet",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

**Expected Response**:
```
HTTP/1.1 403 Forbidden

{
  "status": "error",
  "code": "model_access_restricted",
  "message": "Model access restricted: Requires Pro tier or higher",
  "details": {
    "model_id": "claude-3.5-sonnet",
    "user_tier": "free",
    "required_tier": "pro",
    "upgrade_url": "/subscriptions/upgrade"
  }
}
```

#### Test 3: Successful Inference (Pro User, Pro Model)

```bash
PRO_TOKEN="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X POST "https://api.rephlo.com/v1/chat/completions" \
  -H "Authorization: Bearer $PRO_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-3.5-sonnet",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 50
  }' \
  | jq
```

**Expected Response**:
```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "model": "claude-3.5-sonnet",
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "Hello! How can I help you today?"
      }
    }
  ]
}
```

---

## Error Handling

### 1. Parsing Error Responses

#### Error Response Format

```typescript
interface ApiError {
  status: 'error';
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
}
```

#### Tier Restriction Error

```typescript
interface TierRestrictionError extends ApiError {
  code: 'model_access_restricted';
  details: {
    model_id: string;
    user_tier: 'free' | 'pro' | 'enterprise';
    required_tier: 'free' | 'pro' | 'enterprise';
    upgrade_url: string;
  };
}
```

---

### 2. Error Handling Implementation

```javascript
async function chatCompletion(modelId, messages, accessToken) {
  try {
    const response = await fetch('https://api.rephlo.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: modelId,
        messages: messages
      })
    });

    if (!response.ok) {
      const error = await response.json();

      if (error.code === 'model_access_restricted') {
        // Handle tier restriction
        throw new TierRestrictionError(
          error.message,
          error.details.required_tier,
          error.details.upgrade_url
        );
      }

      // Handle other errors
      throw new ApiError(error.message, error.code);
    }

    return await response.json();

  } catch (error) {
    if (error instanceof TierRestrictionError) {
      // Show upgrade prompt to user
      showUpgradePrompt(error.requiredTier, error.upgradeUrl);
    } else {
      // Handle generic errors
      showErrorMessage(error.message);
    }
  }
}

// Custom error classes
class TierRestrictionError extends Error {
  constructor(message, requiredTier, upgradeUrl) {
    super(message);
    this.name = 'TierRestrictionError';
    this.requiredTier = requiredTier;
    this.upgradeUrl = upgradeUrl;
  }
}

class ApiError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}
```

---

### 3. Displaying User-Friendly Messages

#### Message Mapping

```javascript
const ERROR_MESSAGES = {
  'model_access_restricted': {
    title: 'Upgrade Required',
    message: (details) =>
      `This model requires a ${details.required_tier} subscription. Upgrade now to access advanced AI models.`,
    action: 'Upgrade Now'
  },
  'insufficient_credits': {
    title: 'Insufficient Credits',
    message: () =>
      `You don't have enough credits to complete this request. Purchase more credits or wait for your monthly reset.`,
    action: 'Buy Credits'
  },
  'resource_not_found': {
    title: 'Model Not Found',
    message: () =>
      `The selected model is not available. Please choose a different model.`,
    action: 'Choose Model'
  }
};

function showErrorMessage(error) {
  const errorConfig = ERROR_MESSAGES[error.code] || {
    title: 'Error',
    message: () => error.message,
    action: 'Retry'
  };

  // Display modal/toast
  showModal({
    title: errorConfig.title,
    message: errorConfig.message(error.details),
    primaryButton: errorConfig.action,
    onPrimaryClick: () => {
      if (error.code === 'model_access_restricted') {
        window.location.href = error.details.upgrade_url;
      }
    }
  });
}
```

---

### 4. Implementing Upgrade Flow

#### React Component

```tsx
import React, { useState } from 'react';

const UpgradePrompt: React.FC<{
  requiredTier: string;
  currentTier: string;
  onClose: () => void;
}> = ({ requiredTier, currentTier, onClose }) => {
  return (
    <div className="modal-overlay">
      <div className="upgrade-modal">
        <h2>Upgrade to {requiredTier}</h2>
        <p>
          You're currently on the <strong>{currentTier}</strong> plan.
          Upgrade to <strong>{requiredTier}</strong> to access this model.
        </p>

        <div className="tier-comparison">
          <div className="current-tier">
            <h3>{currentTier}</h3>
            <ul>
              <li>2,000 credits/month</li>
              <li>Basic models</li>
              <li>Community support</li>
            </ul>
          </div>

          <div className="target-tier">
            <h3>{requiredTier}</h3>
            <ul>
              <li>50,000 credits/month</li>
              <li>Advanced models</li>
              <li>Email support</li>
              <li>Priority access</li>
            </ul>
          </div>
        </div>

        <div className="modal-actions">
          <button onClick={onClose} className="btn-secondary">
            Not Now
          </button>
          <button
            onClick={() => window.location.href = '/subscriptions/upgrade'}
            className="btn-primary"
          >
            Upgrade to {requiredTier}
          </button>
        </div>
      </div>
    </div>
  );
};
```

---

## Best Practices

### 1. Pre-validate Model Access

**Don't wait for 403 errors**. Check `access_status` before making inference requests.

```javascript
// ❌ Bad: Wait for 403 error
async function useModel(modelId) {
  try {
    await chatCompletion(modelId, messages);
  } catch (error) {
    if (error.code === 'model_access_restricted') {
      showUpgradePrompt();
    }
  }
}

// ✅ Good: Check access before request
async function useModel(modelId) {
  const models = await fetchModels();
  const model = models.find(m => m.id === modelId);

  if (model.access_status === 'upgrade_required') {
    showUpgradePrompt(model.required_tier);
    return;
  }

  await chatCompletion(modelId, messages);
}
```

---

### 2. Cache Model List

**Don't fetch models on every render**. Cache for 5-10 minutes.

```javascript
class ModelCache {
  constructor() {
    this.cache = null;
    this.lastFetch = 0;
    this.TTL = 5 * 60 * 1000; // 5 minutes
  }

  async getModels(accessToken) {
    const now = Date.now();

    if (this.cache && (now - this.lastFetch) < this.TTL) {
      return this.cache;
    }

    const response = await fetch('https://api.rephlo.com/v1/models', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    const data = await response.json();
    this.cache = data;
    this.lastFetch = now;

    return data;
  }

  invalidate() {
    this.cache = null;
    this.lastFetch = 0;
  }
}

// Usage
const modelCache = new ModelCache();
const models = await modelCache.getModels(accessToken);
```

---

### 3. Handle Tier Changes During Sessions

**User might upgrade during an active session**. Refresh tier info periodically.

```javascript
// Refresh user tier every 10 minutes
setInterval(async () => {
  const models = await fetchModels();
  updateUserTier(models.user_tier);
  modelCache.invalidate(); // Force refresh on next request
}, 10 * 60 * 1000);

// Also refresh after subscription changes
async function onSubscriptionUpgrade() {
  modelCache.invalidate();
  const models = await fetchModels();
  updateUI(models);
}
```

---

### 4. Graceful Degradation

**If tier API fails**, fall back to showing all models.

```javascript
async function fetchModelsWithFallback() {
  try {
    const response = await fetch('https://api.rephlo.com/v1/models', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch models');
    }

    return await response.json();

  } catch (error) {
    console.error('Failed to fetch tier info, showing all models', error);

    // Fallback: Show all models without tier info
    return {
      models: FALLBACK_MODELS.map(m => ({
        ...m,
        access_status: 'allowed' // Assume allowed if tier check fails
      })),
      user_tier: undefined
    };
  }
}
```

---

### 5. Optimize UI for Different Tiers

```javascript
function renderModelList(models, userTier) {
  const accessible = models.filter(m => m.access_status === 'allowed');
  const restricted = models.filter(m => m.access_status === 'upgrade_required');

  return (
    <div>
      {/* Always show accessible models first */}
      <section>
        <h2>Available Models ({accessible.length})</h2>
        {accessible.map(model => <ModelCard key={model.id} model={model} />)}
      </section>

      {/* Show restricted models in separate section */}
      {restricted.length > 0 && (
        <section className="restricted-models">
          <h2>
            Premium Models ({restricted.length})
            <span className="upgrade-badge">Upgrade Required</span>
          </h2>
          {restricted.map(model => <ModelCard key={model.id} model={model} />)}
        </section>
      )}
    </div>
  );
}
```

---

## Code Examples

### Complete Integration Example (React + TypeScript)

```typescript
import React, { useState, useEffect } from 'react';

// Types
interface Model {
  id: string;
  name: string;
  provider: string;
  description?: string;
  required_tier: 'free' | 'pro' | 'enterprise';
  access_status: 'allowed' | 'upgrade_required';
  credits_per_1k_tokens: number;
}

interface ModelListResponse {
  models: Model[];
  total: number;
  user_tier?: 'free' | 'pro' | 'enterprise';
}

// API Service
class RephloAPI {
  constructor(private accessToken: string) {}

  async getModels(): Promise<ModelListResponse> {
    const response = await fetch('https://api.rephlo.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch models');
    }

    return await response.json();
  }

  async chatCompletion(modelId: string, messages: any[]) {
    const response = await fetch('https://api.rephlo.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ model: modelId, messages })
    });

    if (!response.ok) {
      const error = await response.json();
      throw error;
    }

    return await response.json();
  }
}

// React Component
const ModelSelector: React.FC<{ accessToken: string }> = ({ accessToken }) => {
  const [models, setModels] = useState<Model[]>([]);
  const [userTier, setUserTier] = useState<string | undefined>();
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const api = new RephloAPI(accessToken);

  useEffect(() => {
    loadModels();
  }, []);

  async function loadModels() {
    try {
      setLoading(true);
      const data = await api.getModels();
      setModels(data.models);
      setUserTier(data.user_tier);
    } catch (err) {
      setError('Failed to load models');
    } finally {
      setLoading(false);
    }
  }

  async function handleModelSelect(modelId: string) {
    const model = models.find(m => m.id === modelId);

    if (!model) return;

    if (model.access_status === 'upgrade_required') {
      // Show upgrade prompt
      alert(`This model requires ${model.required_tier} tier. Upgrade to access it.`);
      return;
    }

    setSelectedModel(modelId);
  }

  if (loading) return <div>Loading models...</div>;
  if (error) return <div>Error: {error}</div>;

  const accessible = models.filter(m => m.access_status === 'allowed');
  const restricted = models.filter(m => m.access_status === 'upgrade_required');

  return (
    <div className="model-selector">
      <div className="user-tier-badge">
        Current Plan: <strong>{userTier}</strong>
      </div>

      <h2>Available Models</h2>
      <div className="model-grid">
        {accessible.map(model => (
          <div
            key={model.id}
            className={`model-card ${selectedModel === model.id ? 'selected' : ''}`}
            onClick={() => handleModelSelect(model.id)}
          >
            <h3>{model.name}</h3>
            <p>{model.description}</p>
            <span className="provider">{model.provider}</span>
          </div>
        ))}
      </div>

      {restricted.length > 0 && (
        <>
          <h2>Premium Models</h2>
          <div className="model-grid restricted">
            {restricted.map(model => (
              <div
                key={model.id}
                className="model-card locked"
                onClick={() => handleModelSelect(model.id)}
              >
                <h3>{model.name} 🔒</h3>
                <p>{model.description}</p>
                <span className="tier-badge">{model.required_tier} tier required</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ModelSelector;
```

---

**Last Updated**: 2025-11-08
**Version**: 1.0
**Support**: developers@rephlo.com

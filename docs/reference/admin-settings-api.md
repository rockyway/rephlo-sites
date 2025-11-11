# Admin Settings API Documentation

**API Version**: v1
**Base URL**: `http://localhost:7150` (development)
**Authentication**: Required (Admin role)
**Last Updated**: 2025-11-11

---

## Overview

The Admin Settings API allows administrators to configure platform settings across six categories: General, Email, Security, Integrations, Feature Flags, and System.

**Features**:
- Category-based settings organization
- Automatic encryption for sensitive values (API keys, passwords)
- Input validation per category
- Settings persistence to PostgreSQL database
- Test utilities for email and cache management

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

### 1. Get All Settings

Retrieve settings for all categories.

**Endpoint**: `GET /admin/settings`

**Request**:
```http
GET /admin/settings HTTP/1.1
Host: localhost:7150
Authorization: Bearer <admin_token>
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "general": {
      "platform_name": "Rephlo",
      "platform_description": "Transform text. Keep your flow.",
      "timezone": "America/New_York",
      "date_format": "MM/DD/YYYY",
      "time_format": "12h",
      "default_currency": "USD",
      "default_language": "en"
    },
    "email": {
      "smtp_host": "smtp.sendgrid.net",
      "smtp_port": 587,
      "smtp_username": "apikey",
      "smtp_password": "••••••••",
      "smtp_secure": false,
      "from_email": "noreply@rephlo.com",
      "from_name": "Rephlo"
    },
    "security": {
      "session_timeout_minutes": 1440,
      "password_min_length": 8,
      "password_require_uppercase": true,
      "password_require_lowercase": true,
      "password_require_numbers": true,
      "password_require_symbols": true,
      "mfa_enforcement": "optional",
      "failed_login_attempts_lockout": 5,
      "lockout_duration_minutes": 15
    },
    "integrations": {
      "stripe_api_key": "sk_test_••••",
      "stripe_webhook_secret": "whsec_••••",
      "sendgrid_api_key": "SG.••••",
      "openai_api_key": "sk-••••",
      "anthropic_api_key": "sk-ant-••••",
      "google_ai_api_key": "AIza••••",
      "webhook_url": ""
    },
    "feature_flags": {
      "enable_perpetual_licenses": true,
      "enable_coupons": true,
      "enable_mfa": true,
      "enable_webhooks": true,
      "enable_beta_features": false,
      "maintenance_mode": false,
      "debug_mode": false
    },
    "system": {
      "log_level": "info",
      "log_retention_days": 90,
      "backup_frequency": "daily",
      "last_backup": "2025-11-11T10:30:00.000Z"
    }
  }
}
```

**Notes**:
- Sensitive fields are decrypted in the response
- Default values returned for settings not yet configured
- All 6 categories always returned

---

### 2. Get Category Settings

Retrieve settings for a specific category.

**Endpoint**: `GET /admin/settings/:category`

**Parameters**:
- `category` (path): One of `general`, `email`, `security`, `integrations`, `feature_flags`, `system`

**Request**:
```http
GET /admin/settings/general HTTP/1.1
Host: localhost:7150
Authorization: Bearer <admin_token>
```

**Response** (200 OK):
```json
{
  "success": true,
  "category": "general",
  "data": {
    "platform_name": "Rephlo",
    "platform_description": "Transform text. Keep your flow.",
    "timezone": "America/New_York",
    "date_format": "MM/DD/YYYY",
    "time_format": "12h",
    "default_currency": "USD",
    "default_language": "en"
  }
}
```

**Error Response** (400 Bad Request):
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CATEGORY",
    "message": "Invalid category. Must be one of: general, email, security, integrations, feature_flags, system"
  }
}
```

---

### 3. Update Category Settings

Update settings for a specific category.

**Endpoint**: `PUT /admin/settings/:category`

**Parameters**:
- `category` (path): One of `general`, `email`, `security`, `integrations`, `feature_flags`, `system`

**Request**:
```http
PUT /admin/settings/general HTTP/1.1
Host: localhost:7150
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "platform_name": "My Custom Platform",
  "timezone": "America/Los_Angeles",
  "date_format": "YYYY-MM-DD"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "general settings updated successfully",
  "category": "general",
  "data": {
    "platform_name": "My Custom Platform",
    "platform_description": "Transform text. Keep your flow.",
    "timezone": "America/Los_Angeles",
    "date_format": "YYYY-MM-DD",
    "time_format": "12h",
    "default_currency": "USD",
    "default_language": "en"
  }
}
```

**Error Response** (400 Bad Request - Validation Error):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid date_format"
  }
}
```

**Notes**:
- Partial updates supported (only provide fields to change)
- Sensitive fields automatically encrypted before storage
- Validation performed before update

---

### 4. Test Email Configuration

Test the email configuration without saving.

**Endpoint**: `POST /admin/settings/test-email`

**Request**:
```http
POST /admin/settings/test-email HTTP/1.1
Host: localhost:7150
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "smtp_host": "smtp.sendgrid.net",
  "smtp_port": 587,
  "smtp_username": "apikey",
  "smtp_password": "your-api-key",
  "smtp_secure": false,
  "from_email": "test@example.com"
}
```

**Response** (200 OK - Success):
```json
{
  "success": true,
  "message": "Email configuration is valid. (Actual sending not implemented yet)"
}
```

**Response** (200 OK - Failure):
```json
{
  "success": false,
  "message": "Invalid smtp_port"
}
```

**Note**: Currently validates configuration only. Actual email sending to be implemented.

---

### 5. Clear Application Cache

Clear all cached data (Redis, in-memory caches).

**Endpoint**: `POST /admin/settings/clear-cache`

**Request**:
```http
POST /admin/settings/clear-cache HTTP/1.1
Host: localhost:7150
Authorization: Bearer <admin_token>
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Cache cleared successfully"
}
```

**Note**: Clears all application caches. Use with caution in production.

---

### 6. Create Database Backup

Trigger an immediate database backup.

**Endpoint**: `POST /admin/settings/run-backup`

**Request**:
```http
POST /admin/settings/run-backup HTTP/1.1
Host: localhost:7150
Authorization: Bearer <admin_token>
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Backup created successfully",
  "timestamp": "2025-11-11T10:45:23.456Z"
}
```

**Notes**:
- Updates `system.last_backup` setting with timestamp
- Actual backup implementation to be completed
- Currently creates placeholder backup

---

## Setting Categories

### General Settings

**Category**: `general`

| Field | Type | Default | Validation |
|-------|------|---------|------------|
| `platform_name` | string | "Rephlo" | Any string |
| `platform_description` | string | "Transform text..." | Any string |
| `timezone` | string | "America/New_York" | Valid timezone |
| `date_format` | string | "MM/DD/YYYY" | One of: `MM/DD/YYYY`, `DD/MM/YYYY`, `YYYY-MM-DD` |
| `time_format` | string | "12h" | One of: `12h`, `24h` |
| `default_currency` | string | "USD" | One of: `USD`, `EUR`, `GBP` |
| `default_language` | string | "en" | Any string |

**Example Update**:
```json
{
  "platform_name": "Acme Corp",
  "timezone": "Europe/London",
  "date_format": "DD/MM/YYYY",
  "default_currency": "GBP"
}
```

---

### Email Settings

**Category**: `email`

| Field | Type | Default | Validation | Encrypted |
|-------|------|---------|------------|-----------|
| `smtp_host` | string | "" | Any string | No |
| `smtp_port` | number | 587 | 1-65535 | No |
| `smtp_username` | string | "" | Any string | No |
| `smtp_password` | string | "" | Any string | ✅ Yes |
| `smtp_secure` | boolean | false | Boolean | No |
| `from_email` | string | "" | Valid email | No |
| `from_name` | string | "Rephlo" | Any string | No |

**Example Update**:
```json
{
  "smtp_host": "smtp.mailgun.org",
  "smtp_port": 587,
  "smtp_username": "postmaster@mg.example.com",
  "smtp_password": "my-secret-password",
  "from_email": "noreply@example.com",
  "from_name": "My Platform"
}
```

**Note**: `smtp_password` is automatically encrypted before storage.

---

### Security Settings

**Category**: `security`

| Field | Type | Default | Validation |
|-------|------|---------|------------|
| `session_timeout_minutes` | number | 1440 | ≥ 5 |
| `password_min_length` | number | 8 | ≥ 6 |
| `password_require_uppercase` | boolean | true | Boolean |
| `password_require_lowercase` | boolean | true | Boolean |
| `password_require_numbers` | boolean | true | Boolean |
| `password_require_symbols` | boolean | true | Boolean |
| `mfa_enforcement` | string | "optional" | One of: `optional`, `required`, `disabled` |
| `failed_login_attempts_lockout` | number | 5 | Any number |
| `lockout_duration_minutes` | number | 15 | Any number |

**Example Update**:
```json
{
  "session_timeout_minutes": 720,
  "password_min_length": 10,
  "mfa_enforcement": "required",
  "failed_login_attempts_lockout": 3
}
```

---

### Integration Settings

**Category**: `integrations`

| Field | Type | Default | Encrypted |
|-------|------|---------|-----------|
| `stripe_api_key` | string | "" | ✅ Yes |
| `stripe_webhook_secret` | string | "" | ✅ Yes |
| `sendgrid_api_key` | string | "" | ✅ Yes |
| `openai_api_key` | string | "" | ✅ Yes |
| `anthropic_api_key` | string | "" | ✅ Yes |
| `google_ai_api_key` | string | "" | ✅ Yes |
| `webhook_url` | string | "" | No |

**Example Update**:
```json
{
  "stripe_api_key": "sk_live_1234567890",
  "openai_api_key": "sk-proj-abcdef",
  "webhook_url": "https://api.example.com/webhooks"
}
```

**Security Note**: All API keys are automatically encrypted using AES-256-GCM before storage. They are decrypted when retrieved via API.

---

### Feature Flags

**Category**: `feature_flags`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enable_perpetual_licenses` | boolean | true | Allow perpetual license purchases |
| `enable_coupons` | boolean | true | Enable coupon system |
| `enable_mfa` | boolean | true | Enable MFA feature |
| `enable_webhooks` | boolean | true | Enable webhook delivery |
| `enable_beta_features` | boolean | false | Enable experimental features |
| `maintenance_mode` | boolean | false | Put platform in maintenance mode |
| `debug_mode` | boolean | false | Enable verbose logging |

**Example Update**:
```json
{
  "enable_beta_features": true,
  "maintenance_mode": false,
  "debug_mode": true
}
```

**Warning**: Setting `maintenance_mode: true` will prevent user access to the platform.

---

### System Settings

**Category**: `system`

| Field | Type | Default | Validation |
|-------|------|---------|------------|
| `log_level` | string | "info" | One of: `debug`, `info`, `warn`, `error` |
| `log_retention_days` | number | 90 | Any number |
| `backup_frequency` | string | "daily" | One of: `daily`, `weekly`, `monthly` |
| `last_backup` | string \| null | null | ISO 8601 timestamp (read-only) |

**Example Update**:
```json
{
  "log_level": "debug",
  "log_retention_days": 30,
  "backup_frequency": "weekly"
}
```

**Note**: `last_backup` is automatically updated when running backups. Do not set manually.

---

## Encryption

### Sensitive Fields

The following fields are automatically encrypted before storage using **AES-256-GCM**:

- `smtp_password`
- `stripe_api_key`
- `stripe_webhook_secret`
- `sendgrid_api_key`
- `openai_api_key`
- `anthropic_api_key`
- `google_ai_api_key`

**Encryption Format**:
```
<iv>:<authTag>:<encryptedData>
```

Where:
- `iv`: 16-byte initialization vector (hex)
- `authTag`: 16-byte authentication tag (hex)
- `encryptedData`: Encrypted content (hex)

**Example**:
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6:q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2:g3h4i5j6k7l8m9n0o1p2q3r4s5t6u7v8
```

**Decryption**:
- Fields are automatically decrypted when retrieved via API
- Only decrypted values are returned in responses
- Raw encrypted values never exposed to clients

---

## Error Handling

### Error Response Format

All errors follow a consistent structure:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|------------|-------------|
| `INVALID_CATEGORY` | 400 | Category parameter is invalid |
| `VALIDATION_ERROR` | 400 | Setting value failed validation |
| `SETTINGS_FETCH_ERROR` | 500 | Failed to retrieve settings |
| `SETTINGS_UPDATE_ERROR` | 500 | Failed to update settings |
| `EMAIL_TEST_ERROR` | 500 | Failed to test email config |
| `CACHE_CLEAR_ERROR` | 500 | Failed to clear cache |
| `BACKUP_ERROR` | 500 | Failed to create backup |

---

## Examples

### cURL Examples

#### Get All Settings
```bash
curl -X GET http://localhost:7150/admin/settings \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

#### Update General Settings
```bash
curl -X PUT http://localhost:7150/admin/settings/general \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "platform_name": "My Platform",
    "timezone": "America/Los_Angeles"
  }'
```

#### Test Email Configuration
```bash
curl -X POST http://localhost:7150/admin/settings/test-email \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "smtp_host": "smtp.sendgrid.net",
    "smtp_port": 587,
    "from_email": "test@example.com"
  }'
```

#### Clear Cache
```bash
curl -X POST http://localhost:7150/admin/settings/clear-cache \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

#### Run Backup
```bash
curl -X POST http://localhost:7150/admin/settings/run-backup \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

### JavaScript/TypeScript Examples

#### Using Axios

```typescript
import axios from 'axios';

const API_BASE = 'http://localhost:7150';
const adminToken = 'your-admin-token';

// Get all settings
const getAllSettings = async () => {
  const response = await axios.get(`${API_BASE}/admin/settings`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  return response.data.data;
};

// Update settings
const updateGeneralSettings = async (settings: Record<string, any>) => {
  const response = await axios.put(
    `${API_BASE}/admin/settings/general`,
    settings,
    { headers: { Authorization: `Bearer ${adminToken}` } }
  );
  return response.data.data;
};

// Test email configuration
const testEmail = async (emailConfig: Record<string, any>) => {
  const response = await axios.post(
    `${API_BASE}/admin/settings/test-email`,
    emailConfig,
    { headers: { Authorization: `Bearer ${adminToken}` } }
  );
  return response.data;
};
```

---

## Rate Limiting

Admin endpoints are subject to rate limiting:

- **Free Tier**: 10 requests/minute
- **Pro Tier**: 60 requests/minute
- **Enterprise Tier**: 300 requests/minute

**Rate Limit Headers**:
```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 1636123456
```

---

## Best Practices

1. **Partial Updates**: Only send fields you want to update (not all fields required)
2. **Validation**: Always validate input before sending to avoid validation errors
3. **Sensitive Data**: Never log or display sensitive fields (API keys, passwords)
4. **Cache Clearing**: Use clear-cache sparingly in production (causes performance dip)
5. **Backups**: Schedule regular backups via `backup_frequency` instead of manual triggers

---

## Related Documentation

- [Admin UI Navigation Guide](/docs/guides/admin-ui-navigation-guide.md)
- [Settings Service Implementation](/backend/src/services/settings.service.ts)
- [Settings Controller](/backend/src/controllers/admin/settings.controller.ts)
- [Admin Settings Frontend](/frontend/src/pages/admin/AdminSettings.tsx)

---

**API Version**: v1
**Last Updated**: 2025-11-11
**Maintained By**: Rephlo Backend Team

---

**End of Documentation**

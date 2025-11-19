# Perpetual License Auto-Activation Coordination Plan

**Document ID**: 203
**Created**: 2025-11-19
**Status**: Planning
**Priority**: P1 (High)
**Parent Document**: [110-perpetual-plan-and-proration-strategy.md](./110-perpetual-plan-and-proration-strategy.md)
**Target Version**: v2.0.0

---

## Executive Summary

This document defines the coordination plan for implementing **seamless perpetual license activation** across Backend API, Identity Provider (OIDC), and Rephlo Desktop Client (WPF). The system supports two activation paths:

1. **Manual Activation** – User enters license key in desktop app
2. **Automatic Activation** – User logs in with OAuth; system detects and auto-activates license

**Current Status**: Plan 110 backend implementation is ~70% complete. Missing components:
- ✅ License purchase and activation endpoints exist (`/api/licenses/activate`)
- ✅ Device fingerprint validation implemented
- ❌ **Missing**: `GET /api/licenses/me` endpoint for authenticated license retrieval
- ❌ **Missing**: Identity Provider JWT claims integration (`licenseStatus`, `licenseKey`)
- ❌ **Missing**: Desktop client license manager module (WPF team scope)

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Current Implementation Status](#current-implementation-status)
3. [Gap Analysis](#gap-analysis)
4. [Backend Implementation Plan](#backend-implementation-plan)
5. [Identity Provider Integration Plan](#identity-provider-integration-plan)
6. [Desktop Client Requirements](#desktop-client-requirements)
7. [Data Flow Diagrams](#data-flow-diagrams)
8. [Security Considerations](#security-considerations)
9. [Testing Strategy](#testing-strategy)
10. [Coordination Timeline](#coordination-timeline)

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                     Rephlo Desktop App (WPF)                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              License Manager Module                      │   │
│  │  • Manual Key Entry UI                                   │   │
│  │  • Auto-Activation on Login                              │   │
│  │  • Local License Cache (encrypted)                       │   │
│  │  • Offline Validation (30-day grace)                     │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                            ↓ HTTPS
┌─────────────────────────────────────────────────────────────────┐
│                     Identity Provider (OIDC)                     │
│  • OAuth 2.0 Authorization Code Flow + PKCE                     │
│  • RS256 JWT Signing                                            │
│  • Custom Claims: licenseStatus, licenseKey, tier              │
│  • Userinfo Endpoint Enhancement                                │
└─────────────────────────────────────────────────────────────────┘
                            ↓ HTTPS
┌─────────────────────────────────────────────────────────────────┐
│                      Backend API (Node.js)                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Existing Endpoints (Plan 110):                          │   │
│  │  ✅ POST /api/licenses/purchase                          │   │
│  │  ✅ POST /api/licenses/activate                          │   │
│  │  ✅ GET /api/licenses/:licenseKey                        │   │
│  │  ✅ DELETE /api/licenses/activations/:id                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  New Endpoints (This Plan):                              │   │
│  │  ❌ GET /api/licenses/me (authenticated)                 │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                  PostgreSQL Database (Shared)                    │
│  • perpetual_license table                                      │
│  • license_activation table                                     │
│  • User table (links license ownership)                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Current Implementation Status

### Backend (Plan 110) - 70% Complete

**✅ Implemented Components:**

| Component | File | Status | Notes |
|-----------|------|--------|-------|
| License Purchase | `backend/src/controllers/license-management.controller.ts:40` | ✅ Complete | `POST /api/licenses/purchase` |
| Device Activation | `backend/src/controllers/license-management.controller.ts:89` | ✅ Complete | `POST /api/licenses/activate` |
| Device Deactivation | `backend/src/controllers/license-management.controller.ts:149` | ✅ Complete | `DELETE /api/licenses/activations/:id` |
| License Details | `backend/src/routes/plan110.routes.ts:96` | ✅ Complete | `GET /api/licenses/:licenseKey` |
| Active Devices List | `backend/src/routes/plan110.routes.ts:106` | ✅ Complete | `GET /api/licenses/:licenseKey/devices` |
| Device Fingerprint Validation | `backend/src/services/device-activation-management.service.ts` | ✅ Complete | SHA-256 hashing |
| 3-Device Limit Enforcement | `backend/src/services/license-management.service.ts` | ✅ Complete | Validation in `activateDevice()` |

**❌ Missing Components:**

| Component | Endpoint | Priority | Reason |
|-----------|----------|----------|--------|
| User License Retrieval | `GET /api/licenses/me` | **P0 Critical** | Auto-activation requires authenticated endpoint to fetch user's active license |
| JWT Claims Integration | Identity Provider claims | **P0 Critical** | Desktop needs `licenseStatus` in token for quick offline validation |

**📊 Database Schema (Already Deployed):**

```sql
-- ✅ Existing Schema (Plan 110)
CREATE TABLE perpetual_license (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES "User"(id) ON DELETE CASCADE,
  license_key VARCHAR(255) UNIQUE NOT NULL,
  purchased_version VARCHAR(20),
  eligible_until_version VARCHAR(20),
  max_activations INTEGER DEFAULT 3,
  status VARCHAR(20) DEFAULT 'active',
  purchased_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE license_activation (
  id UUID PRIMARY KEY,
  license_id UUID REFERENCES perpetual_license(id) ON DELETE CASCADE,
  machine_fingerprint VARCHAR(255) NOT NULL,
  device_name VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active',
  activated_at TIMESTAMP DEFAULT NOW(),
  last_verified_at TIMESTAMP
);
```

### Identity Provider - 0% Complete (JWT Claims)

**❌ Not Yet Implemented:**
- JWT claims enrichment with license data
- Userinfo endpoint enhancement
- Token refresh with updated claims

---

## Gap Analysis

### Critical Gaps (Must Implement)

#### Gap 1: `GET /api/licenses/me` Endpoint

**Problem**: Desktop client cannot auto-activate on login because there's no authenticated endpoint to fetch user's license.

**Current Workaround**: User must manually enter license key even if they purchased it.

**Required Behavior**:
```typescript
// Request
GET /api/licenses/me
Authorization: Bearer <JWT_TOKEN>

// Response (if license exists)
{
  "status": "success",
  "data": {
    "id": "uuid-123",
    "licenseKey": "REPHLO-V1-XXXX-XXXX-XXXX",
    "status": "active",
    "purchasedVersion": "1.0.0",
    "eligibleUntilVersion": "1.99.99",
    "maxActivations": 3,
    "activeDeviceCount": 2,
    "purchasedAt": "2025-01-15T10:00:00Z"
  }
}

// Response (if no license)
{
  "status": "success",
  "data": null
}
```

**Implementation Location**:
- Controller: `backend/src/controllers/license-management.controller.ts`
- Route: `backend/src/routes/plan110.routes.ts` (add after line 100)
- Service: Extend `LicenseManagementService.getUserActiveLicense(userId)`

---

#### Gap 2: Identity Provider JWT Claims

**Problem**: Desktop app must call `/api/licenses/me` on every login to check license status. Slow and requires network.

**Better Solution**: Include license info in JWT claims for instant offline validation.

**Required JWT Payload**:
```json
{
  "sub": "user-uuid-123",
  "email": "user@example.com",
  "role": "user",
  "scope": "openid profile email",

  // ⬇️ New claims for license
  "licenseStatus": "active",          // active | expired | null
  "licenseKey": "REPHLO-V1-****-XXXX", // Masked key
  "licenseTier": "perpetual",          // perpetual | pro | free
  "licenseVersion": "1.0.0",           // Purchased version

  "iat": 1700000000,
  "exp": 1700003600
}
```

**Implementation Location**:
- Identity Provider config: `identity-provider/src/config/oidc.ts`
- Custom claims function in `findAccount` adapter (line ~350)
- Userinfo endpoint customization

**Benefits**:
- Desktop can validate license offline (JWT signature verification)
- No API call needed on every app startup
- 30-day offline grace period using cached JWT

---

### Non-Critical Enhancements (Future Iterations)

| Enhancement | Priority | Reason |
|-------------|----------|--------|
| License Transfer API | P2 | Allow users to deactivate old device remotely |
| License Sharing Detection | P2 | Alert admins to suspicious multi-device usage |
| Grace Period Configuration | P3 | Currently hardcoded 30 days |
| License Renewal Notifications | P3 | Email users before expiration |

---

## Backend Implementation Plan

### Task 1: Add `GET /api/licenses/me` Endpoint

**Acceptance Criteria**:
- ✅ Returns active license if user has one
- ✅ Returns `null` if user has no license
- ✅ Requires authentication (JWT token)
- ✅ Includes activation count and device limit
- ✅ Returns 401 if unauthenticated

**Implementation Steps**:

1. **Service Layer** (`backend/src/services/license-management.service.ts`):
```typescript
/**
 * Get user's active perpetual license
 * @param userId - User ID from JWT
 * @returns Active license or null
 */
async getUserActiveLicense(userId: string): Promise<PerpetualLicense | null> {
  const license = await this.prisma.perpetualLicense.findFirst({
    where: {
      user_id: userId,
      status: 'active',
    },
    include: {
      _count: {
        select: {
          activations: {
            where: { status: 'active' },
          },
        },
      },
    },
    orderBy: {
      purchased_at: 'desc', // Most recent if multiple
    },
  });

  return license;
}
```

2. **Controller Layer** (`backend/src/controllers/license-management.controller.ts`):
```typescript
/**
 * GET /api/licenses/me
 * Get authenticated user's active license
 */
async getMyLicense(req: Request, res: Response): Promise<void> {
  const userId = (req as any).user?.sub || (req as any).userId;

  if (!userId) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
    return;
  }

  try {
    const license = await this.licenseService.getUserActiveLicense(userId);

    if (!license) {
      res.status(200).json({
        status: 'success',
        data: null, // No license found
      });
      return;
    }

    // Transform to API response format (camelCase)
    res.status(200).json({
      status: 'success',
      data: {
        id: license.id,
        licenseKey: license.license_key,
        status: license.status,
        purchasedVersion: license.purchased_version,
        eligibleUntilVersion: license.eligible_until_version,
        maxActivations: license.max_activations,
        activeDeviceCount: license._count.activations,
        purchasedAt: license.purchased_at.toISOString(),
      },
    });
  } catch (error) {
    logger.error('Failed to fetch user license', { userId, error });
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve license',
      },
    });
  }
}
```

3. **Route Registration** (`backend/src/routes/plan110.routes.ts`):
```typescript
/**
 * GET /api/licenses/me
 * Get authenticated user's active perpetual license
 * Requires authentication
 */
router.get(
  '/licenses/me',
  authMiddleware, // ⚠️ Critical: Must be authenticated
  asyncHandler(licenseController.getMyLicense.bind(licenseController))
);
```

**Testing Requirements**:
- Unit test: `getUserActiveLicense()` returns correct license
- Integration test: Endpoint returns 401 without auth
- Integration test: Endpoint returns `null` for user without license
- Integration test: Endpoint returns license data for user with license
- Integration test: Returns most recent license if user has multiple

**Files to Modify**:
- `backend/src/services/license-management.service.ts` (add method)
- `backend/src/controllers/license-management.controller.ts` (add method)
- `backend/src/routes/plan110.routes.ts` (add route ~line 110)

---

## Identity Provider Integration Plan

### Task 2: Add License Claims to JWT

**Objective**: Enrich JWT tokens with license status for offline validation in desktop app.

**Implementation Location**: `identity-provider/src/config/oidc.ts`

**Current `findAccount` Implementation** (line ~350):
```typescript
async findAccount(ctx: any, id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      role: true,
    },
  });

  return {
    accountId: id,
    async claims() {
      return {
        sub: id,
        email: user.email,
        role: user.role,
      };
    },
  };
}
```

**Enhanced Implementation**:
```typescript
async findAccount(ctx: any, id: string) {
  // Fetch user with license data (join query)
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      role: true,
      perpetualLicenses: {
        where: { status: 'active' },
        orderBy: { purchased_at: 'desc' },
        take: 1, // Most recent active license
        select: {
          license_key: true,
          status: true,
          purchased_version: true,
          eligible_until_version: true,
        },
      },
    },
  });

  if (!user) {
    return undefined;
  }

  const activeLicense = user.perpetualLicenses[0] || null;

  return {
    accountId: id,
    async claims(use: string, scope: string) {
      const baseClaims = {
        sub: id,
        email: user.email,
        role: user.role,
      };

      // Add license claims if license exists
      if (activeLicense) {
        return {
          ...baseClaims,
          licenseStatus: activeLicense.status, // 'active' | 'expired'
          licenseKey: maskLicenseKey(activeLicense.license_key), // Show last 4 chars
          licenseTier: 'perpetual',
          licenseVersion: activeLicense.purchased_version,
        };
      }

      return {
        ...baseClaims,
        licenseStatus: null,
        licenseTier: 'free', // Default tier for users without license
      };
    },
  };
}

/**
 * Mask license key for security (show last 4 characters)
 * Example: REPHLO-V1-XXXX-XXXX-AB12 → REPHLO-V1-****-****-AB12
 */
function maskLicenseKey(key: string): string {
  const parts = key.split('-');
  if (parts.length < 3) return key;

  return [
    parts[0], // REPHLO
    parts[1], // V1
    '****',
    '****',
    parts[parts.length - 1], // Last segment
  ].join('-');
}
```

**Userinfo Endpoint Enhancement**:

The OIDC `/oauth/userinfo` endpoint automatically uses the `claims()` function, so no additional changes needed. Desktop can call:

```typescript
GET /oauth/userinfo
Authorization: Bearer <ACCESS_TOKEN>

// Response includes license claims
{
  "sub": "user-uuid-123",
  "email": "user@example.com",
  "role": "user",
  "licenseStatus": "active",
  "licenseKey": "REPHLO-V1-****-****-AB12",
  "licenseTier": "perpetual",
  "licenseVersion": "1.0.0"
}
```

**Testing Requirements**:
- Integration test: JWT contains license claims for user with license
- Integration test: JWT contains `licenseStatus: null` for user without license
- Integration test: License key is properly masked
- Integration test: Userinfo endpoint returns license claims
- Security test: Ensure license key masking prevents exposure

**Files to Modify**:
- `identity-provider/src/config/oidc.ts` (modify `findAccount`, add `maskLicenseKey`)
- `identity-provider/src/config/oidc.ts` (update Prisma schema import to include `perpetualLicenses`)

---

## Desktop Client Requirements (WPF Team Scope)

**IMPORTANT - Separate Repository Context**:
This section applies to the **Text Assistant WPF Desktop Application**, maintained in a separate codebase:
- **Repository Location**: `D:\sources\demo\text-assistant\`
- **Architecture**: .NET 8.0 WPF application with MVVM pattern
- **Reference Document**: `D:\sources\demo\text-assistant\PROJECT_STRUCTURE.md`
- **Current Version**: 3.0.1
- **Technology Stack**: WPF-UI 4.0.3 (Lepo), CommunityToolkit.Mvvm, Entity Framework Core 8.0.8

**Existing Infrastructure to Leverage**:
The Text Assistant already has extensive OAuth 2.0 and encryption infrastructure:
- ✅ **OAuth 2.0 PKCE Flow**: `DedicatedAPITokenManager` with token refresh
- ✅ **Encryption Service**: `CrossPlatformEncryptionService` using Microsoft.AspNetCore.DataProtection
- ✅ **Database**: SQLite with EF Core (`ApplicationDbContext`)
- ✅ **DI Container**: 60+ registered services with proper scoping
- ✅ **UI Framework**: Single-window architecture with `NavigationService` and `DialogService`
- ✅ **Windows Interop**: P/Invoke layer for Windows APIs (`User32`, `Kernel32`, WMI)

### Component 1: License Manager Module

**New Files Required**:
```
TextAssistant.Core/Services/License/
├── LicenseManager.cs (new)               # Core license management service
├── LicenseApiClient.cs (new)             # HTTP client for Rephlo backend
└── LicenseValidationService.cs (new)     # Offline validation + JWT verification

TextAssistant.Core/Interfaces/
└── ILicenseManager.cs (new)              # Service contract

TextAssistant.Data/Models/
└── LicenseActivation.cs (new)            # EF Core entity for local license

TextAssistant.Platform.Windows/Services/
└── WindowsDeviceFingerprintService.cs (new)  # WMI-based fingerprint

TextAssistant.UI/ViewModels/Settings/
└── LicenseSettingsViewModel.cs (new)     # License UI ViewModel

TextAssistant.UI/Views/Settings/
└── LicenseSettingsView.xaml (new)        # License activation UI (WPF-UI controls)
```

**Responsibilities**:

1. **Manual Activation Flow**:
   - UI: Add "License" tab to existing Settings page (`SettingsView.xaml`)
   - Input: License key text box with validation (WPF-UI `TextBox` control)
   - Call: `POST /api/licenses/activate` via `LicenseApiClient`
   - Store: Encrypted license in SQLite via existing `ApplicationDbContext`
   - Error: Use existing `DialogService.ShowMessageAsync()` for error messages

2. **Auto-Activation Flow**:
   - Trigger: After successful OAuth login (hook into existing `DedicatedAPITokenManager.OnTokenReceived`)
   - Call: `GET /api/licenses/me` with OAuth access token
   - Decision: If license exists → auto-activate; if not → show optional "Enter Key" dialog
   - Storage: Same as manual flow (encrypted in SQLite)

3. **Local License Storage**:
   - Database: Reuse existing `%LOCALAPPDATA%\TextAssistant\TextAssistant.db`
   - Entity: New `LicenseActivation` table via EF Core migration
   - Encryption: Use existing `ICrossPlatformEncryptionService` (already injected)
   - Fields: `Id`, `LicenseKey` (encrypted), `ActivationId`, `DeviceFingerprint`, `Status`, `ExpiresAt`, `CreatedAt`

4. **Offline Validation**:
   - JWT Claims: Read `licenseStatus` from OAuth token (existing token manager)
   - Signature: Verify JWT using OIDC JWKS (reuse OAuth infrastructure)
   - Grace Period: 30 days offline; after that, trigger OAuth re-authentication
   - Fallback: Check local database if network unavailable

**Dependency Injection Registration** (in `App.xaml.cs`):
```csharp
// Add to ConfigureServices()
services.AddSingleton<ILicenseApiClient, LicenseApiClient>(sp =>
    new LicenseApiClient(baseUrl: environmentService.GetCurrentApiUrl()));

services.AddScoped<ILicenseManager, LicenseManager>();
services.AddSingleton<IDeviceFingerprintService, WindowsDeviceFingerprintService>();
services.AddTransient<LicenseSettingsViewModel>();
```

### Component 2: Machine Fingerprint Generator

**Implementation**: `TextAssistant.Platform.Windows/Services/WindowsDeviceFingerprintService.cs`

**Leverage Existing WMI Access**:
Text Assistant already uses `System.Management` for Windows interop. Extend this for device fingerprinting.

**Implementation** (must match backend SHA-256 format):
```csharp
using System.Management;
using System.Security.Cryptography;
using System.Text;
using TextAssistant.Core.Interfaces;

namespace TextAssistant.Platform.Windows.Services
{
    public class WindowsDeviceFingerprintService : IDeviceFingerprintService
    {
        public string GenerateFingerprint()
        {
            var cpuId = GetCpuId();
            var diskSerial = GetDiskSerial();
            var osVersion = Environment.OSVersion.ToString();

            var combined = $"{cpuId}|{diskSerial}|{osVersion}";
            return ComputeSHA256Hash(combined); // 64-char hex string
        }

        private string ComputeSHA256Hash(string input)
        {
            using var sha256 = SHA256.Create();
            var bytes = Encoding.UTF8.GetBytes(input);
            var hash = sha256.ComputeHash(bytes);
            return BitConverter.ToString(hash).Replace("-", "").ToLowerInvariant();
        }

        private string GetCpuId()
        {
            try
            {
                using var searcher = new ManagementObjectSearcher("SELECT ProcessorId FROM Win32_Processor");
                foreach (var obj in searcher.Get())
                {
                    return obj["ProcessorId"]?.ToString() ?? "UNKNOWN-CPU";
                }
            }
            catch { return "UNKNOWN-CPU"; }

            return "UNKNOWN-CPU";
        }

        private string GetDiskSerial()
        {
            try
            {
                using var searcher = new ManagementObjectSearcher("SELECT SerialNumber FROM Win32_DiskDrive");
                foreach (var obj in searcher.Get())
                {
                    var serial = obj["SerialNumber"]?.ToString();
                    if (!string.IsNullOrWhiteSpace(serial))
                        return serial.Trim();
                }
            }
            catch { return "UNKNOWN-DISK"; }

            return "UNKNOWN-DISK";
        }
    }
}
```

**NuGet Package Required**: `System.Management` (already present in Text Assistant dependencies)

### Component 3: UI States

**State 1: Not Activated**
```
┌─────────────────────────────────────────┐
│  Activate Your Perpetual License       │
│                                         │
│  Enter License Key:                     │
│  [REPHLO-V1-XXXX-XXXX-XXXX]            │
│                                         │
│  [ Activate ]  [ Purchase License ]    │
└─────────────────────────────────────────┘
```

**State 2: Activated**
```
┌─────────────────────────────────────────┐
│  ✅ License Active                      │
│                                         │
│  License: REPHLO-V1-****-****-AB12     │
│  Version: 1.0.0 (eligible until 1.99.99)│
│  Devices: 2 / 3 active                  │
│  Expires: Perpetual                     │
│                                         │
│  [ Manage Devices ]  [ Deactivate ]    │
└─────────────────────────────────────────┘
```

### Component 4: API Integration

**Desktop API Client** (C#/.NET):
```csharp
public class LicenseApiClient
{
    private readonly HttpClient _httpClient;
    private readonly string _apiBaseUrl;

    /// <summary>
    /// Get user's active license (authenticated)
    /// </summary>
    public async Task<LicenseInfo?> GetMyLicenseAsync(string accessToken)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/licenses/me");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var response = await _httpClient.SendAsync(request);
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<ApiResponse<LicenseInfo>>(json);

        return result?.Data; // Null if no license
    }

    /// <summary>
    /// Activate device with license key (public endpoint)
    /// </summary>
    public async Task<ActivationResult> ActivateDeviceAsync(string licenseKey, DeviceInfo deviceInfo)
    {
        var payload = new
        {
            licenseKey,
            deviceInfo = new
            {
                fingerprint = deviceInfo.Fingerprint,
                deviceName = deviceInfo.MachineName,
                osVersion = deviceInfo.OsVersion,
            }
        };

        var response = await _httpClient.PostAsJsonAsync("/api/licenses/activate", payload);

        if (response.StatusCode == HttpStatusCode.Forbidden)
        {
            throw new ActivationLimitException("Device limit reached (3/3)");
        }

        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<ApiResponse<ActivationResult>>();
        return result!.Data;
    }
}
```

### Desktop Team Deliverables

**REVISED ESTIMATES** (leveraging existing Text Assistant infrastructure):

| Deliverable | Estimated Effort | Rationale | Dependencies |
|-------------|------------------|-----------|--------------|
| **LicenseApiClient** (HTTP wrapper) | 1 day | Reuse existing HTTP patterns from `DedicatedAPIService` | Backend endpoints live |
| **Device Fingerprint Service** (WMI) | 1.5 days | Extend existing Windows interop; WMI already used | None |
| **LicenseManager Service** (core logic) | 2 days | Leverage existing DI patterns; similar to `CommandService` | API client |
| **Database Migration** (EF Core) | 0.5 day | Add `LicenseActivation` entity; existing migration system | None |
| **Encryption Integration** | 0.5 day | Use existing `CrossPlatformEncryptionService` (no new code) | None |
| **Auto-Activation Hook** | 1 day | Hook into existing `DedicatedAPITokenManager.OnTokenReceived` | IDP JWT claims |
| **License Settings UI** (XAML + ViewModel) | 2 days | Extend existing `SettingsView`; use WPF-UI controls | None |
| **Offline Validation Logic** | 1 day | Reuse existing OAuth JWT verification infrastructure | IDP JWKS endpoint |
| **Unit Tests** (xUnit) | 1.5 days | Test service layer (mock API client) | Services complete |
| **Integration Testing** | 2 days | E2E flows with dev backend | All backend endpoints |

**Total Estimate**: ~13 days (~2.5 weeks for 1 developer)

**Significant Reductions Due To**:
- ✅ Existing OAuth 2.0 PKCE infrastructure (saves ~5 days)
- ✅ Existing encryption service (saves ~2 days)
- ✅ Existing database + EF Core setup (saves ~1 day)
- ✅ Existing DI container configuration (saves ~1 day)
- ✅ Existing UI framework and navigation (saves ~2 days)

---

## Data Flow Diagrams

### Flow 1: Manual Activation

```
Desktop App                Backend API               Database
    |                          |                         |
    |  POST /api/licenses/activate                       |
    |  {                       |                         |
    |    licenseKey,           |                         |
    |    deviceInfo: {         |                         |
    |      fingerprint,        |                         |
    |      deviceName          |                         |
    |    }                     |                         |
    |  }                       |                         |
    |------------------------->|                         |
    |                          |  1. Validate license    |
    |                          |  2. Check device limit  |
    |                          |------------------------>|
    |                          |<------------------------|
    |                          |  3. Create activation   |
    |                          |------------------------>|
    |                          |<------------------------|
    |  200 OK                  |                         |
    |  {                       |                         |
    |    activation_id,        |                         |
    |    license_id,           |                         |
    |    status: "active"      |                         |
    |  }                       |                         |
    |<-------------------------|                         |
    |                          |                         |
    |  4. Store locally (encrypted)                      |
    |  5. Unlock app features  |                         |
```

### Flow 2: Auto-Activation on Login

```
Desktop App         Identity Provider     Backend API       Database
    |                      |                    |               |
    |  1. OAuth Login      |                    |               |
    |--------------------->|                    |               |
    |                      |  2. Auth success   |               |
    |                      |  3. Fetch license  |               |
    |                      |------------------->|               |
    |                      |                    |  Query user   |
    |                      |                    |  license      |
    |                      |                    |-------------->|
    |                      |                    |<--------------|
    |                      |  4. Build JWT claims               |
    |                      |     with license   |               |
    |  5. JWT + userinfo   |                    |               |
    |<---------------------|                    |               |
    |                      |                    |               |
    |  6. Check JWT.licenseStatus               |               |
    |     If "active":     |                    |               |
    |     - Auto-activate  |                    |               |
    |     - Store locally  |                    |               |
    |                      |                    |               |
    |  7. Optional: Call GET /api/licenses/me  |               |
    |     for full details |                    |               |
    |------------------------------------------>|               |
    |                      |                    |  Fetch full   |
    |                      |                    |  license data |
    |                      |                    |-------------->|
    |                      |                    |<--------------|
    |  8. License details  |                    |               |
    |<------------------------------------------|               |
    |                      |                    |               |
    |  9. Unlock features  |                    |               |
```

---

## Security Considerations

### 1. License Key Security

**Threat**: License key exposure in JWT or API responses.

**Mitigation**:
- ✅ JWT claims use **masked license key** (show last 4 chars only)
- ✅ Full license key only revealed during purchase and activation
- ✅ Desktop stores full key encrypted with DPAPI (Windows Data Protection API)

### 2. Device Fingerprint Security

**Threat**: Fingerprint spoofing to bypass 3-device limit.

**Mitigation**:
- ✅ SHA-256 hashing of hardware IDs (irreversible)
- ✅ Backend validates fingerprint uniqueness per license
- ✅ Admin monitoring for suspicious activation patterns (see `DeviceActivationManagementService`)

### 3. Offline Validation Security

**Threat**: User modifies local license file to extend access.

**Mitigation**:
- ✅ Desktop verifies JWT signature using OIDC public key (JWKS)
- ✅ 30-day offline grace period enforced (require re-auth after)
- ✅ Local license file encrypted with machine-specific DPAPI key

### 4. API Endpoint Security

**Threat**: Unauthorized access to user license data.

**Mitigation**:
- ✅ `GET /api/licenses/me` requires authentication (JWT token)
- ✅ Returns only licenses owned by authenticated user (no user_id parameter)
- ✅ Rate limiting applied (existing middleware)

---

## Testing Strategy

### Backend Testing (Jest)

**Test Suite**: `backend/src/__tests__/integration/license-auto-activation.test.ts`

```typescript
describe('License Auto-Activation API', () => {
  describe('GET /api/licenses/me', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app).get('/api/licenses/me');
      expect(response.status).toBe(401);
    });

    it('should return null for user without license', async () => {
      const response = await request(app)
        .get('/api/licenses/me')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeNull();
    });

    it('should return active license for user with license', async () => {
      // Setup: Create license for test user
      const license = await createTestLicense(testUserId);

      const response = await request(app)
        .get('/api/licenses/me')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        licenseKey: license.license_key,
        status: 'active',
        maxActivations: 3,
      });
    });

    it('should return most recent license if user has multiple', async () => {
      // Setup: Create 2 licenses (different purchase dates)
      await createTestLicense(testUserId, { purchasedAt: '2024-01-01' });
      const recent = await createTestLicense(testUserId, { purchasedAt: '2025-01-01' });

      const response = await request(app)
        .get('/api/licenses/me')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.body.data.id).toBe(recent.id);
    });
  });
});
```

### Identity Provider Testing

**Test Suite**: `identity-provider/src/__tests__/jwt-license-claims.test.ts`

```typescript
describe('JWT License Claims', () => {
  it('should include license claims in JWT for user with license', async () => {
    // Setup: Create user with active license
    const user = await createTestUser();
    const license = await createTestLicense(user.id);

    // Simulate OAuth flow
    const token = await performOAuthLogin(user.email);
    const decoded = jwt.decode(token) as any;

    expect(decoded).toMatchObject({
      sub: user.id,
      licenseStatus: 'active',
      licenseKey: expect.stringMatching(/REPHLO-V1-\*\*\*\*-\*\*\*\*-[A-Z0-9]{4}/),
      licenseTier: 'perpetual',
      licenseVersion: '1.0.0',
    });
  });

  it('should return licenseStatus: null for user without license', async () => {
    const user = await createTestUserWithoutLicense();
    const token = await performOAuthLogin(user.email);
    const decoded = jwt.decode(token) as any;

    expect(decoded.licenseStatus).toBeNull();
    expect(decoded.licenseTier).toBe('free');
  });

  it('should mask license key correctly', async () => {
    const key = 'REPHLO-V1-ABCD-EFGH-1234';
    const masked = maskLicenseKey(key);

    expect(masked).toBe('REPHLO-V1-****-****-1234');
  });
});
```

### Desktop Client Testing (NUnit/.NET)

**Test Suite**: `DesktopApp.Tests/LicenseManagerTests.cs`

```csharp
[TestFixture]
public class LicenseManagerTests
{
    [Test]
    public async Task GetMyLicense_WithValidToken_ReturnsLicense()
    {
        var apiClient = new LicenseApiClient(mockHttpClient);
        var license = await apiClient.GetMyLicenseAsync(validAccessToken);

        Assert.IsNotNull(license);
        Assert.AreEqual("active", license.Status);
    }

    [Test]
    public async Task AutoActivation_AfterLogin_ActivatesLicense()
    {
        var licenseManager = new LicenseManager(apiClient, storage);

        // Simulate login with JWT containing license claims
        await licenseManager.OnLoginSuccess(jwtWithLicenseClaims);

        Assert.IsTrue(licenseManager.IsActivated);
        Assert.AreEqual("active", licenseManager.LicenseStatus);
    }

    [Test]
    public void DeviceFingerprint_Generate_MatchesBackendFormat()
    {
        var fingerprint = DeviceFingerprint.Generate();

        // SHA-256 hash = 64 hex characters
        Assert.AreEqual(64, fingerprint.Length);
        Assert.IsTrue(Regex.IsMatch(fingerprint, "^[a-f0-9]{64}$"));
    }
}
```

---

## Coordination Timeline

### Sprint 1 (Week 1-2): Backend Implementation

**Team**: Backend (Node.js)
**Goal**: Implement `GET /api/licenses/me` endpoint

| Task | Owner | Duration | Dependencies |
|------|-------|----------|--------------|
| Add `getUserActiveLicense()` service method | Backend Dev | 1 day | None |
| Add `getMyLicense()` controller method | Backend Dev | 1 day | Service method |
| Register route in `plan110.routes.ts` | Backend Dev | 0.5 day | Controller |
| Write integration tests | Backend Dev | 1 day | Endpoint complete |
| Code review & merge | Tech Lead | 0.5 day | Tests passing |
| Deploy to dev environment | DevOps | 0.5 day | Merged to main |

**Deliverable**: `GET /api/licenses/me` endpoint live in dev environment

---

### Sprint 2 (Week 3-4): Identity Provider Integration

**Team**: Backend (Identity Provider)
**Goal**: Add license claims to JWT and userinfo endpoint

| Task | Owner | Duration | Dependencies |
|------|-------|----------|--------------|
| Modify `findAccount()` to include license join | IDP Dev | 1 day | None |
| Implement `maskLicenseKey()` helper | IDP Dev | 0.5 day | None |
| Add license claims to `claims()` function | IDP Dev | 1 day | License join |
| Write integration tests for JWT claims | IDP Dev | 1.5 days | Claims implementation |
| Test userinfo endpoint enhancement | QA | 1 day | Tests complete |
| Code review & merge | Tech Lead | 0.5 day | Tests passing |
| Deploy to dev environment | DevOps | 0.5 day | Merged to main |

**Deliverable**: JWT tokens include `licenseStatus`, `licenseKey`, `licenseTier` claims

---

### Sprint 3-4 (Week 5-7): Desktop Client Implementation

**Team**: Desktop (WPF/C# - Text Assistant codebase)
**Goal**: Implement License Manager module with auto-activation
**Repository**: `D:\sources\demo\text-assistant\`

| Task | Owner | Duration | Dependencies |
|------|-------|----------|--------------|
| Design License Settings UI mockups (WPF-UI) | UX Designer | 1 day | None |
| Create `LicenseApiClient` wrapper | Desktop Dev | 1 day | Backend endpoints live |
| Implement `WindowsDeviceFingerprintService` (WMI) | Desktop Dev | 1.5 days | None |
| Create `LicenseManager` service + DI registration | Desktop Dev | 2 days | API client |
| Create EF Core migration for `LicenseActivation` | Desktop Dev | 0.5 day | None |
| Implement manual activation UI (Settings tab) | Desktop Dev | 2 days | LicenseManager service |
| Hook auto-activation into OAuth flow | Desktop Dev | 1 day | IDP JWT claims |
| Implement offline validation (reuse JWT infra) | Desktop Dev | 1 day | IDP JWKS endpoint |
| Write unit tests (xUnit - existing framework) | Desktop Dev | 1.5 days | All components |
| Integration testing with dev backend | Desktop Dev + Backend QA | 2 days | All components |
| Code review & merge (Text Assistant repo) | Tech Lead | 1 day | Tests passing |

**Deliverable**: Text Assistant desktop app supports both manual and auto-activation flows

**REVISED TIMELINE**: ~13 days (~2.5 weeks) vs. original 4 weeks
**Savings**: Leveraging existing OAuth, encryption, database, and UI infrastructure

---

### Sprint 5 (Week 8-9): End-to-End Testing & Launch

**Team**: QA + All Teams
**Goal**: Full E2E testing and production deployment

| Task | Owner | Duration | Dependencies |
|------|-------|----------|--------------|
| E2E test: Purchase → Manual activation | QA | 2 days | All systems integrated |
| E2E test: Purchase → Login → Auto-activation | QA | 2 days | All systems integrated |
| E2E test: Offline validation (30-day grace) | QA | 1 day | Desktop complete |
| E2E test: Device limit enforcement (3 devices) | QA | 1 day | Backend complete |
| Security audit (license key masking, DPAPI) | Security Team | 2 days | All components |
| Performance testing (activation latency <2s) | QA | 1 day | All systems |
| Bug fixes and refinements | All Teams | 3 days | Testing complete |
| Production deployment | DevOps | 1 day | All tests passing |
| Post-launch monitoring (7 days) | All Teams | 7 days | Deployed |

**Deliverable**: Perpetual license auto-activation live in production

---

## Success Metrics

### Functional Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Auto-activation success rate | >95% | Desktop telemetry |
| Manual activation success rate | >98% | Backend logs |
| Activation latency (API call) | <2s | Backend metrics |
| Offline validation success rate | >99% | Desktop telemetry |
| JWT claim inclusion rate | 100% | IDP logs |

### User Experience Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Users choosing auto-activation | >80% | Desktop telemetry |
| Support tickets for activation issues | <2% | Support system |
| Activation abandonment rate | <5% | Conversion funnel |

### Technical Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| License fraud detection rate | <1% | Admin monitoring |
| Device fingerprint collision rate | <0.01% | Backend logs |
| JWT signature verification failures | <0.1% | Desktop logs |

---

## Master Agent Orchestration

**Master Agent Role**: Coordinate specialized agents for planning and implementation.

### Phase 1: Planning (This Document)

- ✅ **Master Agent**: Created comprehensive coordination plan
- ⏳ **QA Planning Agent**: Define test scenarios (Sprint 5)

### Phase 2: Implementation (Sprints 1-4)

**Backend API Agent**:
- Implement `GET /api/licenses/me` endpoint
- Add service method `getUserActiveLicense()`
- Write integration tests

**Identity Provider Agent**:
- Modify `findAccount()` to include license data
- Add license claims to JWT
- Implement `maskLicenseKey()` helper

**Desktop Client Agent** (External Team):
- Provide this plan as reference
- Coordinate API contract with backend team
- Implement License Manager module per specifications

### Phase 3: QA Validation (Sprint 5)

**QA/Testing Agent**:
- Validate all acceptance criteria
- Execute E2E test scenarios
- Security audit for license key exposure

---

## Appendix A: API Response Examples

### Example 1: `GET /api/licenses/me` (User with License)

**Request**:
```http
GET /api/licenses/me HTTP/1.1
Host: api.rephlo.com
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response** (200 OK):
```json
{
  "status": "success",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "licenseKey": "REPHLO-V1-A1B2-C3D4-E5F6",
    "status": "active",
    "purchasedVersion": "1.0.0",
    "eligibleUntilVersion": "1.99.99",
    "maxActivations": 3,
    "activeDeviceCount": 2,
    "purchasedAt": "2025-01-15T10:30:00.000Z"
  }
}
```

### Example 2: `GET /api/licenses/me` (User without License)

**Response** (200 OK):
```json
{
  "status": "success",
  "data": null
}
```

### Example 3: JWT with License Claims

**Decoded JWT Payload**:
```json
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "role": "user",
  "scope": "openid profile email",
  "licenseStatus": "active",
  "licenseKey": "REPHLO-V1-****-****-E5F6",
  "licenseTier": "perpetual",
  "licenseVersion": "1.0.0",
  "iat": 1700000000,
  "exp": 1700003600,
  "iss": "https://auth.rephlo.com",
  "aud": "rephlo-desktop-app"
}
```

---

## Appendix B: Error Handling

### Backend Error Codes

| HTTP Status | Error Code | Message | Cause |
|-------------|-----------|---------|-------|
| 401 | `UNAUTHORIZED` | Authentication required | Missing or invalid JWT token |
| 404 | `LICENSE_NOT_FOUND` | License key not found | Invalid license key during activation |
| 403 | `ACTIVATION_LIMIT_REACHED` | Device limit reached (3/3) | User exceeded 3-device limit |
| 500 | `INTERNAL_SERVER_ERROR` | Failed to retrieve license | Database error or service failure |

### Desktop Error Messages (User-Facing)

| Error Code | User Message | Suggested Action |
|-----------|--------------|------------------|
| `UNAUTHORIZED` | "Please log in to activate your license." | Redirect to login screen |
| `LICENSE_NOT_FOUND` | "License key is invalid. Please check and try again." | Show input field with error highlight |
| `ACTIVATION_LIMIT_REACHED` | "You've reached the 3-device limit. Deactivate an old device first." | Link to device management |
| `NETWORK_ERROR` | "Cannot connect to server. Check your internet connection." | Retry button |

---

## Document Approval

**Backend Team Lead**: [ ] Approved
**Identity Provider Team Lead**: [ ] Approved
**Desktop Team Lead**: [ ] Approved
**QA Lead**: [ ] Approved
**Product Manager**: [ ] Approved

**Next Steps**:
1. Backend team implements `GET /api/licenses/me` (Sprint 1)
2. IDP team adds JWT license claims (Sprint 2)
3. Desktop team begins License Manager module (Sprint 3)
4. QA prepares E2E test scenarios (Sprint 5)

---

**End of Document**

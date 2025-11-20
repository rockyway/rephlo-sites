# Desktop Client: Perpetual License Auto-Activation Implementation Specification

**Document Number:** 204
**Created:** 2025-01-19
**Status:** Ready for Implementation
**Related Documents:**
- Plan 203: Perpetual License Auto-Activation Coordination Plan
- Plan 110: Perpetual Plan and Proration Strategy
- Desktop Client: `D:\sources\demo\text-assistant\PROJECT_STRUCTURE.md`

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Summary](#architecture-summary)
3. [Implementation Requirements](#implementation-requirements)
4. [Detailed Implementation Guide](#detailed-implementation-guide)
5. [Security Considerations](#security-considerations)
6. [Testing Requirements](#testing-requirements)
7. [Deployment Checklist](#deployment-checklist)

---

## Overview

### Purpose

This document provides comprehensive implementation specifications for integrating perpetual license auto-activation into the Text Assistant WPF desktop application. The implementation enables users to purchase and activate perpetual licenses automatically through OAuth login, eliminating manual license key entry for authenticated users.

### Goals

1. **Seamless Auto-Activation**: Automatically detect and activate perpetual licenses when user logs in with OAuth
2. **Manual Activation Fallback**: Support manual license key entry for users without OAuth login
3. **Offline Validation**: Enable 30-day offline grace period using cached JWT claims
4. **Secure Storage**: Encrypt and store license data using existing `CrossPlatformEncryptionService`
5. **User Experience**: Zero-friction activation for authenticated users

### Non-Goals

- Subscription-based licensing (handled separately)
- Enterprise license management (future phase)
- License transfer between devices (handled by backend API)

---

## Architecture Summary

### Current Text Assistant Infrastructure

The Text Assistant WPF application already has robust infrastructure that can be leveraged for perpetual license integration:

**Existing Services:**
- **OAuth 2.0/OIDC Client** (`OAuthService.cs`, `TokenService.cs`)
  - Authorization Code Flow with PKCE
  - Token storage and refresh
  - Session management

- **Encryption** (`CrossPlatformEncryptionService.cs`)
  - AES-256-GCM encryption
  - Platform-agnostic key derivation
  - Secure local storage

- **Database** (`AppDbContext.cs`, Entity Framework Core)
  - SQLite local database
  - Migrations support
  - Async/await patterns

- **Dependency Injection** (60+ registered services)
  - Scoped, Singleton, Transient lifetimes
  - Constructor injection
  - Service locator pattern

**Directory Structure:**
```
text-assistant/
├── src/
│   ├── ViewModels/          # MVVM ViewModels
│   ├── Views/               # WPF Views
│   ├── Services/            # Business logic services
│   │   ├── Auth/            # OAuth and authentication
│   │   ├── Encryption/      # Cross-platform encryption
│   │   ├── Database/        # EF Core DbContext
│   │   └── LicenseManagement/  # (NEW) License services
│   ├── Models/              # Domain models
│   │   └── License/         # (NEW) License models
│   ├── Data/                # Database entities
│   │   └── Entities/        # (NEW) License entities
│   └── Migrations/          # EF Core migrations
```

### Integration Points

```
┌───────────────────────────────────────────────────────────────┐
│                   Text Assistant WPF App                      │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐ │
│  │  Login View  │────▶│  OAuth       │────▶│  License     │ │
│  │  (WPF)       │     │  Service     │     │  Activation  │ │
│  └──────────────┘     └──────────────┘     │  Service     │ │
│         │                    │              └──────────────┘ │
│         │                    │                     │         │
│         │                    ▼                     ▼         │
│         │             ┌──────────────┐     ┌──────────────┐ │
│         │             │ Token        │     │  Encrypted   │ │
│         │             │ Service      │     │  Storage     │ │
│         │             └──────────────┘     │  Service     │ │
│         │                    │              └──────────────┘ │
│         │                    │                     │         │
│         ▼                    ▼                     ▼         │
│  ┌─────────────────────────────────────────────────────────┐│
│  │            AppDbContext (SQLite)                        ││
│  │  - OAuthSessions                                        ││
│  │  - (NEW) PerpetualLicenses                              ││
│  │  - (NEW) DeviceActivations                              ││
│  └─────────────────────────────────────────────────────────┘│
│                                                               │
└───────────────────────────────────────────────────────────────┘
                        ▲                          ▲
                        │                          │
                        │ OAuth Login              │ API Calls
                        │                          │
┌───────────────────────┴──────────┐  ┌───────────┴────────────┐
│  Identity Provider (IDP)         │  │  Backend API           │
│  http://localhost:7151           │  │  http://localhost:7150 │
│                                  │  │                        │
│  - OAuth authorize               │  │  GET /api/licenses/me  │
│  - Token endpoint                │  │  POST /licenses/       │
│  - JWT with license claims       │  │    activate            │
│  - JWKS public keys              │  │  GET /licenses/:key    │
└──────────────────────────────────┘  └────────────────────────┘
```

---

## Implementation Requirements

### Phase 1: Data Models & Database (1 week)

#### 1.1 Create License Entity Models

**File:** `src/Data/Entities/PerpetualLicenseEntity.cs`

```csharp
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TextAssistant.Data.Entities
{
    /// <summary>
    /// Represents a perpetual license stored locally in the app database.
    /// Synced from backend API and cached for offline validation.
    /// </summary>
    [Table("perpetual_licenses")]
    public class PerpetualLicenseEntity
    {
        [Key]
        [Column("id")]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Required]
        [MaxLength(50)]
        [Column("license_key")]
        public string LicenseKey { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        [Column("purchased_version")]
        public string PurchasedVersion { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        [Column("eligible_until_version")]
        public string EligibleUntilVersion { get; set; } = string.Empty;

        [Required]
        [Column("max_activations")]
        public int MaxActivations { get; set; } = 3;

        [Required]
        [Column("active_device_count")]
        public int ActiveDeviceCount { get; set; } = 0;

        [Required]
        [MaxLength(20)]
        [Column("status")]
        public string Status { get; set; } = "active"; // active, suspended, revoked, expired

        [Required]
        [Column("purchased_at")]
        public DateTime PurchasedAt { get; set; }

        [Column("activated_at")]
        public DateTime? ActivatedAt { get; set; }

        [Column("last_synced_at")]
        public DateTime? LastSyncedAt { get; set; }

        [Column("cached_jwt")]
        [MaxLength(2048)]
        public string? CachedJwt { get; set; } // Encrypted JWT for offline validation

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation property
        public DeviceActivationEntity? DeviceActivation { get; set; }
    }
}
```

**File:** `src/Data/Entities/DeviceActivationEntity.cs`

```csharp
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TextAssistant.Data.Entities
{
    /// <summary>
    /// Represents the current device's activation record.
    /// Stores device fingerprint and activation details.
    /// </summary>
    [Table("device_activations")]
    public class DeviceActivationEntity
    {
        [Key]
        [Column("id")]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Required]
        [Column("license_id")]
        [ForeignKey(nameof(PerpetualLicense))]
        public string LicenseId { get; set; } = string.Empty;

        [Required]
        [MaxLength(64)]
        [Column("device_fingerprint")]
        public string DeviceFingerprint { get; set; } = string.Empty;

        [MaxLength(255)]
        [Column("device_name")]
        public string? DeviceName { get; set; }

        [MaxLength(50)]
        [Column("os_type")]
        public string? OsType { get; set; }

        [MaxLength(100)]
        [Column("os_version")]
        public string? OsVersion { get; set; }

        [MaxLength(255)]
        [Column("cpu_info")]
        public string? CpuInfo { get; set; }

        [Required]
        [Column("activated_at")]
        public DateTime ActivatedAt { get; set; }

        [Column("last_seen_at")]
        public DateTime LastSeenAt { get; set; } = DateTime.UtcNow;

        [MaxLength(20)]
        [Column("status")]
        public string Status { get; set; } = "active"; // active, deactivated

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation property
        public PerpetualLicenseEntity PerpetualLicense { get; set; } = null!;
    }
}
```

#### 1.2 Update AppDbContext

**File:** `src/Services/Database/AppDbContext.cs`

```csharp
using Microsoft.EntityFrameworkCore;
using TextAssistant.Data.Entities;

namespace TextAssistant.Services.Database
{
    public class AppDbContext : DbContext
    {
        // Existing DbSets...
        public DbSet<OAuthSessionEntity> OAuthSessions { get; set; }

        // NEW: License management DbSets
        public DbSet<PerpetualLicenseEntity> PerpetualLicenses { get; set; }
        public DbSet<DeviceActivationEntity> DeviceActivations { get; set; }

        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure PerpetualLicense
            modelBuilder.Entity<PerpetualLicenseEntity>(entity =>
            {
                entity.HasIndex(e => e.LicenseKey).IsUnique();
                entity.HasIndex(e => e.Status);
                entity.HasIndex(e => e.LastSyncedAt);
            });

            // Configure DeviceActivation
            modelBuilder.Entity<DeviceActivationEntity>(entity =>
            {
                entity.HasIndex(e => e.LicenseId);
                entity.HasIndex(e => e.DeviceFingerprint);
                entity.HasIndex(e => e.Status);

                // One-to-one relationship
                entity.HasOne(d => d.PerpetualLicense)
                      .WithOne(p => p.DeviceActivation)
                      .HasForeignKey<DeviceActivationEntity>(d => d.LicenseId)
                      .OnDelete(DeleteBehavior.Cascade);
            });
        }
    }
}
```

#### 1.3 Create EF Core Migration

```powershell
# Run from Text Assistant project root
dotnet ef migrations add AddPerpetualLicenseTables
dotnet ef database update
```

---

### Phase 2: Device Fingerprinting Service (2 days)

#### 2.1 Create Device Fingerprint Service

**File:** `src/Services/LicenseManagement/DeviceFingerprintService.cs`

```csharp
using System;
using System.Management;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace TextAssistant.Services.LicenseManagement
{
    /// <summary>
    /// Generates a unique device fingerprint using hardware identifiers.
    /// Uses SHA-256 hash of CPU ID + Disk Serial + OS Version.
    /// </summary>
    public interface IDeviceFingerprintService
    {
        Task<string> GenerateFingerprintAsync();
        Task<DeviceInfo> GetDeviceInfoAsync();
    }

    public class DeviceFingerprintService : IDeviceFingerprintService
    {
        private readonly ILogger<DeviceFingerprintService> _logger;

        public DeviceFingerprintService(ILogger<DeviceFingerprintService> logger)
        {
            _logger = logger;
        }

        public async Task<string> GenerateFingerprintAsync()
        {
            try
            {
                var cpuId = await GetCpuIdAsync();
                var diskSerial = await GetDiskSerialAsync();
                var osVersion = Environment.OSVersion.VersionString;

                var combined = $"{cpuId}|{diskSerial}|{osVersion}";

                using var sha256 = SHA256.Create();
                var hash = sha256.ComputeHash(Encoding.UTF8.GetBytes(combined));
                return BitConverter.ToString(hash).Replace("-", "").ToLowerInvariant();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to generate device fingerprint");
                throw;
            }
        }

        public async Task<DeviceInfo> GetDeviceInfoAsync()
        {
            return new DeviceInfo
            {
                DeviceName = Environment.MachineName,
                OsType = "Windows",
                OsVersion = Environment.OSVersion.VersionString,
                CpuInfo = await GetCpuInfoAsync()
            };
        }

        private async Task<string> GetCpuIdAsync()
        {
            return await Task.Run(() =>
            {
                try
                {
                    using var searcher = new ManagementObjectSearcher("SELECT ProcessorId FROM Win32_Processor");
                    foreach (var obj in searcher.Get())
                    {
                        return obj["ProcessorId"]?.ToString() ?? "unknown";
                    }
                    return "unknown";
                }
                catch
                {
                    return "unknown";
                }
            });
        }

        private async Task<string> GetDiskSerialAsync()
        {
            return await Task.Run(() =>
            {
                try
                {
                    using var searcher = new ManagementObjectSearcher("SELECT SerialNumber FROM Win32_PhysicalMedia");
                    foreach (var obj in searcher.Get())
                    {
                        var serial = obj["SerialNumber"]?.ToString()?.Trim();
                        if (!string.IsNullOrEmpty(serial))
                            return serial;
                    }
                    return "unknown";
                }
                catch
                {
                    return "unknown";
                }
            });
        }

        private async Task<string> GetCpuInfoAsync()
        {
            return await Task.Run(() =>
            {
                try
                {
                    using var searcher = new ManagementObjectSearcher("SELECT Name FROM Win32_Processor");
                    foreach (var obj in searcher.Get())
                    {
                        return obj["Name"]?.ToString() ?? "Unknown CPU";
                    }
                    return "Unknown CPU";
                }
                catch
                {
                    return "Unknown CPU";
                }
            });
        }
    }

    public class DeviceInfo
    {
        public string DeviceName { get; set; } = string.Empty;
        public string OsType { get; set; } = string.Empty;
        public string OsVersion { get; set; } = string.Empty;
        public string CpuInfo { get; set; } = string.Empty;
    }
}
```

---

### Phase 3: License Management Service (3 days)

#### 3.1 Create License API Client

**File:** `src/Services/LicenseManagement/LicenseApiClient.cs`

```csharp
using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace TextAssistant.Services.LicenseManagement
{
    /// <summary>
    /// HTTP client for Backend API license endpoints.
    /// </summary>
    public interface ILicenseApiClient
    {
        Task<PerpetualLicenseResponse?> GetMyLicenseAsync(string accessToken);
        Task<ActivationResponse?> ActivateDeviceAsync(string licenseKey, DeviceActivationRequest request);
        Task<LicenseDetailsResponse?> GetLicenseDetailsAsync(string licenseKey);
    }

    public class LicenseApiClient : ILicenseApiClient
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<LicenseApiClient> _logger;
        private const string BaseUrl = "http://localhost:7150"; // TODO: Move to config

        public LicenseApiClient(HttpClient httpClient, ILogger<LicenseApiClient> logger)
        {
            _httpClient = httpClient;
            _httpClient.BaseAddress = new Uri(BaseUrl);
            _logger = logger;
        }

        public async Task<PerpetualLicenseResponse?> GetMyLicenseAsync(string accessToken)
        {
            try
            {
                _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

                var response = await _httpClient.GetAsync("/api/licenses/me");
                response.EnsureSuccessStatusCode();

                var result = await response.Content.ReadFromJsonAsync<ApiResponse<PerpetualLicenseResponse>>();
                return result?.Data;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to retrieve user's perpetual license");
                return null;
            }
        }

        public async Task<ActivationResponse?> ActivateDeviceAsync(string licenseKey, DeviceActivationRequest request)
        {
            try
            {
                var response = await _httpClient.PostAsJsonAsync("/api/licenses/activate", new
                {
                    licenseKey,
                    deviceFingerprint = request.DeviceFingerprint,
                    deviceName = request.DeviceName,
                    osInfo = $"{request.OsType} {request.OsVersion}",
                    cpuInfo = request.CpuInfo
                });

                response.EnsureSuccessStatusCode();

                var result = await response.Content.ReadFromJsonAsync<ApiResponse<ActivationResponse>>();
                return result?.Data;
            }
            catch (HttpRequestException ex) when (ex.StatusCode == System.Net.HttpStatusCode.BadRequest)
            {
                _logger.LogWarning("Device activation failed: {Message}", ex.Message);
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to activate device");
                throw;
            }
        }

        public async Task<LicenseDetailsResponse?> GetLicenseDetailsAsync(string licenseKey)
        {
            try
            {
                var response = await _httpClient.GetAsync($"/api/licenses/{licenseKey}");
                response.EnsureSuccessStatusCode();

                var result = await response.Content.ReadFromJsonAsync<ApiResponse<LicenseDetailsResponse>>();
                return result?.Data;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to retrieve license details for key: {LicenseKey}", licenseKey);
                return null;
            }
        }
    }

    // Response DTOs
    public class ApiResponse<T>
    {
        public string Status { get; set; } = string.Empty;
        public T? Data { get; set; }
    }

    public class PerpetualLicenseResponse
    {
        public string Id { get; set; } = string.Empty;
        public string LicenseKey { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string PurchasedVersion { get; set; } = string.Empty;
        public string EligibleUntilVersion { get; set; } = string.Empty;
        public int MaxActivations { get; set; }
        public int ActiveDeviceCount { get; set; }
        public DateTime PurchasedAt { get; set; }
    }

    public class ActivationResponse
    {
        public string Id { get; set; } = string.Empty;
        public string LicenseId { get; set; } = string.Empty;
        public string DeviceName { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime ActivatedAt { get; set; }
    }

    public class LicenseDetailsResponse
    {
        public string Id { get; set; } = string.Empty;
        public string LicenseKey { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string PurchasedVersion { get; set; } = string.Empty;
        public string EligibleUntilVersion { get; set; } = string.Empty;
        public int MaxActivations { get; set; }
        public DateTime PurchasedAt { get; set; }
    }

    public class DeviceActivationRequest
    {
        public string DeviceFingerprint { get; set; } = string.Empty;
        public string DeviceName { get; set; } = string.Empty;
        public string OsType { get; set; } = string.Empty;
        public string OsVersion { get; set; } = string.Empty;
        public string CpuInfo { get; set; } = string.Empty;
    }
}
```

#### 3.2 Create License Activation Service

**File:** `src/Services/LicenseManagement/LicenseActivationService.cs`

```csharp
using System;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using TextAssistant.Data.Entities;
using TextAssistant.Services.Database;
using TextAssistant.Services.Encryption;

namespace TextAssistant.Services.LicenseManagement
{
    /// <summary>
    /// Core service for perpetual license activation and management.
    /// Handles auto-activation, manual activation, and offline validation.
    /// </summary>
    public interface ILicenseActivationService
    {
        Task<AutoActivationResult> TryAutoActivationAsync(string accessToken);
        Task<ManualActivationResult> ActivateWithKeyAsync(string licenseKey);
        Task<bool> IsLicenseValidAsync();
        Task<PerpetualLicenseEntity?> GetCurrentLicenseAsync();
    }

    public class LicenseActivationService : ILicenseActivationService
    {
        private readonly AppDbContext _dbContext;
        private readonly ILicenseApiClient _licenseApiClient;
        private readonly IDeviceFingerprintService _fingerprintService;
        private readonly ICrossPlatformEncryptionService _encryptionService;
        private readonly ILogger<LicenseActivationService> _logger;

        public LicenseActivationService(
            AppDbContext dbContext,
            ILicenseApiClient licenseApiClient,
            IDeviceFingerprintService fingerprintService,
            ICrossPlatformEncryptionService encryptionService,
            ILogger<LicenseActivationService> logger)
        {
            _dbContext = dbContext;
            _licenseApiClient = licenseApiClient;
            _fingerprintService = fingerprintService;
            _encryptionService = encryptionService;
            _logger = logger;
        }

        public async Task<AutoActivationResult> TryAutoActivationAsync(string accessToken)
        {
            try
            {
                _logger.LogInformation("Starting auto-activation flow...");

                // Step 1: Decode JWT to check for license claims
                var handler = new JwtSecurityTokenHandler();
                var jwtToken = handler.ReadJwtToken(accessToken);

                var licenseStatus = jwtToken.Claims.FirstOrDefault(c => c.Type == "licenseStatus")?.Value;
                var licenseKey = jwtToken.Claims.FirstOrDefault(c => c.Type == "licenseKey")?.Value;

                if (licenseStatus != "active" || string.IsNullOrEmpty(licenseKey))
                {
                    _logger.LogInformation("No active license found in JWT claims");
                    return new AutoActivationResult { Success = false, Message = "No active license found" };
                }

                _logger.LogInformation("Active license found in JWT: {LicenseKey}", licenseKey);

                // Step 2: Call GET /api/licenses/me to get full license details
                var licenseData = await _licenseApiClient.GetMyLicenseAsync(accessToken);
                if (licenseData == null)
                {
                    return new AutoActivationResult { Success = false, Message = "Failed to retrieve license details" };
                }

                // Step 3: Check if device is already activated
                var existingActivation = await _dbContext.DeviceActivations
                    .Include(d => d.PerpetualLicense)
                    .FirstOrDefaultAsync(d => d.PerpetualLicense.LicenseKey == licenseData.LicenseKey);

                if (existingActivation != null)
                {
                    _logger.LogInformation("Device already activated");

                    // Update cached JWT and last_seen_at
                    existingActivation.LastSeenAt = DateTime.UtcNow;
                    existingActivation.PerpetualLicense.CachedJwt = await EncryptJwtAsync(accessToken);
                    existingActivation.PerpetualLicense.LastSyncedAt = DateTime.UtcNow;
                    await _dbContext.SaveChangesAsync();

                    return new AutoActivationResult
                    {
                        Success = true,
                        Message = "Device already activated",
                        LicenseKey = licenseData.LicenseKey,
                        AlreadyActivated = true
                    };
                }

                // Step 4: Generate device fingerprint
                var fingerprint = await _fingerprintService.GenerateFingerprintAsync();
                var deviceInfo = await _fingerprintService.GetDeviceInfoAsync();

                // Step 5: Call POST /api/licenses/activate
                var activationRequest = new DeviceActivationRequest
                {
                    DeviceFingerprint = fingerprint,
                    DeviceName = deviceInfo.DeviceName,
                    OsType = deviceInfo.OsType,
                    OsVersion = deviceInfo.OsVersion,
                    CpuInfo = deviceInfo.CpuInfo
                };

                var activationResponse = await _licenseApiClient.ActivateDeviceAsync(licenseData.LicenseKey, activationRequest);
                if (activationResponse == null)
                {
                    return new AutoActivationResult
                    {
                        Success = false,
                        Message = "Device activation failed. Maximum activations may be reached."
                    };
                }

                // Step 6: Store license and activation in local database
                var license = new PerpetualLicenseEntity
                {
                    Id = licenseData.Id,
                    LicenseKey = licenseData.LicenseKey,
                    PurchasedVersion = licenseData.PurchasedVersion,
                    EligibleUntilVersion = licenseData.EligibleUntilVersion,
                    MaxActivations = licenseData.MaxActivations,
                    ActiveDeviceCount = licenseData.ActiveDeviceCount,
                    Status = licenseData.Status,
                    PurchasedAt = licenseData.PurchasedAt,
                    ActivatedAt = activationResponse.ActivatedAt,
                    CachedJwt = await EncryptJwtAsync(accessToken),
                    LastSyncedAt = DateTime.UtcNow
                };

                var activation = new DeviceActivationEntity
                {
                    Id = activationResponse.Id,
                    LicenseId = license.Id,
                    DeviceFingerprint = fingerprint,
                    DeviceName = deviceInfo.DeviceName,
                    OsType = deviceInfo.OsType,
                    OsVersion = deviceInfo.OsVersion,
                    CpuInfo = deviceInfo.CpuInfo,
                    ActivatedAt = activationResponse.ActivatedAt,
                    Status = "active"
                };

                _dbContext.PerpetualLicenses.Add(license);
                _dbContext.DeviceActivations.Add(activation);
                await _dbContext.SaveChangesAsync();

                _logger.LogInformation("Auto-activation successful: {LicenseKey}", licenseData.LicenseKey);

                return new AutoActivationResult
                {
                    Success = true,
                    Message = "Auto-activation successful",
                    LicenseKey = licenseData.LicenseKey,
                    AlreadyActivated = false
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Auto-activation failed");
                return new AutoActivationResult { Success = false, Message = $"Error: {ex.Message}" };
            }
        }

        public async Task<ManualActivationResult> ActivateWithKeyAsync(string licenseKey)
        {
            try
            {
                _logger.LogInformation("Starting manual activation with license key...");

                // Step 1: Validate license key format
                if (string.IsNullOrWhiteSpace(licenseKey) || !licenseKey.StartsWith("REPHLO-V"))
                {
                    return new ManualActivationResult
                    {
                        Success = false,
                        Message = "Invalid license key format"
                    };
                }

                // Step 2: Check if already activated locally
                var existingLicense = await _dbContext.PerpetualLicenses
                    .FirstOrDefaultAsync(l => l.LicenseKey == licenseKey);

                if (existingLicense != null)
                {
                    return new ManualActivationResult
                    {
                        Success = false,
                        Message = "This license is already activated on this device"
                    };
                }

                // Step 3: Verify license exists in backend
                var licenseDetails = await _licenseApiClient.GetLicenseDetailsAsync(licenseKey);
                if (licenseDetails == null)
                {
                    return new ManualActivationResult
                    {
                        Success = false,
                        Message = "License not found or invalid"
                    };
                }

                if (licenseDetails.Status != "active")
                {
                    return new ManualActivationResult
                    {
                        Success = false,
                        Message = $"License is {licenseDetails.Status}"
                    };
                }

                // Step 4: Generate device fingerprint
                var fingerprint = await _fingerprintService.GenerateFingerprintAsync();
                var deviceInfo = await _fingerprintService.GetDeviceInfoAsync();

                // Step 5: Call POST /api/licenses/activate
                var activationRequest = new DeviceActivationRequest
                {
                    DeviceFingerprint = fingerprint,
                    DeviceName = deviceInfo.DeviceName,
                    OsType = deviceInfo.OsType,
                    OsVersion = deviceInfo.OsVersion,
                    CpuInfo = deviceInfo.CpuInfo
                };

                var activationResponse = await _licenseApiClient.ActivateDeviceAsync(licenseKey, activationRequest);
                if (activationResponse == null)
                {
                    return new ManualActivationResult
                    {
                        Success = false,
                        Message = "Activation failed. Maximum device activations may be reached."
                    };
                }

                // Step 6: Store license locally
                var license = new PerpetualLicenseEntity
                {
                    Id = licenseDetails.Id,
                    LicenseKey = licenseDetails.LicenseKey,
                    PurchasedVersion = licenseDetails.PurchasedVersion,
                    EligibleUntilVersion = licenseDetails.EligibleUntilVersion,
                    MaxActivations = licenseDetails.MaxActivations,
                    ActiveDeviceCount = 1, // After activation
                    Status = licenseDetails.Status,
                    PurchasedAt = licenseDetails.PurchasedAt,
                    ActivatedAt = activationResponse.ActivatedAt,
                    LastSyncedAt = DateTime.UtcNow
                };

                var activation = new DeviceActivationEntity
                {
                    Id = activationResponse.Id,
                    LicenseId = license.Id,
                    DeviceFingerprint = fingerprint,
                    DeviceName = deviceInfo.DeviceName,
                    OsType = deviceInfo.OsType,
                    OsVersion = deviceInfo.OsVersion,
                    CpuInfo = deviceInfo.CpuInfo,
                    ActivatedAt = activationResponse.ActivatedAt,
                    Status = "active"
                };

                _dbContext.PerpetualLicenses.Add(license);
                _dbContext.DeviceActivations.Add(activation);
                await _dbContext.SaveChangesAsync();

                _logger.LogInformation("Manual activation successful: {LicenseKey}", licenseKey);

                return new ManualActivationResult
                {
                    Success = true,
                    Message = "Activation successful",
                    LicenseKey = licenseKey
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Manual activation failed");
                return new ManualActivationResult { Success = false, Message = $"Error: {ex.Message}" };
            }
        }

        public async Task<bool> IsLicenseValidAsync()
        {
            var license = await GetCurrentLicenseAsync();
            if (license == null) return false;

            // Check license status
            if (license.Status != "active") return false;

            // Check if JWT is expired (30-day grace period for offline)
            if (license.LastSyncedAt.HasValue)
            {
                var daysSinceSync = (DateTime.UtcNow - license.LastSyncedAt.Value).TotalDays;
                if (daysSinceSync > 30)
                {
                    _logger.LogWarning("License requires online validation (offline grace period expired)");
                    return false;
                }
            }

            // Check version eligibility
            var currentVersion = GetCurrentAppVersion();
            if (!IsVersionEligible(currentVersion, license.EligibleUntilVersion))
            {
                _logger.LogWarning("Current app version {CurrentVersion} exceeds license eligibility {EligibleUntil}",
                    currentVersion, license.EligibleUntilVersion);
                return false;
            }

            return true;
        }

        public async Task<PerpetualLicenseEntity?> GetCurrentLicenseAsync()
        {
            return await _dbContext.PerpetualLicenses
                .Include(l => l.DeviceActivation)
                .Where(l => l.Status == "active")
                .OrderByDescending(l => l.ActivatedAt)
                .FirstOrDefaultAsync();
        }

        // Helper methods
        private async Task<string> EncryptJwtAsync(string jwt)
        {
            var encrypted = await _encryptionService.EncryptAsync(jwt);
            return encrypted;
        }

        private string GetCurrentAppVersion()
        {
            var version = System.Reflection.Assembly.GetExecutingAssembly().GetName().Version;
            return $"{version?.Major}.{version?.Minor}.{version?.Build}";
        }

        private bool IsVersionEligible(string currentVersion, string eligibleUntilVersion)
        {
            // Simple version comparison (assumes format: "1.2.3")
            var current = Version.Parse(currentVersion);
            var eligible = Version.Parse(eligibleUntilVersion);
            return current <= eligible;
        }
    }

    // Result classes
    public class AutoActivationResult
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public string? LicenseKey { get; set; }
        public bool AlreadyActivated { get; set; }
    }

    public class ManualActivationResult
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public string? LicenseKey { get; set; }
    }
}
```

---

### Phase 4: UI Integration (2 days)

#### 4.1 Update Login Flow

**File:** `src/ViewModels/LoginViewModel.cs`

Add auto-activation trigger after successful OAuth login:

```csharp
private async Task OnOAuthLoginCompleted(string accessToken)
{
    try
    {
        // Existing OAuth token storage...
        await _tokenService.StoreTokenAsync(accessToken);

        // NEW: Auto-activation check
        var activationResult = await _licenseActivationService.TryAutoActivationAsync(accessToken);

        if (activationResult.Success)
        {
            if (activationResult.AlreadyActivated)
            {
                _logger.LogInformation("Perpetual license already activated");
            }
            else
            {
                _logger.LogInformation("Perpetual license auto-activated successfully");
                // Show success notification
                await _dialogService.ShowSuccessAsync(
                    "License Activated",
                    $"Your perpetual license has been automatically activated.\\nLicense Key: {activationResult.LicenseKey}"
                );
            }
        }
        else
        {
            _logger.LogWarning("Auto-activation failed or no license found: {Message}", activationResult.Message);
        }

        // Navigate to main app view
        NavigateToMainView();
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error during OAuth login completion");
    }
}
```

#### 4.2 Create Manual Activation View

**File:** `src/Views/ManualActivationView.xaml`

```xaml
<UserControl x:Class="TextAssistant.Views.ManualActivationView"
             xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
             xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
             xmlns:d="http://schemas.microsoft.com/expression/blend/2008"
             xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
             xmlns:ui="http://schemas.lepo.co/wpfui/2022/xaml"
             mc:Ignorable="d"
             d:DesignHeight="450" d:DesignWidth="800">
    <Grid Margin="20">
        <Grid.RowDefinitions>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="*"/>
            <RowDefinition Height="Auto"/>
        </Grid.RowDefinitions>

        <!-- Header -->
        <StackPanel Grid.Row="0" Margin="0,0,0,20">
            <TextBlock Text="Activate Perpetual License"
                       FontSize="24"
                       FontWeight="Bold"
                       Margin="0,0,0,10"/>
            <TextBlock Text="Enter your license key to activate this device"
                       FontSize="14"
                       Foreground="{DynamicResource TextFillColorSecondaryBrush}"/>
        </StackPanel>

        <!-- Content -->
        <StackPanel Grid.Row="1" VerticalAlignment="Top">
            <TextBlock Text="License Key"
                       Margin="0,0,0,5"
                       FontWeight="Medium"/>
            <ui:TextBox PlaceholderText="REPHLO-V1-XXXX-XXXX-XXXX"
                        Text="{Binding LicenseKey, UpdateSourceTrigger=PropertyChanged}"
                        Margin="0,0,0,20"
                        CharacterCasing="Upper"/>

            <ui:Button Content="Activate License"
                       Command="{Binding ActivateCommand}"
                       Appearance="Primary"
                       Icon="{ui:SymbolIcon Key24}"
                       HorizontalAlignment="Stretch"
                       Padding="20,10"/>

            <!-- Status Message -->
            <TextBlock Text="{Binding StatusMessage}"
                       Margin="0,20,0,0"
                       TextWrapping="Wrap"
                       Foreground="{Binding StatusMessageBrush}"
                       Visibility="{Binding ShowStatusMessage, Converter={StaticResource BooleanToVisibilityConverter}}"/>
        </StackPanel>

        <!-- Footer -->
        <StackPanel Grid.Row="2" Margin="0,20,0,0">
            <Separator Margin="0,0,0,10"/>
            <TextBlock TextWrapping="Wrap"
                       Foreground="{DynamicResource TextFillColorTertiaryBrush}">
                <Run Text="Don't have a license?"/>
                <Hyperlink Command="{Binding NavigateToPurchaseCommand}">
                    <Run Text="Purchase a perpetual license"/>
                </Hyperlink>
            </TextBlock>
        </StackPanel>
    </Grid>
</UserControl>
```

**File:** `src/ViewModels/ManualActivationViewModel.cs`

```csharp
using System.Windows.Input;
using System.Windows.Media;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using TextAssistant.Services.LicenseManagement;

namespace TextAssistant.ViewModels
{
    public partial class ManualActivationViewModel : ObservableObject
    {
        private readonly ILicenseActivationService _licenseActivationService;
        private readonly INavigationService _navigationService;

        [ObservableProperty]
        private string _licenseKey = string.Empty;

        [ObservableProperty]
        private string _statusMessage = string.Empty;

        [ObservableProperty]
        private Brush _statusMessageBrush = Brushes.Gray;

        [ObservableProperty]
        private bool _showStatusMessage;

        [ObservableProperty]
        private bool _isActivating;

        public ManualActivationViewModel(
            ILicenseActivationService licenseActivationService,
            INavigationService navigationService)
        {
            _licenseActivationService = licenseActivationService;
            _navigationService = navigationService;
        }

        [RelayCommand]
        private async Task ActivateAsync()
        {
            if (string.IsNullOrWhiteSpace(LicenseKey))
            {
                ShowErrorMessage("Please enter a license key");
                return;
            }

            IsActivating = true;
            ShowStatusMessage = false;

            try
            {
                var result = await _licenseActivationService.ActivateWithKeyAsync(LicenseKey.Trim().ToUpperInvariant());

                if (result.Success)
                {
                    ShowSuccessMessage($"License activated successfully!\\nLicense Key: {result.LicenseKey}");

                    // Navigate to main view after 2 seconds
                    await Task.Delay(2000);
                    _navigationService.NavigateToMainView();
                }
                else
                {
                    ShowErrorMessage(result.Message);
                }
            }
            catch (Exception ex)
            {
                ShowErrorMessage($"Activation failed: {ex.Message}");
            }
            finally
            {
                IsActivating = false;
            }
        }

        [RelayCommand]
        private void NavigateToPurchase()
        {
            // Open purchase page in browser
            System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo
            {
                FileName = "https://rephlo.ai/pricing",
                UseShellExecute = true
            });
        }

        private void ShowSuccessMessage(string message)
        {
            StatusMessage = message;
            StatusMessageBrush = Brushes.Green;
            ShowStatusMessage = true;
        }

        private void ShowErrorMessage(string message)
        {
            StatusMessage = message;
            StatusMessageBrush = Brushes.Red;
            ShowStatusMessage = true;
        }
    }
}
```

---

### Phase 5: Dependency Injection Registration

**File:** `src/App.xaml.cs` or `src/ServiceConfiguration.cs`

```csharp
public static void ConfigureLicenseServices(IServiceCollection services)
{
    // License Management Services
    services.AddScoped<IDeviceFingerprintService, DeviceFingerprintService>();
    services.AddScoped<ILicenseActivationService, LicenseActivationService>();
    services.AddHttpClient<ILicenseApiClient, LicenseApiClient>();

    // ViewModels
    services.AddTransient<ManualActivationViewModel>();
}
```

---

## Security Considerations

### 1. Secure Storage

**JWT Caching:**
- Store JWT in encrypted format using `CrossPlatformEncryptionService`
- AES-256-GCM encryption with platform-derived keys
- Never store plain-text JWT in SQLite

**License Key Protection:**
- Store license keys in encrypted form
- Use Windows Data Protection API (DPAPI) for additional security layer

### 2. Offline Validation

**30-Day Grace Period:**
- Check `last_synced_at` timestamp
- Require online re-validation if > 30 days
- Verify JWT signature using cached JWKS public key

**JWT Verification:**
```csharp
private async Task<bool> VerifyJwtOfflineAsync(string jwt)
{
    try
    {
        var handler = new JwtSecurityTokenHandler();
        var token = handler.ReadJwtToken(jwt);

        // Check expiry (allow 30-day grace period)
        var expiryDate = token.ValidTo;
        var gracePeriodExpiry = expiryDate.AddDays(30);

        if (DateTime.UtcNow > gracePeriodExpiry)
        {
            return false;
        }

        // Verify signature using cached JWKS public key
        var publicKey = await GetCachedPublicKeyAsync();
        var validationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = publicKey,
            ValidateIssuer = true,
            ValidIssuer = "http://localhost:7151",
            ValidateAudience = false
        };

        handler.ValidateToken(jwt, validationParameters, out _);
        return true;
    }
    catch
    {
        return false;
    }
}
```

### 3. Device Fingerprinting

**Hardware-Based Fingerprint:**
- CPU ID (ProcessorId from WMI)
- Disk Serial Number (PhysicalMedia SerialNumber)
- OS Version string

**Important:**
- Fingerprint should remain stable across OS updates
- Handle cases where WMI queries fail gracefully
- Use fallback values ("unknown") if hardware info unavailable

---

## Testing Requirements

### Unit Tests

**Test Coverage:**
- `DeviceFingerprintService`: Hardware ID generation
- `LicenseActivationService`: Auto-activation and manual activation flows
- `LicenseApiClient`: HTTP request/response handling
- JWT decoding and offline validation logic

**Example Test:**
```csharp
[Fact]
public async Task TryAutoActivation_WithValidJwt_ShouldActivateDevice()
{
    // Arrange
    var accessToken = GenerateTestJwt(licenseStatus: "active", licenseKey: "REPHLO-V1-TEST-XXXX-XXXX");
    var mockApiClient = new Mock<ILicenseApiClient>();
    mockApiClient.Setup(c => c.GetMyLicenseAsync(accessToken))
        .ReturnsAsync(new PerpetualLicenseResponse { LicenseKey = "REPHLO-V1-TEST-XXXX-XXXX", Status = "active" });

    var service = new LicenseActivationService(...);

    // Act
    var result = await service.TryAutoActivationAsync(accessToken);

    // Assert
    Assert.True(result.Success);
    Assert.Equal("REPHLO-V1-TEST-XXXX-XXXX", result.LicenseKey);
}
```

### Integration Tests

**End-to-End Scenarios:**
1. OAuth login → auto-activation → license stored locally
2. Manual license key entry → activation → success
3. Offline validation with cached JWT (within 30 days)
4. Offline validation failure (> 30 days)
5. Max activations reached → error handling

---

## Deployment Checklist

### Pre-Deployment

- [ ] EF Core migrations created and tested
- [ ] All services registered in DI container
- [ ] Unit tests pass (>80% coverage)
- [ ] Integration tests pass
- [ ] Manual QA testing completed
- [ ] Security review (encrypted storage, JWT validation)
- [ ] Performance profiling (device fingerprinting < 500ms)

### Configuration

- [ ] Backend API URL configured (dev: localhost:7150, prod: api.rephlo.ai)
- [ ] IDP URL configured (dev: localhost:7151, prod: auth.rephlo.ai)
- [ ] Offline grace period configured (default: 30 days)
- [ ] JWT expiry handling configured (1 hour TTL)

### Post-Deployment

- [ ] Monitor auto-activation success rate
- [ ] Track manual activation error rates
- [ ] Monitor offline validation failures
- [ ] Log device fingerprint generation performance

---

## Timeline

| Phase | Duration | Tasks |
|-------|----------|-------|
| **Phase 1: Data Models & Database** | 1 week | Entity models, DbContext updates, EF migrations |
| **Phase 2: Device Fingerprinting** | 2 days | Hardware ID generation, WMI queries, SHA-256 hashing |
| **Phase 3: License Management** | 3 days | API client, activation service, offline validation |
| **Phase 4: UI Integration** | 2 days | Login flow updates, manual activation view |
| **Phase 5: Testing & QA** | 2 days | Unit tests, integration tests, manual testing |
| **TOTAL** | **2.5 weeks** | **Complete implementation** |

---

## Success Metrics

### Technical Metrics

- **Auto-Activation Success Rate:** > 95%
- **Device Fingerprint Generation Time:** < 500ms
- **License Validation Time:** < 100ms (offline), < 2s (online)
- **JWT Cache Hit Rate:** > 80%

### User Experience Metrics

- **Zero Manual Entry for OAuth Users:** 100% auto-activation
- **Manual Activation Time:** < 60 seconds
- **Offline App Launch Time:** < 3 seconds
- **Error Rate:** < 1%

---

## References

- **Backend API Endpoints:** `backend/src/routes/plan110.routes.ts`
- **Identity Provider JWT Claims:** `identity-provider/src/services/auth.service.ts`
- **Test Scripts:** `backend/PERPETUAL_LICENSE_API_TESTS.md`
- **Coordination Plan:** `docs/plan/203-perpetual-license-auto-activation-coordination-plan.md`

---

## Support & Questions

For implementation questions or issues, contact:

- **Backend Team:** (rephlo-sites2 repository maintainers)
- **Desktop Team:** (Text Assistant repository maintainers)
- **Documentation:** See `docs/plan/` and `docs/reference/` directories

---

*Document Version:* 1.0
*Last Updated:* 2025-01-19
*Author:* System Architect (Claude Code)

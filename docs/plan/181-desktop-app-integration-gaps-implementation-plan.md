# Desktop App Integration Gaps - Implementation Plan

**Plan ID:** 181
**Date:** 2025-11-13
**Owner:** Desktop App Team
**Status:** 📋 Ready for Implementation
**Priority:** P0 - Critical (Blocks Commercial Launch)
**Estimated Effort:** 3-4 weeks
**Dependencies:** Backend API (Complete), Identity Provider (Complete)

---

## Executive Summary

This plan addresses critical gaps in the Desktop Application that block commercial launch. While the OAuth authentication and API integration infrastructure is solid (75% complete), the user-facing monetization flows are missing. Users cannot upgrade when hitting limits, manage subscriptions, or receive actionable error messages.

**Key Changes from Original Analysis:**
1. ✅ **Preserve History Transaction** - Local SQLite history preserved for BOTH BYOK and Login modes (conversation content NEVER stored on server)
2. ✅ **Privacy-First Architecture** - Input/output text stays local; server only stores usage metadata (timestamps, model, tokens)
3. ✅ **New Settings Architecture** - Login-aware screens with Billing, Usage, Privacy, and Account sections
4. ✅ **Optional Cloud Sync** - Future P2 feature for multi-device access (user opt-in with encryption)

---

## Table of Contents

1. [Scope & Objectives](#scope--objectives)
2. [Architecture Overview](#architecture-overview)
3. [Phase 1: Upgrade Flow Implementation (P0)](#phase-1-upgrade-flow-implementation-p0)
4. [Phase 2: Settings Redesign (P0)](#phase-2-settings-redesign-p0)
5. [Phase 3: Model Tier Filtering (P1)](#phase-3-model-tier-filtering-p1)
6. [Phase 4: QA & Polish (Required)](#phase-4-qa--polish-required)
7. [Implementation Details](#implementation-details)
8. [Testing Strategy](#testing-strategy)
9. [Acceptance Criteria](#acceptance-criteria)
10. [Timeline & Milestones](#timeline--milestones)

---

## Scope & Objectives

### In Scope

**P0 - Critical (Blocks Launch):**
- ✅ Upgrade prompt dialog when hitting credit/tier limits
- ✅ Specific exception handlers for monetization errors
- ✅ Settings screen redesign with Billing, Usage, Privacy, Account sections
- ✅ Stripe integration for subscription management and invoices

**P1 - High Priority:**
- ✅ Model tier filtering UI with lock icons and tooltips
- ✅ Tier badges in status bar and main window

**P2 - Nice to Have (Future):**
- ⏭️ Credit purchase flow (embedded Stripe Checkout) - Deferred
- ⏭️ Advanced usage analytics - Deferred

### Out of Scope

- ❌ **History Transaction Storage Changes** - Conversation data stays local (SQLite) for BOTH BYOK and Login modes
- ❌ **Cloud Sync Feature** - Deferred to P2 (optional multi-device sync with user consent and encryption)
- ❌ Identity Provider changes - OAuth flow complete
- ❌ Offline BYOK provider changes - Existing functionality unchanged

**⚠️ Important Architecture Note:**
The Desktop App uses a **privacy-first architecture** where:
- **All conversation history (input/output text)** is stored locally in SQLite for BOTH BYOK and Login modes
- **Server-side storage** is limited to usage metadata ONLY (timestamps, model names, token counts, credits consumed)
- This is a key market differentiator for security-conscious users
- Backend API endpoints already track usage metadata via `UsageHistory` table (no changes needed)

---

## Architecture Overview

### Current State vs Target State

| Component | Current State | Target State |
|-----------|---------------|--------------|
| **Authentication** | ✅ OAuth PKCE working | ✅ No changes needed |
| **API Integration** | ✅ Chat completions working | ✅ No changes needed |
| **Credit Fetching** | ✅ 5-min cache working | ✅ No changes needed |
| **Error Handling** | ❌ Generic catches | ✅ Specific handlers with UI prompts |
| **Settings** | ❌ Single LLM config screen | ✅ Login-aware multi-section screen |
| **History Storage** | ✅ Local SQLite (both modes) | ✅ **Preserved** (no server storage of conversations) |
| **Usage Tracking** | ✅ Local SQLite metadata | ✅ + Backend API metadata (timestamps/model/tokens only) |
| **Subscription UI** | ❌ None | ✅ Billing screen with Stripe portal |
| **Model Filtering** | ❌ Server-filtered only | ✅ Client-aware with tier badges |

---

## Phase 1: Upgrade Flow Implementation (P0)

**Duration:** Week 1-2 (10 days)
**Priority:** P0 - Critical
**Owner:** Desktop App Team

### 1.1 Create Upgrade Dialog Component

**File:** `TextAssistant.UI\Views\Dialogs\UpgradeDialog.xaml`

**UI Design:**

```
┌─────────────────────────────────────────────────┐
│  ⚠️  Insufficient Credits                       │
├─────────────────────────────────────────────────┤
│                                                 │
│  You need 5,000 credits to complete this       │
│  transformation, but you only have 1,200       │
│  credits remaining.                             │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │ Your Credits                              │ │
│  │ Available:    1,200 credits               │ │
│  │ Required:     5,000 credits               │ │
│  │ Shortfall:    3,800 credits               │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  Choose an option:                              │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ 🆙 Upgrade to Pro Plan                  │   │
│  │ • Unlimited free monthly credits        │   │
│  │ • Access to premium models              │   │
│  │ • Priority support                      │   │
│  │                                         │   │
│  │         [View Pro Plans]                │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ 💳 Buy More Credits (One-time)          │   │
│  │ • Pay only for what you use             │   │
│  │ • Never expires                         │   │
│  │                                         │   │
│  │      [Purchase Credits]                 │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ 🔑 Use Your Own API Key (BYOK)          │   │
│  │ • Bring your own OpenAI/Claude key      │   │
│  │ • No credit limits                      │   │
│  │                                         │   │
│  │    [Switch to BYOK Mode]                │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│              [Cancel]                           │
└─────────────────────────────────────────────────┘
```

**ViewModel:** `TextAssistant.UI\ViewModels\UpgradeDialogViewModel.cs`

**Properties:**
```csharp
public class UpgradeDialogViewModel : ViewModelBase
{
    public int RequiredCredits { get; set; }
    public int AvailableCredits { get; set; }
    public int Shortfall => RequiredCredits - AvailableCredits;

    public IAsyncRelayCommand ViewProPlansCommand { get; }
    public IAsyncRelayCommand PurchaseCreditsCommand { get; }
    public IAsyncRelayCommand SwitchToBYOKCommand { get; }
}
```

**Actions:**
- **View Pro Plans** → Opens browser to subscription page (from environment config)
- **Purchase Credits** → Opens browser to credit purchase page (future: embedded Stripe Checkout)
- **Switch to BYOK Mode** → Opens BYOK provider setup dialog

**Acceptance Criteria:**
- ✅ Dialog shows when `InsufficientCreditsException` caught
- ✅ Displays accurate credit numbers from exception
- ✅ All three options are functional
- ✅ Dialog is modal and prevents further actions until dismissed
- ✅ ESC key closes dialog

---

### 1.2 Implement Specific Exception Handlers

**File:** `TextAssistant.UI\ViewModels\ContextMenuOverlayViewModel.cs`

**Current Code (Line ~913):**
```csharp
catch (Exception ex)
{
    _logger.LogError(ex, "Error executing command");
    // Generic error message shown
}
```

**Updated Code:**
```csharp
catch (InsufficientCreditsException ex)
{
    _logger.LogWarning(ex, "Insufficient credits: Required={Required}, Available={Available}",
        ex.RequiredCredits, ex.AvailableCredits);

    await Application.Current.Dispatcher.InvokeAsync(async () =>
    {
        var upgradeDialog = _serviceProvider.GetRequiredService<UpgradeDialog>();
        var viewModel = upgradeDialog.DataContext as UpgradeDialogViewModel;

        if (viewModel != null)
        {
            viewModel.RequiredCredits = ex.RequiredCredits;
            viewModel.AvailableCredits = ex.AvailableCredits;
        }

        await upgradeDialog.ShowDialogAsync();
    });
}
catch (SubscriptionExpiredException ex)
{
    _logger.LogWarning(ex, "Subscription expired: {Message}", ex.Message);

    await Application.Current.Dispatcher.InvokeAsync(async () =>
    {
        var result = await ShowRenewalPromptAsync(ex.Message);
        if (result == DialogResult.Renew)
        {
            OpenSubscriptionManagement();
        }
    });
}
catch (UnauthorizedException ex)
{
    _logger.LogWarning(ex, "Authentication failed: {Message}", ex.Message);

    await Application.Current.Dispatcher.InvokeAsync(async () =>
    {
        var result = await ShowReLoginPromptAsync();
        if (result == DialogResult.Login)
        {
            await _oauthService.StartLoginFlowAsync();
        }
    });
}
catch (OperationCanceledException)
{
    _logger.LogDebug("Operation cancelled by user");
    // Silent dismissal
}
catch (Exception ex)
{
    _logger.LogError(ex, "Unexpected error executing command");
    await ShowGenericErrorAsync(ex.Message);
}
```

**Files to Update:**
1. `ContextMenuOverlayViewModel.cs` - Context menu command executions (24 catch blocks)
2. `MainWindowV4ViewModel.cs` - Background refresh operations
3. `WelcomeScreenViewModel.cs` - OAuth login flow

**Acceptance Criteria:**
- ✅ All `InsufficientCreditsException` show upgrade dialog
- ✅ All `SubscriptionExpiredException` show renewal prompt
- ✅ All `UnauthorizedException` show re-login prompt
- ✅ Generic exceptions show user-friendly messages (not technical details)
- ✅ All error scenarios logged with appropriate severity

---

### 1.3 Subscription Expiry Dialog

**File:** `TextAssistant.UI\Views\Dialogs\SubscriptionExpiredDialog.xaml`

**UI Design:**

```
┌─────────────────────────────────────────────────┐
│  ⚠️  Subscription Expired                       │
├─────────────────────────────────────────────────┤
│                                                 │
│  Your Pro subscription expired on Oct 15, 2025 │
│                                                 │
│  Renew now to continue enjoying:                │
│  • Unlimited monthly credits                   │
│  • Access to premium models (GPT-4, Claude)    │
│  • Priority support                            │
│                                                 │
│         [Renew Subscription]                    │
│                                                 │
│  Or continue with:                              │
│  • Free tier (limited monthly credits)         │
│  • BYOK mode (bring your own API key)          │
│                                                 │
│      [Continue with Free Tier]                  │
│      [Switch to BYOK Mode]                      │
│                                                 │
│              [Close]                            │
└─────────────────────────────────────────────────┘
```

**Actions:**
- **Renew Subscription** → Opens browser to Stripe Customer Portal
- **Continue with Free Tier** → Closes dialog, user continues with free tier
- **Switch to BYOK Mode** → Opens BYOK provider setup dialog

---

## Phase 2: Settings Redesign (P0)

**Duration:** Week 2-3 (10 days)
**Priority:** P0 - Critical
**Owner:** Desktop App Team

### 2.1 New Settings Architecture

**Current Settings Screen:**
- Single screen with LLM provider configuration tabs
- No login-aware content
- No subscription management

**New Settings Structure:**

```
Settings Window
├── [Sidebar Navigation]
│   ├── 🏠 General
│   ├── 🔧 LLM Providers (existing, unchanged)
│   ├── ⌨️  Hotkeys (existing, unchanged)
│   ├── 💳 Billing (Login mode only)
│   ├── 📊 Usage (Login mode only)
│   ├── 🔒 Privacy (both modes, different content)
│   └── 👤 Account (both modes, different content)
│
└── [Content Area] (dynamic based on selection and login state)
```

**Login State Detection:**
```csharp
public bool IsLoggedIn => _oauthService.IsAuthenticated() &&
                          _environmentService.CurrentEnvironment != EnvironmentType.BYOK;
```

---

### 2.2 Billing Screen (Login Mode Only)

**File:** `TextAssistant.UI\Views\Settings\BillingSettingsView.xaml`

**Visibility:** `Visibility="{Binding IsLoggedIn, Converter={StaticResource BoolToVisibilityConverter}}"`

**UI Design:**

```
┌─────────────────────────────────────────────────────────┐
│  💳 Billing & Subscription                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃ Current Plan                                      ┃  │
│  ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫  │
│  ┃                                                   ┃  │
│  ┃  ⭐ Pro Plan                                      ┃  │
│  ┃                                                   ┃  │
│  ┃  Status:          Active                         ┃  │
│  ┃  Billing Cycle:   Monthly                        ┃  │
│  ┃  Current Period:  Oct 15 - Nov 15, 2025          ┃  │
│  ┃  Auto-Renew:      Enabled                        ┃  │
│  ┃                                                   ┃  │
│  ┃  Credits:         Unlimited (monthly reset)      ┃  │
│  ┃  Models:          All premium models included    ┃  │
│  ┃                                                   ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │         [Upgrade/Downgrade Plan]                │   │
│  │         [Cancel Subscription]                   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃ Payment Method                                    ┃  │
│  ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫  │
│  ┃                                                   ┃  │
│  ┃  💳 Visa ending in 4242                          ┃  │
│  ┃  Expires: 12/2025                                ┃  │
│  ┃                                                   ┃  │
│  ┃  [Manage Payment Methods in Stripe] →           ┃  │
│  ┃                                                   ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                                         │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃ Invoices                                          ┃  │
│  ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫  │
│  ┃                                                   ┃  │
│  ┃  Date         Amount    Status      Actions      ┃  │
│  ┃  ──────────────────────────────────────────────  ┃  │
│  ┃  Nov 1, 2025  $29.00    Paid       [View] →     ┃  │
│  ┃  Oct 1, 2025  $29.00    Paid       [View] →     ┃  │
│  ┃  Sep 1, 2025  $29.00    Paid       [View] →     ┃  │
│  ┃                                                   ┃  │
│  ┃  [View All Invoices in Stripe] →                ┃  │
│  ┃                                                   ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**ViewModel:** `TextAssistant.UI\ViewModels\Settings\BillingSettingsViewModel.cs`

**Properties:**
```csharp
public class BillingSettingsViewModel : ViewModelBase
{
    public string CurrentTier { get; set; }              // "Free", "Pro", "Enterprise"
    public string SubscriptionStatus { get; set; }       // "Active", "Cancelled", "Expired"
    public string BillingCycle { get; set; }             // "Monthly", "Annual"
    public DateTime CurrentPeriodStart { get; set; }
    public DateTime CurrentPeriodEnd { get; set; }
    public bool AutoRenew { get; set; }
    public string CreditsSummary { get; set; }           // e.g., "Unlimited (monthly reset)"

    public string PaymentMethodLast4 { get; set; }
    public string PaymentMethodExpiry { get; set; }

    public ObservableCollection<InvoiceViewModel> RecentInvoices { get; set; }

    public IAsyncRelayCommand AdjustPlanCommand { get; }
    public IAsyncRelayCommand CancelSubscriptionCommand { get; }
    public IAsyncRelayCommand ManagePaymentCommand { get; }
    public IAsyncRelayCommand ViewAllInvoicesCommand { get; }
    public IAsyncRelayCommand<string> ViewInvoiceCommand { get; }
}
```

**Data Sources:**
1. **User Profile API:** `GET /api/user/profile` (already integrated)
   - Returns: `Subscription.Tier`, `Subscription.Status`, `Subscription.CurrentPeriodStart/End`
2. **Stripe Customer Portal:** External link construction
   - Format: `{environmentConfig.StripeCustomerPortalUrl}?prefilled_email={userEmail}`

**Actions:**
- **Upgrade/Downgrade Plan** → Opens Stripe Customer Portal in browser
- **Cancel Subscription** → Opens Stripe Customer Portal in browser
- **Manage Payment Methods** → Opens Stripe Customer Portal in browser
- **View Invoice** → Opens Stripe invoice URL in browser (format: `https://invoice.stripe.com/i/{invoiceId}`)
- **View All Invoices** → Opens Stripe Customer Portal invoices section

**Backend API Enhancement (Optional - Future):**
Currently, invoices are accessed via Stripe Customer Portal links. If Desktop App needs invoice list directly:
- New endpoint: `GET /api/user/invoices?limit=10`
- Response: List of invoices with `id`, `date`, `amount`, `status`, `invoiceUrl`

**Acceptance Criteria:**
- ✅ Shows current subscription tier, status, and billing cycle
- ✅ Displays current period dates and auto-renew status
- ✅ Shows last 3 invoices with "View" links
- ✅ All Stripe portal links open correctly in default browser
- ✅ Screen only visible when `IsLoggedIn == true`
- ✅ Data refreshes when screen is opened (not stale)

---

### 2.3 Usage Screen (Login Mode Only)

**File:** `TextAssistant.UI\Views\Settings\UsageSettingsView.xaml`

**Visibility:** `Visibility="{Binding IsLoggedIn, Converter={StaticResource BoolToVisibilityConverter}}"`

**UI Design (Simplified Monthly Summary):**

```
┌─────────────────────────────────────────────────────────┐
│  📊 Usage Summary                                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃ Current Month (November 2025)                     ┃  │
│  ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫  │
│  ┃                                                   ┃  │
│  ┃  Credits Used:     45,230 credits                ┃  │
│  ┃  API Requests:     1,287 requests                ┃  │
│  ┃  Total Tokens:     2,145,678 tokens              ┃  │
│  ┃                                                   ┃  │
│  ┃  Most Used Model:  GPT-4 (67%)                   ┃  │
│  ┃  Average Request:  1,668 tokens                  ┃  │
│  ┃                                                   ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                                         │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃ Credits Breakdown                                 ┃  │
│  ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫  │
│  ┃                                                   ┃  │
│  ┃  Free Credits Used:      0 / 10,000              ┃  │
│  ┃  Pro Credits Used:       45,230 (unlimited)      ┃  │
│  ┃                                                   ┃  │
│  ┃  [■■■■■■■□□□] 67% of typical monthly usage      ┃  │
│  ┃                                                   ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                                         │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃ Usage by Model                                    ┃  │
│  ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫  │
│  ┃                                                   ┃  │
│  ┃  GPT-4          867 requests  30,234 credits     ┃  │
│  ┃  Claude 3       320 requests  12,456 credits     ┃  │
│  ┃  GPT-3.5        100 requests   2,540 credits     ┃  │
│  ┃                                                   ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                                         │
│  Period: Nov 1 - Nov 13, 2025 (13 days)                │
│                                                         │
│  [View Detailed History] →                             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**ViewModel:** `TextAssistant.UI\ViewModels\Settings\UsageSettingsViewModel.cs`

**Properties:**
```csharp
public class UsageSettingsViewModel : ViewModelBase
{
    public int CreditsUsed { get; set; }
    public int ApiRequests { get; set; }
    public long TotalTokens { get; set; }
    public string MostUsedModel { get; set; }
    public int AverageTokensPerRequest { get; set; }

    public int FreeCreditsUsed { get; set; }
    public int FreeCreditsLimit { get; set; }
    public int ProCreditsUsed { get; set; }

    public ObservableCollection<ModelUsageViewModel> ModelBreakdown { get; set; }

    public string PeriodStart { get; set; }
    public string PeriodEnd { get; set; }

    public IAsyncRelayCommand ViewDetailedHistoryCommand { get; }
}
```

**Data Sources:**

**Option 1: Backend API Integration (Recommended)**
- Endpoint: `GET /api/user/usage/summary?period=current_month`
- Response:
  ```json
  {
    "period": "2025-11",
    "creditsUsed": 45230,
    "apiRequests": 1287,
    "totalTokens": 2145678,
    "mostUsedModel": "gpt-4",
    "averageTokensPerRequest": 1668,
    "freeCreditsUsed": 0,
    "freeCreditsLimit": 10000,
    "proCreditsUsed": 45230,
    "modelBreakdown": [
      { "model": "gpt-4", "requests": 867, "credits": 30234 },
      { "model": "claude-3-opus", "requests": 320, "credits": 12456 }
    ]
  }
  ```

**Option 2: Local SQLite Aggregation (Fallback)**
- If backend API not available, aggregate from existing `UsageHistory` table
- Query: `SELECT COUNT(*), SUM(credits), model FROM usage_history WHERE created_at >= start_of_month GROUP BY model`

**Hybrid Approach (Recommended):**
```csharp
public async Task LoadUsageDataAsync()
{
    if (IsLoggedIn && _networkService.IsOnline)
    {
        // Fetch from backend API
        var summary = await _usageApiService.GetMonthlySummaryAsync();
        UpdateViewModel(summary);
    }
    else
    {
        // Fall back to local SQLite
        var localSummary = await _usageHistoryService.GetLocalSummaryAsync();
        UpdateViewModel(localSummary);
    }
}
```

**Actions:**
- **View Detailed History** → Opens existing History window (local SQLite, preserved)

**Acceptance Criteria:**
- ✅ Shows current month usage summary
- ✅ Displays credits, requests, and tokens used
- ✅ Shows model breakdown with top 3 models
- ✅ Data refreshes when screen is opened
- ✅ Falls back to local data if offline or API unavailable
- ✅ Screen only visible when `IsLoggedIn == true`

**Backend API Enhancement (Required):**
- New endpoint: `GET /api/user/usage/summary?period=current_month`
- Aggregates usage from `UsageHistory` table in backend database
- Returns monthly totals and model breakdown

---

### 2.4 Privacy Screen (Both Modes, Different Content)

**File:** `TextAssistant.UI\Views\Settings\PrivacySettingsView.xaml`

**Visibility:** Always visible (both Login and BYOK modes)

**UI Design:**

**Login Mode:**
```
┌─────────────────────────────────────────────────────────┐
│  🔒 Privacy & Data                                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃ Data Stored on Rephlo Servers                     ┃  │
│  ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫  │
│  ┃                                                   ┃  │
│  ┃  • Account information (email, profile)          ┃  │
│  ┃  • Subscription and billing data                 ┃  │
│  ┃  • Usage metadata (timestamps, model, tokens)    ┃  │
│  ┃                                                   ┃  │
│  ┃  ⚠️ IMPORTANT: Your input/output text content    ┃  │
│  ┃  is NEVER stored on Rephlo servers.              ┃  │
│  ┃                                                   ┃  │
│  ┃  We only log usage metadata for billing:         ┃  │
│  ┃  • Timestamp of API request                      ┃  │
│  ┃  • Model used (e.g., "gpt-4")                    ┃  │
│  ┃  • Token count and credit cost                   ┃  │
│  ┃  • Request ID for troubleshooting                ┃  │
│  ┃                                                   ┃  │
│  ┃  Your conversations stay on your device only.    ┃  │
│  ┃                                                   ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                                         │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃ Data Stored Locally                               ┃  │
│  ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫  │
│  ┃                                                   ┃  │
│  ┃  • Commands and templates                        ┃  │
│  ┃  • Transaction history (input/output text)       ┃  │
│  ┃  • Screenshots and multimodal content            ┃  │
│  ┃  • Application settings and preferences          ┃  │
│  ┃                                                   ┃  │
│  ┃  Location: %LOCALAPPDATA%\TextAssistant\         ┃  │
│  ┃                                                   ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                                         │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃ Export Your Data                                  ┃  │
│  ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫  │
│  ┃                                                   ┃  │
│  ┃  Export all your data for backup or migration.   ┃  │
│  ┃                                                   ┃  │
│  ┃  Package includes:                               ┃  │
│  ┃  • Account profile and preferences               ┃  │
│  ┃  • All commands and templates                    ┃  │
│  ┃  • Transaction history (input/output text)       ┃  │
│  ┃  • Usage statistics and metadata                 ┃  │
│  ┃  • Screenshots (if applicable)                   ┃  │
│  ┃                                                   ┃  │
│  ┃  Format: ZIP archive with JSON + images          ┃  │
│  ┃                                                   ┃  │
│  ┃         [Export All Data]                        ┃  │
│  ┃                                                   ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                                         │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃ Data Retention                                    ┃  │
│  ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫  │
│  ┃                                                   ┃  │
│  ┃  Local transaction history retention:            ┃  │
│  ┃                                                   ┃  │
│  ┃  [■] Keep for 90 days (default)                  ┃  │
│  ┃  [ ] Keep for 30 days                            ┃  │
│  ┃  [ ] Keep forever                                ┃  │
│  ┃  [ ] Delete immediately after each session       ┃  │
│  ┃                                                   ┃  │
│  ┃  [Clear History Now]                             ┃  │
│  ┃                                                   ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                                         │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃ Cloud Sync (Optional, P2 - Future Feature)       ┃  │
│  ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫  │
│  ┃                                                   ┃  │
│  ┃  Sync your local data to Rephlo cloud for        ┃  │
│  ┃  multi-device access (with your consent only).   ┃  │
│  ┃                                                   ┃  │
│  ┃  [ ] Enable cloud sync (opt-in)                  ┃  │
│  ┃                                                   ┃  │
│  ┃  ⚠️ When enabled, your conversation history      ┃  │
│  ┃  will be encrypted and stored on our servers     ┃  │
│  ┃  to sync across devices.                         ┃  │
│  ┃                                                   ┃  │
│  ┃  Last Sync: Never                                ┃  │
│  ┃  [Sync Now]  [Manage Synced Devices]            ┃  │
│  ┃                                                   ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**BYOK Mode:**
```
┌─────────────────────────────────────────────────────────┐
│  🔒 Privacy & Data (BYOK Mode)                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃ Complete Privacy                                  ┃  │
│  ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫  │
│  ┃                                                   ┃  │
│  ┃  ✅ All data stored locally on your device       ┃  │
│  ┃  ✅ No data sent to Rephlo servers               ┃  │
│  ┃  ✅ API requests go directly to your provider    ┃  │
│  ┃      (OpenAI, Anthropic, Google, Ollama)         ┃  │
│  ┃                                                   ┃  │
│  ┃  Your API keys are encrypted and stored locally. ┃  │
│  ┃  We never have access to your API keys or data.  ┃  │
│  ┃                                                   ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                                         │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃ Data Stored Locally                               ┃  │
│  ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫  │
│  ┃                                                   ┃  │
│  ┃  • API keys (encrypted with Windows DPAPI)       ┃  │
│  ┃  • Commands and templates                        ┃  │
│  ┃  • Transaction history (full input/output text)  ┃  │
│  ┃  • Screenshots and multimodal content            ┃  │
│  ┃  • Application settings and preferences          ┃  │
│  ┃                                                   ┃  │
│  ┃  Location: %LOCALAPPDATA%\TextAssistant\         ┃  │
│  ┃                                                   ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                                         │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃ Export Your Data                                  ┃  │
│  ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫  │
│  ┃                                                   ┃  │
│  ┃  Export all your local data for backup.          ┃  │
│  ┃                                                   ┃  │
│  ┃  Package includes:                               ┃  │
│  ┃  • All commands and templates                    ┃  │
│  ┃  • Transaction history (full text content)       ┃  │
│  ┃  • Screenshots (if applicable)                   ┃  │
│  ┃  • Application settings                          ┃  │
│  ┃                                                   ┃  │
│  ┃  Note: API keys are NOT included in export       ┃  │
│  ┃  for security reasons.                           ┃  │
│  ┃                                                   ┃  │
│  ┃  Format: ZIP archive with JSON + images          ┃  │
│  ┃                                                   ┃  │
│  ┃         [Export All Data]                        ┃  │
│  ┃                                                   ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                                         │
│  (Data Retention section same as Login mode)           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**ViewModel:** `TextAssistant.UI\ViewModels\Settings\PrivacySettingsViewModel.cs`

**Properties:**
```csharp
public class PrivacySettingsViewModel : ViewModelBase
{
    public bool IsLoggedIn { get; set; }
    public bool IsBYOKMode => !IsLoggedIn;

    public string DataStorageDescription => IsLoggedIn
        ? "Metadata stored on Rephlo servers, content stored locally"
        : "All data stored locally on your device";

    public DataRetentionPeriod SelectedRetention { get; set; }

    public IAsyncRelayCommand ExportDataCommand { get; }
    public IAsyncRelayCommand ClearHistoryCommand { get; }
}

public enum DataRetentionPeriod
{
    Days30,
    Days90,   // Default
    Forever,
    Immediate
}
```

**Export Data Implementation:**

```csharp
public async Task ExportDataAsync()
{
    var saveDialog = new SaveFileDialog
    {
        FileName = $"TextAssistant-Export-{DateTime.Now:yyyyMMdd}.zip",
        Filter = "ZIP Archive (*.zip)|*.zip"
    };

    if (saveDialog.ShowDialog() == true)
    {
        var exporter = _serviceProvider.GetRequiredService<IDataExporter>();

        var exportData = new ExportPackage
        {
            Profile = IsLoggedIn ? await _profileService.GetProfileAsync() : null,
            Commands = await _commandService.GetAllAsync(),
            History = await _historyService.GetAllAsync(),
            Screenshots = await _screenshotService.GetAllAsync(),
            Settings = await _settingsRepository.GetAllAsync(),
            ExportDate = DateTime.UtcNow,
            Mode = IsLoggedIn ? "Login" : "BYOK"
        };

        await exporter.ExportToZipAsync(exportData, saveDialog.FileName);

        ShowSuccessMessage($"Data exported to {saveDialog.FileName}");
    }
}
```

**ZIP Archive Structure:**
```
TextAssistant-Export-20251113.zip
├── metadata.json              # Export metadata (date, version, mode)
├── profile.json               # User profile (Login mode only)
├── commands.json              # All commands and templates
├── history.json               # Transaction history with full text
├── settings.json              # Application settings
└── screenshots/               # Folder with all screenshots
    ├── 20251101-143025.png
    └── 20251102-091547.png
```

**Acceptance Criteria:**
- ✅ Shows different content based on `IsLoggedIn` state
- ✅ Export data creates ZIP archive with all local data
- ✅ Export excludes API keys for security
- ✅ Data retention settings apply to local SQLite cleanup
- ✅ Clear History Now prompts for confirmation before deletion
- ✅ Screen visible in both Login and BYOK modes

---

### 2.5 Account Screen (Both Modes, Different Content)

**File:** `TextAssistant.UI\Views\Settings\AccountSettingsView.xaml`

**Visibility:** Always visible (both Login and BYOK modes)

**UI Design:**

**Login Mode:**
```
┌─────────────────────────────────────────────────────────┐
│  👤 Account                                             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃ Profile Information                               ┃  │
│  ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫  │
│  ┃                                                   ┃  │
│  ┃  Email:        user@example.com                  ┃  │
│  ┃  Account ID:   usr_1234567890abcdef              ┃  │
│  ┃  Member Since: October 15, 2025                  ┃  │
│  ┃                                                   ┃  │
│  ┃  [Manage Profile in Dashboard] →                ┃  │
│  ┃                                                   ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                                         │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃ Current Environment                               ┃  │
│  ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫  │
│  ┃                                                   ┃  │
│  ┃  Environment:  Production                        ┃  │
│  ┃  API Endpoint: https://api.rephlo.com            ┃  │
│  ┃                                                   ┃  │
│  ┃  [Switch Environment] (Developer only)           ┃  │
│  ┃                                                   ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                                         │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃ Sign Out                                          ┃  │
│  ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫  │
│  ┃                                                   ┃  │
│  ┃  Sign out from your Rephlo account.              ┃  │
│  ┃                                                   ┃  │
│  ┃  Note: Your local data (commands, history,       ┃  │
│  ┃  settings) will be preserved.                    ┃  │
│  ┃                                                   ┃  │
│  ┃         [Sign Out]                               ┃  │
│  ┃                                                   ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**BYOK Mode:**
```
┌─────────────────────────────────────────────────────────┐
│  👤 Account (BYOK Mode)                                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃ BYOK (Bring Your Own Key) Mode                    ┃  │
│  ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫  │
│  ┃                                                   ┃  │
│  ┃  You are using Text Assistant in offline mode    ┃  │
│  ┃  with your own API keys.                         ┃  │
│  ┃                                                   ┃  │
│  ┃  All data is stored locally on your device.      ┃  │
│  ┃  No account connection to Rephlo servers.        ┃  │
│  ┃                                                   ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                                         │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃ Switch to Login Mode                              ┃  │
│  ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫  │
│  ┃                                                   ┃  │
│  ┃  Want to use Rephlo's managed service?           ┃  │
│  ┃                                                   ┃  │
│  ┃  Benefits:                                       ┃  │
│  ┃  • No API key management                        ┃  │
│  ┃  • Monthly free credits                         ┃  │
│  ┃  • Usage tracking and analytics                 ┃  │
│  ┃  • Sync across devices                          ┃  │
│  ┃                                                   ┃  │
│  ┃  Your local data will be preserved.              ┃  │
│  ┃                                                   ┃  │
│  ┃         [Sign In to Rephlo]                      ┃  │
│  ┃                                                   ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**ViewModel:** `TextAssistant.UI\ViewModels\Settings\AccountSettingsViewModel.cs`

**Properties:**
```csharp
public class AccountSettingsViewModel : ViewModelBase
{
    public bool IsLoggedIn { get; set; }
    public bool IsBYOKMode => !IsLoggedIn;

    // Login mode properties
    public string UserEmail { get; set; }
    public string AccountId { get; set; }
    public DateTime MemberSince { get; set; }
    public string CurrentEnvironment { get; set; }  // "Production", "Staging", "Local"
    public string ApiEndpoint { get; set; }

    public IAsyncRelayCommand ManageProfileCommand { get; }
    public IAsyncRelayCommand SwitchEnvironmentCommand { get; }
    public IAsyncRelayCommand SignOutCommand { get; }
    public IAsyncRelayCommand SignInCommand { get; }
}
```

**Sign Out Implementation:**

```csharp
public async Task SignOutAsync()
{
    var result = await ShowConfirmationAsync(
        "Sign Out",
        "Are you sure you want to sign out?\n\nYour local data (commands, history, settings) will be preserved."
    );

    if (result == DialogResult.Yes)
    {
        // Revoke OAuth token
        await _oauthService.RevokeTokenAsync();

        // Clear user profile cache
        _profileCache.Clear();

        // Clear credits cache
        _creditsCache.Clear();

        // Switch to BYOK mode (or show welcome screen)
        await _providerManager.SwitchToBYOKModeAsync();

        // Show success message
        ShowInfoMessage("You have been signed out successfully.");

        // Close settings window and show welcome screen
        _navigationService.NavigateToWelcome();
    }
}
```

**Sign In Implementation (BYOK → Login):**

```csharp
public async Task SignInAsync()
{
    // Show OAuth login flow
    var result = await _oauthService.StartLoginFlowAsync();

    if (result.Success)
    {
        // Fetch user profile
        var profile = await _oauthService.GetUserProfileAsync();

        // Switch active provider to Dedicated API
        var dedicatedProvider = await _providerRepository.GetOrCreateDedicatedProviderAsync();
        await _providerManager.SwitchProviderAsync(dedicatedProvider.ConnectionId);

        // Update UI
        IsLoggedIn = true;
        UserEmail = profile.Email;

        ShowSuccessMessage($"Welcome back, {profile.Email}!");

        // Refresh settings screen to show Billing/Usage tabs
        await RefreshSettingsAsync();
    }
}
```

**Acceptance Criteria:**
- ✅ Shows user email, account ID, and member since date in Login mode
- ✅ Shows current environment (Production/Staging/Local)
- ✅ Sign Out revokes OAuth token and clears caches
- ✅ Sign Out preserves local data (commands, history, settings)
- ✅ BYOK mode shows "Sign In to Rephlo" button
- ✅ Switching from BYOK to Login works seamlessly
- ✅ Screen visible in both Login and BYOK modes with different content

---

### 2.6 Settings Navigation Update

**File:** `TextAssistant.UI\Views\Settings\SettingsWindow.xaml`

**Updated Sidebar Navigation:**

```xml
<ui:NavigationView x:Name="NavigationView"
                   PaneDisplayMode="Left"
                   IsBackEnabled="False"
                   IsSettingsVisible="False"
                   SelectionChanged="NavigationView_SelectionChanged">
    <ui:NavigationView.MenuItems>
        <ui:NavigationViewItem Content="General"
                              Icon="{ui:SymbolIcon Home24}"
                              Tag="general"/>

        <ui:NavigationViewItem Content="LLM Providers"
                              Icon="{ui:SymbolIcon Cloud24}"
                              Tag="providers"/>

        <ui:NavigationViewItem Content="Hotkeys"
                              Icon="{ui:SymbolIcon Keyboard24}"
                              Tag="hotkeys"/>

        <ui:NavigationViewItemSeparator Visibility="{Binding IsLoggedIn, Converter={StaticResource BoolToVisibilityConverter}}"/>

        <ui:NavigationViewItem Content="Billing"
                              Icon="{ui:SymbolIcon CreditCardPerson24}"
                              Tag="billing"
                              Visibility="{Binding IsLoggedIn, Converter={StaticResource BoolToVisibilityConverter}}"/>

        <ui:NavigationViewItem Content="Usage"
                              Icon="{ui:SymbolIcon ChartMultiple24}"
                              Tag="usage"
                              Visibility="{Binding IsLoggedIn, Converter={StaticResource BoolToVisibilityConverter}}"/>

        <ui:NavigationViewItemSeparator/>

        <ui:NavigationViewItem Content="Privacy"
                              Icon="{ui:SymbolIcon ShieldLock24}"
                              Tag="privacy"/>

        <ui:NavigationViewItem Content="Account"
                              Icon="{ui:SymbolIcon Person24}"
                              Tag="account"/>
    </ui:NavigationView.MenuItems>
</ui:NavigationView>
```

**Dynamic Content Loading:**

```csharp
private void NavigationView_SelectionChanged(NavigationView sender, NavigationViewSelectionChangedEventArgs args)
{
    if (args.SelectedItem is NavigationViewItem item)
    {
        var tag = item.Tag?.ToString();

        switch (tag)
        {
            case "general":
                ContentFrame.Navigate(typeof(GeneralSettingsView));
                break;
            case "providers":
                ContentFrame.Navigate(typeof(LLMProviderSettingsView));
                break;
            case "hotkeys":
                ContentFrame.Navigate(typeof(HotkeySettingsView));
                break;
            case "billing":
                if (IsLoggedIn)
                    ContentFrame.Navigate(typeof(BillingSettingsView));
                break;
            case "usage":
                if (IsLoggedIn)
                    ContentFrame.Navigate(typeof(UsageSettingsView));
                break;
            case "privacy":
                ContentFrame.Navigate(typeof(PrivacySettingsView));
                break;
            case "account":
                ContentFrame.Navigate(typeof(AccountSettingsView));
                break;
        }
    }
}
```

**Acceptance Criteria:**
- ✅ Billing and Usage tabs only visible when `IsLoggedIn == true`
- ✅ Privacy and Account tabs always visible (different content based on login state)
- ✅ Navigation items highlight correctly when selected
- ✅ Settings window remembers last selected tab across sessions
- ✅ Tabs update visibility when user signs in/out without restarting

---

## Phase 3: Model Tier Filtering (P1)

**Duration:** Week 3 (5 days)
**Priority:** P1 - High
**Owner:** Desktop App Team

### 3.1 Update Model API Response Parsing

**Current Model Class:** `TextAssistant.Core\Models\Model.cs`

**Add Missing Properties:**

```csharp
public class Model
{
    // Existing properties
    public string Id { get; set; }
    public string Name { get; set; }
    public string DisplayName { get; set; }
    public string Provider { get; set; }
    public List<string> Capabilities { get; set; }
    public int ContextLength { get; set; }
    public int MaxOutputTokens { get; set; }
    public decimal CreditsPerThousandTokens { get; set; }
    public bool IsAvailable { get; set; }
    public bool IsDeprecated { get; set; }

    // NEW PROPERTIES FOR TIER FILTERING
    public string? RequiredTier { get; set; }              // "free", "pro", "enterprise"
    public string? TierRestrictionMode { get; set; }       // "enforce", "soft", "none"
    public string? AccessStatus { get; set; }              // "accessible", "upgrade_required", "contact_sales"

    // Computed properties
    public bool IsAccessible => AccessStatus == "accessible";
    public bool RequiresUpgrade => AccessStatus == "upgrade_required";
    public bool RequiresEnterprise => AccessStatus == "contact_sales";
    public bool IsLocked => !IsAccessible;
}
```

**Backend API Update (Required):**

The Desktop App team should coordinate with Backend API team to ensure `/v1/models` endpoint returns tier metadata:

**Expected Response:**
```json
{
  "models": [
    {
      "id": "gpt-4",
      "name": "gpt-4",
      "displayName": "GPT-4",
      "provider": "openai",
      "requiredTier": "pro",
      "tierRestrictionMode": "enforce",
      "access_status": "upgrade_required",
      "creditsPerThousandTokens": 50
    },
    {
      "id": "gpt-3.5-turbo",
      "name": "gpt-3.5-turbo",
      "displayName": "GPT-3.5 Turbo",
      "provider": "openai",
      "requiredTier": "free",
      "tierRestrictionMode": "none",
      "access_status": "accessible",
      "creditsPerThousandTokens": 5
    }
  ]
}
```

**Acceptance Criteria:**
- ✅ Model class includes `RequiredTier`, `TierRestrictionMode`, `AccessStatus`
- ✅ Desktop app parses new fields from API response
- ✅ Computed properties (`IsAccessible`, `IsLocked`) work correctly

---

### 3.2 Update Model Selection UI

**File:** `TextAssistant.UI\ViewModels\MainWindowV4ViewModel.cs`

**Current Model Dropdown:**
- Shows only accessible models (server-filtered)
- No tier indicators
- No tooltips

**Updated Model Dropdown:**

```
Model Selection:
  ✅ GPT-3.5 Turbo (Free)      [Selectable]
  🔒 GPT-4 (Pro)               [Locked - Tooltip: "Upgrade to Pro"]
  🔒 Claude 3 Opus (Enterprise) [Locked - Tooltip: "Contact Sales"]
```

**XAML Update:**

```xml
<ComboBox ItemsSource="{Binding AvailableModels}"
          SelectedItem="{Binding SelectedModel}"
          DisplayMemberPath="DisplayName">
    <ComboBox.ItemTemplate>
        <DataTemplate>
            <StackPanel Orientation="Horizontal" Spacing="8">
                <!-- Lock icon for restricted models -->
                <ui:SymbolIcon Symbol="LockClosed24"
                              Visibility="{Binding IsLocked, Converter={StaticResource BoolToVisibilityConverter}}"
                              Foreground="{DynamicResource SystemControlForegroundBaseMediumBrush}"/>

                <!-- Check icon for accessible models -->
                <ui:SymbolIcon Symbol="Checkmark24"
                              Visibility="{Binding IsAccessible, Converter={StaticResource BoolToVisibilityConverter}}"
                              Foreground="{DynamicResource SystemAccentColorBrush}"/>

                <!-- Model display name -->
                <TextBlock Text="{Binding DisplayName}"/>

                <!-- Tier badge -->
                <Border Background="{Binding TierBadgeColor}"
                        CornerRadius="2"
                        Padding="4,2"
                        Visibility="{Binding ShowTierBadge, Converter={StaticResource BoolToVisibilityConverter}}">
                    <TextBlock Text="{Binding RequiredTier}"
                              FontSize="10"
                              Foreground="White"
                              TextTransform="Uppercase"/>
                </Border>
            </StackPanel>
        </DataTemplate>
    </ComboBox.ItemTemplate>

    <ComboBox.ItemContainerStyle>
        <Style TargetType="ComboBoxItem">
            <!-- Disable locked models -->
            <Setter Property="IsEnabled" Value="{Binding IsAccessible}"/>

            <!-- Tooltip for locked models -->
            <Setter Property="ToolTip">
                <Setter.Value>
                    <ToolTip Visibility="{Binding IsLocked, Converter={StaticResource BoolToVisibilityConverter}}">
                        <StackPanel>
                            <TextBlock Text="{Binding UpgradeMessage}" FontWeight="SemiBold"/>
                            <TextBlock Text="{Binding RequiredTierDescription}"
                                      Foreground="{DynamicResource SystemControlForegroundBaseMediumBrush}"/>
                        </StackPanel>
                    </ToolTip>
                </Setter.Value>
            </Setter>
        </Style>
    </ComboBox.ItemContainerStyle>
</ComboBox>
```

**ViewModel Properties:**

```csharp
public class ModelViewModel
{
    public Model Model { get; set; }

    public string UpgradeMessage => Model.RequiresUpgrade
        ? $"Upgrade to {Model.RequiredTier.ToUpper()} to access {Model.DisplayName}"
        : Model.RequiresEnterprise
            ? "Contact Sales for Enterprise access"
            : string.Empty;

    public string RequiredTierDescription => Model.RequiredTier switch
    {
        "pro" => "Pro tier includes unlimited monthly credits and access to premium models.",
        "enterprise" => "Enterprise tier includes custom pricing, dedicated support, and advanced features.",
        _ => string.Empty
    };

    public Brush TierBadgeColor => Model.RequiredTier switch
    {
        "free" => Brushes.Gray,
        "pro" => Brushes.Blue,
        "enterprise" => Brushes.Purple,
        _ => Brushes.Transparent
    };

    public bool ShowTierBadge => !string.IsNullOrEmpty(Model.RequiredTier);
}
```

**Acceptance Criteria:**
- ✅ All models shown (not just accessible ones)
- ✅ Locked models are grayed out and non-selectable
- ✅ Lock icon appears on restricted models
- ✅ Tier badge shows tier requirement (Free/Pro/Enterprise)
- ✅ Tooltip shows upgrade message and tier description
- ✅ Clicking locked model does NOT select it (no accidental errors)

---

### 3.3 Add Tier Badge to Status Bar

**File:** `TextAssistant.UI\ViewModels\MainWindowV4ViewModel.cs`

**Current Status Bar:**
```
LLM: GPT-4 | Credits: 12,345
```

**Updated Status Bar:**
```
⭐ Pro Plan | LLM: GPT-4 | Credits: 12,345
```

**XAML Update:**

```xml
<StackPanel Orientation="Horizontal" Spacing="12">
    <!-- Tier badge (Login mode only) -->
    <Border Background="{Binding TierBadgeBackground}"
            CornerRadius="2"
            Padding="6,3"
            Visibility="{Binding ShowTierBadge, Converter={StaticResource BoolToVisibilityConverter}}">
        <StackPanel Orientation="Horizontal" Spacing="4">
            <TextBlock Text="{Binding TierIcon}" FontSize="12"/>
            <TextBlock Text="{Binding TierDisplayName}"
                      FontSize="11"
                      FontWeight="SemiBold"
                      Foreground="White"/>
        </StackPanel>
    </Border>

    <!-- Existing LLM and Credits display -->
    <TextBlock Text="{Binding LLMDisplayText}"/>
    <TextBlock Text="{Binding CreditDisplayText}"/>
</StackPanel>
```

**ViewModel Properties:**

```csharp
public bool ShowTierBadge => IsLoggedIn && !string.IsNullOrEmpty(UserTier);
public string UserTier { get; set; }  // "free", "pro", "enterprise"

public string TierIcon => UserTier switch
{
    "free" => "🆓",
    "pro" => "⭐",
    "enterprise" => "💼",
    _ => ""
};

public string TierDisplayName => UserTier switch
{
    "free" => "Free Plan",
    "pro" => "Pro Plan",
    "enterprise" => "Enterprise",
    _ => ""
};

public Brush TierBadgeBackground => UserTier switch
{
    "free" => new SolidColorBrush(Color.FromRgb(108, 117, 125)),  // Gray
    "pro" => new SolidColorBrush(Color.FromRgb(37, 99, 235)),     // Blue
    "enterprise" => new SolidColorBrush(Color.FromRgb(139, 92, 246)), // Purple
    _ => Brushes.Transparent
};
```

**Data Source:**
- Loaded from `UserProfile.Subscription.Tier` (already fetched after OAuth login)

**Acceptance Criteria:**
- ✅ Tier badge shows in status bar when logged in
- ✅ Correct icon and color for each tier
- ✅ Badge hidden in BYOK mode
- ✅ Badge updates when tier changes (after upgrade/downgrade)

---

## Phase 4: QA & Polish (Required)

**Duration:** Week 4 (5 days)
**Priority:** P0 - Critical
**Owner:** QA Team + Desktop App Team

### 4.1 Test Scenarios

**Upgrade Flow Testing:**

| Scenario | Steps | Expected Result |
|----------|-------|-----------------|
| **Insufficient Credits (Free Tier)** | 1. Login as Free user<br>2. Use GPT-4 until credits exhausted<br>3. Try to use GPT-4 again | Upgrade dialog shows with 3 options |
| **Insufficient Credits (Pro Tier)** | 1. Login as Pro user<br>2. Simulate credit exhaustion<br>3. Try to use model | Upgrade dialog shows (buy more credits) |
| **Subscription Expired** | 1. Login with expired subscription<br>2. Try to use premium model | Subscription renewal dialog shows |
| **Tier Restriction** | 1. Login as Free user<br>2. Try to use Enterprise-only model | Tier restriction error with upgrade prompt |
| **Upgrade Flow - View Plans** | 1. Trigger upgrade dialog<br>2. Click "View Pro Plans" | Browser opens to subscription page |
| **Upgrade Flow - Buy Credits** | 1. Trigger upgrade dialog<br>2. Click "Purchase Credits" | Browser opens to credit purchase page |
| **Upgrade Flow - Switch to BYOK** | 1. Trigger upgrade dialog<br>2. Click "Switch to BYOK Mode" | BYOK setup dialog opens |

**Settings Screen Testing:**

| Scenario | Steps | Expected Result |
|----------|-------|-----------------|
| **Billing Screen (Login)** | 1. Login<br>2. Open Settings → Billing | Shows subscription, payment method, invoices |
| **Billing Screen (BYOK)** | 1. Use BYOK mode<br>2. Open Settings | Billing tab NOT visible |
| **Usage Screen (Login)** | 1. Login<br>2. Open Settings → Usage | Shows monthly usage summary |
| **Usage Screen (BYOK)** | 1. Use BYOK mode<br>2. Open Settings | Usage tab NOT visible |
| **Privacy Screen (Login)** | 1. Login<br>2. Open Settings → Privacy | Shows "Metadata stored on server" message |
| **Privacy Screen (BYOK)** | 1. Use BYOK mode<br>2. Open Settings → Privacy | Shows "All data local" message |
| **Export Data (Login)** | 1. Login<br>2. Settings → Privacy → Export Data | ZIP created with profile, commands, history |
| **Export Data (BYOK)** | 1. BYOK mode<br>2. Settings → Privacy → Export Data | ZIP created without profile (no API keys) |
| **Sign Out** | 1. Login<br>2. Settings → Account → Sign Out | Token revoked, local data preserved, BYOK mode |
| **Sign In (from BYOK)** | 1. BYOK mode<br>2. Settings → Account → Sign In | OAuth flow works, switches to Login mode |
| **Stripe Links** | 1. Login<br>2. Click any Stripe link (Manage Subscription, View Invoice) | Browser opens correct Stripe URL |

**Model Tier Filtering Testing:**

| Scenario | Steps | Expected Result |
|----------|-------|-----------------|
| **Show All Models** | 1. Login as Free user<br>2. Open model dropdown | Shows all models (accessible + locked) |
| **Lock Icon** | 1. Free user<br>2. View model dropdown | Pro/Enterprise models show lock icon |
| **Tier Badge** | 1. Free user<br>2. View model dropdown | Each model shows tier badge (Free/Pro/Enterprise) |
| **Tooltip** | 1. Free user<br>2. Hover over locked model | Tooltip shows "Upgrade to Pro" message |
| **Disabled Selection** | 1. Free user<br>2. Click locked model | Model NOT selected (grayed out) |
| **Tier Badge in Status Bar** | 1. Login as Pro user | Status bar shows "⭐ Pro Plan" |

**Error Handling Testing:**

| Scenario | Steps | Expected Result |
|----------|-------|-----------------|
| **Generic Exception** | 1. Simulate network error<br>2. Try to use model | User-friendly error message (not technical stack trace) |
| **401 Unauthorized** | 1. Expire access token<br>2. Try to use model | Automatic token refresh OR re-login prompt |
| **403 Forbidden** | 1. Simulate insufficient credits error<br>2. Try to use model | Upgrade dialog shows |
| **429 Rate Limit** | 1. Exceed rate limit<br>2. Try to use model | Rate limit error with retry suggestion |

---

### 4.2 Acceptance Criteria (Final Checklist)

**P0 - Critical (Must Have):**

- [ ] ✅ Upgrade dialog appears when `InsufficientCreditsException` thrown
- [ ] ✅ Upgrade dialog shows accurate credit numbers
- [ ] ✅ Upgrade dialog provides 3 working options (View Plans, Buy Credits, Switch to BYOK)
- [ ] ✅ Subscription expired dialog appears on `SubscriptionExpiredException`
- [ ] ✅ Re-login prompt appears on `UnauthorizedException`
- [ ] ✅ Generic exceptions show user-friendly messages (not technical details)
- [ ] ✅ Settings → Billing screen visible ONLY in Login mode
- [ ] ✅ Settings → Usage screen visible ONLY in Login mode
- [ ] ✅ Settings → Privacy screen visible in BOTH modes (different content)
- [ ] ✅ Settings → Account screen visible in BOTH modes (different content)
- [ ] ✅ Billing screen shows current plan, payment method, and invoices
- [ ] ✅ Usage screen shows monthly usage summary
- [ ] ✅ Export Data creates ZIP with all local data
- [ ] ✅ Sign Out revokes OAuth token and preserves local data
- [ ] ✅ Sign In (from BYOK) works seamlessly
- [ ] ✅ All Stripe links open correctly in browser
- [ ] ✅ Model dropdown shows all models (locked + accessible)
- [ ] ✅ Locked models have lock icon and tier badge
- [ ] ✅ Locked models are grayed out and non-selectable
- [ ] ✅ Tooltips show upgrade messages for locked models
- [ ] ✅ Tier badge shows in status bar when logged in

**P1 - High Priority (Should Have):**

- [ ] ✅ Model tier filtering works correctly
- [ ] ✅ Tier badges use correct colors (Gray/Blue/Purple)
- [ ] ✅ Usage screen falls back to local SQLite if API unavailable
- [ ] ✅ Data retention settings apply to local history cleanup
- [ ] ✅ History Transaction screen preserved for BYOK mode
- [ ] ✅ All error scenarios logged with appropriate severity

**P2 - Nice to Have (Future):**

- [ ] ⏭️ Embedded Stripe Checkout for credit purchases (deferred)
- [ ] ⏭️ Advanced usage analytics and charts (deferred)
- [ ] ⏭️ Invoice download/PDF generation (deferred)

---

## Implementation Details

### File Structure

**New Files to Create:**

```
TextAssistant.UI/
├── Views/
│   └── Dialogs/
│       ├── UpgradeDialog.xaml                       # NEW
│       ├── UpgradeDialog.xaml.cs                    # NEW
│       ├── SubscriptionExpiredDialog.xaml           # NEW
│       └── SubscriptionExpiredDialog.xaml.cs        # NEW
│
├── ViewModels/
│   ├── Dialogs/
│   │   ├── UpgradeDialogViewModel.cs                # NEW
│   │   └── SubscriptionExpiredDialogViewModel.cs   # NEW
│   │
│   └── Settings/
│       ├── BillingSettingsViewModel.cs              # NEW
│       ├── UsageSettingsViewModel.cs                # NEW
│       ├── PrivacySettingsViewModel.cs              # NEW
│       └── AccountSettingsViewModel.cs              # NEW
│
└── Views/
    └── Settings/
        ├── BillingSettingsView.xaml                 # NEW
        ├── BillingSettingsView.xaml.cs              # NEW
        ├── UsageSettingsView.xaml                   # NEW
        ├── UsageSettingsView.xaml.cs                # NEW
        ├── PrivacySettingsView.xaml                 # NEW
        ├── PrivacySettingsView.xaml.cs              # NEW
        ├── AccountSettingsView.xaml                 # NEW
        └── AccountSettingsView.xaml.cs              # NEW

TextAssistant.Core/
├── Models/
│   ├── ExportPackage.cs                             # NEW
│   └── InvoiceViewModel.cs                          # NEW (if backend API provides invoices)
│
├── Services/
│   └── IDataExporter.cs                             # NEW
│       └── DataExporter.cs                          # NEW
│
└── Exceptions/
    └── TierRestrictionException.cs                  # NEW (optional)
```

**Files to Modify:**

```
TextAssistant.UI/
├── ViewModels/
│   ├── ContextMenuOverlayViewModel.cs               # UPDATE: Add specific exception handlers
│   ├── MainWindowV4ViewModel.cs                     # UPDATE: Add tier badge, model filtering
│   └── WelcomeScreenViewModel.cs                    # UPDATE: Add exception handlers
│
└── Views/
    └── Settings/
        └── SettingsWindow.xaml                      # UPDATE: Add Billing, Usage, Privacy, Account tabs

TextAssistant.Core/
└── Models/
    └── Model.cs                                     # UPDATE: Add RequiredTier, TierRestrictionMode, AccessStatus
```

---

### Dependency Injection Registration

**File:** `TextAssistant.UI\DependencyInjection\ServiceConfiguration.cs`

**Add to DI Container:**

```csharp
// Dialogs
services.AddTransient<UpgradeDialog>();
services.AddTransient<UpgradeDialogViewModel>();
services.AddTransient<SubscriptionExpiredDialog>();
services.AddTransient<SubscriptionExpiredDialogViewModel>();

// Settings ViewModels
services.AddTransient<BillingSettingsViewModel>();
services.AddTransient<UsageSettingsViewModel>();
services.AddTransient<PrivacySettingsViewModel>();
services.AddTransient<AccountSettingsViewModel>();

// Services
services.AddSingleton<IDataExporter, DataExporter>();
```

---

### Environment Configuration Update

**File:** `TextAssistant.Core\Models\EnvironmentConfiguration.cs`

**Add Stripe Customer Portal URL:**

```csharp
public class EnvironmentConfiguration
{
    // Existing properties
    public string AuthorizationEndpoint { get; set; }
    public string TokenEndpoint { get; set; }
    public string RevokeEndpoint { get; set; }
    public string ApiBaseUrl { get; set; }

    // NEW PROPERTIES
    public string StripeCustomerPortalUrl { get; set; }
    public string SubscriptionPageUrl { get; set; }
    public string CreditPurchasePageUrl { get; set; }
}
```

**Local Environment Example:**

```csharp
public static EnvironmentConfiguration Local => new()
{
    Name = "Local",
    AuthorizationEndpoint = "http://localhost:7151/oauth/authorize",
    TokenEndpoint = "http://localhost:7151/oauth/token",
    RevokeEndpoint = "http://localhost:7151/oauth/revoke",
    ApiBaseUrl = "http://localhost:7150",

    // NEW
    StripeCustomerPortalUrl = "https://billing.stripe.com/p/login/test_...", // Test mode portal
    SubscriptionPageUrl = "http://localhost:7052/pricing",
    CreditPurchasePageUrl = "http://localhost:7052/credits",
};
```

---

## Testing Strategy

### Unit Tests

**New Test Files:**

```
TextAssistant.Tests/
├── UI/
│   ├── UpgradeDialogViewModelTests.cs               # NEW
│   ├── BillingSettingsViewModelTests.cs             # NEW
│   ├── UsageSettingsViewModelTests.cs               # NEW
│   ├── PrivacySettingsViewModelTests.cs             # NEW
│   └── AccountSettingsViewModelTests.cs             # NEW
│
├── Core/
│   ├── DataExporterTests.cs                         # NEW
│   └── ModelTierFilteringTests.cs                   # NEW
│
└── Integration/
    ├── UpgradeFlowIntegrationTests.cs               # NEW
    └── SettingsScreenIntegrationTests.cs            # NEW
```

**Example Test:**

```csharp
public class UpgradeDialogViewModelTests
{
    [Fact]
    public void Shortfall_CalculatesCorrectly()
    {
        var viewModel = new UpgradeDialogViewModel
        {
            RequiredCredits = 5000,
            AvailableCredits = 1200
        };

        Assert.Equal(3800, viewModel.Shortfall);
    }

    [Fact]
    public async Task ViewProPlansCommand_OpensCorrectUrl()
    {
        var mockBrowserService = new Mock<IBrowserService>();
        var viewModel = new UpgradeDialogViewModel(mockBrowserService.Object);

        await viewModel.ViewProPlansCommand.ExecuteAsync(null);

        mockBrowserService.Verify(x => x.OpenUrl(It.Is<string>(url => url.Contains("pricing"))), Times.Once);
    }
}
```

---

### Integration Tests

**Scenario: Upgrade Flow End-to-End**

```csharp
public class UpgradeFlowIntegrationTests : IClassFixture<TestApplicationFixture>
{
    private readonly TestApplicationFixture _fixture;

    [Fact]
    public async Task InsufficientCredits_ShowsUpgradeDialog()
    {
        // Arrange: Setup test user with low credits
        var user = await _fixture.CreateTestUserAsync(credits: 100);
        await _fixture.LoginAsync(user);

        // Act: Trigger operation requiring 5000 credits
        var exception = await Assert.ThrowsAsync<InsufficientCreditsException>(() =>
            _fixture.ExecuteCommandAsync(requiredCredits: 5000)
        );

        // Assert: Exception has correct data
        Assert.Equal(5000, exception.RequiredCredits);
        Assert.Equal(100, exception.AvailableCredits);

        // Assert: Upgrade dialog was shown (via UI automation)
        var dialog = _fixture.FindDialog("UpgradeDialog");
        Assert.NotNull(dialog);
        Assert.Contains("5,000 credits", dialog.Content);
        Assert.Contains("100 credits", dialog.Content);
    }
}
```

---

### Manual Testing Checklist

**Pre-Launch Manual QA:**

- [ ] Test upgrade flow with real Stripe test mode
- [ ] Verify all Stripe links open correctly
- [ ] Test sign out → sign in round trip
- [ ] Test BYOK → Login mode switch
- [ ] Test Login → BYOK mode switch
- [ ] Verify data export ZIP contents
- [ ] Test all error scenarios (401, 403, 429, network errors)
- [ ] Test model tier filtering with Free/Pro/Enterprise accounts
- [ ] Verify tier badge colors and icons
- [ ] Test history retention cleanup
- [ ] Verify local history preserved after sign out

---

## Timeline & Milestones

### Week 1: Upgrade Flow Implementation

**Days 1-3: Upgrade Dialog UI**
- [ ] Create `UpgradeDialog.xaml` and ViewModel
- [ ] Implement 3 action buttons (View Plans, Buy Credits, Switch to BYOK)
- [ ] Add unit tests

**Days 4-5: Exception Handlers**
- [ ] Update `ContextMenuOverlayViewModel.cs` with specific handlers
- [ ] Update `MainWindowV4ViewModel.cs` background refresh handlers
- [ ] Add subscription expired dialog
- [ ] Add re-login prompt

**Deliverable:** Upgrade flow functional, all exceptions handled gracefully

---

### Week 2: Settings Redesign

**Days 6-8: New Settings Screens**
- [ ] Create Billing screen (Login mode only)
- [ ] Create Usage screen (Login mode only)
- [ ] Add Stripe Customer Portal integration
- [ ] Add unit tests

**Days 9-10: Privacy & Account Screens**
- [ ] Create Privacy screen (both modes, different content)
- [ ] Create Account screen (both modes, different content)
- [ ] Implement data export functionality
- [ ] Implement sign out/sign in flows
- [ ] Add unit tests

**Deliverable:** Settings screen redesign complete, all tabs functional

---

### Week 3: Model Tier Filtering

**Days 11-13: Backend API Coordination**
- [ ] Coordinate with Backend team to add tier metadata to `/v1/models` response
- [ ] Update `Model.cs` with new properties
- [ ] Update API response parsing
- [ ] Add unit tests

**Days 14-15: UI Updates**
- [ ] Update model dropdown with lock icons and tier badges
- [ ] Add tooltips for locked models
- [ ] Disable locked models in dropdown
- [ ] Add tier badge to status bar
- [ ] Add integration tests

**Deliverable:** Model tier filtering working, all models visible with tier indicators

---

### Week 4: QA & Polish

**Days 16-18: Integration Testing**
- [ ] Test all upgrade flow scenarios
- [ ] Test all settings screen scenarios
- [ ] Test model tier filtering
- [ ] Test error handling
- [ ] Test sign out/sign in flows
- [ ] Test data export

**Days 19-20: Bug Fixes & Polish**
- [ ] Fix all critical bugs
- [ ] Polish UI/UX (animations, transitions, visual feedback)
- [ ] Update documentation
- [ ] Final regression testing

**Deliverable:** Production-ready Desktop App with all critical gaps addressed

---

## Success Metrics

**Quantitative Metrics:**

- ✅ Upgrade dialog shown 100% of the time when `InsufficientCreditsException` thrown
- ✅ Upgrade conversion rate > 5% (users clicking "View Pro Plans" or "Purchase Credits")
- ✅ Sign out → Sign in round trip success rate > 95%
- ✅ Data export success rate > 98%
- ✅ All Stripe links open correctly 100% of the time
- ✅ Model tier filtering accuracy 100%
- ✅ Zero crashes or unhandled exceptions in production

**Qualitative Metrics:**

- ✅ User-friendly error messages (no technical jargon)
- ✅ Seamless Login ↔ BYOK mode switching
- ✅ Settings screen feels cohesive and professional
- ✅ Upgrade flow is clear and actionable
- ✅ Model tier filtering is intuitive (users understand why models are locked)

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Backend API delays tier metadata implementation | Medium | High | Desktop team implements mock data for testing, integrates real API later |
| Stripe Customer Portal URLs change | Low | Medium | Store URLs in environment config (easy to update) |
| User confusion with locked models | Medium | Medium | Add clear tooltips and upgrade messages, conduct UX testing |
| Data export failures | Low | High | Implement robust error handling, validate ZIP contents before completion |
| Sign out/sign in flow bugs | Medium | High | Comprehensive integration testing, automated E2E tests |
| BYOK users accidentally signing in | Low | Low | Add confirmation prompt before switching modes |

---

## Dependencies

**Backend API Team:**
- [ ] Add tier metadata to `/v1/models` response (`requiredTier`, `tierRestrictionMode`, `access_status`)
- [ ] Create usage summary endpoint `GET /api/user/usage/summary?period=current_month` (optional but recommended)
- [ ] Verify Stripe Customer Portal URLs are stable

**Desktop App Team:**
- [ ] Implement all UI components listed in this plan
- [ ] Update exception handling across all ViewModels
- [ ] Add new Settings screens
- [ ] Update model selection UI

**QA Team:**
- [ ] Create test plans for all scenarios
- [ ] Execute manual testing checklist
- [ ] Validate Stripe integration in test mode

---

## Rollout Plan

### Phase 1: Internal Beta (Week 1-2)
- Deploy to 5-10 internal testers
- Test upgrade flows with real Stripe test mode
- Gather feedback on UX

### Phase 2: Closed Beta (Week 3)
- Deploy to 50-100 beta testers
- Monitor error logs and crash reports
- Collect user feedback on upgrade flow clarity

### Phase 3: Production Release (Week 4+)
- Deploy to all users
- Monitor upgrade conversion rates
- Track support tickets related to monetization flows

---

## Appendix

### A. Backend API Endpoints Required

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/oauth/authorize` | GET | OAuth authorization | ✅ Implemented |
| `/oauth/token` | POST | Token exchange | ✅ Implemented |
| `/oauth/revoke` | POST | Token revocation | ✅ Implemented |
| `/v1/chat/completions` | POST | Chat completion | ✅ Implemented |
| `/v1/models` | GET | List models | ⚠️ Needs tier metadata |
| `/api/user/profile` | GET | User profile | ✅ Implemented |
| `/api/user/credits` | GET | Credit balance | ✅ Implemented |
| `/api/user/usage/summary` | GET | Usage summary | ❌ Optional (future) |

---

### B. Stripe Integration URLs

**Test Mode (Local/Staging):**
- Customer Portal: `https://billing.stripe.com/p/login/test_{session_id}`
- Subscription Page: `http://localhost:7052/pricing`
- Credit Purchase: `http://localhost:7052/credits`

**Production:**
- Customer Portal: `https://billing.stripe.com/p/login/{session_id}`
- Subscription Page: `https://rephlo.com/pricing`
- Credit Purchase: `https://rephlo.com/credits`

---

### C. Error Code Reference

| Error Code | HTTP Status | Exception Type | User Message | Action |
|------------|-------------|----------------|--------------|--------|
| `insufficient_credits` | 403 | `InsufficientCreditsException` | "You need {required} credits but only have {available}." | Show upgrade dialog |
| `subscription_expired` | 403 | `SubscriptionExpiredException` | "Your subscription expired on {date}. Renew to continue." | Show renewal prompt |
| `tier_restriction` | 403 | `TierRestrictionException` | "This model requires {tier} tier. Upgrade to access." | Show upgrade dialog |
| `unauthorized` | 401 | `UnauthorizedException` | "Your session has expired. Please log in again." | Show re-login prompt |
| `rate_limit_exceeded` | 429 | `RateLimitException` | "Too many requests. Please try again in {seconds} seconds." | Show retry message |

---

### D. UI Component Library (WPF UI / Lepo)

**Required Components:**
- `NavigationView` - Settings sidebar navigation
- `InfoBar` - Error/success messages
- `Button` with `Appearance` (Primary, Secondary, Danger)
- `SymbolIcon` - Lock, Checkmark, etc.
- `Border` with `CornerRadius` - Tier badges
- `ToolTip` - Model upgrade messages
- `Dialog` - Upgrade and confirmation dialogs

---

## Conclusion

This implementation plan addresses all critical gaps identified in the Desktop App's API integration. By implementing these changes, the Desktop App will be fully ready for commercial launch with:

✅ **Complete upgrade flows** - Users can upgrade when hitting limits
✅ **Subscription management** - Users can view/modify subscriptions
✅ **Model tier awareness** - Users understand tier restrictions
✅ **Data privacy** - Users can export and manage their data
✅ **Seamless BYOK support** - Offline mode preserved and enhanced

**Estimated Timeline:** 3-4 weeks to production-ready state
**Estimated Effort:** ~120-160 person-hours
**Success Criteria:** All P0 acceptance criteria met, no critical bugs, >95% upgrade flow success rate

---

**Document Version:** 1.0
**Last Updated:** 2025-11-13
**Next Review:** After Phase 1 completion (Week 2)
**Approvals Required:** Desktop App Team Lead, Product Manager, Backend API Team Lead

# Desktop Client Credit API Migration Guide

**Document ID**: 191
**Created**: 2025-01-17
**Updated**: 2025-01-17
**Status**: Active - Breaking Change
**Target Audience**: WPF Desktop Client Developers
**Technology Stack**: WPF + XAML + C# + .NET
**Related Documents**:
- `docs/reference/190-credit-deduction-flow-documentation.md`
- `docs/plan/189-credit-api-option2-implementation.md`
- `backend/src/controllers/credits.controller.ts`

---

## Table of Contents

1. [Overview](#overview)
2. [Breaking Changes Summary](#breaking-changes-summary)
3. [Old vs New Response Structure](#old-vs-new-response-structure)
4. [Migration Steps](#migration-steps)
5. [C# Type Definitions](#c-type-definitions)
6. [UI Display Recommendations](#ui-display-recommendations)
7. [Testing Checklist](#testing-checklist)
8. [Rollback Plan](#rollback-plan)

---

## Overview

### What Changed?

The **`GET /api/user/credits`** endpoint response structure has been updated to implement **Plan 189: Split Subscription vs Purchased Credits API**.

**Purpose**: Provide clearer distinction between:
- **Subscription Credits**: Monthly allocated credits from subscription tier (Pro, Pro+, etc.) that reset monthly
- **Purchased Addon Credits**: One-time purchased credit packs that never reset (permanent until used)

### Impact Level

🔴 **BREAKING CHANGE** - Requires mandatory Desktop client update

**Affected Endpoint**: `GET /api/user/credits`

**Effective Date**: 2025-01-17 (Backend deployment)

**Desktop Client Deadline**: Must update before backend deployment to production

---

## Breaking Changes Summary

### ❌ Removed Field

| Field Name | Description | Replacement |
|------------|-------------|-------------|
| `proCredits` | Combined subscription + purchased credits | Split into `subscriptionCredits` and `purchasedCredits` |

### ✅ New Fields

| Field Name | Type | Description |
|------------|------|-------------|
| `subscriptionCredits` | Object | Monthly credits from subscription tier (Pro: 1500, Pro+: 5000, etc.) |
| `subscriptionCredits.remaining` | number | Remaining subscription credits |
| `subscriptionCredits.monthlyAllocation` | number | Monthly allocation from tier |
| `subscriptionCredits.used` | number | Used subscription credits |
| `subscriptionCredits.resetDate` | string (ISO 8601) | Next monthly reset date |
| `subscriptionCredits.daysUntilReset` | number | Days until reset |
| `purchasedCredits` | Object | One-time purchased credit packs (no reset) |
| `purchasedCredits.remaining` | number | Remaining purchased credits |
| `purchasedCredits.totalPurchased` | number | Total purchased credits (lifetime) |
| `purchasedCredits.lifetimeUsed` | number | Lifetime used purchased credits |

### 🔄 Changed Fields

| Field Name | Old Behavior | New Behavior |
|------------|--------------|--------------|
| `totalAvailable` | Sum of free + pro credits | Sum of free + subscription + purchased credits |

---

## Old vs New Response Structure

### Old Response (Before Plan 189) ❌

```json
{
  "freeCredits": {
    "remaining": 200,
    "monthlyAllocation": 200,
    "used": 0,
    "resetDate": "2025-02-01T00:00:00Z",
    "daysUntilReset": 15
  },
  "proCredits": {
    "remaining": 6500,              // ❌ MISLEADING: Mixed subscription + purchased
    "purchasedTotal": 11500,        // ❌ MISLEADING: Includes subscription allocation
    "lifetimeUsed": 5000
  },
  "totalAvailable": 6700,
  "lastUpdated": "2025-01-17T14:30:00Z"
}
```

**Problem with Old Structure**:
- `proCredits.purchasedTotal` included monthly subscription credits (1500) + purchased credits (10000) = 11500
- Users with Pro tier but no purchased credits showed `purchasedTotal: 1500`, implying they purchased credits
- No way to distinguish subscription credits (reset monthly) from purchased credits (permanent)

### New Response (Plan 189) ✅

```json
{
  "freeCredits": {
    "remaining": 200,
    "monthlyAllocation": 200,
    "used": 0,
    "resetDate": "2025-02-01T00:00:00Z",
    "daysUntilReset": 15
  },
  "subscriptionCredits": {           // ✅ NEW: Monthly credits from Pro tier
    "remaining": 1500,
    "monthlyAllocation": 1500,
    "used": 0,
    "resetDate": "2025-02-01T00:00:00Z",
    "daysUntilReset": 15
  },
  "purchasedCredits": {              // ✅ NEW: Purchased credit packs only
    "remaining": 5000,
    "totalPurchased": 10000,         // ✅ ACCURATE: Only purchased credits
    "lifetimeUsed": 5000
  },
  "totalAvailable": 6700,            // 200 + 1500 + 5000
  "lastUpdated": "2025-01-17T14:30:00Z"
}
```

**Clarity Improvements**:
- ✅ `subscriptionCredits` clearly shows monthly tier allocation
- ✅ `purchasedCredits.totalPurchased` only includes one-time purchases
- ✅ Both credit types show reset behavior (subscription resets, purchased doesn't)
- ✅ User with Pro tier and no purchases shows `purchasedCredits.totalPurchased: 0`

---

## Migration Steps

### Step 1: Update C# Data Models

**File**: `Models/CreditModels.cs` (or equivalent)

```csharp
using System;
using Newtonsoft.Json;

namespace RephloDesktop.Models
{
    // OLD MODEL (Delete or deprecate)
    [Obsolete("Use CreditResponse instead")]
    public class OldCreditResponse
    {
        [JsonProperty("freeCredits")]
        public FreeCreditsInfo FreeCredits { get; set; }

        [JsonProperty("proCredits")]  // ❌ OLD: Combined credits
        public OldProCreditsInfo ProCredits { get; set; }

        [JsonProperty("totalAvailable")]
        public int TotalAvailable { get; set; }

        [JsonProperty("lastUpdated")]
        public DateTime LastUpdated { get; set; }
    }

    [Obsolete("Use SubscriptionCreditsInfo and PurchasedCreditsInfo instead")]
    public class OldProCreditsInfo
    {
        [JsonProperty("remaining")]
        public int Remaining { get; set; }

        [JsonProperty("purchasedTotal")]
        public int PurchasedTotal { get; set; }

        [JsonProperty("lifetimeUsed")]
        public int LifetimeUsed { get; set; }
    }

    // NEW MODEL (Implement)
    public class CreditResponse
    {
        [JsonProperty("freeCredits")]
        public FreeCreditsInfo FreeCredits { get; set; }

        [JsonProperty("subscriptionCredits")]  // ✅ NEW: Monthly subscription credits
        public SubscriptionCreditsInfo SubscriptionCredits { get; set; }

        [JsonProperty("purchasedCredits")]  // ✅ NEW: One-time purchased credits
        public PurchasedCreditsInfo PurchasedCredits { get; set; }

        [JsonProperty("totalAvailable")]
        public int TotalAvailable { get; set; }

        [JsonProperty("lastUpdated")]
        public DateTime LastUpdated { get; set; }
    }

    /// <summary>
    /// Free credits breakdown
    /// Monthly allocated credits for free tier (200 credits/month)
    /// </summary>
    public class FreeCreditsInfo
    {
        /// <summary>Remaining free credits</summary>
        [JsonProperty("remaining")]
        public int Remaining { get; set; }

        /// <summary>Monthly allocation (200 for free tier)</summary>
        [JsonProperty("monthlyAllocation")]
        public int MonthlyAllocation { get; set; }

        /// <summary>Used free credits this month</summary>
        [JsonProperty("used")]
        public int Used { get; set; }

        /// <summary>Next reset date (ISO 8601 string)</summary>
        [JsonProperty("resetDate")]
        public DateTime ResetDate { get; set; }

        /// <summary>Days until next reset</summary>
        [JsonProperty("daysUntilReset")]
        public int DaysUntilReset { get; set; }
    }

    /// <summary>
    /// Subscription credits breakdown
    /// Monthly allocated credits from subscription tier (Pro: 1500, Pro+: 5000, etc.)
    /// These credits reset every month
    /// </summary>
    public class SubscriptionCreditsInfo
    {
        /// <summary>Remaining subscription credits</summary>
        [JsonProperty("remaining")]
        public int Remaining { get; set; }

        /// <summary>Monthly allocation from tier (Pro: 1500, Pro+: 5000, Pro Max: 25000)</summary>
        [JsonProperty("monthlyAllocation")]
        public int MonthlyAllocation { get; set; }

        /// <summary>Used subscription credits this month</summary>
        [JsonProperty("used")]
        public int Used { get; set; }

        /// <summary>Next reset date (ISO 8601 string, same as billing period end)</summary>
        [JsonProperty("resetDate")]
        public DateTime ResetDate { get; set; }

        /// <summary>Days until next reset</summary>
        [JsonProperty("daysUntilReset")]
        public int DaysUntilReset { get; set; }
    }

    /// <summary>
    /// Purchased addon credits breakdown
    /// One-time purchased credit packs that never reset (permanent until used)
    /// </summary>
    public class PurchasedCreditsInfo
    {
        /// <summary>Remaining purchased credits</summary>
        [JsonProperty("remaining")]
        public int Remaining { get; set; }

        /// <summary>Total purchased credits (lifetime, all credit pack purchases)</summary>
        [JsonProperty("totalPurchased")]
        public int TotalPurchased { get; set; }

        /// <summary>Lifetime used purchased credits</summary>
        [JsonProperty("lifetimeUsed")]
        public int LifetimeUsed { get; set; }
    }

    /// <summary>
    /// Helper class for credit breakdown display
    /// </summary>
    public class CreditBreakdown
    {
        public int Free { get; set; }
        public int Subscription { get; set; }
        public int Purchased { get; set; }
        public int Total { get; set; }
    }
}
```

### Step 2: Update API Service

**File**: `Services/CreditService.cs` (or equivalent)

```csharp
using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using Newtonsoft.Json;
using RephloDesktop.Models;

namespace RephloDesktop.Services
{
    public class CreditService
    {
        private readonly HttpClient _httpClient;
        private readonly string _baseUrl = "http://localhost:7150"; // or production URL

        public CreditService(HttpClient httpClient)
        {
            _httpClient = httpClient;
        }

        // OLD CODE ❌
        [Obsolete("Use FetchCreditsAsync() instead")]
        public async Task<OldCreditResponse> FetchCreditsOldAsync(string accessToken)
        {
            _httpClient.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", accessToken);

            var response = await _httpClient.GetAsync($"{_baseUrl}/api/user/credits");
            response.EnsureSuccessStatusCode();

            var json = await response.Content.ReadAsStringAsync();
            return JsonConvert.DeserializeObject<OldCreditResponse>(json);
        }

        // NEW CODE ✅
        public async Task<CreditResponse> FetchCreditsAsync(string accessToken)
        {
            _httpClient.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", accessToken);

            var response = await _httpClient.GetAsync($"{_baseUrl}/api/user/credits");
            response.EnsureSuccessStatusCode();

            var json = await response.Content.ReadAsStringAsync();
            var credits = JsonConvert.DeserializeObject<CreditResponse>(json);

            return credits;
        }

        // Helper: Get credit breakdown for display
        public CreditBreakdown GetCreditBreakdown(CreditResponse credits)
        {
            return new CreditBreakdown
            {
                Free = credits.FreeCredits.Remaining,
                Subscription = credits.SubscriptionCredits.Remaining,
                Purchased = credits.PurchasedCredits.Remaining,
                Total = credits.TotalAvailable
            };
        }

        // Helper: Check if user has purchased credits
        public bool HasPurchasedCredits(CreditResponse credits)
        {
            return credits.PurchasedCredits.TotalPurchased > 0;
        }

        // Helper: Get monthly allocation (free + subscription)
        public int GetMonthlyAllocation(CreditResponse credits)
        {
            return credits.FreeCredits.MonthlyAllocation +
                   credits.SubscriptionCredits.MonthlyAllocation;
        }

        // Helper: Check if user has enough credits
        public bool HasEnoughCredits(CreditResponse credits, int required)
        {
            return credits.TotalAvailable >= required;
        }
    }
}
```

### Step 3: Update ViewModel (MVVM Pattern)

**File**: `ViewModels/CreditViewModel.cs`

```csharp
using System;
using System.ComponentModel;
using System.Runtime.CompilerServices;
using System.Threading.Tasks;
using System.Windows.Input;
using RephloDesktop.Models;
using RephloDesktop.Services;

namespace RephloDesktop.ViewModels
{
    public class CreditViewModel : INotifyPropertyChanged
    {
        private readonly CreditService _creditService;
        private readonly string _accessToken;
        private CreditResponse _credits;

        public CreditViewModel(CreditService creditService, string accessToken)
        {
            _creditService = creditService;
            _accessToken = accessToken;
            RefreshCommand = new RelayCommand(async () => await RefreshCreditsAsync());
        }

        // Properties for data binding
        public CreditResponse Credits
        {
            get => _credits;
            set
            {
                _credits = value;
                OnPropertyChanged();
                OnPropertyChanged(nameof(TotalCredits));
                OnPropertyChanged(nameof(FreeRemaining));
                OnPropertyChanged(nameof(SubscriptionRemaining));
                OnPropertyChanged(nameof(PurchasedRemaining));
                OnPropertyChanged(nameof(HasPurchasedCredits));
                OnPropertyChanged(nameof(HasSubscriptionCredits));
                OnPropertyChanged(nameof(DaysUntilReset));
                OnPropertyChanged(nameof(ResetDateFormatted));
            }
        }

        public int TotalCredits => Credits?.TotalAvailable ?? 0;
        public int FreeRemaining => Credits?.FreeCredits.Remaining ?? 0;
        public int SubscriptionRemaining => Credits?.SubscriptionCredits.Remaining ?? 0;
        public int PurchasedRemaining => Credits?.PurchasedCredits.Remaining ?? 0;

        public bool HasPurchasedCredits => Credits?.PurchasedCredits.TotalPurchased > 0;
        public bool HasSubscriptionCredits => Credits?.SubscriptionCredits.MonthlyAllocation > 0;

        public int DaysUntilReset => Credits?.SubscriptionCredits.DaysUntilReset ?? 0;
        public string ResetDateFormatted => Credits?.SubscriptionCredits.ResetDate.ToString("MMM dd, yyyy") ?? "";

        public ICommand RefreshCommand { get; }

        public async Task RefreshCreditsAsync()
        {
            try
            {
                Credits = await _creditService.FetchCreditsAsync(_accessToken);
            }
            catch (Exception ex)
            {
                // Handle error (show message box, log, etc.)
                System.Diagnostics.Debug.WriteLine($"Error fetching credits: {ex.Message}");
            }
        }

        public event PropertyChangedEventHandler PropertyChanged;

        protected void OnPropertyChanged([CallerMemberName] string propertyName = null)
        {
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
        }
    }

    // Simple RelayCommand implementation
    public class RelayCommand : ICommand
    {
        private readonly Func<Task> _execute;
        private readonly Func<bool> _canExecute;

        public RelayCommand(Func<Task> execute, Func<bool> canExecute = null)
        {
            _execute = execute;
            _canExecute = canExecute;
        }

        public bool CanExecute(object parameter) => _canExecute?.Invoke() ?? true;
        public async void Execute(object parameter) => await _execute();
        public event EventHandler CanExecuteChanged;
    }
}
```

### Step 4: Update XAML UI

**File**: `Views/CreditDisplayView.xaml`

**OLD XAML ❌**

```xml
<UserControl x:Class="RephloDesktop.Views.CreditDisplayView"
             xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
             xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml">
    <StackPanel Margin="20">
        <!-- Old structure -->
        <TextBlock Text="Free Credits" FontSize="18" FontWeight="Bold"/>
        <TextBlock>
            <Run Text="Remaining: "/>
            <Run Text="{Binding Credits.FreeCredits.Remaining}"/>
        </TextBlock>

        <!-- ❌ OLD: Combined "Pro Credits" section -->
        <TextBlock Text="Pro Credits" FontSize="18" FontWeight="Bold" Margin="0,20,0,0"/>
        <TextBlock>
            <Run Text="Remaining: "/>
            <Run Text="{Binding Credits.ProCredits.Remaining}"/>
        </TextBlock>
        <TextBlock>
            <Run Text="Total Purchased: "/>
            <Run Text="{Binding Credits.ProCredits.PurchasedTotal}"/>
            <!-- ❌ PROBLEM: Misleading label -->
        </TextBlock>
    </StackPanel>
</UserControl>
```

**NEW XAML ✅**

```xml
<UserControl x:Class="RephloDesktop.Views.CreditDisplayView"
             xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
             xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
             xmlns:local="clr-namespace:RephloDesktop.Views">
    <StackPanel Margin="20" Background="#F9FAFB">
        <!-- Header -->
        <Border Background="#1E40AF" Padding="20" CornerRadius="8,8,0,0">
            <StackPanel>
                <TextBlock Text="Credit Balance"
                           FontSize="20"
                           FontWeight="Bold"
                           Foreground="White"/>
                <TextBlock FontSize="32"
                           FontWeight="Bold"
                           Foreground="White"
                           Margin="0,10,0,0">
                    <Run Text="{Binding TotalCredits, StringFormat=N0}"/>
                    <Run Text=" credits" FontSize="16"/>
                </TextBlock>
            </StackPanel>
        </Border>

        <!-- Free Credits Section -->
        <Border Background="White"
                Padding="20"
                BorderBrush="#E5E7EB"
                BorderThickness="0,1,0,1">
            <StackPanel>
                <TextBlock Text="📅 Free Credits (Monthly)"
                           FontSize="16"
                           FontWeight="SemiBold"/>
                <StackPanel Orientation="Horizontal" Margin="0,10,0,0">
                    <TextBlock>
                        <Run Text="{Binding FreeRemaining, StringFormat=N0}"/>
                        <Run Text=" / "/>
                        <Run Text="{Binding Credits.FreeCredits.MonthlyAllocation, StringFormat=N0}"/>
                    </TextBlock>
                </StackPanel>
                <ProgressBar Value="{Binding FreeRemaining}"
                             Maximum="{Binding Credits.FreeCredits.MonthlyAllocation}"
                             Height="8"
                             Margin="0,5,0,0"
                             Foreground="#3B82F6"/>
                <TextBlock Margin="0,5,0,0"
                           FontSize="12"
                           Foreground="#6B7280">
                    <Run Text="Resets in "/>
                    <Run Text="{Binding Credits.FreeCredits.DaysUntilReset}"/>
                    <Run Text=" days"/>
                </TextBlock>
            </StackPanel>
        </Border>

        <!-- Subscription Credits Section (conditionally visible) -->
        <Border Background="White"
                Padding="20"
                BorderBrush="#E5E7EB"
                BorderThickness="0,0,0,1"
                Visibility="{Binding HasSubscriptionCredits, Converter={StaticResource BoolToVisibility}}">
            <StackPanel>
                <TextBlock Text="📅 Subscription Credits (Monthly)"
                           FontSize="16"
                           FontWeight="SemiBold"/>
                <StackPanel Orientation="Horizontal" Margin="0,10,0,0">
                    <TextBlock>
                        <Run Text="{Binding SubscriptionRemaining, StringFormat=N0}"/>
                        <Run Text=" / "/>
                        <Run Text="{Binding Credits.SubscriptionCredits.MonthlyAllocation, StringFormat=N0}"/>
                    </TextBlock>
                </StackPanel>
                <ProgressBar Value="{Binding SubscriptionRemaining}"
                             Maximum="{Binding Credits.SubscriptionCredits.MonthlyAllocation}"
                             Height="8"
                             Margin="0,5,0,0"
                             Foreground="#8B5CF6"/>
                <TextBlock Margin="0,5,0,0"
                           FontSize="12"
                           Foreground="#6B7280">
                    <Run Text="Resets in "/>
                    <Run Text="{Binding DaysUntilReset}"/>
                    <Run Text=" days on "/>
                    <Run Text="{Binding ResetDateFormatted}"/>
                </TextBlock>
            </StackPanel>
        </Border>

        <!-- Purchased Credits Section (conditionally visible) -->
        <Border Background="White"
                Padding="20"
                BorderBrush="#E5E7EB"
                BorderThickness="0,0,0,1"
                Visibility="{Binding HasPurchasedCredits, Converter={StaticResource BoolToVisibility}}">
            <StackPanel>
                <TextBlock Text="🛒 Purchased Credits (Permanent)"
                           FontSize="16"
                           FontWeight="SemiBold"/>
                <Grid Margin="0,10,0,0">
                    <Grid.ColumnDefinitions>
                        <ColumnDefinition Width="Auto"/>
                        <ColumnDefinition Width="*"/>
                    </Grid.ColumnDefinitions>
                    <Grid.RowDefinitions>
                        <RowDefinition Height="Auto"/>
                        <RowDefinition Height="Auto"/>
                        <RowDefinition Height="Auto"/>
                    </Grid.RowDefinitions>

                    <TextBlock Grid.Row="0" Grid.Column="0" Text="Remaining:" Margin="0,0,10,5"/>
                    <TextBlock Grid.Row="0" Grid.Column="1" FontWeight="SemiBold">
                        <Run Text="{Binding PurchasedRemaining, StringFormat=N0}"/>
                    </TextBlock>

                    <TextBlock Grid.Row="1" Grid.Column="0" Text="Total Purchased:" Margin="0,0,10,5"/>
                    <TextBlock Grid.Row="1" Grid.Column="1">
                        <Run Text="{Binding Credits.PurchasedCredits.TotalPurchased, StringFormat=N0}"/>
                    </TextBlock>

                    <TextBlock Grid.Row="2" Grid.Column="0" Text="Lifetime Used:" Margin="0,0,10,5"/>
                    <TextBlock Grid.Row="2" Grid.Column="1">
                        <Run Text="{Binding Credits.PurchasedCredits.LifetimeUsed, StringFormat=N0}"/>
                    </TextBlock>
                </Grid>
                <ProgressBar Value="{Binding Credits.PurchasedCredits.LifetimeUsed}"
                             Maximum="{Binding Credits.PurchasedCredits.TotalPurchased}"
                             Height="8"
                             Margin="0,10,0,0"
                             Foreground="#10B981"/>
            </StackPanel>
        </Border>

        <!-- Action Buttons -->
        <Border Background="White" Padding="20" CornerRadius="0,0,8,8">
            <StackPanel Orientation="Horizontal" HorizontalAlignment="Center">
                <Button Content="Purchase More Credits"
                        Padding="15,8"
                        Margin="5"
                        Background="#10B981"
                        Foreground="White"
                        BorderThickness="0"
                        Cursor="Hand"/>
                <Button Content="Upgrade Subscription"
                        Padding="15,8"
                        Margin="5"
                        Background="#8B5CF6"
                        Foreground="White"
                        BorderThickness="0"
                        Cursor="Hand"
                        Visibility="{Binding HasSubscriptionCredits, Converter={StaticResource InverseBoolToVisibility}}"/>
            </StackPanel>
        </Border>

        <!-- Last Updated -->
        <TextBlock Text="{Binding Credits.LastUpdated, StringFormat='Last updated: {0:g}'}"
                   FontSize="11"
                   Foreground="#9CA3AF"
                   Margin="20,10,20,0"
                   HorizontalAlignment="Center"/>
    </StackPanel>
</UserControl>
```

**Add BoolToVisibilityConverter to App.xaml Resources:**

```xml
<Application.Resources>
    <BooleanToVisibilityConverter x:Key="BoolToVisibility"/>
    <local:InverseBooleanToVisibilityConverter x:Key="InverseBoolToVisibility"/>
</Application.Resources>
```

**Converter class:**

```csharp
using System;
using System.Globalization;
using System.Windows;
using System.Windows.Data;

namespace RephloDesktop.Converters
{
    public class InverseBooleanToVisibilityConverter : IValueConverter
    {
        public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
        {
            if (value is bool boolValue)
            {
                return boolValue ? Visibility.Collapsed : Visibility.Visible;
            }
            return Visibility.Visible;
        }

        public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
        {
            throw new NotImplementedException();
        }
    }
}
```

### Step 5: Update Credit Check Logic

**File**: `Utils/CreditCheckHelper.cs`

```csharp
using RephloDesktop.Models;

namespace RephloDesktop.Utils
{
    public static class CreditCheckHelper
    {
        /// <summary>
        /// Check if user has enough credits for a request
        /// </summary>
        public static bool HasEnoughCredits(CreditResponse credits, int required)
        {
            return credits.TotalAvailable >= required;
        }

        /// <summary>
        /// Get available credits total
        /// </summary>
        public static int GetAvailableCredits(CreditResponse credits)
        {
            return credits.TotalAvailable;
        }

        /// <summary>
        /// Get credit breakdown for display
        /// </summary>
        public static CreditBreakdown GetCreditBreakdown(CreditResponse credits)
        {
            return new CreditBreakdown
            {
                Free = credits.FreeCredits.Remaining,
                Subscription = credits.SubscriptionCredits.Remaining,
                Purchased = credits.PurchasedCredits.Remaining,
                Total = credits.TotalAvailable
            };
        }

        /// <summary>
        /// Check if user has purchased credits
        /// </summary>
        public static bool HasPurchasedCredits(CreditResponse credits)
        {
            return credits.PurchasedCredits.TotalPurchased > 0;
        }

        /// <summary>
        /// Get monthly allocation (free + subscription)
        /// </summary>
        public static int GetMonthlyAllocation(CreditResponse credits)
        {
            return credits.FreeCredits.MonthlyAllocation +
                   credits.SubscriptionCredits.MonthlyAllocation;
        }

        /// <summary>
        /// Check if credits are running low (less than 100)
        /// </summary>
        public static bool IsLowOnCredits(CreditResponse credits)
        {
            return credits.TotalAvailable < 100;
        }

        /// <summary>
        /// Check if credits reset soon (within 3 days)
        /// </summary>
        public static bool ResetsWithinThreeDays(CreditResponse credits)
        {
            return credits.SubscriptionCredits.DaysUntilReset <= 3;
        }
    }
}
```

---

## C# Type Definitions

### Complete Type Definition Package

See **Step 1** above for the complete `CreditModels.cs` file with all type definitions.

**Key Classes**:
- `CreditResponse` - Main API response class
- `FreeCreditsInfo` - Free tier credits (200/month)
- `SubscriptionCreditsInfo` - Subscription credits (Pro: 1500, Pro+: 5000)
- `PurchasedCreditsInfo` - Purchased credit packs (permanent)
- `CreditBreakdown` - Helper for display logic

---

## UI Display Recommendations

### Recommended UI Layout

```
┌─────────────────────────────────────────────────────┐
│ Credit Balance                                      │
├─────────────────────────────────────────────────────┤
│ Total Available: 6,700 credits                      │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                     │
│ 📅 Monthly Credits (Resets in 15 days)             │
│ ┌─────────────────────────────────────────────┐   │
│ │ Free Tier:          200 / 200   [████████] │   │
│ │ Pro Subscription: 1,500 / 1,500 [████████] │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ 🛒 Purchased Credits (Permanent)                   │
│ ┌─────────────────────────────────────────────┐   │
│ │ Remaining: 5,000                            │   │
│ │ Total Purchased: 10,000                     │   │
│ │ Lifetime Used: 5,000    [████░░░░]         │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ [Purchase More Credits]  [Upgrade Subscription]    │
└─────────────────────────────────────────────────────┘
```

**Note**: Hide "Purchased Credits (Permanent)" section if `TotalPurchased = 0`.

### WPF Status Bar Widget

**File**: `Views/CreditStatusBarWidget.xaml`

```xml
<UserControl x:Class="RephloDesktop.Views.CreditStatusBarWidget"
             xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
             xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml">
    <Border Background="#F3F4F6"
            BorderBrush="#D1D5DB"
            BorderThickness="1"
            CornerRadius="4"
            Padding="8,4">
        <StackPanel Orientation="Horizontal">
            <TextBlock Text="💳" Margin="0,0,5,0"/>
            <TextBlock FontWeight="SemiBold" Foreground="{Binding CreditColor}">
                <Run Text="{Binding TotalCredits, StringFormat=N0}"/>
                <Run Text=" credits" FontSize="11"/>
            </TextBlock>
            <TextBlock Text="•" Margin="5,0" Foreground="#9CA3AF"/>
            <TextBlock FontSize="11" Foreground="#6B7280">
                <Run Text="Resets in "/>
                <Run Text="{Binding DaysUntilReset}"/>
                <Run Text="d"/>
            </TextBlock>
        </StackPanel>
    </Border>
</UserControl>
```

**Code-behind:**

```csharp
public partial class CreditStatusBarWidget : UserControl
{
    public CreditStatusBarWidget()
    {
        InitializeComponent();
    }

    public int TotalCredits
    {
        get => (int)GetValue(TotalCreditsProperty);
        set => SetValue(TotalCreditsProperty, value);
    }

    public static readonly DependencyProperty TotalCreditsProperty =
        DependencyProperty.Register("TotalCredits", typeof(int), typeof(CreditStatusBarWidget));

    public int DaysUntilReset
    {
        get => (int)GetValue(DaysUntilResetProperty);
        set => SetValue(DaysUntilResetProperty, value);
    }

    public static readonly DependencyProperty DaysUntilResetProperty =
        DependencyProperty.Register("DaysUntilReset", typeof(int), typeof(CreditStatusBarWidget));

    public Brush CreditColor
    {
        get
        {
            if (TotalCredits < 100)
                return new SolidColorBrush(Color.FromRgb(239, 68, 68)); // Red
            else if (TotalCredits < 500)
                return new SolidColorBrush(Color.FromRgb(251, 146, 60)); // Orange
            else
                return new SolidColorBrush(Color.FromRgb(34, 197, 94)); // Green
        }
    }
}
```

### UX Copy Recommendations

| Scenario | Recommended Copy |
|----------|------------------|
| **User has only free credits** | "You're on the Free tier with 200 credits/month. Upgrade to Pro for 1,500 credits/month." |
| **User has subscription credits, no purchased** | "You have 1,500 Pro credits that reset monthly on Feb 1st. Purchase credit packs for permanent credits." |
| **User has purchased credits** | "You have 5,000 permanent credits from credit pack purchases. These never expire." |
| **User low on credits** | "You're running low on credits (150 remaining). Consider purchasing a credit pack or upgrading your plan." |
| **Credits reset soon** | "Your monthly credits reset in 2 days. Use them before Feb 1st or they'll be lost!" |

---

## Testing Checklist

### Unit Tests

- [ ] **Model Deserialization**: Verify `CreditResponse` correctly deserializes from JSON
- [ ] **Helper Methods**: Test `CreditCheckHelper` methods with various credit scenarios
- [ ] **ViewModel Properties**: Test computed properties update when Credits changes

### Integration Tests

- [ ] **API Client**: Verify `CreditService.FetchCreditsAsync()` correctly calls endpoint and parses response
- [ ] **ViewModel Integration**: Verify `CreditViewModel` correctly updates when credits refresh
- [ ] **UI Binding**: Verify XAML bindings display correct values

### E2E Tests (Manual Testing Scenarios)

Test with different user scenarios:

#### Scenario 1: Free Tier User (No Subscription, No Purchases)
```json
{
  "freeCredits": { "remaining": 200, "monthlyAllocation": 200, ... },
  "subscriptionCredits": { "remaining": 0, "monthlyAllocation": 0, ... },
  "purchasedCredits": { "remaining": 0, "totalPurchased": 0, ... },
  "totalAvailable": 200
}
```

**Expected UI**:
- Show only "Free Credits" section
- Hide "Subscription Credits" section (`HasSubscriptionCredits = false`)
- Hide "Purchased Credits" section (`HasPurchasedCredits = false`)
- Show "Upgrade to Pro" button

#### Scenario 2: Pro Tier User (No Purchases)
```json
{
  "freeCredits": { "remaining": 200, "monthlyAllocation": 200, ... },
  "subscriptionCredits": { "remaining": 1500, "monthlyAllocation": 1500, ... },
  "purchasedCredits": { "remaining": 0, "totalPurchased": 0, ... },
  "totalAvailable": 1700
}
```

**Expected UI**:
- Show "Free Credits" section
- Show "Subscription Credits" section with Pro tier allocation
- Hide "Purchased Credits" section
- Show "Purchase Credit Packs" button

#### Scenario 3: Pro Tier User with Purchased Credits
```json
{
  "freeCredits": { "remaining": 200, "monthlyAllocation": 200, ... },
  "subscriptionCredits": { "remaining": 1500, "monthlyAllocation": 1500, ... },
  "purchasedCredits": { "remaining": 5000, "totalPurchased": 10000, ... },
  "totalAvailable": 6700
}
```

**Expected UI**:
- Show all three credit sections
- Clearly distinguish monthly vs permanent credits
- Show reset date for free/subscription, no reset for purchased

### Manual Testing Checklist

- [ ] Verify credit display matches backend response
- [ ] Verify total calculation: `totalAvailable = free + subscription + purchased`
- [ ] Verify reset dates are correctly formatted and localized
- [ ] Verify "days until reset" countdown updates correctly
- [ ] Verify purchased credits section hidden when `totalPurchased = 0`
- [ ] Verify subscription credits section hidden when `monthlyAllocation = 0`
- [ ] Test with different system cultures (en-US, de-DE, etc.)
- [ ] Test with large credit amounts (10,000+) for number formatting
- [ ] Test credit depletion flow (make LLM requests until credits low)
- [ ] Test credit purchase flow (verify purchased credits appear immediately)

---

## Rollback Plan

### If Desktop Client Cannot Update in Time

**Option 1: Backend Compatibility Layer (Temporary)**

Add backwards-compatible response to backend (see Migration Guide section 8).

**Desktop Client Change** (add header to HttpClient):

```csharp
_httpClient.DefaultRequestHeaders.Add("X-API-Version", "v1");  // Request old format
```

**Deprecation Timeline**:
- Week 1-2: Deploy backend with compatibility layer
- Week 3-4: Update Desktop client to new format
- Week 5: Remove compatibility layer from backend

### If Backend Deployment Needs Rollback

1. **Revert backend code** to commit before Plan 189 changes
2. **Restore database seed script** to old `seedCredits()` version
3. **Re-seed test database** with `npm run db:reset`
4. **Verify API response** matches old format
5. **Notify Desktop team** of rollback

---

## FAQ

### Q1: What happens to existing credit balances during migration?

**A**: No user data is lost. The backend database was updated to properly link credits to subscriptions using the `subscription_id` foreign key. All existing credits are correctly classified as either:
- Subscription credits (if `subscription_id` is not NULL)
- Purchased credits (if `subscription_id` is NULL)

### Q2: Will the `totalAvailable` value change?

**A**: No, `totalAvailable` remains the same calculation: `free + subscription + purchased`. The only change is that the breakdown is now more detailed.

### Q3: Do we need to update OAuth token enhancement endpoint?

**A**: Yes, the `/auth/oauth/enhance-token` endpoint was also updated to match the new structure. If your Desktop client uses this endpoint to get credit data in OAuth tokens, you must update that code path as well.

**Updated Endpoint**: `GET /auth/oauth/enhance-token`

**New Response Structure**:
```json
{
  "user": { ... },
  "credits": {
    "freeCredits": { ... },
    "subscriptionCredits": { ... },
    "purchasedCredits": { ... },
    "totalAvailable": 6700
  }
}
```

### Q4: How do we handle users with zero subscription credits?

**A**: Users on the Free tier will have:
```json
{
  "subscriptionCredits": {
    "remaining": 0,
    "monthlyAllocation": 0,
    "used": 0,
    "resetDate": "2025-02-01T00:00:00Z",
    "daysUntilReset": 15
  }
}
```

**Recommended UI**: Hide the "Subscription Credits" section entirely when `monthlyAllocation = 0` using the `Visibility` binding.

### Q5: How should we display credit consumption order?

**A**: The backend deducts credits in this order (per Plan 189):
1. Free credits first
2. Subscription credits second
3. Purchased credits last

**Recommended UI**: Show this priority in tooltips or help text: "Credits are used in this order: Free → Subscription → Purchased"

---

## Support & Questions

**Backend Team Contact**: backend-team@rephlo.ai

**Documentation**:
- Full Credit Deduction Flow: `docs/reference/190-credit-deduction-flow-documentation.md`
- Plan 189 Spec: `docs/plan/189-credit-api-option2-implementation.md`
- API Standards: `docs/reference/156-api-standards.md`

**Code References**:
- Backend Controller: `backend/src/controllers/credits.controller.ts` (line 288)
- Backend Service: `backend/src/services/credit.service.ts` (line 535)
- Type Definitions: `backend/src/interfaces/services/credit.interface.ts` (line 22)

**Test API Endpoint**: `GET https://api-dev.rephlo.ai/api/user/credits` (requires valid OAuth token)

---

**Document Version**: 2.0
**Last Updated**: 2025-01-17
**Technology Stack**: WPF + XAML + C# + .NET
**Maintained By**: Backend Team
**Review Cycle**: After each Desktop client release

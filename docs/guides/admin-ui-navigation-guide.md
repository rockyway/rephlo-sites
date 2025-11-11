# Admin UI Navigation Guide

**Document ID**: DOC-ADMIN-NAV-001
**Version**: 2.0
**Last Updated**: 2025-11-11
**Applies To**: Plan 131 Implementation (Phases 1-5)

---

## Overview

This guide explains the Rephlo Admin UI navigation structure, including the nested sidebar navigation, breadcrumbs system, and how to navigate efficiently through all admin pages.

---

## Table of Contents

1. [Navigation Structure](#navigation-structure)
2. [Sidebar Navigation](#sidebar-navigation)
3. [Breadcrumbs](#breadcrumbs)
4. [Keyboard Navigation](#keyboard-navigation)
5. [Mobile Navigation](#mobile-navigation)
6. [Page Directory](#page-directory)

---

## Navigation Structure

The Admin UI uses a **two-level nested navigation** structure:

```
Admin Dashboard
├── Dashboard (Single Item)
├── Users (Group)
│   └── User List
├── Subscriptions (Group)
│   ├── Subscription Management
│   ├── Billing Dashboard
│   └── Credit Management
├── Licenses (Group)
│   ├── License Management
│   ├── Device Activations
│   └── Proration Tracking
├── Coupons & Campaigns (Group)
│   ├── Coupon Management
│   ├── Campaign Management
│   ├── Campaign Calendar
│   ├── Coupon Analytics
│   └── Fraud Detection
├── Profitability (Group)
│   ├── Margin Tracking
│   ├── Pricing Configuration
│   ├── Pricing Simulator
│   └── Vendor Price Monitoring
├── Models (Group)
│   └── Model Tier Management
├── Analytics (Group)
│   ├── Platform Analytics
│   └── Revenue Analytics
└── Settings (Group)
    ├── General
    ├── Email & Notifications
    ├── Security
    ├── Integrations
    ├── Feature Flags
    └── System
```

**Design Principles**:
- **Single Items**: Top-level navigation for standalone pages (Dashboard)
- **Groups**: Collapsible sections containing related pages
- **Nesting**: Maximum 2 levels (groups → items)
- **Persistence**: Expanded groups persist in localStorage

---

## Sidebar Navigation

### Desktop Sidebar

**Location**: Left side of the screen (fixed position)

**Features**:
- **Collapsible**: Click the chevron icon to collapse/expand
- **Persistent State**: Expanded/collapsed state saved in localStorage
- **Active Highlighting**: Current page highlighted in blue
- **Group Expansion**: Click group header to expand/collapse children
- **Auto-Expand**: Groups with active children auto-expand on load

**Collapsed Mode**:
- Shows only icons
- Width: 80px (collapsed) vs 256px (expanded)
- Hover for tooltips (future enhancement)

### Mobile Sidebar

**Location**: Slide-in drawer from left

**Features**:
- **Hamburger Menu**: Click top-left icon to open
- **Overlay**: Semi-transparent backdrop
- **Close Methods**:
  - Click X button
  - Click overlay backdrop
  - Press Escape key
- **Same Navigation**: Identical structure to desktop

### Group Behavior

**Expanding Groups**:
1. Click on the group header (e.g., "Subscriptions")
2. Group expands to reveal child items
3. Chevron icon rotates 180° (⌄ → ⌃)
4. State saved to localStorage

**Collapsing Groups**:
1. Click on expanded group header
2. Group collapses to hide children
3. Chevron rotates back (⌃ → ⌄)
4. State saved to localStorage

**Auto-Expansion**:
- When navigating to a page, its parent group automatically expands
- Example: Navigate to `/admin/credits` → "Subscriptions" group auto-expands

---

## Breadcrumbs

### Overview

Breadcrumbs appear at the top of each admin page, showing the navigation path from the dashboard to the current page.

**Example**:
```
Admin > Subscriptions > Credit Management
```

### Features

**Auto-Generation**:
- Breadcrumbs automatically generated from the current URL
- Maps `/admin/subscriptions/credits` → "Admin > Subscriptions > Credit Management"

**Manual Override**:
- Pages can provide custom breadcrumbs via props
- Useful for dynamic pages (e.g., "User Details")

**Interactivity**:
- All items except the current page are clickable links
- Current page is non-interactive (plain text)
- Hover states on links

**Accessibility**:
- Uses semantic `<nav aria-label="Breadcrumb">` element
- Ordered list (`<ol>`) structure
- Chevron separators marked with `aria-hidden="true"`

### Breadcrumb Format

**Structure**:
```
[Icon] Label > [Icon] Label > Current Page
```

**Icons**:
- Home icon for "Admin" root
- Group icons for intermediate levels (when applicable)
- No icon for current page

**Example Breadcrumbs**:

| Page | Breadcrumb |
|------|------------|
| Dashboard | `Admin` (single item, not shown) |
| User List | `Admin > Users > User List` |
| Credit Management | `Admin > Subscriptions > Credit Management` |
| Model Tier Management | `Admin > Models > Model Tier Management` |
| Security Settings | `Admin > Settings > Security` |

---

## Keyboard Navigation

### Tab Navigation

**Tab Order**:
1. Sidebar toggle button
2. Navigation groups (top to bottom)
3. Child items within expanded groups
4. Breadcrumb links (left to right)
5. Page content

**Focus Indicators**:
- Blue ring around focused elements (`ring-rephlo-blue`)
- 2px thickness for visibility
- High contrast for accessibility

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **Tab** | Focus next element |
| **Shift + Tab** | Focus previous element |
| **Enter** / **Space** | Activate button or link |
| **Escape** | Close mobile sidebar |

**Group Navigation**:
- **Enter** / **Space**: Expand/collapse group
- **Tab**: Navigate to next sibling or child

**Future Enhancement** (Recommended):
- **Arrow Up/Down**: Navigate between sidebar items
- **Arrow Left/Right**: Collapse/expand groups

---

## Mobile Navigation

### Hamburger Menu

**Location**: Top-left corner of mobile header

**Button**:
- Three horizontal lines (≡)
- Labeled "Menu" for screen readers
- Touch target: 48x48px (meets accessibility standard)

### Mobile Drawer

**Behavior**:
- Slides in from left
- Full-height overlay
- Touch-friendly spacing
- Same navigation structure as desktop
- Smooth animations

**Closing**:
- **X Button**: Top-right of drawer
- **Backdrop**: Click anywhere outside drawer
- **Navigation**: Automatically closes after selecting a page
- **Escape Key**: Press Escape to close

---

## Page Directory

### Dashboard

**Path**: `/admin`
**Group**: None (top-level)
**Description**: Admin home page with overview metrics

### Users

**Group**: Users

| Page | Path | Description |
|------|------|-------------|
| User List | `/admin/users` | Manage all users |

### Subscriptions

**Group**: Subscriptions

| Page | Path | Description |
|------|------|-------------|
| Subscription Management | `/admin/subscriptions` | Manage subscriptions |
| Billing Dashboard | `/admin/billing` | Billing overview and invoices |
| Credit Management | `/admin/credits` | Adjust user credits |

### Licenses

**Group**: Licenses

| Page | Path | Description |
|------|------|-------------|
| License Management | `/admin/licenses` | Manage perpetual licenses |
| Device Activations | `/admin/licenses/devices` | View and manage device activations |
| Proration Tracking | `/admin/licenses/prorations` | Track proration adjustments |

### Coupons & Campaigns

**Group**: Coupons & Campaigns

| Page | Path | Description |
|------|------|-------------|
| Coupon Management | `/admin/coupons` | Create and manage coupons |
| Campaign Management | `/admin/coupons/campaigns` | Marketing campaigns |
| Campaign Calendar | `/admin/coupons/calendar` | Campaign scheduling |
| Coupon Analytics | `/admin/coupons/analytics` | Coupon performance metrics |
| Fraud Detection | `/admin/coupons/fraud` | Detect coupon abuse |

### Profitability

**Group**: Profitability

| Page | Path | Description |
|------|------|-------------|
| Margin Tracking | `/admin/profitability/margins` | Track profit margins |
| Pricing Configuration | `/admin/profitability/pricing` | Configure pricing rules |
| Pricing Simulator | `/admin/profitability/simulator` | Simulate pricing scenarios |
| Vendor Price Monitoring | `/admin/profitability/vendor-prices` | Monitor vendor API prices |

### Models

**Group**: Models

| Page | Path | Description |
|------|------|-------------|
| Model Tier Management | `/admin/models` | Configure model tier access |

### Analytics

**Group**: Analytics

| Page | Path | Description |
|------|------|-------------|
| Platform Analytics | `/admin/analytics` | Platform usage metrics |
| Revenue Analytics | `/admin/analytics/revenue` | Revenue and financial metrics |

### Settings

**Group**: Settings

| Page | Path | Description |
|------|------|-------------|
| General | `/admin/settings#general` | Platform name, timezone, locale |
| Email & Notifications | `/admin/settings#email` | SMTP configuration |
| Security | `/admin/settings#security` | Password policy, MFA, sessions |
| Integrations | `/admin/settings#integrations` | API keys for Stripe, SendGrid, LLMs |
| Feature Flags | `/admin/settings#features` | Enable/disable features |
| System | `/admin/settings#system` | Logging, cache, backups |

**Note**: Settings uses hash-based navigation within a single page.

---

## Best Practices

### For Users

1. **Keep Frequently Used Groups Expanded**
   - The sidebar remembers your preferences
   - Expand groups you use often for quick access

2. **Use Breadcrumbs for Quick Navigation**
   - Click breadcrumb items to jump up levels
   - Faster than using the sidebar

3. **Use Keyboard Shortcuts**
   - Tab through navigation efficiently
   - Use Enter/Space to activate

4. **Collapse Sidebar for More Screen Space**
   - Click chevron to collapse when working on data-heavy pages
   - Sidebar stays collapsed until you expand it again

### For Developers

1. **Adding New Pages**
   - Update `AdminSidebar.tsx` navigation structure
   - Add route in `adminRoutes.tsx`
   - Breadcrumbs auto-generate (or provide custom via props)

2. **Modifying Navigation**
   - Edit `navigationItems` array in `AdminSidebar.tsx`
   - Follow existing structure (groups vs single items)
   - Update this guide when adding major sections

3. **Testing Navigation**
   - Test keyboard navigation on all pages
   - Test mobile drawer on various screen sizes
   - Verify breadcrumbs display correctly
   - Check localStorage persistence

---

## Troubleshooting

### Common Issues

**Issue**: Sidebar doesn't remember expanded/collapsed state
- **Solution**: Check localStorage is enabled in browser

**Issue**: Mobile drawer doesn't open
- **Solution**: Verify `__toggleMobileSidebar` function is exposed

**Issue**: Breadcrumbs show incorrect path
- **Solution**: Check route definitions match URL structure

**Issue**: Active page not highlighted
- **Solution**: Verify `location.pathname` matches `href` in navigation

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0 | 2025-11-11 | Added nested navigation, breadcrumbs, 12 groups |
| 1.0 | 2025-11-08 | Initial sidebar with 7 items |

---

## Related Documentation

- [Admin UI Gap Closure Plan (Plan 131)](/docs/plan/131-comprehensive-admin-gap-closure-plan.md)
- [Accessibility Audit Report](/docs/qa/accessibility-audit-report-plan-131.md)
- [AdminSidebar Component](/frontend/src/components/admin/layout/AdminSidebar.tsx)
- [Breadcrumbs Component](/frontend/src/components/admin/layout/Breadcrumbs.tsx)

---

**Last Updated**: 2025-11-11
**Maintained By**: Rephlo Team
**Questions?**: Contact the development team

---

**End of Guide**

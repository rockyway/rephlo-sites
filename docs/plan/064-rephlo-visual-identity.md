# Rephlo Visual Identity System

> **Document Type**: Design Specification
> **Created**: November 2025
> **Status**: Draft - Pending Approval
> **Related**: 063-rephlo-brand-narrative.md

---

## Executive Summary

This document defines the complete visual identity system for **Rephlo**, including logo concepts, color palette, typography, iconography, and UI component specifications. The visual system embodies the brand's core values: professional intelligence, seamless flow, and modern simplicity.

---

## Logo Concepts

### Concept A: "Flow Mark" (Primary Recommendation ⭐)

#### Visual Description

```
┌─────────────────────────────────────────┐
│    ╱╲                                   │
│   ╱  ╲     REPHLO                       │
│  ╱ ⟿  ╲                                 │
│ ╱      ╲                                │
│╱────────╲                               │
│                                          │
│ Symbol: Stylized "R" formed by          │
│ flowing lines suggesting transformation │
│ Arrow (⟿) integrated subtly inside      │
└─────────────────────────────────────────┘
```

#### Design Elements

- **Mark**: Abstract "R" created from flowing, curved strokes
- **Flow Arrow**: Subtle right-pointing arrow integrated into negative space
- **Style**: Minimal, geometric, modern
- **Colors**: Single color mark (adaptable to all brand colors)
- **Wordmark**: Custom sans-serif, tight letter-spacing, lowercase "rephlo"

#### Why This Works

✅ **Memorable symbol** - Similar to Notion's "N", Linear's angle icon
✅ **Suggests movement and transformation** - Aligns with "flow" concept
✅ **Scales well** - Works from 16px system tray to billboard
✅ **Modern without being trendy** - Will age well over 5+ years
✅ **Monochrome compatible** - Critical for system tray icon states

#### Application Specifications

**Minimum Sizes**:
- Print: 20mm width
- Digital: 40px width
- System Tray: 16px (simplified version)

**Clear Space**:
- Maintain 0.5x logo height on all sides
- No text or graphics within clear space zone

**Color Variations**:
- Primary: Rephlo Blue (#2563EB)
- White: On dark backgrounds
- Black: On light backgrounds when color unavailable
- Gray: Disabled states

---

### Concept B: "Transform Symbol"

#### Visual Description

```
┌─────────────────────────────────────────┐
│   [ text → TEXT ]    REPHLO             │
│                                          │
│ Symbol: Brackets with transformation    │
│ arrow, showing before/after             │
└─────────────────────────────────────────┘
```

#### Design Elements

- **Mark**: Square brackets `[ ]` with centered arrow `→`
- **Typography**: Inside brackets, "text" → "TEXT" (transformation visualization)
- **Style**: Literal, functional, technical
- **Colors**: Gradient on arrow (blue to cyan)

#### Why Consider

✅ Immediately communicates function
✅ Appeals to developers and technical users
✅ Clear input/output metaphor

⚠️ May feel too literal for long-term branding
⚠️ Less versatile across different contexts

---

### Concept C: "Wave Wordmark"

#### Visual Description

```
┌─────────────────────────────────────────┐
│   rephlo                                 │
│   ~~~~~~                                 │
│   (flowing underline beneath letters)   │
└─────────────────────────────────────────┘
```

#### Design Elements

- **Wordmark-Only**: No separate symbol
- **Flow Element**: Smooth wave/flow line beneath or integrated into letters
- **"ph" Ligature**: Letters "p" and "h" connected with flowing stroke
- **Style**: Fluid, organic, continuous

#### Why Consider

✅ Clean, minimal (like Stripe, Figma)
✅ "Flow" visually represented
✅ Modern tech aesthetic

⚠️ Less distinctive as standalone app icon
⚠️ Requires larger size for legibility

---

## Color Palette System

### Primary Palette: "Intelligent Flow" (Recommended ⭐)

#### Core Brand Colors

**Primary Brand Color: Rephlo Blue**
```
Color Name: Rephlo Blue
Hex: #2563EB
RGB: 37, 99, 235
HSL: 221, 83%, 53%
CMYK: 84, 58, 0, 8

Usage:
- Primary logo color
- Call-to-action buttons
- Primary headings
- Links and interactive elements
- System tray icon (normal state)

Accessibility:
- WCAG AAA on white backgrounds (12.6:1 contrast)
- WCAG AAA for large text on #F1F5F9 (8.2:1 contrast)
```

**Secondary Color: Deep Navy**
```
Color Name: Deep Navy
Hex: #1E293B
RGB: 30, 41, 59
HSL: 217, 33%, 17%

Usage:
- Body text
- Dark UI backgrounds (dark mode)
- Secondary UI elements
- Borders and dividers

Accessibility:
- WCAG AAA on white (14.8:1 contrast)
```

**Accent Color: Electric Cyan**
```
Color Name: Electric Cyan
Hex: #06B6D4
RGB: 6, 182, 212
HSL: 189, 94%, 43%

Usage:
- Call-to-action highlights
- Success states and confirmations
- Interactive element hover states
- Loading indicators
- System tray icon (processing state)

Accessibility:
- WCAG AA on white (3.9:1 contrast)
- WCAG AAA on #1E293B (11.2:1 contrast)
```

#### Neutral Colors

**Text Hierarchy**
```
Primary Text: #0F172A (Pure Black) - Headings, important content
Secondary Text: #64748B (Slate Gray) - Body text, descriptions
Tertiary Text: #94A3B8 (Light Slate) - Hints, placeholders
Disabled Text: #CBD5E1 (Very Light Slate) - Disabled states
```

**Background Hierarchy**
```
Primary Background: #FFFFFF (White) - Main content areas
Secondary Background: #F1F5F9 (Light Gray) - Subtle backgrounds
Tertiary Background: #E2E8F0 (Lighter Gray) - Hover states
Border Color: #CBD5E1 (Light Slate) - Dividers, borders
```

#### Semantic Colors

**Success**
```
Green: #10B981 (Emerald)
Background: #D1FAE5 (Light Emerald)
Usage: Success messages, confirmations, completed states
```

**Warning**
```
Amber: #F59E0B (Amber)
Background: #FEF3C7 (Light Amber)
Usage: Warnings, caution messages, important notices
```

**Error**
```
Red: #EF4444 (Red)
Background: #FEE2E2 (Light Red)
Usage: Error messages, destructive actions, validation errors
```

**Info**
```
Blue: #3B82F6 (Blue)
Background: #DBEAFE (Light Blue)
Usage: Information messages, tips, neutral notifications
```

---

### Alternative Palette: Purple Intelligence

```
Primary: Rephlo Purple #7C3AED
Secondary: Deep Indigo #312E81
Accent: Bright Violet #A78BFA

Vibe: Creative, AI-forward, Premium
Why Consider: More distinctive in crowded market
Risk: May feel less professional for enterprise/B2B users
```

---

### Gradient System (Optional)

**Primary Gradient: Blue to Cyan**
```
Linear Gradient: 135deg
From: #2563EB (Rephlo Blue)
To: #06B6D4 (Electric Cyan)

Usage:
- Hero sections on website
- Feature highlight cards
- Premium tier badges
- Loading states and animations

Application:
background: linear-gradient(135deg, #2563EB 0%, #06B6D4 100%);
```

**Warning**: Use gradients sparingly. They can date quickly and reduce legibility if overused.

---

## Typography System

### Primary Typeface: Inter (Recommended ⭐)

#### Font Specifications

```
Font Family: Inter
Source: Google Fonts (Open Source)
License: SIL Open Font License 1.1
Variable Font: Yes (supports dynamic weight adjustments)
Character Set: Latin, Latin Extended, Cyrillic, Greek
```

#### Weight Usage

**Light (300)**
- Use: Large headings (48px+), hero text
- Not recommended for body text (readability)

**Regular (400)**
- Use: Body text, descriptions, UI labels
- Primary weight for most content

**Medium (500)**
- Use: Subheadings, button text, navigation items
- Provides subtle emphasis without boldness

**Semibold (600)**
- Use: Section headings, card titles, important labels
- Primary weight for headings

**Bold (700)**
- Use: Hero headings, CTAs, emphasis
- Maximum weight recommended (avoid Black/900)

#### Type Scale

```
Hero (Display):        48px / 3rem     | Line-height: 1.1  | Weight: 700
Heading 1:             36px / 2.25rem  | Line-height: 1.2  | Weight: 600
Heading 2:             30px / 1.875rem | Line-height: 1.3  | Weight: 600
Heading 3:             24px / 1.5rem   | Line-height: 1.4  | Weight: 600
Heading 4:             20px / 1.25rem  | Line-height: 1.4  | Weight: 500
Body Large:            18px / 1.125rem | Line-height: 1.6  | Weight: 400
Body (Default):        16px / 1rem     | Line-height: 1.6  | Weight: 400
Body Small:            14px / 0.875rem | Line-height: 1.5  | Weight: 400
Caption:               12px / 0.75rem  | Line-height: 1.4  | Weight: 400
```

#### Why Inter

✅ Excellent screen readability at small sizes (optimized for UI)
✅ Open source with no licensing restrictions
✅ Used by leading tech brands (Linear, GitHub, Vercel)
✅ Variable font support (single file, multiple weights)
✅ Extensive language support (multilingual ready)
✅ Regular updates and active maintenance

---

### Alternative Typeface: Manrope

```
Font Family: Manrope
Source: Google Fonts
Character: Geometric, modern, slightly warmer than Inter

Use Cases:
- Marketing materials (warmer personality)
- Branding collateral (more distinctive)
- Short-form content (social media posts)

Not Recommended For:
- UI text (Inter is superior for interfaces)
- Long-form reading (less optimized for body text)
```

---

### Monospace Font: JetBrains Mono

```
Font Family: JetBrains Mono
Source: Google Fonts
Weight Range: 400-700

Use Cases:
- Code snippets and examples
- Command syntax display
- Technical documentation
- Developer-facing content
- JSON/XML data display

Example:
rephlo.executeCommand({ text: "{{input_text}}" });
```

---

## Iconography System

### Icon Library

**Recommended**: Lucide Icons (compatible with WPF-UI)
**Alternative**: Phosphor Icons

### Icon Style Guidelines

```
Stroke-based (not filled)
Stroke Weight: 2px
Line Caps: Rounded
Corner Radius: 2px (for rounded rectangles)
Grid: 24x24px
Padding: 2px minimum from grid edge
Colors: Match brand palette
```

### Icon Usage by Context

| Context | Icon Style | Example |
|---------|-----------|---------|
| **Navigation** | Outlined, 24px | Home, Settings, Profile |
| **Actions** | Outlined, 20px | Edit, Delete, Copy |
| **Status** | Filled, 16px | Success ✓, Error ✗, Warning ⚠ |
| **Features** | Outlined, 32px | AI Brain, Text Document, Keyboard |

### Core Icon Set

**Essential Icons**:
```
⚡ Lightning Bolt - Quick action, speed, instant
📝 Document/Text - Writing, text, content
🎨 Palette - Customization, themes, personalization
🔒 Lock - Privacy, security, encryption
⚙️ Gear - Settings, configuration
👤 User - Profile, account
🌐 Globe - Language, global, web
📂 Folder - Organization, spaces, groups
⭐ Star - Favorites, featured, important
✓ Checkmark - Success, complete, approved
✗ X Mark - Error, close, cancel
⚠ Warning - Caution, attention needed
ℹ Info - Information, help, tips
→ Arrow Right - Next, continue, transform
↻ Refresh - Reload, sync, update
⬇ Download - Save, export, download
⬆ Upload - Import, add, upload
```

---

## Logo Applications

### App Icon (Windows)

#### Specifications

```
Sizes Required:
- 256x256px (high-res display)
- 128x128px (standard display)
- 64x64px (taskbar)
- 48x48px (small icons view)
- 32x32px (list view)
- 16x16px (system tray)

Format: PNG with transparency, ICO file for Windows
Background: Gradient (Blue #2563EB to Cyan #06B6D4)
Symbol: White "Flow Mark" centered
Corner Radius: 20% of icon size (Windows 11 style)
```

#### Icon Variants

**Light Mode**
```
Background: Gradient (Blue to Cyan)
Symbol: White (#FFFFFF)
Shadow: Subtle 0 4px 12px rgba(37, 99, 235, 0.3)
```

**Dark Mode**
```
Background: Dark Navy (#1E293B)
Symbol: Cyan (#06B6D4) with subtle glow
Border: 1px cyan glow
```

---

### System Tray Icon

#### Critical Requirements

```
Size: 16x16px (Windows standard)
Format: PNG with transparency
Background: Transparent
Style: Monochrome (color only for state indication)
```

#### States

**Normal State (Blue)**
```
Icon: Simplified "R" mark
Color: #2563EB (Rephlo Blue)
Opacity: 100%
```

**Processing State (Animated)**
```
Icon: "R" mark with rotating element
Color: #F59E0B (Amber)
Animation: 500ms blink/rotation
Opacity: 100% → 60% → 100% (repeating)
```

**Disabled State (Gray)**
```
Icon: "R" mark
Color: #94A3B8 (Slate Gray)
Opacity: 60%
```

**Important**: At 16px, fine details disappear. Use bold, simple shapes only.

---

### Marketing Lockup

#### Horizontal Lockup (Primary)

```
┌──────────────────────────────────┐
│  ╱╲                              │
│ ╱  ╲  rephlo                     │
│╱ ⟿  ╲                            │
│───────                           │
│        Transform text.           │
│        Keep your flow.           │
└──────────────────────────────────┘

Minimum Width: 120px
Clear Space: 0.5x logo height on all sides
Tagline: Optional (can be omitted in small sizes)
```

#### Vertical Lockup (Alternative)

```
┌──────────────────┐
│      ╱╲          │
│     ╱  ╲         │
│    ╱ ⟿  ╲        │
│   ───────        │
│                  │
│     rephlo       │
│                  │
│  Text that flows.│
└──────────────────┘

Minimum Height: 80px
Use When: Square formats (social media avatars, badges)
```

---

## UI Component Styling

### Buttons

#### Primary Button (Call-to-Action)

```
Background: #2563EB (Rephlo Blue)
Text: #FFFFFF (White)
Font: Inter Medium (500)
Size: 16px
Padding: 12px 24px
Border-radius: 8px
Border: none
Shadow: 0 1px 2px rgba(0, 0, 0, 0.05)

Hover:
  Background: #1D4ED8 (Darker Blue)
  Shadow: 0 4px 12px rgba(37, 99, 235, 0.3)

Active:
  Background: #1E40AF
  Transform: translateY(1px)

Disabled:
  Background: #CBD5E1 (Light Slate)
  Text: #94A3B8 (Slate Gray)
  Cursor: not-allowed
```

#### Secondary Button

```
Background: Transparent
Text: #2563EB (Rephlo Blue)
Font: Inter Medium (500)
Size: 16px
Padding: 12px 24px
Border-radius: 8px
Border: 2px solid #2563EB
Shadow: none

Hover:
  Background: #2563EB10 (Blue 10% opacity)
  Border: 2px solid #1D4ED8

Active:
  Background: #2563EB20 (Blue 20% opacity)

Disabled:
  Border: 2px solid #CBD5E1
  Text: #94A3B8
  Cursor: not-allowed
```

#### Ghost Button (Subtle)

```
Background: Transparent
Text: #64748B (Slate Gray)
Font: Inter Regular (400)
Size: 16px
Padding: 8px 16px
Border-radius: 6px
Border: none
Shadow: none

Hover:
  Background: #F1F5F9 (Light Gray)
  Text: #1E293B (Deep Navy)

Active:
  Background: #E2E8F0
```

---

### Input Fields

```
Background: #FFFFFF (White)
Border: 1px solid #CBD5E1 (Light Slate)
Border-radius: 6px
Padding: 10px 14px
Font: Inter Regular (400)
Size: 16px
Color: #1E293B (Deep Navy)

Placeholder:
  Color: #94A3B8 (Slate Gray)
  Font-style: normal

Focus:
  Border: 2px solid #2563EB (Rephlo Blue)
  Outline: 4px solid #2563EB20 (Blue 20% opacity)
  Padding: 9px 13px (adjust for 2px border)

Error:
  Border: 2px solid #EF4444 (Red)
  Background: #FEE2E220 (Light Red 20% opacity)

Disabled:
  Background: #F1F5F9 (Light Gray)
  Border: 1px solid #E2E8F0
  Color: #94A3B8 (Slate Gray)
  Cursor: not-allowed
```

---

### Cards

```
Background: #FFFFFF (White)
Border: 1px solid #E2E8F0 (Lighter Gray)
Border-radius: 12px
Padding: 20px
Shadow: 0 1px 3px rgba(0, 0, 0, 0.1)

Hover (Interactive Cards):
  Shadow: 0 4px 16px rgba(0, 0, 0, 0.12)
  Transform: translateY(-2px)
  Transition: all 200ms ease-in-out

Active:
  Shadow: 0 2px 8px rgba(0, 0, 0, 0.08)
  Transform: translateY(0px)

Accent Border (Bottom):
  Border-bottom: 4px solid #2563EB (Rephlo Blue)
  Use for featured items, command cards
```

---

### Badges & Tags

```
Background: #DBEAFE (Light Blue)
Text: #1E40AF (Dark Blue)
Font: Inter Medium (500)
Size: 12px
Padding: 4px 10px
Border-radius: 12px (pill shape)
Border: none

Color Variants:
  Success: #D1FAE5 background, #065F46 text
  Warning: #FEF3C7 background, #92400E text
  Error: #FEE2E2 background, #991B1B text
  Neutral: #F1F5F9 background, #475569 text
```

---

## Visual Style Guide

### Design Principles

#### 1. Minimal but Warm

```
✅ DO:
- Use ample whitespace (minimum 16px between major sections)
- Apply subtle shadows for depth (not flat, not excessive)
- Round corners consistently (8px for cards, 6px for inputs)
- Use soft gradients sparingly for emphasis

❌ DON'T:
- Overcrowd interfaces with too many elements
- Use harsh drop shadows or excessive elevation
- Mix corner radius values inconsistently
- Apply gradients to every surface
```

#### 2. Fluid Motion

```
Animation Timing:
- Quick interactions: 150-200ms (buttons, toggles)
- Page transitions: 250-300ms (navigation, modals)
- Complex animations: 400-500ms (illustrations, reveals)

Easing Functions:
- Default: ease-in-out (smooth start and end)
- Enter: ease-out (quick start, slow end)
- Exit: ease-in (slow start, quick end)
- Bounce: cubic-bezier(0.68, -0.55, 0.27, 1.55) (playful)

Motion Principles:
✅ Smooth, flowing transitions
✅ Natural acceleration/deceleration
✅ Respect user motion preferences (prefers-reduced-motion)
❌ Jarring, instant changes
❌ Excessive or distracting animations
```

#### 3. Intelligent Contrast

```
Text on Backgrounds:
- Light mode default: #1E293B text on #FFFFFF background
- Dark mode default: #F1F5F9 text on #1E293B background
- Minimum contrast ratio: 4.5:1 (WCAG AA)
- Target contrast ratio: 7:1+ (WCAG AAA)

Color Usage:
✅ Use color to support meaning, not convey it alone
✅ Pair color with icons or text labels
✅ Test in grayscale to ensure clarity without color
❌ Rely on color alone for critical information
```

#### 4. Purposeful Color

```
Semantic Color Usage:

Blue (#2563EB):
  • Primary actions and navigation
  • Links and interactive elements
  • Neutral informational states

Cyan (#06B6D4):
  • Call-to-action emphasis
  • Processing/loading states
  • Success confirmations

Green (#10B981):
  • Success messages only
  • Completed states
  • Positive confirmations

Amber (#F59E0B):
  • Warnings and cautions
  • Important notices
  • Processing (system tray)

Red (#EF4444):
  • Errors and validation failures
  • Destructive actions (delete)
  • Critical alerts

Gray Scale:
  • Disabled states
  • Placeholder text
  • Secondary information
```

---

## Illustration Style

### Concept: "Flow Lines"

#### Visual Language

```
┌─────────────────────────────────────────┐
│     ╱───────╲                           │
│    ╱         ╲      Flowing curves      │
│   │  [TEXT]   │     Abstract shapes     │
│    ╲         ╱      Minimal color       │
│     ╲───────╱       Modern geometric    │
└─────────────────────────────────────────┘
```

#### Elements

- **Flowing Lines**: Smooth curves suggesting movement (like water, air)
- **Subtle Gradients**: Blue to Cyan on key elements only
- **Isometric Perspective**: Optional 3D depth for complex scenes
- **Abstract Representations**: Avoid literal depictions, use metaphors
- **Limited Palette**: Brand colors + neutrals only (no rainbow)

#### Use Cases

**Empty States**
```
Illustration: Flowing line path with placeholder
Message: "No commands yet. Create your first one to get started."
Style: Simple, encouraging, minimal
```

**Onboarding**
```
Illustration: Step-by-step path with flow arrows
Message: Step indicators with progress visualization
Style: Clear, instructional, friendly
```

**Error States**
```
Illustration: Broken or interrupted flow line
Message: Clear error explanation with suggested action
Style: Non-threatening, helpful, reassuring
```

**Marketing/Hero**
```
Illustration: Text transformation visualization
Style: Dynamic, impressive, professional
Elements: Before/after text, flow arrows, device mockups
```

---

## Accessibility Guidelines

### Color Contrast Requirements

```
WCAG AA Minimum (4.5:1 for normal text, 3:1 for large):
✅ #2563EB on #FFFFFF: 6.2:1 (Pass)
✅ #1E293B on #FFFFFF: 14.8:1 (Pass)
✅ #64748B on #FFFFFF: 4.6:1 (Pass)

WCAG AAA Preferred (7:1 for normal text, 4.5:1 for large):
✅ #1E293B on #FFFFFF: 14.8:1 (Excellent)
✅ #2563EB on #FFFFFF: 6.2:1 (Large text only)
⚠️ #06B6D4 on #FFFFFF: 3.9:1 (Insufficient for body text)

Recommendations:
- Use #06B6D4 (Cyan) for large elements only (buttons, icons)
- Pair cyan with dark backgrounds for sufficient contrast
- Never use cyan for body text or small labels
```

### Focus Indicators

```
All interactive elements must have visible focus states:

Keyboard Focus Ring:
  Outline: 3px solid #2563EB
  Offset: 2px
  Border-radius: Inherit from element

Focus-Visible (modern browsers):
  Apply focus ring only for keyboard navigation
  Hide for mouse/touch interactions
```

### Screen Reader Support

```
All icons must have:
- aria-label for standalone icons
- aria-hidden="true" for decorative icons
- Accompanying text (visible or sr-only)

Interactive elements must have:
- Descriptive labels
- Role attributes (button, link, etc.)
- State indicators (aria-pressed, aria-expanded)
```

---

## Brand Asset Checklist

### Logo Files Required

```
□ SVG (vector, scalable)
  - rephlo-logo-primary.svg
  - rephlo-logo-white.svg
  - rephlo-logo-black.svg
  - rephlo-symbol-only.svg

□ PNG (raster, multiple sizes)
  - rephlo-logo-256px.png
  - rephlo-logo-128px.png
  - rephlo-logo-64px.png
  - rephlo-logo-32px.png
  - rephlo-logo-16px.png (system tray)

□ ICO (Windows icon)
  - rephlo.ico (multi-resolution: 256, 128, 64, 48, 32, 16)

□ Favicon
  - favicon.ico (16x16, 32x32)
  - favicon-16x16.png
  - favicon-32x32.png
  - apple-touch-icon.png (180x180)
```

### Color Swatches

```
□ ASE (Adobe Swatch Exchange) for design tools
□ XAML ResourceDictionary for WPF application
□ CSS Variables for web applications
□ JSON file for programmatic access
```

### Font Files

```
□ Inter (Variable TTF or WOFF2)
□ JetBrains Mono (Regular, Medium, Bold)
□ License files and attribution
```

---

## Implementation Priority

### Phase 1: Essential (Week 1)

1. Finalize logo design ("Flow Mark" concept)
2. Generate all logo file formats (SVG, PNG, ICO)
3. Create system tray icon variants
4. Define XAML ResourceDictionary with brand colors
5. Update app icon in project files

### Phase 2: UI Components (Week 2)

1. Implement button styles in WPF
2. Update card components with new styling
3. Apply typography scale throughout UI
4. Create reusable component library

### Phase 3: Marketing (Week 3)

1. Design website hero section
2. Create social media graphics
3. Develop brand guidelines PDF
4. Prepare press kit assets

---

**Document Version**: 1.0
**Last Updated**: November 2025
**Owner**: Design Team
**Review Cycle**: Quarterly

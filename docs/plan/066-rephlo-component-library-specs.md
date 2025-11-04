# Rephlo Component Library Specifications

> **Document Type**: UI Component Design System
> **Created**: November 2025
> **Status**: Specification v1.0
> **Related**: 064-rephlo-visual-identity.md, 065-rephlo-brand-guidelines.md

---

## Table of Contents

1. [Overview](#overview)
2. [Design Tokens](#design-tokens)
3. [Button Components](#button-components)
4. [Input Components](#input-components)
5. [Card Components](#card-components)
6. [Navigation Components](#navigation-components)
7. [Feedback Components](#feedback-components)
8. [Typography Components](#typography-components)
9. [Icon Components](#icon-components)
10. [Layout Components](#layout-components)
11. [Animation Specifications](#animation-specifications)
12. [Accessibility Requirements](#accessibility-requirements)

---

## Overview

### Purpose

This document defines the complete component library for Rephlo's WPF application interface. All components follow the Rephlo brand guidelines and ensure consistency across the application.

### Design Principles

1. **Consistency**: Same patterns, same behaviors, predictable experiences
2. **Accessibility**: WCAG AA minimum, AAA preferred
3. **Clarity**: Clear visual hierarchy, purposeful design choices
4. **Performance**: Smooth animations, responsive interactions
5. **Modularity**: Reusable, composable components

### Component Naming Convention

```
Pattern: [Component][Variant][State]

Examples:
- ButtonPrimary
- ButtonSecondary
- ButtonPrimaryHover
- InputTextField
- InputTextFieldError
- CardCommandDefault
- CardCommandHover
```

---

## Design Tokens

### Spacing Scale

```xaml
<!-- Base Unit: 4px -->
<system:Double x:Key="SpacingXs">4</system:Double>     <!-- 4px -->
<system:Double x:Key="SpacingSm">8</system:Double>     <!-- 8px -->
<system:Double x:Key="SpacingMd">12</system:Double>    <!-- 12px -->
<system:Double x:Key="SpacingLg">16</system:Double>    <!-- 16px -->
<system:Double x:Key="SpacingXl">24</system:Double>    <!-- 24px -->
<system:Double x:Key="Spacing2xl">32</system:Double>   <!-- 32px -->
<system:Double x:Key="Spacing3xl">48</system:Double>   <!-- 48px -->
<system:Double x:Key="Spacing4xl">64</system:Double>   <!-- 64px -->
```

**Usage Guidelines**:
- **4px (Xs)**: Inner padding for compact elements
- **8px (Sm)**: Default padding within components
- **12px (Md)**: Standard spacing between related elements
- **16px (Lg)**: Default spacing between sections
- **24px (Xl)**: Large gaps between major sections
- **32px+ (2xl-4xl)**: Hero sections, page margins

### Border Radius Scale

```xaml
<system:Double x:Key="RadiusNone">0</system:Double>
<system:Double x:Key="RadiusSm">4</system:Double>      <!-- 4px -->
<system:Double x:Key="RadiusMd">6</system:Double>      <!-- 6px - Input fields -->
<system:Double x:Key="RadiusLg">8</system:Double>      <!-- 8px - Buttons, cards -->
<system:Double x:Key="RadiusXl">12</system:Double>     <!-- 12px - Large cards -->
<system:Double x:Key="RadiusFull">9999</system:Double> <!-- Fully rounded (pills, badges) -->
```

### Shadow Definitions

```xaml
<!-- Shadow Sm - Subtle depth -->
<DropShadowEffect x:Key="ShadowSm"
                  Color="#000000"
                  Opacity="0.05"
                  BlurRadius="3"
                  ShadowDepth="1"
                  Direction="270"/>

<!-- Shadow Md - Standard cards -->
<DropShadowEffect x:Key="ShadowMd"
                  Color="#000000"
                  Opacity="0.1"
                  BlurRadius="8"
                  ShadowDepth="2"
                  Direction="270"/>

<!-- Shadow Lg - Hover elevation -->
<DropShadowEffect x:Key="ShadowLg"
                  Color="#000000"
                  Opacity="0.12"
                  BlurRadius="16"
                  ShadowDepth="4"
                  Direction="270"/>

<!-- Shadow Xl - Modals, overlays -->
<DropShadowEffect x:Key="ShadowXl"
                  Color="#000000"
                  Opacity="0.15"
                  BlurRadius="24"
                  ShadowDepth="8"
                  Direction="270"/>
```

### Animation Durations

```xaml
<Duration x:Key="DurationFast">0:0:0.15</Duration>     <!-- 150ms - Quick interactions -->
<Duration x:Key="DurationNormal">0:0:0.2</Duration>    <!-- 200ms - Standard transitions -->
<Duration x:Key="DurationSlow">0:0:0.3</Duration>      <!-- 300ms - Page transitions -->
<Duration x:Key="DurationSlower">0:0:0.5</Duration>    <!-- 500ms - Complex animations -->
```

---

## Button Components

### Primary Button

**Visual Specification**

```
┌────────────────────────┐
│   Get Started  →       │
└────────────────────────┘

Background: Rephlo Blue (#2563EB)
Text: White (#FFFFFF)
Font: Inter Medium (500) 16px
Padding: 12px horizontal, 24px vertical
Border-radius: 8px
Shadow: 0 1px 2px rgba(0,0,0,0.05)
```

**XAML Implementation**

```xaml
<Style x:Key="ButtonPrimaryStyle" TargetType="Button">
    <Setter Property="Background" Value="{StaticResource RephloBlueBrush}"/>
    <Setter Property="Foreground" Value="#FFFFFF"/>
    <Setter Property="FontFamily" Value="{StaticResource InterFont}"/>
    <Setter Property="FontWeight" Value="Medium"/>
    <Setter Property="FontSize" Value="16"/>
    <Setter Property="Padding" Value="24,12"/>
    <Setter Property="BorderThickness" Value="0"/>
    <Setter Property="Cursor" Value="Hand"/>
    <Setter Property="Effect" Value="{StaticResource ShadowSm}"/>
    <Setter Property="Template">
        <Setter.Value>
            <ControlTemplate TargetType="Button">
                <Border x:Name="ButtonBorder"
                        Background="{TemplateBinding Background}"
                        CornerRadius="{StaticResource RadiusLg}"
                        Padding="{TemplateBinding Padding}">
                    <ContentPresenter HorizontalAlignment="Center"
                                      VerticalAlignment="Center"/>
                </Border>
                <ControlTemplate.Triggers>
                    <!-- Hover State -->
                    <Trigger Property="IsMouseOver" Value="True">
                        <Setter TargetName="ButtonBorder" Property="Background"
                                Value="{StaticResource RephloBlueHoverBrush}"/>
                        <Setter Property="Effect" Value="{StaticResource ShadowMd}"/>
                    </Trigger>
                    <!-- Pressed State -->
                    <Trigger Property="IsPressed" Value="True">
                        <Setter TargetName="ButtonBorder" Property="Background"
                                Value="{StaticResource RephloBluePressedBrush}"/>
                        <Setter Property="RenderTransform">
                            <Setter.Value>
                                <TranslateTransform Y="1"/>
                            </Setter.Value>
                        </Setter>
                    </Trigger>
                    <!-- Disabled State -->
                    <Trigger Property="IsEnabled" Value="False">
                        <Setter TargetName="ButtonBorder" Property="Background"
                                Value="{StaticResource TextDisabledBrush}"/>
                        <Setter Property="Foreground" Value="{StaticResource TextTertiaryBrush}"/>
                        <Setter Property="Cursor" Value="Arrow"/>
                        <Setter Property="Effect" Value="{x:Null}"/>
                    </Trigger>
                </ControlTemplate.Triggers>
            </ControlTemplate>
        </Setter.Value>
    </Setter>
</Style>
```

**States**

| State | Background | Text | Cursor | Transition |
|-------|-----------|------|--------|------------|
| Default | #2563EB | #FFFFFF | Hand | - |
| Hover | #1D4ED8 | #FFFFFF | Hand | 200ms ease-in-out |
| Pressed | #1E40AF | #FFFFFF | Hand | Instant |
| Disabled | #CBD5E1 | #94A3B8 | Arrow | - |
| Focus | #2563EB | #FFFFFF | Hand | 3px #2563EB outline |

---

### Secondary Button

**Visual Specification**

```
┌────────────────────────┐
│      Learn More        │
└────────────────────────┘

Background: Transparent
Text: Rephlo Blue (#2563EB)
Border: 2px solid #2563EB
Font: Inter Medium (500) 16px
Padding: 10px 22px (adjusted for border)
Border-radius: 8px
```

**XAML Implementation**

```xaml
<Style x:Key="ButtonSecondaryStyle" TargetType="Button">
    <Setter Property="Background" Value="Transparent"/>
    <Setter Property="Foreground" Value="{StaticResource RephloBlueBrush}"/>
    <Setter Property="BorderBrush" Value="{StaticResource RephloBlueBrush}"/>
    <Setter Property="BorderThickness" Value="2"/>
    <Setter Property="FontFamily" Value="{StaticResource InterFont}"/>
    <Setter Property="FontWeight" Value="Medium"/>
    <Setter Property="FontSize" Value="16"/>
    <Setter Property="Padding" Value="22,10"/>
    <Setter Property="Cursor" Value="Hand"/>
    <Setter Property="Template">
        <Setter.Value>
            <ControlTemplate TargetType="Button">
                <Border x:Name="ButtonBorder"
                        Background="{TemplateBinding Background}"
                        BorderBrush="{TemplateBinding BorderBrush}"
                        BorderThickness="{TemplateBinding BorderThickness}"
                        CornerRadius="{StaticResource RadiusLg}"
                        Padding="{TemplateBinding Padding}">
                    <ContentPresenter HorizontalAlignment="Center"
                                      VerticalAlignment="Center"/>
                </Border>
                <ControlTemplate.Triggers>
                    <!-- Hover State -->
                    <Trigger Property="IsMouseOver" Value="True">
                        <Setter TargetName="ButtonBorder" Property="Background"
                                Value="{StaticResource RephloBlueLight10Brush}"/>
                        <Setter TargetName="ButtonBorder" Property="BorderBrush"
                                Value="{StaticResource RephloBlueHoverBrush}"/>
                    </Trigger>
                    <!-- Pressed State -->
                    <Trigger Property="IsPressed" Value="True">
                        <Setter TargetName="ButtonBorder" Property="Background"
                                Value="{StaticResource RephloBlueLight20Brush}"/>
                    </Trigger>
                    <!-- Disabled State -->
                    <Trigger Property="IsEnabled" Value="False">
                        <Setter TargetName="ButtonBorder" Property="BorderBrush"
                                Value="{StaticResource TextDisabledBrush}"/>
                        <Setter Property="Foreground" Value="{StaticResource TextTertiaryBrush}"/>
                        <Setter Property="Cursor" Value="Arrow"/>
                    </Trigger>
                </ControlTemplate.Triggers>
            </ControlTemplate>
        </Setter.Value>
    </Setter>
</Style>
```

---

### Ghost Button (Subtle)

**Visual Specification**

```
[ Cancel ]

Background: Transparent
Text: Slate Gray (#64748B)
Border: None
Font: Inter Regular (400) 16px
Padding: 8px 16px
Border-radius: 6px
```

**States**

| State | Background | Text |
|-------|-----------|------|
| Default | Transparent | #64748B |
| Hover | #F1F5F9 | #1E293B |
| Pressed | #E2E8F0 | #1E293B |
| Disabled | Transparent | #CBD5E1 |

---

### Icon Button

**Visual Specification**

```
┌─────┐
│  ⚙  │  (Settings icon)
└─────┘

Size: 40x40px
Icon: 20x20px centered
Background: Transparent
Border-radius: 8px
```

**Usage**: Toolbars, compact actions, icon-only operations

---

## Input Components

### Text Field

**Visual Specification**

```
┌─────────────────────────────────┐
│ Enter text here...              │
└─────────────────────────────────┘

Background: White (#FFFFFF)
Border: 1px solid #CBD5E1
Border-radius: 6px
Padding: 10px 14px
Font: Inter Regular (400) 16px
Text Color: #1E293B
Placeholder: #94A3B8
```

**XAML Implementation**

```xaml
<Style x:Key="TextFieldStyle" TargetType="TextBox">
    <Setter Property="Background" Value="{StaticResource BackgroundPrimaryBrush}"/>
    <Setter Property="Foreground" Value="{StaticResource TextPrimaryBrush}"/>
    <Setter Property="BorderBrush" Value="{StaticResource BorderBrush}"/>
    <Setter Property="BorderThickness" Value="1"/>
    <Setter Property="FontFamily" Value="{StaticResource InterFont}"/>
    <Setter Property="FontSize" Value="16"/>
    <Setter Property="Padding" Value="14,10"/>
    <Setter Property="MinHeight" Value="40"/>
    <Setter Property="VerticalContentAlignment" Value="Center"/>
    <Setter Property="Template">
        <Setter.Value>
            <ControlTemplate TargetType="TextBox">
                <Border x:Name="BorderElement"
                        Background="{TemplateBinding Background}"
                        BorderBrush="{TemplateBinding BorderBrush}"
                        BorderThickness="{TemplateBinding BorderThickness}"
                        CornerRadius="{StaticResource RadiusMd}">
                    <ScrollViewer x:Name="PART_ContentHost"
                                  Margin="{TemplateBinding Padding}"
                                  VerticalAlignment="{TemplateBinding VerticalContentAlignment}"/>
                </Border>
                <ControlTemplate.Triggers>
                    <!-- Focus State -->
                    <Trigger Property="IsFocused" Value="True">
                        <Setter TargetName="BorderElement" Property="BorderBrush"
                                Value="{StaticResource RephloBlueBrush}"/>
                        <Setter TargetName="BorderElement" Property="BorderThickness" Value="2"/>
                        <Setter TargetName="BorderElement" Property="Effect">
                            <Setter.Value>
                                <DropShadowEffect Color="#2563EB" Opacity="0.2"
                                                  BlurRadius="8" ShadowDepth="0"/>
                            </Setter.Value>
                        </Setter>
                        <!-- Adjust padding to compensate for thicker border -->
                        <Setter Property="Padding" Value="13,9"/>
                    </Trigger>
                    <!-- Disabled State -->
                    <Trigger Property="IsEnabled" Value="False">
                        <Setter TargetName="BorderElement" Property="Background"
                                Value="{StaticResource BackgroundSecondaryBrush}"/>
                        <Setter Property="Foreground" Value="{StaticResource TextTertiaryBrush}"/>
                    </Trigger>
                </ControlTemplate.Triggers>
            </ControlTemplate>
        </Setter.Value>
    </Setter>
</Style>
```

**States**

| State | Border | Background | Text | Notes |
|-------|--------|-----------|------|-------|
| Default | 1px #CBD5E1 | #FFFFFF | #1E293B | - |
| Focus | 2px #2563EB | #FFFFFF | #1E293B | + Blue glow |
| Error | 2px #EF4444 | #FEE2E220 | #1E293B | Light red bg |
| Disabled | 1px #E2E8F0 | #F1F5F9 | #94A3B8 | - |

---

### Text Area (Multi-line)

**Visual Specification**

Similar to Text Field but:
- Min-height: 80px
- Vertical scrollbar when content exceeds height
- Resize grip in bottom-right corner (optional)

---

### Checkbox

**Visual Specification**

```
☑ Enable feature

Size: 20x20px
Checkmark: 16x16px (Lucide Icon)
Label: Inter Regular 16px
Spacing: 8px between checkbox and label
```

**States**

| State | Border | Background | Checkmark | Label |
|-------|--------|-----------|-----------|-------|
| Unchecked | 2px #CBD5E1 | Transparent | Hidden | #1E293B |
| Checked | 2px #2563EB | #2563EB | White | #1E293B |
| Hover (unchecked) | 2px #2563EB | Transparent | Hidden | #1E293B |
| Hover (checked) | 2px #1D4ED8 | #1D4ED8 | White | #1E293B |
| Disabled | 2px #E2E8F0 | #F1F5F9 | #CBD5E1 | #94A3B8 |

---

### Radio Button

**Visual Specification**

```
◉ Option 1
○ Option 2

Size: 20x20px
Inner circle: 10x10px
Label: Inter Regular 16px
Spacing: 8px between radio and label
Group spacing: 12px between options
```

---

### Dropdown / ComboBox

**Visual Specification**

```
┌─────────────────────────────┐
│ Select option...         ▼ │
└─────────────────────────────┘

Height: 40px
Padding: 10px 14px
Border: 1px #CBD5E1
Border-radius: 6px
Dropdown icon: 20x20px chevron (right-aligned)
```

**Dropdown Menu**

```
┌─────────────────────────────┐
│ ● Option 1                  │
│   Option 2                  │
│   Option 3                  │
└─────────────────────────────┘

Background: White #FFFFFF
Border: 1px #E2E8F0
Shadow: 0 4px 16px rgba(0,0,0,0.12)
Border-radius: 8px
Item padding: 12px 14px
Item height: 44px
Selected item: Blue background (#DBEAFE)
Hover item: Light gray (#F1F5F9)
```

---

## Card Components

### Default Card

**Visual Specification**

```
┌────────────────────────────────┐
│  📝 Command Card               │
│                                │
│  Write Blog Post               │
│  Marketing Space               │
│                                │
│  ──────────────────────────    │
└────────────────────────────────┘

Background: White (#FFFFFF)
Border: 1px #E2E8F0
Border-radius: 12px
Padding: 20px
Shadow: 0 1px 3px rgba(0,0,0,0.1)
```

**XAML Implementation**

```xaml
<Style x:Key="CardDefaultStyle" TargetType="Border">
    <Setter Property="Background" Value="{StaticResource BackgroundPrimaryBrush}"/>
    <Setter Property="BorderBrush" Value="{StaticResource BackgroundTertiaryBrush}"/>
    <Setter Property="BorderThickness" Value="1"/>
    <Setter Property="CornerRadius" Value="{StaticResource RadiusXl}"/>
    <Setter Property="Padding" Value="20"/>
    <Setter Property="Effect" Value="{StaticResource ShadowSm}"/>
</Style>
```

---

### Interactive Card (Clickable)

**States**

| State | Shadow | Transform | Border |
|-------|--------|-----------|--------|
| Default | 0 1px 3px | None | 1px #E2E8F0 |
| Hover | 0 4px 16px | translateY(-2px) | 1px #E2E8F0 |
| Pressed | 0 2px 8px | translateY(0) | 1px #E2E8F0 |

**Animation**: 200ms ease-in-out for all transitions

---

### Command Card (Accent Border)

**Visual Specification**

```
┌────────────────────────────────┐
│  Write Blog Post               │
│  Marketing                     │
├════════════════════════════════┤ ← Blue accent (4px)
```

**Bottom Accent**: 4px solid Rephlo Blue (#2563EB)

---

## Navigation Components

### Tab Navigation

**Visual Specification**

```
Commands | Spaces | Settings | History
────────
(Active tab underlined)

Tab padding: 12px 16px
Active indicator: 3px bottom border (#2563EB)
Font: Inter Medium (500) 16px
Active text: #1E293B
Inactive text: #64748B
Hover: #2563EB
```

---

### Breadcrumbs

**Visual Specification**

```
Home / Spaces / Marketing / Commands
      >        >           >

Font: Inter Regular (400) 14px
Link color: #2563EB
Current page: #1E293B (not clickable)
Separator: > (#94A3B8)
Spacing: 8px between items
```

---

### Pagination

**Visual Specification**

```
← Previous   1 [2] 3 4 5   Next →

Page numbers: 32x32px squares
Active page: #2563EB background, white text
Inactive page: Transparent background, #64748B text
Hover: #F1F5F9 background
Border-radius: 6px
```

---

## Feedback Components

### Toast Notification

**Visual Specification**

```
┌──────────────────────────────────┐
│ ✓  Success message here          │
└──────────────────────────────────┘

Background: White (#FFFFFF)
Border: 1px #E2E8F0
Border-left: 4px solid (semantic color)
Border-radius: 8px
Padding: 16px
Shadow: 0 4px 16px rgba(0,0,0,0.12)
Min-width: 320px
Max-width: 480px
```

**Variants**

| Type | Left Border | Icon | Icon Color | Auto-dismiss |
|------|------------|------|-----------|--------------|
| Success | #10B981 | ✓ | #10B981 | 3 seconds |
| Error | #EF4444 | ✗ | #EF4444 | Manual |
| Warning | #F59E0B | ⚠ | #F59E0B | 5 seconds |
| Info | #3B82F6 | ℹ | #3B82F6 | 4 seconds |

**Position**: Bottom-right, 24px from edges

---

### Progress Indicator (Spinner)

**Visual Specification**

```
⟳  (Rotating circle)

Size: 24x24px (default), 16px (small), 32px (large)
Color: Rephlo Blue (#2563EB)
Stroke width: 3px
Animation: 1s linear infinite rotation
```

---

### Badge / Tag

**Visual Specification**

```
┌──────────┐
│  New     │
└──────────┘

Background: #DBEAFE (Light Blue)
Text: #1E40AF (Dark Blue)
Font: Inter Medium (500) 12px
Padding: 4px 10px
Border-radius: 12px (pill)
Height: 24px
```

**Color Variants**

| Type | Background | Text |
|------|-----------|------|
| Primary | #DBEAFE | #1E40AF |
| Success | #D1FAE5 | #065F46 |
| Warning | #FEF3C7 | #92400E |
| Error | #FEE2E2 | #991B1B |
| Neutral | #F1F5F9 | #475569 |

---

## Typography Components

### Heading Styles

```xaml
<!-- Heading 1 -->
<Style x:Key="Heading1Style" TargetType="TextBlock">
    <Setter Property="FontFamily" Value="{StaticResource InterFont}"/>
    <Setter Property="FontSize" Value="36"/>
    <Setter Property="FontWeight" Value="SemiBold"/>
    <Setter Property="Foreground" Value="{StaticResource TextPrimaryBrush}"/>
    <Setter Property="LineHeight" Value="43"/>
    <Setter Property="Margin" Value="0,0,0,16"/>
</Style>

<!-- Heading 2 -->
<Style x:Key="Heading2Style" TargetType="TextBlock">
    <Setter Property="FontFamily" Value="{StaticResource InterFont}"/>
    <Setter Property="FontSize" Value="30"/>
    <Setter Property="FontWeight" Value="SemiBold"/>
    <Setter Property="Foreground" Value="{StaticResource TextPrimaryBrush}"/>
    <Setter Property="LineHeight" Value="39"/>
    <Setter Property="Margin" Value="0,0,0,12"/>
</Style>

<!-- Heading 3 -->
<Style x:Key="Heading3Style" TargetType="TextBlock">
    <Setter Property="FontFamily" Value="{StaticResource InterFont}"/>
    <Setter Property="FontSize" Value="24"/>
    <Setter Property="FontWeight" Value="SemiBold"/>
    <Setter Property="Foreground" Value="{StaticResource TextPrimaryBrush}"/>
    <Setter Property="LineHeight" Value="34"/>
    <Setter Property="Margin" Value="0,0,0,12"/>
</Style>

<!-- Body Text -->
<Style x:Key="BodyTextStyle" TargetType="TextBlock">
    <Setter Property="FontFamily" Value="{StaticResource InterFont}"/>
    <Setter Property="FontSize" Value="16"/>
    <Setter Property="FontWeight" Value="Regular"/>
    <Setter Property="Foreground" Value="{StaticResource TextSecondaryBrush}"/>
    <Setter Property="LineHeight" Value="26"/>
    <Setter Property="TextWrapping" Value="Wrap"/>
</Style>

<!-- Caption -->
<Style x:Key="CaptionStyle" TargetType="TextBlock">
    <Setter Property="FontFamily" Value="{StaticResource InterFont}"/>
    <Setter Property="FontSize" Value="12"/>
    <Setter Property="FontWeight" Value="Regular"/>
    <Setter Property="Foreground" Value="{StaticResource TextTertiaryBrush}"/>
    <Setter Property="LineHeight" Value="17"/>
</Style>
```

---

## Icon Components

### Icon Specifications

**Library**: Lucide Icons or Phosphor Icons (stroke-based)

**Sizes**:
```
Small: 16x16px (dense UIs, inline text)
Medium: 20x20px (default UI actions)
Large: 24px (navigation, headers)
XLarge: 32px (feature illustrations, empty states)
```

**Stroke Weight**: 2px (consistent across all sizes)

**Colors**:
- Default: #64748B (Slate Gray)
- Active/Hover: #2563EB (Rephlo Blue)
- Success: #10B981 (Green)
- Error: #EF4444 (Red)
- Warning: #F59E0B (Amber)

---

## Layout Components

### Container

**Specifications**

```
Max-width: 1280px (desktop)
Padding: 24px (mobile), 32px (tablet), 48px (desktop)
Margin: 0 auto (centered)
```

---

### Grid System

**12-Column Grid**

```
Column width: Fluid (100% / 12)
Gutter: 24px
Container max-width: 1280px

Breakpoints:
- Mobile: 0-639px (1 column layouts)
- Tablet: 640-1023px (6-8 column layouts)
- Desktop: 1024px+ (12 column layouts)
```

---

### Stack (Vertical Spacing)

**Spacing Options**

```
Tight: 8px between items
Normal: 16px between items (default)
Relaxed: 24px between items
Loose: 32px between items
```

---

## Animation Specifications

### Transition Easing Functions

```xaml
<!-- Ease In Out (Default) -->
<KeySpline x:Key="EaseInOut">0.4, 0.0, 0.2, 1.0</KeySpline>

<!-- Ease Out (Enter) -->
<KeySpline x:Key="EaseOut">0.0, 0.0, 0.2, 1.0</KeySpline>

<!-- Ease In (Exit) -->
<KeySpline x:Key="EaseIn">0.4, 0.0, 1.0, 1.0</KeySpline>

<!-- Bounce (Playful) -->
<KeySpline x:Key="Bounce">0.68, -0.55, 0.27, 1.55</KeySpline>
```

### Common Animations

**Fade In**

```xaml
<Storyboard x:Key="FadeInStoryboard">
    <DoubleAnimation Storyboard.TargetProperty="Opacity"
                     From="0" To="1"
                     Duration="0:0:0.2"
                     EasingFunction="{StaticResource EaseOut}"/>
</Storyboard>
```

**Slide Up (Enter)**

```xaml
<Storyboard x:Key="SlideUpStoryboard">
    <DoubleAnimation Storyboard.TargetProperty="(UIElement.RenderTransform).(TranslateTransform.Y)"
                     From="20" To="0"
                     Duration="0:0:0.3"
                     EasingFunction="{StaticResource EaseOut}"/>
    <DoubleAnimation Storyboard.TargetProperty="Opacity"
                     From="0" To="1"
                     Duration="0:0:0.3"/>
</Storyboard>
```

**Scale Bounce (Button Press)**

```xaml
<Storyboard x:Key="ScaleBounceStoryboard">
    <DoubleAnimation Storyboard.TargetProperty="(UIElement.RenderTransform).(ScaleTransform.ScaleX)"
                     From="1.0" To="0.95" Duration="0:0:0.1"
                     AutoReverse="True"/>
    <DoubleAnimation Storyboard.TargetProperty="(UIElement.RenderTransform).(ScaleTransform.ScaleY)"
                     From="1.0" To="0.95" Duration="0:0:0.1"
                     AutoReverse="True"/>
</Storyboard>
```

---

## Accessibility Requirements

### Keyboard Navigation

**Tab Order**:
- Logical flow (left-to-right, top-to-bottom)
- All interactive elements focusable
- Skip navigation link for screen readers

**Focus Indicators**:
```
Outline: 3px solid #2563EB
Offset: 2px from element
Border-radius: Inherit from element
```

**Keyboard Shortcuts**:
- Enter/Space: Activate buttons
- Arrow keys: Navigate lists/menus
- Escape: Close modals/dropdowns
- Tab: Next focusable element
- Shift+Tab: Previous focusable element

---

### Screen Reader Support

**ARIA Labels**:
```xaml
<!-- Icon-only button -->
<Button AutomationProperties.Name="Settings"
        ToolTip="Open Settings">
    <SymbolIcon Symbol="Settings24"/>
</Button>

<!-- Decorative icon -->
<SymbolIcon Symbol="Star24"
            AutomationProperties.AccessibilityView="Raw"/>

<!-- Status region -->
<TextBlock AutomationProperties.LiveSetting="Polite"
           Text="Loading..."/>
```

**Required Attributes**:
- All icons: `AutomationProperties.Name` or `AccessibilityView="Raw"`
- Interactive elements: Descriptive labels
- Form inputs: Associated labels
- Status messages: `LiveSetting` property

---

### Color Contrast

**Minimum Requirements (WCAG AA)**:
- Normal text (16px): 4.5:1 contrast ratio
- Large text (18px+): 3.0:1 contrast ratio
- UI components: 3.0:1 contrast ratio

**Rephlo Compliance**:
✅ Primary text (#1E293B on #FFFFFF): 14.8:1 (AAA)
✅ Secondary text (#64748B on #FFFFFF): 4.6:1 (AA)
✅ Rephlo Blue (#2563EB on #FFFFFF): 6.2:1 (AAA for large text)
⚠️ Electric Cyan (#06B6D4 on #FFFFFF): 3.9:1 (AA for large only)

**Rule**: Never use cyan for body text or small labels

---

### Motion Preferences

**Respect System Settings**:

```xaml
<!-- Check for reduced motion preference -->
<Style x:Key="AnimatedCardStyle" TargetType="Border">
    <Style.Triggers>
        <!-- Disable animations if prefers-reduced-motion -->
        <DataTrigger Binding="{Binding SystemParameters.HighContrast}"
                     Value="True">
            <Setter Property="Effect" Value="{x:Null}"/>
            <!-- Disable storyboards -->
        </DataTrigger>
    </Style.Triggers>
</Style>
```

**Alternative**: Instant state changes instead of animated transitions

---

## Component Usage Examples

### Login Form

```xaml
<StackPanel Spacing="{StaticResource SpacingLg}">
    <!-- Heading -->
    <TextBlock Text="Sign In to Rephlo"
               Style="{StaticResource Heading2Style}"/>

    <!-- Email Input -->
    <StackPanel Spacing="{StaticResource SpacingSm}">
        <TextBlock Text="Email" Style="{StaticResource CaptionStyle}"/>
        <TextBox Style="{StaticResource TextFieldStyle}"
                 AutomationProperties.Name="Email address"
                 InputScope="EmailNameOrAddress"/>
    </StackPanel>

    <!-- Password Input -->
    <StackPanel Spacing="{StaticResource SpacingSm}">
        <TextBlock Text="Password" Style="{StaticResource CaptionStyle}"/>
        <PasswordBox Style="{StaticResource PasswordFieldStyle}"
                     AutomationProperties.Name="Password"/>
    </StackPanel>

    <!-- Actions -->
    <StackPanel Orientation="Horizontal" Spacing="{StaticResource SpacingMd}">
        <Button Content="Sign In" Style="{StaticResource ButtonPrimaryStyle}"/>
        <Button Content="Cancel" Style="{StaticResource ButtonGhostStyle}"/>
    </StackPanel>
</StackPanel>
```

---

### Command Card

```xaml
<Border Style="{StaticResource CardInteractiveStyle}">
    <Grid>
        <Grid.RowDefinitions>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="Auto"/>
        </Grid.RowDefinitions>

        <!-- Icon and Edit Button -->
        <Grid Grid.Row="0">
            <SymbolIcon Symbol="Document24" HorizontalAlignment="Left"/>
            <Button Content="✏" Style="{StaticResource IconButtonStyle}"
                    HorizontalAlignment="Right"
                    AutomationProperties.Name="Edit Command"/>
        </Grid>

        <!-- Command Name -->
        <TextBlock Grid.Row="1" Text="Write Blog Post"
                   Style="{StaticResource Heading3Style}"
                   Margin="0,12,0,4"/>

        <!-- Space Name -->
        <TextBlock Grid.Row="2" Text="Marketing"
                   Style="{StaticResource CaptionStyle}"
                   Foreground="{StaticResource TextTertiaryBrush}"/>

        <!-- Accent Border (Bottom) -->
        <Border Grid.Row="2" Height="4" VerticalAlignment="Bottom"
                Background="{StaticResource RephloBlueBrush}"
                CornerRadius="0,0,12,12"/>
    </Grid>
</Border>
```

---

## Implementation Checklist

### For Developers

**Phase 1: Foundations** (Week 1)
```
□ Import RephloColors.xaml into App.xaml
□ Define spacing scale constants
□ Define border-radius constants
□ Define shadow resources
□ Define animation durations
□ Set up Inter font family resource
```

**Phase 2: Core Components** (Week 2)
```
□ Implement Button styles (Primary, Secondary, Ghost, Icon)
□ Implement Input styles (TextField, TextArea, PasswordBox)
□ Implement Checkbox and RadioButton styles
□ Implement Dropdown/ComboBox style
□ Test all interactive states (hover, press, focus, disabled)
□ Verify keyboard navigation
```

**Phase 3: Composite Components** (Week 3)
```
□ Implement Card styles (Default, Interactive, Command)
□ Implement Navigation components (Tabs, Breadcrumbs)
□ Implement Feedback components (Toast, Badge, Spinner)
□ Implement Typography styles (Headings, Body, Caption)
□ Test component compositions
```

**Phase 4: Polish & Accessibility** (Week 4)
```
□ Add all animations and transitions
□ Implement focus indicators
□ Add ARIA labels and AutomationProperties
□ Test with screen reader (Narrator)
□ Test keyboard-only navigation
□ Verify color contrast compliance
□ Test with high contrast mode
□ Document component usage examples
```

---

## Resources & References

**Related Documents**:
- 063-rephlo-brand-narrative.md (Messaging, voice & tone)
- 064-rephlo-visual-identity.md (Logo, colors, typography)
- 065-rephlo-brand-guidelines.md (Complete brand manual)
- TextAssistant.UI/Resources/RephloColors.xaml (Color definitions)

**External Resources**:
- WPF UI Library: https://wpfui.lepo.co/
- Lucide Icons: https://lucide.dev/
- Inter Font: https://fonts.google.com/specimen/Inter
- WCAG Guidelines: https://www.w3.org/WAI/WCAG21/quickref/

**Contact**:
- Design questions: design@rephlo.io
- Development support: dev@rephlo.io

---

**Document Version**: 1.0
**Last Updated**: November 2025
**Owner**: Design & Engineering Teams
**Review Cycle**: Monthly

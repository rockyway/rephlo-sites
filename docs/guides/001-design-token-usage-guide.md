# Rephlo Design Token Usage Guide

> **Document Type**: Developer Guide
> **Created**: November 3, 2025
> **Applies To**: Frontend v1.0+
> **Related**: docs/plan/070-frontend-modernization-plan.md

---

## Overview

This guide explains how to use Rephlo's design token system in your components. The design tokens provide a consistent, brand-aligned visual language across the entire application.

---

## Shadow/Elevation System

### Available Shadows

| Token | CSS Value | Use Case | Example |
|-------|-----------|----------|---------|
| `shadow-sm` | `0 1px 2px rgba(0, 0, 0, 0.05)` | Default state | Cards, buttons |
| `shadow-md` | `0 4px 8px rgba(0, 0, 0, 0.1)` | Hover state | Interactive elements |
| `shadow-lg` | `0 8px 16px rgba(0, 0, 0, 0.12)` | Active/focused | Dropdowns, modals |
| `shadow-xl` | `0 12px 24px rgba(0, 0, 0, 0.15)` | Prominent overlays | Dialogs, toasts |

### Usage Patterns

#### Basic Elevation
```tsx
// Default card with subtle shadow
<div className="shadow-sm">...</div>
```

#### Interactive Elevation
```tsx
// Card that elevates on hover
<div className="shadow-sm hover:shadow-lg transition-shadow duration-base">
  ...
</div>
```

#### Button Elevation
```tsx
// Button with hover and active states
<button className="shadow-sm hover:shadow-md active:shadow-sm transition-shadow duration-fast">
  Click me
</button>
```

---

## Gradient System

### Available Gradients

| Token | Direction | Colors | Use Case |
|-------|-----------|--------|----------|
| `bg-gradient-rephlo` | 135deg diagonal | Blue → Cyan | Primary brand gradient |
| `bg-gradient-rephlo-vertical` | 180deg vertical | Blue → Cyan | Hero sections, backgrounds |
| `bg-gradient-navy-blue` | 135deg diagonal | Navy → Blue | Secondary gradient, contrasts |

### Usage Patterns

#### Hero Section
```tsx
<section className="bg-gradient-rephlo-vertical text-white py-20">
  <h1>Welcome to Rephlo</h1>
</section>
```

#### Gradient Text
```tsx
<h1 className="bg-gradient-rephlo bg-clip-text text-transparent">
  AI-Powered Workflow
</h1>
```

#### Gradient Border
```tsx
<div className="p-[2px] bg-gradient-rephlo rounded-lg">
  <div className="bg-white rounded-lg p-4">
    Content with gradient border
  </div>
</div>
```

#### Gradient Overlay
```tsx
<div className="relative">
  <img src="..." alt="..." />
  <div className="absolute inset-0 bg-gradient-navy-blue opacity-60" />
</div>
```

---

## Animation Timing

### Available Durations

| Token | Milliseconds | Use Case |
|-------|--------------|----------|
| `duration-fast` | 150ms | Micro-interactions (icon hover, ripples) |
| `duration-base` | 200ms | Standard UI transitions (default) |
| `duration-slow` | 300ms | Emphasized actions (modal entrance) |
| `duration-slower` | 500ms | Complex animations (page transitions) |

### Usage Patterns

#### Standard Transition
```tsx
// Default timing for most interactions
<button className="transition-colors duration-base hover:bg-blue-600">
  Hover me
</button>
```

#### Quick Feedback
```tsx
// Fast feedback for icon interactions
<svg className="transition-transform duration-fast hover:scale-110">
  ...
</svg>
```

#### Modal Entrance
```tsx
// Slower, more deliberate entrance
<dialog className="transition-all duration-slow ease-out">
  ...
</dialog>
```

---

## Easing Functions

### Available Easings

| Token | Cubic Bezier | Feel | Use Case |
|-------|--------------|------|----------|
| `ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | Smooth, natural | Default for most transitions |
| `ease-out` | `cubic-bezier(0, 0, 0.2, 1)` | Quick start, slow end | Appearing elements |
| `ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | Slow start, quick end | Dismissing elements |
| `ease-bounce` | `cubic-bezier(0.68, -0.55, 0.27, 1.55)` | Playful overshoot | Special effects, celebrations |

### Usage Patterns

#### Standard Smooth Transition
```tsx
// Natural, comfortable motion
<div className="transition-all duration-base ease-in-out">
  ...
</div>
```

#### Appearing Element
```tsx
// Quick entrance (dropdowns, tooltips)
<div className="transition-opacity duration-base ease-out opacity-0 hover:opacity-100">
  Tooltip
</div>
```

#### Dismissing Element
```tsx
// Closing modal or drawer
<aside className="transition-transform duration-slow ease-in translate-x-0">
  ...
</aside>
```

#### Playful Bounce
```tsx
// Use sparingly for celebratory effects
<button className="transition-transform duration-slow ease-bounce hover:scale-105">
  Success!
</button>
```

---

## Spacing System

### Available Spacing

| Token | Pixels | Rem | Common Use |
|-------|--------|-----|------------|
| `xs` | 4px | 0.25rem | Minimal gaps, icon spacing |
| `sm` | 8px | 0.5rem | Compact padding, tight margins |
| `md` | 12px | 0.75rem | Standard gaps, comfortable spacing |
| `lg` | 16px | 1rem | Default padding, list spacing |
| `xl` | 24px | 1.5rem | Section padding, card spacing |
| `2xl` | 32px | 2rem | Large padding, generous spacing |
| `3xl` | 48px | 3rem | Section dividers, hero padding |
| `4xl` | 64px | 4rem | Page sections, major spacing |

### Usage Patterns

#### Component Padding
```tsx
// Compact button
<button className="px-md py-xs">Compact</button>

// Standard button
<button className="px-lg py-sm">Standard</button>

// Large button
<button className="px-xl py-md">Large</button>
```

#### Layout Spacing
```tsx
// Card with comfortable padding
<div className="p-xl">
  <h3 className="mb-md">Title</h3>
  <p className="mb-lg">Content...</p>
</div>
```

#### Section Spacing
```tsx
// Page section with major spacing
<section className="py-4xl">
  <div className="container">
    ...
  </div>
</section>
```

#### Grid Gaps
```tsx
// Feature grid with medium gaps
<div className="grid grid-cols-3 gap-md">
  ...
</div>
```

---

## Common Patterns

### Interactive Button
```tsx
<button
  className={cn(
    // Base styles
    "px-lg py-sm rounded-md",
    "bg-rephlo-blue text-white",

    // Elevation and transitions
    "shadow-sm hover:shadow-md active:shadow-sm",
    "transition-all duration-base ease-out",

    // Hover effects
    "hover:bg-rephlo-blue-600",
    "active:scale-95"
  )}
>
  Click Me
</button>
```

### Interactive Card
```tsx
<div
  className={cn(
    // Base styles
    "p-xl rounded-lg bg-white",

    // Elevation changes
    "shadow-sm hover:shadow-lg",

    // Smooth transitions
    "transition-all duration-base ease-out",

    // Transform on hover
    "hover:-translate-y-1"
  )}
>
  <h3>Card Title</h3>
  <p>Card content...</p>
</div>
```

### Featured Card with Gradient Border
```tsx
<div className="relative p-[2px] bg-gradient-rephlo rounded-lg shadow-md">
  <div className="bg-white rounded-lg p-xl">
    <h3>Featured Content</h3>
    <p>This card has a gradient border...</p>
  </div>
</div>
```

### Input with Enhanced Focus
```tsx
<input
  className={cn(
    // Base styles
    "px-lg py-md rounded-md",
    "border border-gray-300",

    // Focus state with glow
    "focus:outline-none",
    "focus:ring-4 focus:ring-rephlo-blue/20",
    "focus:border-rephlo-blue",
    "focus:shadow-md",

    // Smooth transition
    "transition-all duration-fast ease-out"
  )}
  type="text"
  placeholder="Enter text..."
/>
```

### Hero Section with Gradient
```tsx
<section className="relative py-4xl bg-gradient-rephlo-vertical text-white">
  <div className="container">
    <h1 className="text-hero mb-xl">
      AI-Powered Workflow Automation
    </h1>
    <p className="text-body-lg mb-2xl">
      Streamline your business with intelligent agents
    </p>
    <button className="px-xl py-lg shadow-lg hover:shadow-xl transition-shadow duration-base">
      Get Started
    </button>
  </div>
</section>
```

### Loading Spinner with Glow
```tsx
<div
  className={cn(
    "w-12 h-12 rounded-full",
    "border-4 border-rephlo-blue border-t-transparent",
    "shadow-lg",
    "animate-spin",
    "transition-all duration-slower ease-in-out"
  )}
/>
```

---

## Best Practices

### Shadow Usage
- ✅ Use `shadow-sm` as default for elevated elements
- ✅ Increase to `shadow-md` or `shadow-lg` on hover
- ✅ Use `shadow-xl` sparingly for prominent overlays
- ❌ Avoid mixing shadow scales (e.g., `shadow-sm shadow-xl`)

### Gradient Usage
- ✅ Use gradients for hero sections, CTAs, and accents
- ✅ Use `bg-gradient-rephlo` for primary brand presence
- ✅ Use opacity to create subtle gradient effects
- ❌ Avoid using multiple gradients on the same element
- ❌ Don't overuse gradients (maintain visual hierarchy)

### Animation Timing
- ✅ Use `duration-base` (200ms) as default
- ✅ Use `duration-fast` for micro-interactions
- ✅ Use `duration-slow` for emphasized actions
- ❌ Avoid animations longer than `duration-slower` (500ms)
- ❌ Don't animate too many properties simultaneously

### Easing Functions
- ✅ Use `ease-out` for appearing elements
- ✅ Use `ease-in` for dismissing elements
- ✅ Use `ease-in-out` for most standard transitions
- ✅ Use `ease-bounce` sparingly for special effects
- ❌ Avoid mixing multiple easing functions in one transition

### Spacing System
- ✅ Always use spacing tokens (never arbitrary values like `p-[13px]`)
- ✅ Maintain 4px grid alignment
- ✅ Use consistent spacing within components
- ❌ Avoid mixing spacing scales (e.g., `p-xs m-4xl`)

---

## Accessibility Considerations

### Motion Preferences
Always respect user motion preferences:

```tsx
<div className={cn(
  // Standard animation
  "transition-all duration-base ease-out",

  // Respect reduced motion
  "motion-reduce:transition-none"
)}>
  ...
</div>
```

### Focus States
Ensure visible focus indicators:

```tsx
<button className={cn(
  "shadow-sm",

  // Clear focus ring
  "focus:outline-none focus:ring-4 focus:ring-rephlo-blue/50",

  // Smooth transition
  "transition-all duration-fast"
)}>
  Accessible Button
</button>
```

---

## Testing Checklist

When implementing design tokens:

- [ ] Verify shadow scale feels natural (subtle → prominent)
- [ ] Test gradient contrast for readability
- [ ] Ensure animations are smooth (not janky)
- [ ] Test reduced motion support
- [ ] Verify spacing maintains 4px grid
- [ ] Check focus states are clearly visible
- [ ] Test hover/active states provide clear feedback
- [ ] Verify responsive behavior at all breakpoints

---

## Browser Compatibility

All design tokens are fully compatible with:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

Gradient and shadow support is universal in modern browsers (2020+).

---

## Additional Resources

- [Tailwind CSS Documentation](https://tailwindcss.com)
- [Rephlo Visual Identity Guide](docs/plan/064-rephlo-visual-identity.md)
- [Component Library Specs](docs/plan/066-rephlo-component-library-specs.md)
- [Frontend Modernization Plan](docs/plan/070-frontend-modernization-plan.md)

---

**Document Version**: 1.0
**Last Updated**: November 3, 2025
**Next Review**: After Phase 2 completion

# Design System Migration Guide

> **Document Type**: Developer Guide
> **Created**: November 3, 2025
> **Applies To**: Frontend v1.0+
> **For**: Developers extending or modifying the design system

---

## Table of Contents

1. [When to Use This Guide](#when-to-use-this-guide)
2. [Pre-Migration Checklist](#pre-migration-checklist)
3. [Design Token Reference](#design-token-reference)
4. [Component Enhancement Patterns](#component-enhancement-patterns)
5. [Testing Requirements](#testing-requirements)
6. [Brand Compliance Verification](#brand-compliance-verification)
7. [Common Migration Scenarios](#common-migration-scenarios)
8. [Rollback Procedures](#rollback-procedures)
9. [Example Migrations](#example-migrations)

---

## When to Use This Guide

Use this guide when you need to:

- ✅ Add a new component to the design system
- ✅ Enhance an existing component with micro-interactions
- ✅ Create new component variants
- ✅ Add new design tokens (shadows, gradients, spacing, etc.)
- ✅ Update landing page sections with design system enhancements
- ✅ Migrate legacy components to use design tokens

**Do NOT use this guide for**:
- ❌ Simple text changes or content updates
- ❌ Bug fixes that don't affect design system
- ❌ Backend API changes
- ❌ Configuration updates

---

## Pre-Migration Checklist

Before starting any design system migration, verify:

### 1. Design Approval
- [ ] Design changes approved by design lead or stakeholder
- [ ] Brand compliance pre-checked
- [ ] Accessibility requirements understood

### 2. Technical Preparation
- [ ] Latest code pulled from main branch (`git pull origin master`)
- [ ] Development server running (`npm run dev`)
- [ ] All existing tests passing
- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] No ESLint warnings (`npm run lint`)

### 3. Documentation Review
- [ ] Read docs/guides/001-design-token-usage-guide.md
- [ ] Read docs/guides/002-component-enhancement-guide.md
- [ ] Review related components for patterns
- [ ] Understand brand guidelines

### 4. Backup and Branch
```bash
# Create feature branch
git checkout -b feature/your-enhancement-name

# Verify clean working directory
git status
```

---

## Design Token Reference

### When to Add New Tokens

**Add a new token IF**:
- You need a value that will be reused 3+ times
- The value represents a design decision (not implementation detail)
- The value should remain consistent across components
- The value might need to change globally in the future

**Use existing tokens IF**:
- A token already exists for your use case
- The value is within 4px of an existing spacing token
- An existing shadow level is appropriate

### How to Add New Tokens

#### Adding a New Shadow Level

**File**: `frontend/tailwind.config.ts`

```typescript
boxShadow: {
  'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  'md': '0 4px 8px 0 rgba(0, 0, 0, 0.1)',
  'lg': '0 8px 16px 0 rgba(0, 0, 0, 0.12)',
  'xl': '0 12px 24px 0 rgba(0, 0, 0, 0.15)',
  // Add new level
  '2xl': '0 16px 32px 0 rgba(0, 0, 0, 0.18)',
},
```

**When to add**: When existing elevation levels don't provide enough distinction

#### Adding a New Gradient

```typescript
backgroundImage: {
  'gradient-rephlo': 'linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)',
  'gradient-rephlo-vertical': 'linear-gradient(180deg, #2563EB 0%, #06B6D4 100%)',
  'gradient-navy-blue': 'linear-gradient(135deg, #1E293B 0%, #2563EB 100%)',
  // Add new gradient
  'gradient-custom-name': 'linear-gradient(angle, color1, color2)',
},
```

**Naming convention**: `gradient-{descriptive-name}`

#### Adding a New Spacing Level

```typescript
spacing: {
  'xs': '4px',
  'sm': '8px',
  'md': '12px',
  'lg': '16px',
  'xl': '24px',
  '2xl': '32px',
  '3xl': '48px',
  '4xl': '64px',
  // Add new level
  '5xl': '80px',
},
```

**Rule**: Use 4px grid (4, 8, 12, 16, 20, 24, 32, 48, 64, 80, etc.)

#### Adding a New Animation Duration

```typescript
transitionDuration: {
  'fast': '150ms',
  'base': '200ms',
  'slow': '300ms',
  'slower': '500ms',
  // Add new duration
  'slowest': '750ms',
},
```

**When to add**: For complex animations requiring longer duration

### Token Naming Conventions

- **Shadows**: `sm`, `md`, `lg`, `xl`, `2xl` (size-based)
- **Gradients**: `gradient-{descriptive-name}` (purpose-based)
- **Spacing**: `xs`, `sm`, `md`, `lg`, `xl`, `2xl`, etc. (t-shirt sizing)
- **Durations**: `fast`, `base`, `slow`, `slower` (speed-based)
- **Easing**: `ease-{curve-type}` (curve-based)

---

## Component Enhancement Patterns

### Micro-Interaction Template

All interactive components should follow this pattern:

```tsx
<div className={cn(
  // Base styles
  "base-classes",

  // Elevation (shadow)
  "shadow-sm hover:shadow-md active:shadow-sm",

  // Motion (transform)
  "hover:-translate-y-1 active:translate-y-0",

  // Scale feedback
  "active:scale-95",

  // Smooth transitions
  "transition-all duration-base ease-out",

  // Optional: custom classes
  className
)}>
  {children}
</div>
```

### Variant Creation Pattern

Use `class-variance-authority` for component variants:

```tsx
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const componentVariants = cva(
  // Base classes (always applied)
  "base-class-1 base-class-2",
  {
    variants: {
      variant: {
        default: "default-classes",
        interactive: "interactive-classes shadow-sm hover:shadow-lg hover:-translate-y-1",
        featured: "featured-classes border-b-4 border-rephlo-blue",
        elevated: "elevated-classes shadow-lg",
      },
      size: {
        sm: "text-sm p-sm",
        default: "text-base p-md",
        lg: "text-lg p-lg",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

interface ComponentProps extends VariantProps<typeof componentVariants> {
  className?: string;
  children: React.ReactNode;
}

export const Component: React.FC<ComponentProps> = ({
  variant,
  size,
  className,
  children
}) => {
  return (
    <div className={cn(componentVariants({ variant, size }), className)}>
      {children}
    </div>
  );
};
```

### Accessibility Requirements

All enhanced components MUST:

1. **Keyboard Accessible**
   ```tsx
   <button
     className="..."
     onKeyDown={(e) => {
       if (e.key === 'Enter' || e.key === ' ') {
         handleClick();
       }
     }}
   >
   ```

2. **Visible Focus States**
   ```tsx
   className="focus:outline-none focus-visible:ring-2 focus-visible:ring-rephlo-blue focus-visible:ring-offset-2"
   ```

3. **ARIA Labels** (for icon-only buttons)
   ```tsx
   <button aria-label="Close dialog">
     <X className="h-4 w-4" />
   </button>
   ```

4. **Semantic HTML**
   - Use `<button>` for buttons
   - Use `<a>` for links
   - Proper heading hierarchy (h1 → h2 → h3)

5. **Color Contrast**
   - Text: Minimum 4.5:1 ratio
   - UI Components: Minimum 3:1 ratio
   - Use WebAIM Contrast Checker

---

## Testing Requirements

### Build Verification

After every change:

```bash
# 1. TypeScript check
npx tsc --noEmit
# Expected: 0 errors

# 2. ESLint check
npm run lint
# Expected: 0 warnings

# 3. Production build
npm run build
# Expected: Build succeeds in < 5s

# 4. Bundle size check
# Check output - should be < 600KB total
```

### Visual Testing

1. **Run dev server**
   ```bash
   npm run dev
   ```

2. **Test at all breakpoints**
   - Mobile: 375px, 425px
   - Tablet: 768px, 1024px
   - Desktop: 1280px, 1920px

3. **Verify interactions**
   - Hover states work
   - Active states work
   - Focus states visible
   - Animations smooth (200ms)

4. **Check accessibility**
   - Tab through all elements
   - Focus indicators visible
   - Screen reader compatible

### Browser Testing

Test in:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

Verify:
- Layout correct
- Gradients display
- Shadows appear
- Animations run smoothly

### Performance Testing

```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Run Lighthouse audit in Chrome DevTools
# Target: Performance > 90, Accessibility > 90
```

---

## Brand Compliance Verification

Before finalizing any design system change, verify:

### Color Compliance

- [ ] Only brand colors used (#2563EB, #06B6D4, #1E293B)
- [ ] No off-brand colors introduced
- [ ] Gradients use approved brand gradient tokens
- [ ] Color contrast meets WCAG AA (4.5:1 for text)

### Typography Compliance

- [ ] Heading hierarchy correct (h1 → h2 → h3)
- [ ] Font weights appropriate (400, 500, 600, 700)
- [ ] Text colors use brand palette

### Spacing Compliance

- [ ] All spacing uses design tokens (no hardcoded px values)
- [ ] 4px grid system followed
- [ ] Vertical rhythm maintained
- [ ] Adequate breathing room (not cramped)

### Animation Compliance

- [ ] All transitions use `duration-base` (200ms) or approved tokens
- [ ] Easing functions use `ease-out` (natural motion)
- [ ] No jarring or excessive animations
- [ ] Respects `prefers-reduced-motion`

### Shadow Compliance

- [ ] Clear elevation hierarchy
- [ ] Only approved shadow tokens used (sm, md, lg, xl)
- [ ] Interactive states have proper elevation feedback
- [ ] No conflicting or excessive shadows

---

## Common Migration Scenarios

### Scenario 1: Enhancing Existing Component

**Goal**: Add micro-interactions to existing Card component

**Steps**:

1. **Identify current state**
   ```tsx
   // Before
   <div className="rounded-lg border bg-white p-6">
     {children}
   </div>
   ```

2. **Add design tokens**
   ```tsx
   // After
   <div className="rounded-lg border bg-white p-lg shadow-sm">
     {children}
   </div>
   ```

3. **Add micro-interactions**
   ```tsx
   // After
   <div className="rounded-lg border bg-white p-lg shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-base ease-out">
     {children}
   </div>
   ```

4. **Test and verify**
   - Build passes
   - Hover works smoothly
   - Responsive at all breakpoints

### Scenario 2: Adding New Component Variant

**Goal**: Add "featured" variant to Card component

**Steps**:

1. **Update variant definition**
   ```tsx
   const cardVariants = cva(
     "rounded-lg border bg-white",
     {
       variants: {
         variant: {
           default: "shadow-sm",
           interactive: "shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-base",
           // Add new variant
           featured: "shadow-md border-b-4 border-rephlo-blue",
         },
       },
     }
   );
   ```

2. **Update TypeScript interface**
   ```tsx
   interface CardProps extends VariantProps<typeof cardVariants> {
     // variant now includes 'featured'
   }
   ```

3. **Use new variant**
   ```tsx
   <Card variant="featured">
     Featured content
   </Card>
   ```

4. **Test thoroughly**
   - TypeScript passes (0 errors)
   - Build succeeds
   - Visual appearance correct
   - Brand compliant

### Scenario 3: Adding New Landing Page Section

**Goal**: Add "Pricing" section to landing page

**Steps**:

1. **Create component file**
   ```bash
   touch src/components/landing/Pricing.tsx
   ```

2. **Implement with design tokens**
   ```tsx
   import { Card } from '@/components/common/Card';

   export const Pricing: React.FC = () => {
     return (
       <section className="py-4xl px-lg bg-white">
         <div className="container mx-auto">
           <h2 className="text-3xl font-bold mb-2xl text-center">
             Pricing Plans
           </h2>

           <div className="grid md:grid-cols-3 gap-2xl">
             <Card variant="interactive" className="p-xl">
               {/* Pricing card content */}
             </Card>
           </div>
         </div>
       </section>
     );
   };
   ```

3. **Add to Landing page**
   ```tsx
   import { Pricing } from '@/components/landing/Pricing';

   <Pricing />
   ```

4. **Verify**
   - Responsive design works
   - Cards lift on hover
   - Spacing uses tokens
   - Brand compliant

### Scenario 4: Migrating Legacy Component

**Goal**: Update old Button to use design system

**Before**:
```tsx
<button className="px-4 py-2 bg-blue-600 text-white rounded">
  Click Me
</button>
```

**After**:
```tsx
import { Button } from '@/components/common/Button';

<Button variant="primary">
  Click Me
</Button>
```

**Benefits**:
- Uses design tokens (p-md instead of px-4 py-2)
- Brand color (#2563EB instead of blue-600)
- Includes micro-interactions (shadow elevation, scale feedback)
- Accessible (focus states, ARIA labels)
- Consistent with design system

---

## Rollback Procedures

If migration causes issues:

### Git Rollback

```bash
# Discard uncommitted changes
git checkout .

# Revert specific file
git checkout HEAD -- path/to/file.tsx

# Revert last commit (if committed)
git revert HEAD

# Hard reset to previous commit (destructive)
git reset --hard HEAD~1
```

### Incremental Rollback

If only part of migration is problematic:

1. **Identify problematic component**
2. **Revert that component only**
   ```bash
   git checkout HEAD -- src/components/common/Component.tsx
   ```
3. **Keep successful changes**
4. **Debug and retry problematic component**

### Emergency Rollback

If production is affected:

1. **Immediately revert to last known good commit**
   ```bash
   git revert <commit-hash>
   git push origin master
   ```

2. **Trigger deployment of reverted code**
3. **Debug issue in separate branch**
4. **Re-deploy when fixed**

---

## Example Migrations

### Example 1: Adding Hover Elevation to Testimonial Cards

**File**: `src/components/landing/Testimonials.tsx`

**Before**:
```tsx
<div className="rounded-lg border bg-white p-6">
  <p className="text-gray-600 mb-4">{quote}</p>
  <p className="font-semibold">{author}</p>
</div>
```

**After**:
```tsx
<Card variant="featured" className="p-xl">
  <p className="text-gray-600 mb-lg">{quote}</p>
  <p className="font-semibold">{author}</p>
</Card>
```

**Changes**:
- Replaced `div` with `Card` component
- Used `variant="featured"` for blue bottom border
- Replaced `p-6` with `p-xl` (design token)
- Replaced `mb-4` with `mb-lg` (design token)

**Result**: Testimonials now have featured styling with 4px blue border and design token spacing

### Example 2: Adding Brand Gradient to Hero Section

**File**: `src/components/landing/Hero.tsx`

**Before**:
```tsx
<section className="bg-gradient-to-br from-blue-600 to-cyan-500">
  <div className="container mx-auto py-20 px-4">
    {/* Hero content */}
  </div>
</section>
```

**After**:
```tsx
<section className="bg-gradient-rephlo-vertical">
  <div className="container mx-auto py-4xl px-lg">
    {/* Hero content */}
  </div>
</section>
```

**Changes**:
- Replaced Tailwind gradient with brand gradient token
- Replaced `py-20` with `py-4xl` (64px, design token)
- Replaced `px-4` with `px-lg` (16px, design token)

**Result**: Hero uses exact brand gradient colors and spacing tokens

### Example 3: Adding Interactive State to Feature Cards

**File**: `src/components/landing/Features.tsx`

**Before**:
```tsx
<div className="rounded-lg border bg-white p-6">
  <div className="mb-4">
    <Icon className="w-12 h-12 text-blue-600" />
  </div>
  <h3 className="text-xl font-semibold mb-2">{title}</h3>
  <p className="text-gray-600">{description}</p>
</div>
```

**After**:
```tsx
<Card variant="interactive" className="p-lg group">
  <div className="mb-lg">
    <Icon className="w-12 h-12 text-rephlo-blue group-hover:scale-110 transition-transform duration-base" />
  </div>
  <h3 className="text-xl font-semibold mb-sm">{title}</h3>
  <p className="text-gray-600">{description}</p>
</Card>
```

**Changes**:
- Replaced `div` with `Card variant="interactive"`
- Added `group` class for icon interaction
- Icon scales on card hover
- Replaced all spacing with design tokens
- Replaced `text-blue-600` with `text-rephlo-blue`

**Result**: Feature cards lift on hover, icons scale smoothly, uses design system

---

## Best Practices

### Do's ✅

- Always use design tokens for spacing, shadows, gradients
- Test at all breakpoints (375px, 768px, 1024px, 1280px)
- Verify accessibility (keyboard, focus, ARIA)
- Run build before committing (`npm run build`)
- Check TypeScript (`npx tsc --noEmit`)
- Follow component enhancement patterns
- Document new tokens in code comments
- Commit frequently with descriptive messages

### Don'ts ❌

- Don't use hardcoded pixel values (use tokens)
- Don't introduce off-brand colors
- Don't skip accessibility requirements
- Don't commit without testing
- Don't create tokens for one-off values
- Don't break backward compatibility without approval
- Don't skip responsive design testing
- Don't commit broken builds

---

## Need Help?

If you encounter issues during migration:

1. **Check this guide** for similar scenarios
2. **Review existing examples** in `src/components/`
3. **Read design token guide** (docs/guides/001-design-token-usage-guide.md)
4. **Ask the team** in Slack or team chat
5. **Review QA report** (docs/analysis/002-phase5-comprehensive-qa-test-report.md)

---

**Document Version**: 1.0
**Last Updated**: November 3, 2025
**Maintained By**: Frontend Team
**Questions?**: Check docs/README.md

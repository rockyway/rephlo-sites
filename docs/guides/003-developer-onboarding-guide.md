# Rephlo Frontend - Developer Onboarding Guide

> **Document Type**: Developer Guide
> **Created**: November 3, 2025
> **Applies To**: Frontend v1.0+
> **For**: New developers joining the Rephlo frontend team

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Getting Started](#getting-started)
4. [Design System Overview](#design-system-overview)
5. [Development Workflow](#development-workflow)
6. [Code Organization](#code-organization)
7. [Design Principles](#design-principles)
8. [Common Tasks](#common-tasks)
9. [Troubleshooting](#troubleshooting)
10. [Resources](#resources)

---

## Project Overview

### What is Rephlo?

Rephlo is an AI-powered text rewriting desktop application that helps users transform text with different tones and styles. This frontend serves as the marketing and support website.

### Frontend Purpose

- **Landing Page**: Showcase Rephlo's features and benefits
- **Download Tracking**: Monitor app downloads by OS
- **User Feedback**: Collect user feedback and suggestions
- **Admin Dashboard**: Display metrics and analytics
- **Support Pages**: Privacy policy, terms of service

### Project Status

- **Version**: 1.0.0
- **Status**: Production Ready (96/100 QA score)
- **Design Maturity**: 9/10 (93%)
- **Accessibility**: WCAG AA compliant
- **Performance**: Lighthouse > 90 (estimated)

---

## Technology Stack

### Core Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.2.0 | UI framework |
| **TypeScript** | 5.2.2 | Type safety |
| **Vite** | 5.0.8 | Build tool |
| **TailwindCSS** | 3.3.6 | Styling |
| **React Router** | 6.20.1 | Client-side routing |

### UI Libraries

- **Radix UI**: Accessible component primitives (Dialog, Label, Separator, Slot, Toast)
- **Lucide React**: Icon library (0.294.0)
- **class-variance-authority**: Component variant management
- **clsx**: Conditional className utility
- **tailwind-merge**: Merge Tailwind classes intelligently

### Development Tools

- **ESLint**: Code linting with TypeScript support
- **TypeScript**: Strict mode enabled
- **Autoprefixer**: CSS vendor prefixes
- **PostCSS**: CSS processing
- **tailwindcss-animate**: Animation utilities

---

## Getting Started

### Prerequisites

- **Node.js**: v18+ (recommended: v18.17.0 or later)
- **npm**: v9+ (comes with Node.js)
- **Git**: For version control
- **VS Code**: Recommended editor (with extensions below)

### Recommended VS Code Extensions

- **ES7+ React/Redux/React-Native snippets**
- **Tailwind CSS IntelliSense**
- **ESLint**
- **Prettier - Code formatter**
- **TypeScript Vue Plugin (Volar)**

### Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd rephlo-sites/frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### Available Commands

```bash
# Development
npm run dev          # Start dev server (http://localhost:5173)

# Build
npm run build        # Build for production (dist/ folder)
npm run preview      # Preview production build

# Code Quality
npm run lint         # Run ESLint
npx tsc --noEmit     # Type check TypeScript
```

### First Run Verification

After `npm run dev`, visit http://localhost:5173 and verify:
- Landing page loads correctly
- No console errors
- Images and icons display
- Navigation works
- Responsive design works (resize browser)

---

## Design System Overview

### Design Tokens

Rephlo uses a comprehensive design token system for consistency.

#### Shadow Elevation (4 levels)

```tsx
shadow-sm   // 0 1px 2px rgba(0,0,0,0.05)  - Default
shadow-md   // 0 4px 8px rgba(0,0,0,0.1)   - Hover
shadow-lg   // 0 8px 16px rgba(0,0,0,0.12) - Active
shadow-xl   // 0 12px 24px rgba(0,0,0,0.15)- Prominent
```

#### Brand Gradients (3 variants)

```tsx
bg-gradient-rephlo           // Diagonal (135deg)
bg-gradient-rephlo-vertical  // Vertical (180deg)
bg-gradient-navy-blue        // Navy to blue diagonal
```

#### Animation Timing (4 speeds)

```tsx
duration-fast    // 150ms - Quick feedback
duration-base    // 200ms - Standard
duration-slow    // 300ms - Deliberate
duration-slower  // 500ms - Complex animations
```

#### Easing Functions (4 curves)

```tsx
ease-in-out  // Smooth, natural
ease-out     // Quick entrance
ease-in      // Slow entrance
ease-bounce  // Playful bounce
```

#### Spacing (8 levels on 4px grid)

```tsx
xs   // 4px    - Icon margins
sm   // 8px    - Small gaps
md   // 12px   - Component spacing
lg   // 16px   - Standard spacing
xl   // 24px   - Generous spacing
2xl  // 32px   // Grid gaps
3xl  // 48px   // Section spacing
4xl  // 64px   // Major spacing
```

### Component Library

#### Enhanced Components (5 core)

1. **Button** (frontend/src/components/common/Button.tsx)
   - 4 variants: primary, secondary, ghost, destructive
   - 4 sizes: sm, default, lg, icon
   - Elevation feedback (shadow-sm → hover:shadow-md)
   - Scale feedback (active:scale-95)

2. **Card** (frontend/src/components/common/Card.tsx)
   - 4 variants: default, interactive, featured, elevated
   - Interactive: Lifts on hover (-translate-y-1)
   - Featured: 4px blue bottom border
   - Elevated: Higher default shadow

3. **Input** (frontend/src/components/common/Input.tsx)
   - Enhanced focus state (ring + shadow glow)
   - Error state (red border, pink background)
   - Disabled state support

4. **Header** (frontend/src/components/layout/Header.tsx)
   - Active link indicators (bottom border + shadow)
   - Logo with gradient enhancement
   - Responsive navigation

5. **LoadingSpinner** (frontend/src/components/common/LoadingSpinner.tsx)
   - 3 sizes: sm, md, lg
   - Glow effect (shadow-lg)
   - Smooth rotation (duration-slow)

### Usage Reference

See **docs/guides/001-design-token-usage-guide.md** for complete design token documentation with code examples.

See **docs/guides/002-component-enhancement-guide.md** for component enhancement patterns.

---

## Development Workflow

### Daily Workflow

1. **Pull latest changes**
   ```bash
   git pull origin master
   ```

2. **Start dev server**
   ```bash
   npm run dev
   ```

3. **Make changes**
   - Edit files in `src/`
   - Hot reload updates automatically
   - Check browser for visual changes

4. **Verify code quality**
   ```bash
   npm run lint              # Check linting
   npx tsc --noEmit          # Check TypeScript
   npm run build             # Verify production build
   ```

5. **Commit changes**
   ```bash
   git add .
   git commit -m "feat: description of changes"
   git push origin your-branch
   ```

### Creating a Feature Branch

```bash
git checkout -b feature/your-feature-name
# Make changes
git add .
git commit -m "feat: implement your feature"
git push origin feature/your-feature-name
# Create pull request on GitHub
```

### Code Review Process

1. Create pull request on GitHub
2. Assign reviewers
3. Address feedback
4. Ensure CI passes (build, lint, type check)
5. Merge when approved

---

## Code Organization

### Directory Structure

```
frontend/
├── public/              # Static assets (favicon, images)
├── src/
│   ├── components/      # React components
│   │   ├── common/      # Reusable components (Button, Card, Input)
│   │   ├── layout/      # Layout components (Header, Footer)
│   │   └── landing/     # Landing page sections
│   ├── hooks/           # Custom React hooks
│   ├── pages/           # Route pages (Landing, Admin, etc.)
│   ├── services/        # API services (axios)
│   ├── styles/          # Global styles (globals.css)
│   ├── types/           # TypeScript types/interfaces
│   ├── lib/             # Utilities (cn function)
│   ├── App.tsx          # App root component
│   └── main.tsx         # Entry point
├── tailwind.config.ts   # Tailwind configuration
├── tsconfig.json        # TypeScript configuration
├── vite.config.ts       # Vite configuration
└── package.json         # Dependencies and scripts
```

### File Naming Conventions

- **Components**: PascalCase (e.g., `Button.tsx`, `HeroSection.tsx`)
- **Utilities**: camelCase (e.g., `utils.ts`, `apiClient.ts`)
- **Types**: PascalCase (e.g., `types.ts`, `interfaces.ts`)
- **Styles**: kebab-case (e.g., `globals.css`)

### Component Structure

```tsx
// Standard component structure
import React from 'react';
import { cn } from '@/lib/utils';

interface ComponentProps {
  // Props definition
  variant?: 'default' | 'primary';
  className?: string;
  children: React.ReactNode;
}

export const Component: React.FC<ComponentProps> = ({
  variant = 'default',
  className,
  children
}) => {
  return (
    <div className={cn(
      "base-classes",
      variant === 'primary' && "variant-classes",
      className
    )}>
      {children}
    </div>
  );
};
```

---

## Design Principles

### Brand Guidelines

- **Primary Color**: Rephlo Blue (#2563EB)
- **Accent Color**: Electric Cyan (#06B6D4)
- **Secondary Color**: Deep Navy (#1E293B)

### Visual Language

- **Modern**: Clean, professional, contemporary
- **AI-Powered**: Sophisticated, intelligent, advanced
- **Approachable**: Friendly, trustworthy, accessible

### Accessibility Requirements

- **WCAG AA compliance** required for all features
- **Color contrast**: Minimum 4.5:1 for text, 3:1 for UI components
- **Keyboard navigation**: All interactive elements must be keyboard accessible
- **Focus indicators**: Visible on all focusable elements
- **ARIA labels**: Required for icon-only buttons
- **Semantic HTML**: Proper heading hierarchy (h1 → h2 → h3)

### Performance Standards

- **Build time**: < 5 seconds
- **Bundle size**: < 600KB total (gzipped)
- **Lighthouse Performance**: > 90
- **Lighthouse Accessibility**: > 90

### Code Quality Standards

- **TypeScript**: Strict mode enabled, 0 errors
- **ESLint**: 0 warnings
- **No console errors**: In production build
- **Responsive design**: Mobile-first, 375px minimum
- **Cross-browser**: Chrome, Firefox, Safari, Edge

---

## Common Tasks

### Adding a New Component

1. **Create component file**
   ```bash
   # Create in appropriate directory
   touch src/components/common/NewComponent.tsx
   ```

2. **Define component structure**
   ```tsx
   import React from 'react';
   import { cn } from '@/lib/utils';

   interface NewComponentProps {
     className?: string;
   }

   export const NewComponent: React.FC<NewComponentProps> = ({
     className
   }) => {
     return (
       <div className={cn("base-styles", className)}>
         Content
       </div>
     );
   };
   ```

3. **Use design tokens**
   - Spacing: Use `xs`, `sm`, `md`, `lg`, `xl`, `2xl`, `3xl`, `4xl`
   - Shadows: Use `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl`
   - Transitions: Use `duration-base ease-out`

4. **Export from index** (if creating an index file)
   ```tsx
   export { NewComponent } from './NewComponent';
   ```

### Using Design Tokens

**Spacing Example**:
```tsx
<div className="p-lg mb-xl gap-2xl">
  {/* 16px padding, 24px margin-bottom, 32px gap */}
</div>
```

**Shadow Example**:
```tsx
<button className="shadow-sm hover:shadow-md transition-shadow duration-base">
  {/* Elevates on hover */}
</button>
```

**Gradient Example**:
```tsx
<section className="bg-gradient-rephlo">
  {/* Diagonal brand gradient background */}
</section>
```

### Implementing Micro-Interactions

**Hover Elevation**:
```tsx
<div className="shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-base ease-out">
  Interactive Card
</div>
```

**Button Feedback**:
```tsx
<button className="shadow-sm hover:shadow-md active:shadow-sm active:scale-95 transition-all duration-base ease-out">
  Click Me
</button>
```

**Icon Hover**:
```tsx
<div className="group">
  <div className="group-hover:scale-110 transition-transform duration-base">
    <Icon />
  </div>
</div>
```

### Testing Responsive Design

1. **Use browser DevTools**
   - Open DevTools (F12)
   - Toggle device toolbar (Ctrl+Shift+M)
   - Test at 375px, 768px, 1024px, 1280px

2. **Verify breakpoints**
   ```tsx
   // Mobile-first approach
   <div className="
     flex flex-col      // Mobile: column
     md:flex-row        // Tablet: row
     lg:gap-2xl         // Desktop: larger gap
   ">
   ```

3. **Check touch targets**
   - Minimum 44x44px on mobile
   - Use `p-sm` or `p-md` for adequate touch area

---

## Troubleshooting

### Common Issues

#### Build Errors

**Issue**: `Module not found` error
**Solution**: Check import paths, ensure file exists
```tsx
// Correct
import { Button } from '@/components/common/Button';

// Wrong
import { Button } from '@/components/Button';
```

**Issue**: TypeScript errors
**Solution**: Run `npx tsc --noEmit` to see all errors, fix one by one

#### TypeScript Errors

**Issue**: `Property 'X' does not exist on type 'Y'`
**Solution**: Add property to interface or type definition

**Issue**: `Type 'X' is not assignable to type 'Y'`
**Solution**: Check type compatibility, add type assertion if needed

#### Styling Issues

**Issue**: Tailwind classes not applying
**Solution**:
1. Check `tailwind.config.ts` includes file pattern
2. Restart dev server (`npm run dev`)
3. Clear browser cache

**Issue**: Custom classes not working
**Solution**: Define in `globals.css` or use arbitrary values `p-[20px]`

#### Hot Reload Not Working

**Solution**:
1. Stop dev server (Ctrl+C)
2. Delete `node_modules/.vite` cache
3. Restart dev server (`npm run dev`)

### Getting Help

1. **Check documentation**: `docs/guides/` folder
2. **Search codebase**: Use VS Code search (Ctrl+Shift+F)
3. **Ask team**: Slack channel or team chat
4. **Review examples**: Check existing components for patterns

---

## Resources

### Internal Documentation

- **Design Token Guide**: docs/guides/001-design-token-usage-guide.md
- **Component Guide**: docs/guides/002-component-enhancement-guide.md
- **Migration Guide**: docs/guides/004-design-system-migration-guide.md
- **Phase Completion Reports**: docs/progress/
- **QA Test Report**: docs/analysis/002-phase5-comprehensive-qa-test-report.md
- **Project Status**: FRONTEND_MODERNIZATION_STATUS.md

### External Libraries

- **React Docs**: https://react.dev/
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/
- **TailwindCSS Docs**: https://tailwindcss.com/docs
- **Radix UI**: https://www.radix-ui.com/
- **Lucide Icons**: https://lucide.dev/
- **Vite Docs**: https://vitejs.dev/

### Helpful Tools

- **Component Dev Tools**: React DevTools browser extension
- **Accessibility**: axe DevTools browser extension
- **Performance**: Lighthouse in Chrome DevTools
- **Color Contrast**: WebAIM Contrast Checker

---

## Next Steps

After completing this guide:

1. **Clone and run** the project locally
2. **Explore the codebase** starting with `src/App.tsx`
3. **Review landing page** sections in `src/components/landing/`
4. **Study enhanced components** in `src/components/common/`
5. **Read design token guide** for styling patterns
6. **Make a small change** (e.g., update button text) to test workflow
7. **Review pull requests** to see code review standards

---

## Welcome to the Team!

You're now ready to contribute to the Rephlo frontend. The codebase is production-ready with excellent code quality, comprehensive design system, and strong accessibility standards.

If you have questions, check the documentation first, then reach out to the team. Happy coding!

---

**Document Version**: 1.0
**Last Updated**: November 3, 2025
**Maintained By**: Frontend Team
**Questions?**: Check docs/README.md or ask in team chat

import type { Config } from 'tailwindcss'

/**
 * Rephlo Design Token System
 *
 * Shadow Scale (elevation):
 * - sm: subtle shadows (default state)
 * - md: elevated state (hover)
 * - lg: interactive feedback
 * - xl: overlay/prominent
 *
 * Gradient System:
 * - gradient-rephlo: primary brand gradient (135deg diagonal)
 * - gradient-rephlo-vertical: vertical variant (180deg top-to-bottom)
 * - gradient-navy-blue: secondary gradient (navy to blue)
 *
 * Animation Timing:
 * - fast: 150ms (quick feedback for micro-interactions)
 * - base: 200ms (standard interaction timing)
 * - slow: 300ms (deliberate, emphasized actions)
 * - slower: 500ms (complex animations and state changes)
 *
 * Easing Functions:
 * - in-out: smooth, natural motion (default for most interactions)
 * - out: quick entrance (use for appearing elements)
 * - in: slow entrance (use for dismissing elements)
 * - bounce: playful, energetic (use sparingly for special effects)
 *
 * Spacing Scale:
 * - Based on 4px base unit for consistent visual rhythm
 * - xs (4px) through 4xl (64px) for comprehensive spacing needs
 */

export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        // Brand Colors (from Rephlo Visual Identity)
        'rephlo-blue': {
          DEFAULT: '#2563EB',
          50: '#EBF2FE',
          100: '#D6E4FD',
          200: '#AFCAFB',
          300: '#87AFF9',
          400: '#5F95F7',
          500: '#2563EB', // Primary
          600: '#1E4FDB',
          700: '#1840AF',
          800: '#123183',
          900: '#0C2257',
        },
        'deep-navy': {
          DEFAULT: '#1E293B',
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B', // Secondary
          900: '#0F172A',
        },
        'electric-cyan': {
          DEFAULT: '#06B6D4',
          50: '#ECFEFF',
          100: '#CFFAFE',
          200: '#A5F3FC',
          300: '#67E8F9',
          400: '#22D3EE',
          500: '#06B6D4', // Accent
          600: '#0891B2',
          700: '#0E7490',
          800: '#155E75',
          900: '#164E63',
        },
        // Semantic Colors
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        // Typography scale from visual identity
        'hero': ['48px', { lineHeight: '1.1', fontWeight: '700' }],
        'h1': ['36px', { lineHeight: '1.2', fontWeight: '600' }],
        'h2': ['30px', { lineHeight: '1.3', fontWeight: '600' }],
        'h3': ['24px', { lineHeight: '1.4', fontWeight: '600' }],
        'h4': ['20px', { lineHeight: '1.4', fontWeight: '500' }],
        'body-lg': ['18px', { lineHeight: '1.6', fontWeight: '400' }],
        'body': ['16px', { lineHeight: '1.6', fontWeight: '400' }],
        'body-sm': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        'caption': ['12px', { lineHeight: '1.4', fontWeight: '400' }],
      },
      borderRadius: {
        lg: '12px',
        md: '8px',
        sm: '6px',
      },
      // Shadow/Elevation Scale
      // Usage: shadow-sm (default), shadow-md (hover), shadow-lg (interactive), shadow-xl (overlay)
      boxShadow: {
        sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
        md: '0 4px 8px rgba(0, 0, 0, 0.1)',
        lg: '0 8px 16px rgba(0, 0, 0, 0.12)',
        xl: '0 12px 24px rgba(0, 0, 0, 0.15)',
      },
      // Gradient System
      // Usage: bg-gradient-rephlo, bg-gradient-rephlo-vertical, bg-gradient-navy-blue
      backgroundImage: {
        'gradient-rephlo': 'linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)',
        'gradient-rephlo-vertical': 'linear-gradient(180deg, #2563EB 0%, #06B6D4 100%)',
        'gradient-navy-blue': 'linear-gradient(135deg, #1E293B 0%, #2563EB 100%)',
      },
      // Animation Timing Scale
      // Usage: duration-fast, duration-base, duration-slow, duration-slower
      transitionDuration: {
        fast: '150ms',
        base: '200ms',
        slow: '300ms',
        slower: '500ms',
      },
      // Easing Functions
      // Usage: ease-in-out, ease-out, ease-in, ease-bounce
      transitionTimingFunction: {
        'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
        out: 'cubic-bezier(0, 0, 0.2, 1)',
        in: 'cubic-bezier(0.4, 0, 1, 1)',
        bounce: 'cubic-bezier(0.68, -0.55, 0.27, 1.55)',
      },
      // Enhanced Spacing Scale (4px base unit)
      // Usage: p-xs, m-sm, gap-md, etc.
      spacing: {
        xs: '0.25rem',   // 4px
        sm: '0.5rem',    // 8px
        md: '0.75rem',   // 12px
        lg: '1rem',      // 16px
        xl: '1.5rem',    // 24px
        '2xl': '2rem',   // 32px
        '3xl': '3rem',   // 48px
        '4xl': '4rem',   // 64px
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config

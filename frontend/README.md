# Rephlo Frontend

A modern React + TypeScript frontend for the Rephlo Branding Website, built with Vite, TailwindCSS, and shadcn/ui components.

## Features

- **Landing Page**: Hero, Features, Target Audience, Testimonials, CTA sections
- **Admin Dashboard**: Real-time metrics, download stats, feedback management
- **Feedback Form**: User feedback submission with validation
- **Responsive Design**: Mobile-first, works on all screen sizes
- **Brand Compliant**: Follows Rephlo visual identity and brand guidelines
- **Type-Safe**: Full TypeScript support with strict typing
- **Accessible**: WCAG AA compliant components

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **TailwindCSS** - Utility-first styling
- **Radix UI** - Accessible component primitives
- **Lucide React** - Icon library
- **React Router** - Client-side routing
- **Axios** - HTTP client

## Project Structure

```
src/
├── components/
│   ├── common/          # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Textarea.tsx
│   │   ├── Badge.tsx
│   │   └── LoadingSpinner.tsx
│   ├── layout/          # Layout components
│   │   ├── Header.tsx
│   │   └── Footer.tsx
│   ├── landing/         # Landing page sections
│   │   ├── Hero.tsx
│   │   ├── Features.tsx
│   │   ├── TargetAudience.tsx
│   │   ├── Testimonials.tsx
│   │   ├── CTA.tsx
│   │   └── FeedbackForm.tsx
│   └── admin/           # Admin dashboard components
│       ├── MetricsCard.tsx
│       └── FeedbackList.tsx
├── pages/               # Page components
│   ├── Landing.tsx
│   ├── Admin.tsx
│   ├── Privacy.tsx
│   └── Terms.tsx
├── hooks/               # Custom React hooks
│   ├── useFeedback.ts
│   ├── useMetrics.ts
│   └── useDownload.ts
├── services/            # API services
│   └── api.ts
├── types/               # TypeScript types
│   └── index.ts
├── lib/                 # Utilities
│   └── utils.ts
├── App.tsx              # Root component
├── main.tsx             # Entry point
└── index.css            # Global styles
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Backend server running on port 3001 (or set `VITE_API_URL`)

### Installation

```bash
npm install
```

### Development

Start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:5173` (or another port if 5173 is in use).

### Build

Build for production:

```bash
npm run build
```

The built files will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Environment Variables

Create a `.env` file:

```env
VITE_API_URL=http://localhost:3001
```

## Component Library

### Buttons

```tsx
import { Button } from '@/components/common/Button';

<Button variant="primary" size="lg">Download</Button>
<Button variant="secondary">Learn More</Button>
<Button variant="ghost">Cancel</Button>
```

### Cards

```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/common/Card';

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    Content goes here
  </CardContent>
</Card>
```

### Forms

```tsx
import Input from '@/components/common/Input';
import Textarea from '@/components/common/Textarea';

<Input type="email" placeholder="Enter email" />
<Textarea placeholder="Your message" rows={5} />
```

### Badges

```tsx
import Badge from '@/components/common/Badge';

<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>
```

## Hooks

### useMetrics

Fetch metrics from the admin API:

```tsx
import { useMetrics } from '@/hooks/useMetrics';

const { metrics, isLoading, error, refetch } = useMetrics();
```

### useFeedback

Submit user feedback:

```tsx
import { useFeedback } from '@/hooks/useFeedback';

const { submitFeedback, isSubmitting, error, success } = useFeedback();

await submitFeedback({
  message: 'Great product!',
  email: 'user@example.com'
});
```

### useDownload

Track downloads:

```tsx
import { useDownload } from '@/hooks/useDownload';

const { trackDownload, isTracking } = useDownload();

await trackDownload('windows');
```

## Styling

### TailwindCSS Configuration

Brand colors are configured in `tailwind.config.ts`:

- **Rephlo Blue**: `#2563EB` - Primary brand color
- **Deep Navy**: `#1E293B` - Secondary color
- **Electric Cyan**: `#06B6D4` - Accent color

### Typography Scale

- `text-hero`: 48px, bold
- `text-h1`: 36px, semibold
- `text-h2`: 30px, semibold
- `text-h3`: 24px, semibold
- `text-body`: 16px
- `text-caption`: 12px

## Responsive Design

Mobile-first approach with breakpoints:

- `sm`: 640px+
- `md`: 768px+
- `lg`: 1024px+
- `xl`: 1280px+

## Accessibility

All components follow WCAG AA guidelines:

- Proper ARIA labels
- Keyboard navigation support
- Focus indicators
- Color contrast compliance
- Screen reader support

## API Integration

The frontend connects to the backend API at `VITE_API_URL`:

- `GET /api/version` - Get version info
- `POST /api/track-download` - Track download
- `POST /api/feedback` - Submit feedback
- `GET /admin/metrics` - Get metrics (admin)

See `src/services/api.ts` for implementation.

## Routes

- `/` - Landing page
- `/admin` - Admin dashboard
- `/privacy` - Privacy policy
- `/terms` - Terms of service

## Performance

- Production build size: ~515KB (151KB gzipped)
- Lighthouse score target: >85
- First Contentful Paint: <2s
- Time to Interactive: <3s

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

Copyright © 2025 Rephlo. All rights reserved.

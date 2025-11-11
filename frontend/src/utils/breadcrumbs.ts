/**
 * Breadcrumb Utilities
 *
 * Helper functions to generate breadcrumbs from pathname
 */

import { Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string; // Optional for current page (last item)
  icon?: React.ComponentType<{ className?: string }>;
}

/**
 * Path segment to human-readable label mapping
 */
const pathLabelMap: Record<string, string> = {
  // Root
  admin: 'Admin',

  // User management
  users: 'Users',

  // Subscriptions
  subscriptions: 'Subscription Management',
  billing: 'Billing Dashboard',
  credits: 'Credit Management',

  // Licenses
  licenses: 'License Management',
  devices: 'Device Activations',
  prorations: 'Proration Tracking',

  // Coupons & Campaigns
  coupons: 'Coupons & Campaigns',
  campaigns: 'Campaign Management',
  calendar: 'Campaign Calendar',
  analytics: 'Coupon Analytics',
  fraud: 'Fraud Detection',

  // Profitability
  profitability: 'Profitability',
  margins: 'Margin Tracking',
  pricing: 'Pricing Configuration',
  simulator: 'Pricing Simulator',
  'vendor-prices': 'Vendor Price Monitoring',

  // Models
  models: 'Model Tier Management',

  // Analytics (when under /admin/analytics)
  revenue: 'Revenue Analytics',

  // Settings
  settings: 'Settings',
};

/**
 * Group name mapping for parent navigation
 */
const groupMap: Record<string, string> = {
  '/admin/subscriptions': 'Subscriptions',
  '/admin/billing': 'Subscriptions',
  '/admin/credits': 'Subscriptions',

  '/admin/licenses': 'Licenses',
  '/admin/licenses/devices': 'Licenses',
  '/admin/licenses/prorations': 'Licenses',

  '/admin/coupons': 'Coupons & Campaigns',
  '/admin/coupons/campaigns': 'Coupons & Campaigns',
  '/admin/coupons/calendar': 'Coupons & Campaigns',
  '/admin/coupons/analytics': 'Coupons & Campaigns',
  '/admin/coupons/fraud': 'Coupons & Campaigns',

  '/admin/profitability/margins': 'Profitability',
  '/admin/profitability/pricing': 'Profitability',
  '/admin/profitability/simulator': 'Profitability',
  '/admin/profitability/vendor-prices': 'Profitability',

  '/admin/analytics': 'Analytics',
  '/admin/analytics/revenue': 'Analytics',
};

/**
 * Generate breadcrumbs from pathname
 * @param pathname - Current pathname (e.g., '/admin/coupons/analytics')
 * @returns Array of breadcrumb items
 */
export function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const breadcrumbs: BreadcrumbItem[] = [];

  // Remove trailing slash
  const cleanPath = pathname.replace(/\/$/, '');

  // Split path into segments
  const segments = cleanPath.split('/').filter(Boolean);

  // Handle root /admin
  if (segments.length === 0 || (segments.length === 1 && segments[0] === 'admin')) {
    return [
      { label: 'Dashboard', href: '/admin', icon: Home },
    ];
  }

  // Add Admin home
  breadcrumbs.push({ label: 'Admin', href: '/admin', icon: Home });

  // Build path incrementally
  let currentPath = '';

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    currentPath += `/${segment}`;

    // Skip 'admin' segment as we already added it
    if (segment === 'admin') {
      continue;
    }

    // Check if this is the last segment (current page)
    const isLast = i === segments.length - 1;

    // Get label from map or capitalize segment
    let label = pathLabelMap[segment] || capitalizeSegment(segment);

    // For dynamic routes (e.g., /users/:id), show ID
    if (segment.match(/^[a-f0-9-]{36}$/)) {
      label = `Details`;
    }

    // Add breadcrumb
    breadcrumbs.push({
      label,
      href: isLast ? undefined : currentPath, // No href for current page
    });
  }

  // Special handling for nested routes with groups
  // If we're on a page that belongs to a group, insert group breadcrumb
  const group = groupMap[cleanPath];
  if (group && breadcrumbs.length >= 2) {
    const lastBreadcrumb = breadcrumbs[breadcrumbs.length - 1];

    // Check if we need to insert a group breadcrumb
    // Only insert if the second-to-last breadcrumb isn't already the group
    if (breadcrumbs[breadcrumbs.length - 2]?.label !== group) {
      // Remove the last breadcrumb temporarily
      breadcrumbs.pop();

      // Insert group breadcrumb
      breadcrumbs.push({
        label: group,
        // Don't provide href for groups - they're not navigable
      });

      // Re-add the last breadcrumb
      breadcrumbs.push(lastBreadcrumb);
    }
  }

  return breadcrumbs;
}

/**
 * Capitalize segment (convert kebab-case to Title Case)
 * @param segment - Path segment (e.g., 'vendor-prices')
 * @returns Capitalized string (e.g., 'Vendor Prices')
 */
function capitalizeSegment(segment: string): string {
  return segment
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Generate breadcrumbs for a specific page (manual override)
 * Use this when auto-generated breadcrumbs don't match your needs
 *
 * @param items - Array of breadcrumb items
 * @returns Array of breadcrumb items with Admin home prepended
 */
export function createBreadcrumbs(items: BreadcrumbItem[]): BreadcrumbItem[] {
  return [
    { label: 'Admin', href: '/admin', icon: Home },
    ...items,
  ];
}

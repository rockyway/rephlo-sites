/**
 * Security Configuration
 *
 * Centralized security settings for HTTP headers and security policies.
 * Implements security best practices using Helmet.js and custom configurations.
 *
 * Security measures include:
 * - Content Security Policy (CSP)
 * - HTTP Strict Transport Security (HSTS)
 * - X-Frame-Options (Clickjacking protection)
 * - X-Content-Type-Options (MIME-sniffing prevention)
 * - X-XSS-Protection (XSS filter)
 * - Referrer Policy
 * - Permissions Policy
 *
 * Reference: docs/plan/073-dedicated-api-backend-specification.md (Section: Security & Rate Limiting)
 */

import { HelmetOptions } from 'helmet';

// ===== Environment Detection =====

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

// ===== Content Security Policy =====

/**
 * Content Security Policy (CSP) configuration
 *
 * Defines which resources can be loaded and executed.
 * More restrictive in production, allows inline scripts/styles in development for DX.
 */
const contentSecurityPolicy = {
  directives: {
    // Default fallback for all resource types
    defaultSrc: ["'self'"],

    // Script sources
    scriptSrc: isDevelopment
      ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"] // Allow inline scripts in dev for hot reload
      : ["'self'"], // Strict in production

    // Style sources
    styleSrc: isDevelopment
      ? ["'self'", "'unsafe-inline'"] // Allow inline styles in dev
      : ["'self'", "'unsafe-inline'"], // Need inline styles for OIDC login pages

    // Image sources
    imgSrc: [
      "'self'",
      'data:', // Allow data URIs for inline images
      'https:', // Allow HTTPS images from any domain (for user avatars, CDNs)
    ],

    // Font sources
    fontSrc: ["'self'", 'data:', 'https:'],

    // Connect sources (AJAX, WebSocket, EventSource)
    connectSrc: ["'self'"],

    // Media sources (audio, video)
    mediaSrc: ["'self'"],

    // Object sources (embed, object, applet)
    objectSrc: ["'none'"],

    // Frame sources (iframe)
    frameSrc: ["'self'"],

    // Base URI restriction
    baseUri: ["'self'"],

    // Form action restriction
    formAction: ["'self'"],

    // Frame ancestors (controls who can embed this site)
    frameAncestors: ["'self'"],

    // Upgrade insecure requests (HTTP -> HTTPS) in production
    ...(isProduction ? { upgradeInsecureRequests: [] } : {}),
  },

  // Report CSP violations (production only)
  ...(isProduction && process.env.CSP_REPORT_URI
    ? {
        reportOnly: false,
        reportUri: process.env.CSP_REPORT_URI,
      }
    : {}),
};

// ===== HTTP Strict Transport Security (HSTS) =====

/**
 * HSTS configuration
 *
 * Forces browsers to use HTTPS for all requests.
 * Only enabled in production (development uses HTTP).
 */
const hsts = isProduction
  ? {
      maxAge: 31536000, // 1 year in seconds
      includeSubDomains: true, // Apply to all subdomains
      preload: true, // Allow inclusion in browser preload lists
    }
  : false; // Disabled in development

// ===== Referrer Policy =====

/**
 * Referrer Policy configuration
 *
 * Controls how much referrer information is sent with requests.
 */
const referrerPolicy = {
  policy: 'strict-origin-when-cross-origin' as const,
  // Same-origin: Full URL
  // Cross-origin HTTPS: Origin only
  // Cross-origin HTTP: No referrer
};

// ===== Permissions Policy (formerly Feature Policy) =====

/**
 * Permissions Policy configuration
 *
 * Controls which browser features can be used.
 * Disables unnecessary features to reduce attack surface.
 *
 * Note: Not currently applied as Helmet v7.x doesn't support Permissions-Policy header yet.
 * Can be implemented via custom middleware when needed.
 */
// const permissionsPolicy = {
//   // Disable all features by default
//   features: {
//     // Geolocation
//     geolocation: ["'none'"],
//
//     // Microphone
//     microphone: ["'none'"],
//
//     // Camera
//     camera: ["'none'"],
//
//     // Payment
//     payment: ["'none'"],
//
//     // USB
//     usb: ["'none'"],
//
//     // MIDI
//     midi: ["'none'"],
//
//     // Sync XHR (deprecated, should be disabled)
//     'sync-xhr': ["'none'"],
//
//     // Full screen (allow for same origin)
//     fullscreen: ["'self'"],
//
//     // Picture-in-picture
//     'picture-in-picture': ["'self'"],
//   },
// };

// ===== X-Frame-Options =====

/**
 * X-Frame-Options configuration
 *
 * Prevents clickjacking attacks by controlling iframe embedding.
 */
const frameguard = {
  action: 'sameorigin' as const, // Allow framing from same origin only
};

// ===== Other Security Headers =====

/**
 * Additional security headers configuration
 */
const otherHeaders = {
  // X-Content-Type-Options: Prevent MIME-sniffing
  noSniff: true,

  // X-DNS-Prefetch-Control: Control DNS prefetching
  dnsPrefetchControl: {
    allow: false,
  },

  // X-Download-Options: Prevent download execution in IE
  ieNoOpen: true,

  // X-Powered-By: Remove Express fingerprinting
  hidePoweredBy: true,

  // X-XSS-Protection: Enable XSS filter (legacy browsers)
  xssFilter: true,
};

// ===== Combined Helmet Configuration =====

/**
 * Complete Helmet.js configuration
 *
 * Combines all security header configurations.
 * Export this for use in app.ts
 */
export const helmetConfig: Readonly<HelmetOptions> = {
  contentSecurityPolicy,
  hsts,
  referrerPolicy,
  frameguard,
  ...otherHeaders,
};

// ===== CORS Configuration =====

/**
 * CORS allowed origins
 *
 * Maintains allowlist of trusted origins.
 * Supports wildcard patterns for desktop app protocols.
 */
export const corsAllowedOrigins = [
  // Development
  process.env.CORS_ORIGIN || 'http://localhost:7150', // Backend server (changed from 7151 to 7150)
  'http://localhost:8080', // Desktop app development
  'http://localhost:3000', // Alternative development port

  // Production (add your production domains here)
  ...(isProduction
    ? [
        'https://textassistant.com',
        'https://www.textassistant.com',
        'https://app.textassistant.com',
        'https://api.textassistant.com',
      ]
    : []),

  // Desktop app deep links (wildcard pattern)
  'textassistant://*',
];

/**
 * CORS origin validator
 *
 * Checks if an origin is allowed based on the allowlist.
 * Supports wildcard patterns (e.g., textassistant://*)
 */
export function isOriginAllowed(origin: string | undefined): boolean {
  // Allow requests with no origin (like mobile apps or curl)
  if (!origin) {
    return true;
  }

  // Check against allowlist
  return corsAllowedOrigins.some((allowedOrigin) => {
    if (allowedOrigin.includes('*')) {
      // Handle wildcard patterns
      const pattern = allowedOrigin.replace(/\*/g, '.*');
      return new RegExp(`^${pattern}$`).test(origin);
    }
    return allowedOrigin === origin;
  });
}

/**
 * CORS configuration for Express
 *
 * Includes credentials handling, methods, headers, and preflight caching.
 */
export const corsConfig = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // In development, allow all origins for easier testing
    if (isDevelopment) {
      callback(null, true);
      return;
    }

    // In production, validate against allowlist
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS policy`));
    }
  },
  credentials: true, // Allow cookies and authorization headers
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Authorization',
    'Content-Type',
    'X-Request-ID',
    'X-RateLimit-Bypass', // For testing rate limits
  ],
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'Retry-After',
  ],
  maxAge: 86400, // 24 hours preflight cache
  optionsSuccessStatus: 204, // Some legacy browsers choke on 204
};

// ===== Security Logging =====

/**
 * Security event logger
 *
 * Logs security-related events for monitoring and auditing.
 */
export function logSecurityEvent(
  event: string,
  details?: Record<string, any>
): void {
  // Import logger here to avoid circular dependency
  const logger = require('../utils/logger').default;

  logger.warn(`Security Event: ${event}`, {
    event,
    timestamp: new Date().toISOString(),
    ...details,
  });
}

// ===== Trusted Proxy Configuration =====

/**
 * Trusted proxy settings
 *
 * When behind a reverse proxy (nginx, AWS ALB, etc.),
 * trust the X-Forwarded-* headers from specific IPs.
 */
export const trustedProxies = isProduction
  ? [
      'loopback', // 127.0.0.1, ::1
      'linklocal', // 169.254.0.0/16, fe80::/10
      // Add your proxy IPs here
      ...(process.env.TRUSTED_PROXY_IPS?.split(',').map((ip) => ip.trim()) || []),
    ]
  : 'loopback'; // Only trust loopback in development

// ===== Input Sanitization Settings =====

/**
 * Input sanitization configuration
 *
 * Settings for sanitizing user input to prevent injection attacks.
 */
export const sanitizationConfig = {
  // Maximum request body size
  maxBodySize: '10mb',

  // Maximum URL length
  maxUrlLength: 2048,

  // Maximum header size
  maxHeaderSize: 8192,

  // Allowed file upload MIME types
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
  ],

  // Maximum file upload size
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880'), // 5MB default
};

// ===== Rate Limit Bypass Secret =====

/**
 * Rate limit bypass secret
 *
 * For testing purposes, allows bypassing rate limits with X-RateLimit-Bypass header.
 * MUST be disabled or restricted in production.
 */
export const rateLimitBypassSecret = process.env.RATE_LIMIT_BYPASS_SECRET || null;

if (rateLimitBypassSecret && isProduction) {
  const logger = require('../utils/logger').default;
  logger.warn(
    'WARNING: Rate limit bypass is enabled in production. This should be restricted to admin users only.'
  );
}

// ===== Export Security Configuration Summary =====

export const securitySummary = {
  environment: process.env.NODE_ENV || 'development',
  csp: contentSecurityPolicy.directives,
  hsts: hsts || 'disabled',
  cors: {
    allowedOrigins: corsAllowedOrigins.length,
    credentials: true,
  },
  headers: {
    frameguard: frameguard.action,
    noSniff: otherHeaders.noSniff,
    hidePoweredBy: otherHeaders.hidePoweredBy,
  },
  sanitization: sanitizationConfig,
};

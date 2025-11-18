#!/usr/bin/env tsx
/**
 * OpenAPI Coverage Validation Script
 *
 * Validates that all routes defined in the backend source code are documented
 * in the OpenAPI specification (enhanced-api.yaml).
 *
 * Usage:
 *   npm run validate:openapi
 *   tsx scripts/validate-openapi-coverage.ts
 *
 * Exit Codes:
 *   0 - All routes documented (success)
 *   1 - Missing routes found (failure)
 *
 * Purpose:
 *   - Prevent documentation drift
 *   - Enforce documentation-as-code
 *   - CI/CD gate for API completeness
 *
 * Reference: docs/analysis/086-swagger-missing-endpoints-analysis.md
 */

import * as fs from 'fs';
import * as path from 'path';
import YAML from 'yamljs';
import { globSync } from 'glob';

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  routesDir: path.join(__dirname, '../src/routes'),
  openApiSpecPath: path.join(__dirname, '../docs/openapi/enhanced-api.yaml'),
  excludePatterns: [
    /swagger\.routes\.ts$/, // Swagger UI routes (not API endpoints)
    /index\.ts$/, // Route aggregators (not definitions)
  ],
  // Endpoints that are intentionally not documented (internal/legacy)
  allowedUndocumented: [
    'GET /swagger.json', // Swagger JSON endpoint (meta-documentation)
    'POST /webhooks/stripe', // Stripe webhook (not user-facing)
  ],
};

// ============================================================================
// Types
// ============================================================================

interface RouteDefinition {
  method: string; // GET, POST, PUT, PATCH, DELETE
  path: string; // Full path (e.g., /api/user/profile)
  file: string; // Source file
  line: number; // Line number in file
}

interface ValidationResult {
  totalRoutes: number;
  documentedRoutes: number;
  missingRoutes: RouteDefinition[];
  extraDocumented: string[]; // Documented but not in code
  success: boolean;
}

// ============================================================================
// Route Extraction from Source Code
// ============================================================================

/**
 * Extract all route definitions from TypeScript route files
 */
function extractRoutesFromSourceCode(): RouteDefinition[] {
  const routes: RouteDefinition[] = [];

  // Find all route files
  const routeFiles = globSync(`${CONFIG.routesDir}/**/*.ts`, {
    ignore: CONFIG.excludePatterns.map((pattern) =>
      path.join(CONFIG.routesDir, '**', pattern.source.replace(/\$/, ''))
    ),
  });

  for (const filePath of routeFiles) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      // Match route definitions: router.{method}('/path', ...)
      const routeMatch = line.match(/router\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/);

      if (routeMatch) {
        const [, method, routePath] = routeMatch;

        // Determine base path from file name
        const basePath = inferBasePathFromFile(filePath);

        // Combine base path with route path
        const fullPath = combinePaths(basePath, routePath);

        routes.push({
          method: method.toUpperCase(),
          path: fullPath,
          file: path.relative(path.join(__dirname, '..'), filePath),
          line: index + 1,
        });
      }
    });
  }

  return routes;
}

/**
 * Infer base path from route file name
 */
function inferBasePathFromFile(filePath: string): string {
  const fileName = path.basename(filePath, '.ts');

  // Map file names to base paths
  const pathMapping: Record<string, string> = {
    'api.routes': '/api',
    'branding.routes': '/api',
    'v1.routes': '/v1',
    'admin.routes': '/admin',
    'auth.routes': '/auth',
    'mfa.routes': '/auth/mfa',
    'oauth.routes': '/oauth',
    'social-auth.routes': '/oauth',
    'plan109.routes': '/admin', // Subscription monetization
    'plan110.routes': '/api', // Perpetual licensing (mixed /api and /admin)
    'plan111.routes': '/api', // Coupons (mixed /api and /admin)
    'plan190.routes': '/api/admin', // Tier config
    'admin-models.routes': '/admin/models',
    'vendor-analytics.routes': '/admin/analytics',
  };

  return pathMapping[fileName] || '';
}

/**
 * Combine base path and route path intelligently
 */
function combinePaths(basePath: string, routePath: string): string {
  // Handle absolute paths (routes that start with /)
  if (routePath.startsWith('/')) {
    // If route is already absolute and contains base path, use as-is
    if (basePath && routePath.startsWith(basePath)) {
      return routePath;
    }
    // If route is absolute but missing base path, prepend it
    return basePath + routePath;
  }

  // Handle relative paths (routes without leading /)
  if (!basePath) {
    return '/' + routePath;
  }

  return basePath + '/' + routePath;
}

// ============================================================================
// OpenAPI Spec Parsing
// ============================================================================

/**
 * Extract all documented endpoints from OpenAPI spec
 */
function extractDocumentedEndpoints(specPath: string): Set<string> {
  const documented = new Set<string>();

  try {
    const spec = YAML.load(specPath);

    if (!spec || !spec.paths) {
      console.error('❌ Invalid OpenAPI spec: missing paths');
      return documented;
    }

    // Extract all paths and methods
    Object.keys(spec.paths).forEach((path) => {
      const pathItem = spec.paths[path];

      // Check each HTTP method
      ['get', 'post', 'put', 'patch', 'delete'].forEach((method) => {
        if (pathItem[method]) {
          const endpoint = `${method.toUpperCase()} ${path}`;
          documented.add(endpoint);
        }
      });
    });
  } catch (error) {
    console.error('❌ Failed to parse OpenAPI spec:', error);
  }

  return documented;
}

// ============================================================================
// Validation Logic
// ============================================================================

/**
 * Validate route coverage
 */
function validateCoverage(
  sourceRoutes: RouteDefinition[],
  documentedEndpoints: Set<string>
): ValidationResult {
  const missingRoutes: RouteDefinition[] = [];
  let documentedCount = 0;

  // Check each source route
  sourceRoutes.forEach((route) => {
    const endpoint = `${route.method} ${route.path}`;

    // Normalize path (OpenAPI uses {param}, Express uses :param)
    const normalizedEndpoint = normalizeEndpoint(endpoint);

    if (documentedEndpoints.has(normalizedEndpoint)) {
      documentedCount++;
    } else if (!isAllowedUndocumented(endpoint)) {
      missingRoutes.push(route);
    }
  });

  // Check for extra documented endpoints (in spec but not in code)
  const sourceEndpoints = new Set(
    sourceRoutes.map((r) => normalizeEndpoint(`${r.method} ${r.path}`))
  );
  const extraDocumented = Array.from(documentedEndpoints).filter(
    (endpoint) => !sourceEndpoints.has(endpoint) && !isSpecialEndpoint(endpoint)
  );

  return {
    totalRoutes: sourceRoutes.length,
    documentedRoutes: documentedCount,
    missingRoutes,
    extraDocumented,
    success: missingRoutes.length === 0,
  };
}

/**
 * Normalize endpoint format (convert :param to {param})
 */
function normalizeEndpoint(endpoint: string): string {
  return endpoint.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, '{$1}');
}

/**
 * Check if endpoint is allowed to be undocumented
 */
function isAllowedUndocumented(endpoint: string): boolean {
  return CONFIG.allowedUndocumented.includes(endpoint);
}

/**
 * Check if endpoint is special (e.g., health checks, root)
 */
function isSpecialEndpoint(endpoint: string): boolean {
  const specialPaths = ['GET /', 'GET /health', 'GET /health/ready', 'GET /health/live'];
  return specialPaths.includes(endpoint);
}

// ============================================================================
// Reporting
// ============================================================================

/**
 * Print validation results
 */
function printResults(result: ValidationResult, sourceRoutes: RouteDefinition[]): void {
  console.log('\n📊 OpenAPI Coverage Validation Report');
  console.log('=====================================\n');

  const coveragePercent = ((result.documentedRoutes / result.totalRoutes) * 100).toFixed(1);

  console.log(`Total Routes:      ${result.totalRoutes}`);
  console.log(`Documented:        ${result.documentedRoutes}`);
  console.log(`Missing:           ${result.missingRoutes.length}`);
  console.log(`Coverage:          ${coveragePercent}%`);
  console.log('');

  if (result.missingRoutes.length > 0) {
    console.log('❌ Missing from OpenAPI Spec:\n');

    // Group by file
    const byFile = groupByFile(result.missingRoutes);

    Object.keys(byFile)
      .sort()
      .forEach((file) => {
        console.log(`  📄 ${file}`);
        byFile[file].forEach((route) => {
          console.log(`     ${route.method} ${route.path} (line ${route.line})`);
        });
        console.log('');
      });
  }

  if (result.extraDocumented.length > 0) {
    console.log('⚠️  Documented but not found in code:\n');
    result.extraDocumented.forEach((endpoint) => {
      console.log(`   ${endpoint}`);
    });
    console.log('');
  }

  if (result.success) {
    console.log('✅ Success! All routes are documented.\n');
  } else {
    console.log('❌ Failure! Some routes are missing documentation.\n');
    console.log('   Add missing endpoints to:', CONFIG.openApiSpecPath);
    console.log('   Reference: docs/analysis/086-swagger-missing-endpoints-analysis.md\n');
  }
}

/**
 * Group routes by file
 */
function groupByFile(routes: RouteDefinition[]): Record<string, RouteDefinition[]> {
  return routes.reduce((acc, route) => {
    if (!acc[route.file]) {
      acc[route.file] = [];
    }
    acc[route.file].push(route);
    return acc;
  }, {} as Record<string, RouteDefinition[]>);
}

// ============================================================================
// Main Execution
// ============================================================================

function main() {
  console.log('🔍 Validating OpenAPI coverage...\n');

  // Extract routes from source code
  const sourceRoutes = extractRoutesFromSourceCode();
  console.log(`Found ${sourceRoutes.length} route(s) in source code`);

  // Extract documented endpoints from OpenAPI spec
  const documentedEndpoints = extractDocumentedEndpoints(CONFIG.openApiSpecPath);
  console.log(`Found ${documentedEndpoints.size} endpoint(s) in OpenAPI spec`);

  // Validate coverage
  const result = validateCoverage(sourceRoutes, documentedEndpoints);

  // Print results
  printResults(result, sourceRoutes);

  // Exit with appropriate code
  process.exit(result.success ? 0 : 1);
}

// Run main function
if (require.main === module) {
  main();
}

export { extractRoutesFromSourceCode, extractDocumentedEndpoints, validateCoverage };

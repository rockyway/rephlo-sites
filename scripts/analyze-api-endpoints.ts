#!/usr/bin/env ts-node

/**
 * API Endpoint Analysis Script
 *
 * Analyzes backend and identity-provider projects to:
 * 1. Extract all API entry points
 * 2. Identify file/source and line numbers where they are defined
 * 3. Find all usages of these endpoints
 * 4. Generate a comprehensive markdown report
 */

import * as fs from 'fs';
import * as path from 'path';

interface EndpointDefinition {
  method: string;
  path: string;
  file: string;
  line: number;
  handler?: string;
  middleware?: string[];
}

interface EndpointUsage {
  file: string;
  line: number;
  context: string;
}

interface ProjectEndpoints {
  projectName: string;
  baseUrl: string;
  endpoints: EndpointDefinition[];
  usages: Map<string, EndpointUsage[]>;
}

const BACKEND_DIR = path.join(__dirname, '..', 'backend');
const IDP_DIR = path.join(__dirname, '..', 'identity-provider');
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
const ROOT_DIR = path.join(__dirname, '..');

/**
 * Recursively read all files in a directory with specific extensions
 */
function getAllFiles(dirPath: string, extensions: string[]): string[] {
  const files: string[] = [];

  function traverse(currentPath: string) {
    if (!fs.existsSync(currentPath)) {
      return;
    }

    const stat = fs.statSync(currentPath);

    if (stat.isDirectory()) {
      // Skip node_modules and other common directories
      const basename = path.basename(currentPath);
      if (basename === 'node_modules' || basename === 'dist' || basename === '.git') {
        return;
      }

      const entries = fs.readdirSync(currentPath);
      entries.forEach(entry => {
        traverse(path.join(currentPath, entry));
      });
    } else if (stat.isFile()) {
      const ext = path.extname(currentPath);
      if (extensions.includes(ext)) {
        files.push(currentPath);
      }
    }
  }

  traverse(dirPath);
  return files;
}

/**
 * Extract route definitions from Express router files
 */
function extractExpressRoutes(filePath: string): EndpointDefinition[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const endpoints: EndpointDefinition[] = [];

  // Multi-line regex patterns for Express routes
  // Remove newlines and extra whitespace for matching
  const normalizedContent = content.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ');

  // Regex patterns for Express routes (with multiline support)
  const routePatterns = [
    /router\.(get|post|put|patch|delete|options|head)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
    /app\.(get|post|put|patch|delete|options|head)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
    /\.route\s*\(\s*['"`]([^'"`]+)['"`]\s*\)\s*\.(get|post|put|patch|delete)/gi,
  ];

  // Extract routes from normalized content
  routePatterns.forEach(pattern => {
    pattern.lastIndex = 0;
    let match;

    while ((match = pattern.exec(normalizedContent)) !== null) {
      const method = match[1] || match[2];
      const routePath = match[2] || match[1];

      if (method && routePath) {
        // Find the line number by searching for the route path in original content
        let lineNumber = 1;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes(routePath) && lines[i].match(new RegExp(`\\.(${method})\\s*\\(`))) {
            lineNumber = i + 1;
            break;
          }
        }

        // Extract middleware from the context around the match
        const contextStart = Math.max(0, match.index - 200);
        const contextEnd = Math.min(normalizedContent.length, match.index + 200);
        const context = normalizedContent.substring(contextStart, contextEnd);

        const middleware: string[] = [];

        // Look for common middleware patterns
        if (context.match(/authMiddleware|authenticate\(\)/)) middleware.push('authenticate');
        if (context.match(/requireAdmin\(\)/)) middleware.push('requireAdmin');
        if (context.match(/requireScopes\(\[([^\]]+)\]\)/)) {
          const scopeMatch = context.match(/requireScopes\(\[([^\]]+)\]\)/);
          if (scopeMatch) middleware.push(`requireScopes(${scopeMatch[1]})`);
        }
        if (context.match(/requireRoles?\(\[([^\]]+)\]\)/)) {
          const roleMatch = context.match(/requireRoles?\(\[([^\]]+)\]\)/);
          if (roleMatch) middleware.push(`requireRole(${roleMatch[1]})`);
        }
        if (context.match(/auditLog\(/)) middleware.push('auditLog');

        // Extract handler name
        const handlerMatch = context.match(/asyncHandler\(([a-zA-Z0-9_.]+)\./);
        const handler = handlerMatch ? handlerMatch[1] : undefined;

        // Check if we already have this endpoint (avoid duplicates)
        const exists = endpoints.some(
          e => e.method === method.toUpperCase() && e.path === routePath && e.file === path.relative(ROOT_DIR, filePath)
        );

        if (!exists) {
          endpoints.push({
            method: method.toUpperCase(),
            path: routePath,
            file: path.relative(ROOT_DIR, filePath),
            line: lineNumber,
            handler,
            middleware: middleware.length > 0 ? middleware : undefined,
          });
        }
      }
    }
  });

  return endpoints;
}

/**
 * Extract OIDC provider routes from identity-provider
 */
function extractOIDCRoutes(filePath: string): EndpointDefinition[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const endpoints: EndpointDefinition[] = [];

  // Look for OIDC provider route definitions
  const patterns = [
    /app\.use\s*\(\s*['"`]([^'"`]+)['"`]\s*,/gi,
    /app\.(get|post|put|delete)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
  ];

  lines.forEach((line, index) => {
    patterns.forEach(pattern => {
      pattern.lastIndex = 0;
      let match;

      while ((match = pattern.exec(line)) !== null) {
        if (match[1]) {
          const method = match[2] ? match[1].toUpperCase() : 'ALL';
          const routePath = match[2] || match[1];

          endpoints.push({
            method,
            path: routePath,
            file: path.relative(ROOT_DIR, filePath),
            line: index + 1,
          });
        }
      }
    });
  });

  return endpoints;
}

/**
 * Find usages of API endpoints in the codebase
 */
function findEndpointUsages(endpoint: EndpointDefinition, searchDirs: string[]): EndpointUsage[] {
  const usages: EndpointUsage[] = [];
  const pathPattern = endpoint.path
    .replace(/:[^/]+/g, '[^/]+') // Replace :param with regex
    .replace(/\*/g, '.*')
    .replace(/\//g, '\\/');

  // Common patterns for API calls
  const patterns = [
    new RegExp(`['"\`](/[^'"\`]*${pathPattern.replace(/^\//, '')}[^'"\`]*)['"\`]`, 'gi'),
    new RegExp(`axios\\.(${endpoint.method.toLowerCase()}|request)\\s*\\([^)]*['"\`]([^'"\`]*${pathPattern.replace(/^\//, '')}[^'"\`]*)['"\`]`, 'gi'),
    new RegExp(`fetch\\s*\\([^)]*['"\`]([^'"\`]*${pathPattern.replace(/^\//, '')}[^'"\`]*)['"\`]`, 'gi'),
  ];

  searchDirs.forEach(dir => {
    const files = getAllFiles(dir, ['.ts', '.tsx', '.js', '.jsx']);

    files.forEach(file => {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          patterns.forEach(pattern => {
            pattern.lastIndex = 0;
            if (pattern.test(line)) {
              usages.push({
                file: path.relative(ROOT_DIR, file),
                line: index + 1,
                context: line.trim(),
              });
            }
          });
        });
      } catch (error) {
        // Skip files that can't be read
      }
    });
  });

  return usages;
}

/**
 * Analyze backend project
 */
function analyzeBackend(): ProjectEndpoints {
  console.log('Analyzing backend...');

  const routesDir = path.join(BACKEND_DIR, 'src', 'routes');
  const apiDir = path.join(BACKEND_DIR, 'src', 'api');
  const serverFile = path.join(BACKEND_DIR, 'src', 'server.ts');

  const endpoints: EndpointDefinition[] = [];

  // Scan routes directory (primary location)
  if (fs.existsSync(routesDir)) {
    const routeFiles = getAllFiles(routesDir, ['.ts', '.js']);
    routeFiles.forEach(file => {
      const fileEndpoints = extractExpressRoutes(file);
      endpoints.push(...fileEndpoints);
    });
  }

  // Scan API directory (backup location)
  if (fs.existsSync(apiDir)) {
    const routeFiles = getAllFiles(apiDir, ['.ts', '.js']);
    routeFiles.forEach(file => {
      const fileEndpoints = extractExpressRoutes(file);
      endpoints.push(...fileEndpoints);
    });
  }

  // Scan server.ts for top-level routes
  if (fs.existsSync(serverFile)) {
    const serverEndpoints = extractExpressRoutes(serverFile);
    endpoints.push(...serverEndpoints);
  }

  // Find usages
  const usages = new Map<string, EndpointUsage[]>();
  endpoints.forEach(endpoint => {
    const key = `${endpoint.method} ${endpoint.path}`;
    const endpointUsages = findEndpointUsages(endpoint, [FRONTEND_DIR, BACKEND_DIR]);
    if (endpointUsages.length > 0) {
      usages.set(key, endpointUsages);
    }
  });

  return {
    projectName: 'Backend API',
    baseUrl: 'http://localhost:7150',
    endpoints,
    usages,
  };
}

/**
 * Analyze identity-provider project
 */
function analyzeIdentityProvider(): ProjectEndpoints {
  console.log('Analyzing identity-provider...');

  const srcDir = path.join(IDP_DIR, 'src');
  const endpoints: EndpointDefinition[] = [];

  if (fs.existsSync(srcDir)) {
    const files = getAllFiles(srcDir, ['.ts', '.js']);
    files.forEach(file => {
      const fileEndpoints = extractExpressRoutes(file);
      endpoints.push(...fileEndpoints);

      // Also extract OIDC-specific routes
      const oidcEndpoints = extractOIDCRoutes(file);
      endpoints.push(...oidcEndpoints);
    });
  }

  // Add well-known OIDC endpoints
  const oidcStandardEndpoints: EndpointDefinition[] = [
    { method: 'GET', path: '/.well-known/openid-configuration', file: 'identity-provider (OIDC Provider)', line: 0 },
    { method: 'GET', path: '/oauth/authorize', file: 'identity-provider (OIDC Provider)', line: 0 },
    { method: 'POST', path: '/oauth/token', file: 'identity-provider (OIDC Provider)', line: 0 },
    { method: 'GET', path: '/oauth/userinfo', file: 'identity-provider (OIDC Provider)', line: 0 },
    { method: 'GET', path: '/oauth/jwks', file: 'identity-provider (OIDC Provider)', line: 0 },
    { method: 'POST', path: '/oauth/introspect', file: 'identity-provider (OIDC Provider)', line: 0 },
    { method: 'POST', path: '/oauth/revoke', file: 'identity-provider (OIDC Provider)', line: 0 },
  ];

  endpoints.push(...oidcStandardEndpoints);

  // Find usages
  const usages = new Map<string, EndpointUsage[]>();
  endpoints.forEach(endpoint => {
    const key = `${endpoint.method} ${endpoint.path}`;
    const endpointUsages = findEndpointUsages(endpoint, [FRONTEND_DIR, BACKEND_DIR, IDP_DIR]);
    if (endpointUsages.length > 0) {
      usages.set(key, endpointUsages);
    }
  });

  return {
    projectName: 'Identity Provider (OAuth 2.0/OIDC)',
    baseUrl: 'http://localhost:7151',
    endpoints,
    usages,
  };
}

/**
 * Generate markdown report
 */
function generateMarkdownReport(projects: ProjectEndpoints[]): string {
  const now = new Date().toISOString();

  let markdown = `# API Endpoints Analysis Report\n\n`;
  markdown += `**Generated:** ${now}\n\n`;
  markdown += `**Projects Analyzed:**\n`;
  projects.forEach(p => {
    markdown += `- ${p.projectName} (${p.baseUrl})\n`;
  });
  markdown += `\n---\n\n`;

  projects.forEach(project => {
    markdown += `## ${project.projectName}\n\n`;
    markdown += `**Base URL:** \`${project.baseUrl}\`\n\n`;
    markdown += `**Total Endpoints:** ${project.endpoints.length}\n\n`;

    // Group by HTTP method
    const methodGroups = new Map<string, EndpointDefinition[]>();
    project.endpoints.forEach(endpoint => {
      const method = endpoint.method;
      if (!methodGroups.has(method)) {
        methodGroups.set(method, []);
      }
      methodGroups.get(method)!.push(endpoint);
    });

    // Sort methods
    const sortedMethods = Array.from(methodGroups.keys()).sort();

    sortedMethods.forEach(method => {
      const endpoints = methodGroups.get(method)!;
      markdown += `### ${method} Endpoints (${endpoints.length})\n\n`;

      endpoints.forEach(endpoint => {
        markdown += `#### \`${method} ${endpoint.path}\`\n\n`;
        markdown += `**Definition:**\n`;
        markdown += `- **File:** \`${endpoint.file}\`\n`;
        markdown += `- **Line:** ${endpoint.line}\n`;

        if (endpoint.handler) {
          markdown += `- **Handler:** \`${endpoint.handler}\`\n`;
        }

        if (endpoint.middleware && endpoint.middleware.length > 0) {
          markdown += `- **Middleware:** ${endpoint.middleware.map(m => `\`${m}\``).join(', ')}\n`;
        }

        markdown += `\n`;

        // Add usages
        const key = `${endpoint.method} ${endpoint.path}`;
        const usages = project.usages.get(key);

        if (usages && usages.length > 0) {
          markdown += `**Usages (${usages.length}):**\n\n`;
          markdown += `| File | Line | Context |\n`;
          markdown += `|------|------|----------|\n`;

          usages.forEach(usage => {
            const context = usage.context.substring(0, 80).replace(/\|/g, '\\|');
            markdown += `| \`${usage.file}\` | ${usage.line} | \`${context}...\` |\n`;
          });

          markdown += `\n`;
        } else {
          markdown += `**Usages:** None found\n\n`;
        }

        markdown += `---\n\n`;
      });
    });
  });

  // Summary statistics
  markdown += `## Summary Statistics\n\n`;

  projects.forEach(project => {
    const totalEndpoints = project.endpoints.length;
    const endpointsWithUsages = Array.from(project.usages.keys()).length;
    const totalUsages = Array.from(project.usages.values()).reduce((sum, usages) => sum + usages.length, 0);

    markdown += `### ${project.projectName}\n\n`;
    markdown += `- **Total Endpoints:** ${totalEndpoints}\n`;
    markdown += `- **Endpoints with Usages:** ${endpointsWithUsages}\n`;
    markdown += `- **Total Usage References:** ${totalUsages}\n`;
    markdown += `- **Unused Endpoints:** ${totalEndpoints - endpointsWithUsages}\n\n`;
  });

  return markdown;
}

/**
 * Main execution
 */
function main() {
  console.log('Starting API endpoint analysis...\n');

  const projects: ProjectEndpoints[] = [];

  // Analyze backend
  projects.push(analyzeBackend());

  // Analyze identity-provider
  projects.push(analyzeIdentityProvider());

  // Generate report
  console.log('\nGenerating markdown report...');
  const markdown = generateMarkdownReport(projects);

  // Determine next document number
  const docsAnalysisDir = path.join(ROOT_DIR, 'docs', 'analysis');
  if (!fs.existsSync(docsAnalysisDir)) {
    fs.mkdirSync(docsAnalysisDir, { recursive: true });
  }

  const existingFiles = fs.readdirSync(docsAnalysisDir)
    .filter(f => /^\d{3}-/.test(f))
    .sort();

  let nextNumber = 1;
  if (existingFiles.length > 0) {
    const lastFile = existingFiles[existingFiles.length - 1];
    const match = lastFile.match(/^(\d{3})-/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  const outputFile = path.join(docsAnalysisDir, `${String(nextNumber).padStart(3, '0')}-api-endpoints-analysis.md`);
  fs.writeFileSync(outputFile, markdown, 'utf-8');

  console.log(`\n✅ Report generated: ${path.relative(ROOT_DIR, outputFile)}`);
  console.log(`   Total projects analyzed: ${projects.length}`);
  console.log(`   Total endpoints found: ${projects.reduce((sum, p) => sum + p.endpoints.length, 0)}`);
}

// Run the script
main();

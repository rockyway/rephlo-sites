#!/usr/bin/env ts-node

/**
 * API Endpoint Analysis Script
 *
 * Analyzes backend and identity-provider projects to:
 * 1. Extract all API entry points
 * 2. Identify file/source and line numbers where they are defined
 * 3. Find all usages of these endpoints
 * 4. Generate a comprehensive markdown report
 *
 * Usage:
 *   npm run analyze:api
 *   npm run analyze:api -- --include-test=true
 *   npm run analyze:api -- --format=simple
 *   npm run analyze:api -- --format=simple --include-test=true
 */

import * as fs from 'fs';
import * as path from 'path';

// Parse command line arguments
const args = process.argv.slice(2);
const includeTest = args.some(arg => arg === '--include-test=true');
const formatArg = args.find(arg => arg.startsWith('--format='));
const format = formatArg ? formatArg.split('=')[1] : 'full'; // 'simple' or 'full'
const limitArg = args.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined; // Limit number of endpoints to analyze

if (!['simple', 'full'].includes(format)) {
  console.error(`Invalid format: ${format}. Must be 'simple' or 'full'.`);
  process.exit(1);
}

interface EndpointDefinition {
  method: string;
  path: string;
  file: string;
  line: number;
  handler?: string;
  middleware?: string[];
  responseSchema?: string;
  errorSchemas?: string[];
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
      const basename = path.basename(currentPath);

      // Always skip these directories
      if (basename === 'node_modules' || basename === 'dist' || basename === '.git') {
        return;
      }

      // Skip test directories unless includeTest is true
      if (!includeTest) {
        if (basename === '__tests__' || basename === 'test' || basename === 'tests' ||
            basename === '__mocks__' || basename === '__tests__mocks') {
          return;
        }
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

  // Parse line-by-line to build route definitions
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Check if this line starts a route definition
    const routeMatch = line.match(/^\s*(router|app)\s*\.\s*(get|post|put|patch|delete|options|head)\s*\(/);

    if (routeMatch) {
      const method = routeMatch[2].toUpperCase();
      const routeStartLine = i;

      // Collect lines until we find the closing );
      let routeCode = '';
      let bracketCount = 0;
      let foundStart = false;
      let j = i;

      while (j < lines.length) {
        const currentLine = lines[j];
        routeCode += currentLine + ' ';

        // Count parentheses to find the end of the route definition
        for (const char of currentLine) {
          if (char === '(') {
            bracketCount++;
            foundStart = true;
          } else if (char === ')') {
            bracketCount--;
            if (foundStart && bracketCount === 0) {
              // Found the end of this route definition
              break;
            }
          }
        }

        if (foundStart && bracketCount === 0) {
          break;
        }

        j++;
        if (j - i > 20) break; // Safety limit
      }

      // Extract route path from the collected code
      const pathMatch = routeCode.match(/\(\s*['"`]([^'"`]+)['"`]/);
      if (pathMatch) {
        const routePath = pathMatch[1];

        // Extract middleware
        const middleware: string[] = [];
        if (routeCode.match(/authMiddleware|authenticate\(\)/)) middleware.push('authenticate');
        if (routeCode.match(/requireAdmin\(\)/)) middleware.push('requireAdmin');
        if (routeCode.match(/requireScopes\(\[([^\]]+)\]\)/)) {
          const scopeMatch = routeCode.match(/requireScopes\(\[([^\]]+)\]\)/);
          if (scopeMatch) middleware.push(`requireScopes(${scopeMatch[1]})`);
        }
        if (routeCode.match(/requireRoles?\(\[([^\]]+)\]\)/)) {
          const roleMatch = routeCode.match(/requireRoles?\(\[([^\]]+)\]\)/);
          if (roleMatch) middleware.push(`requireRole(${roleMatch[1]})`);
        }
        if (routeCode.match(/auditLog\(/)) middleware.push('auditLog');

        // Extract handler name - support multiple patterns
        let handler: string | undefined = undefined;

        // Pattern 1: asyncHandler(controller.method.bind(...))
        const bindMatch = routeCode.match(/asyncHandler\(([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\.bind/);
        if (bindMatch) {
          handler = `${bindMatch[1]}.${bindMatch[2]}`;
        } else {
          // Pattern 2: asyncHandler(async (req, res) => controller.method(req, res))
          const arrowMatch = routeCode.match(/asyncHandler\(async\s*\([^)]*\)\s*=>\s*([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\(/);
          if (arrowMatch) {
            handler = `${arrowMatch[1]}.${arrowMatch[2]}`;
          } else {
            // Pattern 3: Direct controller reference asyncHandler(controller.method)
            const directMatch = routeCode.match(/asyncHandler\(([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\)/);
            if (directMatch) {
              handler = `${directMatch[1]}.${directMatch[2]}`;
            } else {
              // Pattern 4: Direct controller method without asyncHandler (identity-provider style)
              // e.g., app.get('/path', authController.method)
              const directControllerMatch = routeCode.match(/['"`]\s*,\s*([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\s*[,)]/);
              if (directControllerMatch) {
                handler = `${directControllerMatch[1]}.${directControllerMatch[2]}`;
              }
            }
          }
        }

        // Check for duplicates
        const exists = endpoints.some(
          e => e.method === method && e.path === routePath
        );

        if (!exists) {
          endpoints.push({
            method,
            path: routePath,
            file: path.relative(ROOT_DIR, filePath),
            line: routeStartLine + 1,
            handler,
            middleware: middleware.length > 0 ? middleware : undefined,
          });
        }
      }

      // Move to the end of this route definition
      i = j + 1;
    } else {
      i++;
    }
  }

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
 * Extract response and error schemas from controller method
 */
function extractSchemas(endpoint: EndpointDefinition): { responseSchema?: string; errorSchemas?: string[] } {
  if (!endpoint.handler) {
    return {};
  }

  // Parse handler: controllerName.methodName
  const handlerParts = endpoint.handler.split('.');
  if (handlerParts.length !== 2) {
    return {};
  }

  const [controllerName, methodName] = handlerParts;

  // Convert camelCase controller names to kebab-case file names
  // e.g., adminController -> admin.controller.ts, analyticsController -> analytics.controller.ts
  const kebabName = controllerName
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '')
    .replace(/-controller$/, '');

  // Find controller file - try multiple patterns
  const controllerPatterns = [
    // Pattern 1: kebab-case with .controller.ts suffix
    path.join(BACKEND_DIR, 'src', 'controllers', `${kebabName}.controller.ts`),
    // Pattern 2: direct camelCase name
    path.join(BACKEND_DIR, 'src', 'controllers', `${controllerName}.ts`),
    // Pattern 3: nested directories
    path.join(BACKEND_DIR, 'src', 'controllers', `**`, `${kebabName}.controller.ts`),
    path.join(BACKEND_DIR, 'src', 'controllers', `**`, `${controllerName}.ts`),
    // Pattern 4: identity provider
    path.join(IDP_DIR, 'src', 'controllers', `${kebabName}.controller.ts`),
    path.join(IDP_DIR, 'src', 'controllers', `${controllerName}.ts`),
  ];

  let controllerFile: string | undefined;
  for (const pattern of controllerPatterns) {
    if (pattern.includes('**')) {
      // Handle glob pattern
      const baseDir = pattern.split('**')[0];
      if (fs.existsSync(baseDir)) {
        const files = getAllFiles(baseDir, ['.ts']);
        const found = files.find(f => f.endsWith(`${controllerName}.ts`));
        if (found) {
          controllerFile = found;
          break;
        }
      }
    } else if (fs.existsSync(pattern)) {
      controllerFile = pattern;
      break;
    }
  }

  if (!controllerFile) {
    return {};
  }

  const content = fs.readFileSync(controllerFile, 'utf-8');
  const lines = content.split('\n');

  // Find the method
  let methodStartLine = -1;
  let methodEndLine = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match method declaration: async methodName(
    if (line.match(new RegExp(`async\\s+${methodName}\\s*\\(`)) ||
        line.match(new RegExp(`${methodName}\\s*\\([^)]*\\)\\s*:\\s*Promise`))) {
      methodStartLine = i;

      // Find method end (closing brace at same indentation level)
      let braceCount = 0;
      let foundStart = false;

      for (let j = i; j < lines.length; j++) {
        const currentLine = lines[j];
        for (const char of currentLine) {
          if (char === '{') {
            braceCount++;
            foundStart = true;
          } else if (char === '}') {
            braceCount--;
            if (foundStart && braceCount === 0) {
              methodEndLine = j;
              break;
            }
          }
        }
        if (methodEndLine !== -1) break;
      }
      break;
    }
  }

  if (methodStartLine === -1 || methodEndLine === -1) {
    return {};
  }

  const methodCode = lines.slice(methodStartLine, methodEndLine + 1).join('\n');

  // Extract response and error schemas by analyzing res.status().json() patterns
  let responseSchema: string | undefined;
  const errorSchemas: string[] = [];

  // Strategy 1: Extract from service method return types
  const serviceCallMatch = methodCode.match(/await\s+this\.([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\(/);
  if (serviceCallMatch) {
    const [, serviceName, serviceMethod] = serviceCallMatch;
    const serviceFile = path.join(BACKEND_DIR, 'src', 'services', `${serviceName}.ts`);
    if (fs.existsSync(serviceFile)) {
      const serviceContent = fs.readFileSync(serviceFile, 'utf-8');
      const serviceMethodMatch = serviceContent.match(
        new RegExp(`async\\s+${serviceMethod}\\s*\\([^)]*\\)\\s*:\\s*Promise<([^>]+)>`)
      );
      if (serviceMethodMatch) {
        responseSchema = serviceMethodMatch[1];
      }
    }
  }

  // Strategy 2: Extract from res.json() patterns for success responses
  if (!responseSchema) {
    // Pattern 1: res.status(2xx).json(successResponse(...)) OR res.json(successResponse(...))
    const successResponseMatch = methodCode.match(/res\.(status\(2\d{2}\)\.)?json\(successResponse\(/);
    if (successResponseMatch) {
      // Check if it has pagination metadata as second argument to successResponse()
      // Simpler approach: Check if pagination keywords appear in object literal after successResponse call
      const successResponseIndex = methodCode.indexOf('successResponse(');
      const afterSuccessResponse = methodCode.substring(successResponseIndex);
      // Look for pagination keywords in object literal (both shorthand and full syntax)
      // Matches: { total: ... } or { total, ... } or { total } (shorthand)
      const hasPagination = /\{\s*(total|page|limit|totalPages|hasMore)\s*[,:}]/s.test(afterSuccessResponse) &&
                           // But exclude if it's nested data (like feedback: { total: ... })
                           !/successResponse\(\s*\{[^}]*(total|page|limit)/s.test(afterSuccessResponse);
      responseSchema = hasPagination
        ? '{ status: "success", data: T, meta: PaginationMeta }'
        : '{ status: "success", data: T }';
    } else {
      // Pattern 2: res.status(2xx).json(paginatedResponse(...)) OR res.json(paginatedResponse(...))
      const paginatedMatch = methodCode.match(/res\.(status\(2\d{2}\)\.)?json\(paginatedResponse\(/);
      if (paginatedMatch) {
        responseSchema = '{ status: "success", data: T[], meta: PaginationMeta }';
      } else {
        // Pattern 3: res.status(2xx).json({ ... }) OR res.json({ ... })
        const directJsonMatch = methodCode.match(/res\.(status\(2\d{2}\)\.)?json\(\s*\{/);
        if (directJsonMatch) {
          responseSchema = 'Object';
        }
      }
    }
  }

  // Extract error schemas from res.status(4xx|5xx).json() patterns
  // Pattern 1: res.status(XXX).json({ error: { code: 'xxx' ... }
  // Use a more flexible pattern that handles multi-line and nested objects
  const errorPattern1 = /res\.status\((\d+)\)\.json\([^)]*error:\s*\{[^}]*code:\s*['"]([^'"]+)['"]/gs;
  let match1;
  while ((match1 = errorPattern1.exec(methodCode)) !== null) {
    const [, statusCode, errorCode] = match1;
    const statusNum = parseInt(statusCode);
    if (statusNum >= 400 && !errorSchemas.includes(`${statusCode}: ${errorCode}`)) {
      errorSchemas.push(`${statusCode}: ${errorCode}`);
    }
  }

  // Pattern 2: res.status(XXX).json({ success: false ... })
  const errorPattern2 = /res\.status\((\d+)\)\.json\([^)]*success:\s*false/gs;
  let match2;
  while ((match2 = errorPattern2.exec(methodCode)) !== null) {
    const [, statusCode] = match2;
    const statusNum = parseInt(statusCode);
    if (statusNum >= 400 && !errorSchemas.some(e => e.startsWith(statusCode))) {
      errorSchemas.push(`${statusCode}: error_response`);
    }
  }

  // Pattern 3: sendError() or sendServerError() helper calls
  if (methodCode.includes('sendError(') || methodCode.includes('sendServerError(')) {
    if (!errorSchemas.some(e => e.startsWith('400'))) {
      errorSchemas.push('400: validation_error');
    }
    if (!errorSchemas.some(e => e.startsWith('500'))) {
      errorSchemas.push('500: internal_server_error');
    }
  }

  return {
    responseSchema,
    errorSchemas: errorSchemas.length > 0 ? errorSchemas : undefined,
  };
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
    new RegExp(`(action|href)\\s*=\\s*['"\`]([^'"\`]*${pathPattern.replace(/^\//, '')}[^'"\`]*)['"\`]`, 'gi'),
    new RegExp(`location\\.href\\s*=\\s*['"\`]([^'"\`]*${pathPattern.replace(/^\//, '')}[^'"\`]*)['"\`]`, 'gi'),
  ];

  searchDirs.forEach(dir => {
    const files = getAllFiles(dir, ['.ts', '.tsx', '.js', '.jsx', '.html']);

    files.forEach(file => {
      // Skip test files from usages unless includeTest is true
      if (!includeTest) {
        const relativePath = path.relative(ROOT_DIR, file);
        const isTestFile = relativePath.includes('__tests__') ||
                          relativePath.includes('test') ||
                          relativePath.includes('tests') ||
                          relativePath.includes('__mocks__') ||
                          /\.test\.(ts|tsx|js|jsx)$/.test(file) ||
                          /\.spec\.(ts|tsx|js|jsx)$/.test(file) ||
                          /test-.*\.(ts|tsx|js|jsx)$/.test(file);

        if (isTestFile) {
          return; // Skip this file
        }
      }

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

  let endpoints: EndpointDefinition[] = [];

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

  // Extract schemas for each endpoint
  console.log('Extracting schemas...');
  endpoints.forEach(endpoint => {
    const schemas = extractSchemas(endpoint);
    endpoint.responseSchema = schemas.responseSchema;
    endpoint.errorSchemas = schemas.errorSchemas;
  });

  // Apply limit if specified
  if (limit && limit > 0) {
    console.log(`Limiting to first ${limit} endpoints...`);
    endpoints = endpoints.slice(0, limit);
  }

  // Find usages
  const usages = new Map<string, EndpointUsage[]>();
  endpoints.forEach(endpoint => {
    const key = `${endpoint.method} ${endpoint.path}`;
    const endpointUsages = findEndpointUsages(endpoint, [FRONTEND_DIR, BACKEND_DIR]);

    // Deduplicate usages by file:line
    const uniqueUsages = Array.from(
      new Map(endpointUsages.map(u => [`${u.file}:${u.line}`, u])).values()
    );

    if (uniqueUsages.length > 0) {
      usages.set(key, uniqueUsages);
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

    // Deduplicate usages by file:line
    const uniqueUsages = Array.from(
      new Map(endpointUsages.map(u => [`${u.file}:${u.line}`, u])).values()
    );

    if (uniqueUsages.length > 0) {
      usages.set(key, uniqueUsages);
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
 * Generate simple format markdown report
 */
function generateSimpleMarkdownReport(projects: ProjectEndpoints[]): string {
  const now = new Date().toISOString();

  let markdown = `# API Endpoints Analysis Report (Simple Format)\n\n`;
  markdown += `**Generated:** ${now}\n`;
  markdown += `**Format:** Simple\n`;
  markdown += `**Include Tests:** ${includeTest ? 'Yes' : 'No'}\n\n`;
  markdown += `**Projects Analyzed:**\n`;
  projects.forEach(p => {
    markdown += `- ${p.projectName} (${p.baseUrl})\n`;
  });
  markdown += `\n---\n\n`;

  projects.forEach(project => {
    markdown += `## ${project.projectName}\n\n`;
    markdown += `**Base URL:** \`${project.baseUrl}\`\n\n`;
    markdown += `**Total Endpoints:** ${project.endpoints.length}\n\n`;

    // Sort endpoints by path (ascending)
    const sortedEndpoints = [...project.endpoints].sort((a, b) => {
      // First by path, then by method
      const pathCompare = a.path.localeCompare(b.path);
      if (pathCompare !== 0) return pathCompare;
      return a.method.localeCompare(b.method);
    });

    // Generate flat table
    markdown += `| Method | Endpoint | File | Handler | Response Schema | Error Schemas | Middleware | Usages |\n`;
    markdown += `|--------|----------|------|---------|-----------------|---------------|------------|--------|\n`;

    sortedEndpoints.forEach(endpoint => {
      // Skip root endpoint (any method)
      if (endpoint.path === '/') {
        return;
      }

      const method = endpoint.method;
      const endpointPath = endpoint.path;
      const file = `${endpoint.file} L:${endpoint.line}`;
      const handler = endpoint.handler || '-';
      const responseSchema = endpoint.responseSchema ? `\`${endpoint.responseSchema}\`` : '-';
      const errorSchemas = endpoint.errorSchemas && endpoint.errorSchemas.length > 0
        ? endpoint.errorSchemas.map(e => `\`${e}\``).join('<br>')
        : '-';
      const middleware = endpoint.middleware ? endpoint.middleware.join(', ') : '-';

      // Get usages - format with <br> tags for line breaks
      const key = `${endpoint.method} ${endpoint.path}`;
      const usages = project.usages.get(key);
      const usageStr = usages && usages.length > 0
        ? usages.map(u => `${u.file} L:${u.line}`).join('<br>')
        : '-';

      markdown += `| ${method} | \`${endpointPath}\` | \`${file}\` | \`${handler}\` | ${responseSchema} | ${errorSchemas} | \`${middleware}\` | ${usageStr} |\n`;
    });

    markdown += `\n---\n\n`;
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
 * Generate full format markdown report
 */
function generateMarkdownReport(projects: ProjectEndpoints[]): string {
  const now = new Date().toISOString();

  let markdown = `# API Endpoints Analysis Report (Full Format)\n\n`;
  markdown += `**Generated:** ${now}\n`;
  markdown += `**Format:** Full\n`;
  markdown += `**Include Tests:** ${includeTest ? 'Yes' : 'No'}\n\n`;
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
  console.log('Starting API endpoint analysis...');
  console.log(`Format: ${format}`);
  console.log(`Include Tests: ${includeTest}`);
  if (limit) {
    console.log(`Limit: ${limit} endpoints (POC mode)`);
  }
  console.log();

  const projects: ProjectEndpoints[] = [];

  // Analyze backend
  projects.push(analyzeBackend());

  // Analyze identity-provider
  projects.push(analyzeIdentityProvider());

  // Generate report
  console.log('\nGenerating markdown report...');
  const markdown = format === 'simple'
    ? generateSimpleMarkdownReport(projects)
    : generateMarkdownReport(projects);

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

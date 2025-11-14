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

interface SchemaDefinition {
  name: string;
  definition: string;
  file?: string;
  line?: number;
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
  schemas: Map<string, SchemaDefinition>;
}

const BACKEND_DIR = path.join(__dirname, '..', 'backend');
const IDP_DIR = path.join(__dirname, '..', 'identity-provider');
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
const ROOT_DIR = path.join(__dirname, '..');

/**
 * Route file to prefix mapping
 * Maps route file names to their mounting prefixes based on backend/src/routes/index.ts
 */
const ROUTE_PREFIX_MAP: Record<string, string> = {
  'v1.routes.ts': '/v1',
  'api.routes.ts': '/api',
  'admin.routes.ts': '/admin',
  'admin-models.routes.ts': '/admin/models',
  'plan109.routes.ts': '/admin', // Additional admin endpoints
  'plan110.routes.ts': '/api', // Public endpoints (also has /admin routes)
  'plan111.routes.ts': '', // Mounted at root
  'auth.routes.ts': '/auth',
  'mfa.routes.ts': '/auth/mfa',
  'social-auth.routes.ts': '', // Mounted at root
  'swagger.routes.ts': '/api-docs',
  'branding.routes.ts': '/api',
  'vendor-analytics.routes.ts': '/admin/analytics', // Nested under admin analytics
};

/**
 * Determine the route prefix for a given route file
 * @param filePath - Full path to the route file
 * @returns The prefix to prepend to routes in this file
 */
function getRoutePrefixForFile(filePath: string): string {
  const fileName = path.basename(filePath);

  // Check if we have a direct mapping
  if (ROUTE_PREFIX_MAP[fileName]) {
    return ROUTE_PREFIX_MAP[fileName];
  }

  // Handle nested admin routes (e.g., admin/*.routes.ts)
  if (filePath.includes('/admin/') && fileName.endsWith('.routes.ts')) {
    return '/admin';
  }

  // Default: no prefix (root-level routes)
  return '';
}

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

  // Determine the route prefix for this file
  const routePrefix = getRoutePrefixForFile(filePath);

  // Extract global middleware from router.use() calls
  const globalMiddleware: string[] = [];
  const routerUsePattern = /^\s*(router|app)\s*\.\s*use\s*\(/;

  for (let lineIdx = 0; lineIdx < Math.min(lines.length, 100); lineIdx++) {
    const line = lines[lineIdx];
    if (routerUsePattern.test(line)) {
      // Found router.use() - extract middleware
      if (line.includes('authMiddleware')) globalMiddleware.push('authMiddleware');
      if (line.includes('requireAdmin')) globalMiddleware.push('requireAdmin');
      if (line.includes('authenticate(')) globalMiddleware.push('authenticate');
      if (line.includes('auditLog(')) globalMiddleware.push('auditLog');
    }
  }

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

        // Extract route-specific middleware
        const routeMiddleware: string[] = [];
        if (routeCode.match(/authMiddleware/)) routeMiddleware.push('authMiddleware');
        if (routeCode.match(/authenticate\(\)/)) routeMiddleware.push('authenticate');
        if (routeCode.match(/requireAdmin/)) routeMiddleware.push('requireAdmin');
        if (routeCode.match(/requireScopes\(\[([^\]]+)\]\)/)) {
          const scopeMatch = routeCode.match(/requireScopes\(\[([^\]]+)\]\)/);
          if (scopeMatch) routeMiddleware.push(`requireScopes(${scopeMatch[1]})`);
        }
        if (routeCode.match(/requireRoles?\(\[([^\]]+)\]\)/)) {
          const roleMatch = routeCode.match(/requireRoles?\(\[([^\]]+)\]\)/);
          if (roleMatch) routeMiddleware.push(`requireRole(${roleMatch[1]})`);
        }
        if (routeCode.match(/auditLog\(/)) routeMiddleware.push('auditLog');

        // Combine global and route-specific middleware (remove duplicates)
        const middleware = Array.from(new Set([...globalMiddleware, ...routeMiddleware]));

        // Extract handler name - support multiple patterns
        let handler: string | undefined = undefined;

        // Pattern 1: asyncHandler(controller.method.bind(...)) - handle optional whitespace after asyncHandler(
        const bindMatch = routeCode.match(/asyncHandler\(\s*([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\.bind/);
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

        // Apply route prefix to the path
        const fullPath = routePrefix ? `${routePrefix}${routePath}` : routePath;

        // Check for duplicates
        const exists = endpoints.some(
          e => e.method === method && e.path === fullPath
        );

        if (!exists) {
          endpoints.push({
            method,
            path: fullPath,
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
 * Extract TypeScript type/interface definition from source files
 */
function extractTypeDefinition(typeName: string, searchDirs: string[]): SchemaDefinition | null {
  // Search paths for type definitions
  const typeFiles = [
    path.join(ROOT_DIR, 'shared-types', 'src', '**', '*.types.ts'),
    path.join(BACKEND_DIR, 'src', 'types', '**', '*.ts'),
    path.join(BACKEND_DIR, 'src', 'services', '**', '*.ts'),
    path.join(IDP_DIR, 'src', 'types', '**', '*.ts'),
  ];

  for (const pattern of typeFiles) {
    const baseDir = pattern.split('**')[0];
    if (!fs.existsSync(baseDir)) continue;

    const files = getAllFiles(baseDir, ['.ts']);
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      // Search for interface or type definition
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Match: export interface TypeName { or export type TypeName = {
        const match = line.match(new RegExp(`export\\s+(interface|type)\\s+${typeName}\\s*[={]`));
        if (match) {
          // Extract the full definition (handle multi-line)
          let definition = '';
          let braceCount = 0;
          let startLine = i;
          let foundStart = false;

          for (let j = i; j < Math.min(lines.length, i + 200); j++) {
            const currentLine = lines[j];
            definition += currentLine + '\n';

            for (const char of currentLine) {
              if (char === '{') {
                braceCount++;
                foundStart = true;
              } else if (char === '}') {
                braceCount--;
                if (foundStart && braceCount === 0) {
                  return {
                    name: typeName,
                    definition: definition.trim(),
                    file: path.relative(ROOT_DIR, file),
                    line: startLine + 1,
                  };
                }
              }
            }
          }
        }
      }
    }
  }

  return null;
}

/**
 * Extract service method return type from service files
 * @param serviceName - Service name (e.g., couponAnalyticsService)
 * @param serviceMethod - Method name (e.g., getAnalyticsMetrics)
 * @returns Type name (e.g., CouponAnalyticsMetrics) or undefined
 */
function extractServiceMethodType(
  serviceName: string,
  serviceMethod: string,
  schemasMap?: Map<string, SchemaDefinition>
): string | undefined {
  // Convert camelCase to kebab-case for file lookup
  const kebabName = serviceName
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '')
    .replace(/-service$/, '');

  // Try multiple file patterns
  const serviceFilePatterns = [
    path.join(BACKEND_DIR, 'src', 'services', `${kebabName}.service.ts`),
    path.join(BACKEND_DIR, 'src', 'services', `${serviceName}.ts`),
    path.join(IDP_DIR, 'src', 'services', `${kebabName}.service.ts`),
    path.join(IDP_DIR, 'src', 'services', `${serviceName}.ts`),
  ];

  let serviceFile: string | undefined;
  for (const pattern of serviceFilePatterns) {
    if (fs.existsSync(pattern)) {
      serviceFile = pattern;
      break;
    }
  }

  // If not found, try partial matching
  if (!serviceFile) {
    const serviceDirs = [
      path.join(BACKEND_DIR, 'src', 'services'),
      path.join(IDP_DIR, 'src', 'services'),
    ];

    for (const dir of serviceDirs) {
      if (!fs.existsSync(dir)) continue;

      const files = fs.readdirSync(dir).filter(f => f.endsWith('.service.ts') || f.endsWith('.ts'));
      const candidates = files.filter(f => f.startsWith(kebabName) || f.includes(kebabName));

      if (candidates.length > 1) {
        // Multiple matches - check which one contains the method
        for (const candidate of candidates) {
          const candidatePath = path.join(dir, candidate);
          const candidateContent = fs.readFileSync(candidatePath, 'utf-8');

          // Check if this file contains the method we're looking for
          if (candidateContent.match(new RegExp(`async\\s+${serviceMethod}\\s*\\(`))) {
            serviceFile = candidatePath;
            break;
          }
        }
      } else if (candidates.length === 1) {
        serviceFile = path.join(dir, candidates[0]);
      }

      if (serviceFile) break;
    }
  }

  if (!serviceFile) {
    return undefined;
  }

  const serviceContent = fs.readFileSync(serviceFile, 'utf-8');

  // Try to match Promise<TypeName>
  const namedTypeMatch = serviceContent.match(
    new RegExp(`async\\s+${serviceMethod}\\s*\\([^)]*\\)\\s*:\\s*Promise<([^>]+)>`)
  );

  if (namedTypeMatch) {
    const typeName = namedTypeMatch[1].trim();

    // Filter out internal/primitive types
    const ignoredTypes = ['any | null', 'null', 'void', 'boolean', 'string', 'number'];
    if (!ignoredTypes.includes(typeName)) {
      return typeName;
    }
  }

  return undefined;
}

/**
 * Extract response and error schemas from controller method
 */
function extractSchemas(
  endpoint: EndpointDefinition,
  schemasMap: Map<string, SchemaDefinition>
): { responseSchema?: string; errorSchemas?: string[] } {
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
        // Extract expected filename from pattern (after the **)
        const patternParts = pattern.split('**');
        const expectedFilename = patternParts.length > 1 ? patternParts[1].replace(/^[\/\\]/, '') : `${controllerName}.ts`;

        // Look for files matching the expected filename
        const found = files.find(f => f.endsWith(expectedFilename) || f.endsWith(`${controllerName}.ts`));
        if (found) {
          // Verify the found file contains the method
          const content = fs.readFileSync(found, 'utf-8');
          if (content.includes(`${methodName}`) &&
              (content.includes(`async ${methodName}(`) ||
               content.includes(`${methodName} =`) ||
               content.includes(`${methodName}(`))) {
            controllerFile = found;
            break;
          }
        }
      }
    } else if (fs.existsSync(pattern)) {
      // Verify the found file contains the method
      const content = fs.readFileSync(pattern, 'utf-8');
      if (content.includes(`${methodName}`) &&
          (content.includes(`async ${methodName}(`) ||
           content.includes(`${methodName} =`) ||
           content.includes(`${methodName}(`))) {
        controllerFile = pattern;
        break;
      }
    }
  }

  // If not found, try partial matching (e.g., creditController -> credit-management.controller.ts)
  if (!controllerFile) {
    const controllerDirs = [
      path.join(BACKEND_DIR, 'src', 'controllers'),
      path.join(IDP_DIR, 'src', 'controllers'),
    ];

    for (const dir of controllerDirs) {
      if (!fs.existsSync(dir)) continue;

      // Use getAllFiles to recursively search subdirectories (e.g., backend/src/controllers/admin/)
      const allFiles = getAllFiles(dir, ['.ts']);
      const files = allFiles.map(f => path.basename(f)).filter(f => f.endsWith('.controller.ts') || f.endsWith('.ts'));
      const filePathsMap = new Map(allFiles.map(f => [path.basename(f), f]));

      // Strategy 1: Look for files that contain the kebab name
      const candidates = files.filter(f => f.startsWith(kebabName) || f.includes(kebabName));

      if (candidates.length > 1) {
        // Multiple matches - check which one contains the method
        for (const candidate of candidates) {
          const candidatePath = filePathsMap.get(candidate)!;
          const candidateContent = fs.readFileSync(candidatePath, 'utf-8');

          // Check if this file contains the method we're looking for
          if (candidateContent.includes(`${methodName}`) &&
              (candidateContent.includes(`async ${methodName}(`) ||
               candidateContent.includes(`${methodName} =`) ||
               candidateContent.includes(`${methodName}(`))) {
            controllerFile = candidatePath;
            break;
          }
        }
      } else if (candidates.length === 1) {
        controllerFile = filePathsMap.get(candidates[0])!;
      }

      if (controllerFile) break;
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
    // Match method declaration: async methodName( OR methodName(...): Promise OR methodName = async (
    if (line.match(new RegExp(`async\\s+${methodName}\\s*\\(`)) ||
        line.match(new RegExp(`${methodName}\\s*\\([^)]*\\)\\s*:\\s*Promise`)) ||
        line.match(new RegExp(`${methodName}\\s*=\\s*async\\s*\\(`))) {
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

    // Convert camelCase to kebab-case for file lookup
    // e.g., platformAnalyticsService -> platform-analytics.service.ts
    const kebabName = serviceName
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, '')
      .replace(/-service$/, '');

    // Try multiple file patterns and also glob for partial matches
    const serviceFilePatterns = [
      path.join(BACKEND_DIR, 'src', 'services', `${kebabName}.service.ts`),
      path.join(BACKEND_DIR, 'src', 'services', `${serviceName}.ts`),
      path.join(IDP_DIR, 'src', 'services', `${kebabName}.service.ts`),
      path.join(IDP_DIR, 'src', 'services', `${serviceName}.ts`),
    ];

    let serviceFile: string | undefined;
    for (const pattern of serviceFilePatterns) {
      if (fs.existsSync(pattern)) {
        serviceFile = pattern;
        break;
      }
    }

    // If not found, try glob pattern for partial matches (e.g., campaign-management.service.ts)
    if (!serviceFile) {
      const serviceDirs = [
        path.join(BACKEND_DIR, 'src', 'services'),
        path.join(IDP_DIR, 'src', 'services'),
      ];

      for (const dir of serviceDirs) {
        if (!fs.existsSync(dir)) continue;

        const files = fs.readdirSync(dir).filter(f => f.endsWith('.service.ts') || f.endsWith('.ts'));
        // Look for files that start with the kebab prefix
        const match = files.find(f => f.startsWith(kebabName) || f.includes(kebabName));
        if (match) {
          serviceFile = path.join(dir, match);
          break;
        }
      }
    }

    if (serviceFile) {
      const serviceContent = fs.readFileSync(serviceFile, 'utf-8');

      // First, try to match inline object types Promise<{ ... }>
      const inlineTypeMatch = serviceContent.match(
        new RegExp(`async\\s+${serviceMethod}\\s*\\([^)]*\\)\\s*:\\s*Promise<(\\{[\\s\\S]*?\\})>`, 'm')
      );

      // If not inline, try to match named types Promise<TypeName>
      const namedTypeMatch = !inlineTypeMatch ? serviceContent.match(
        new RegExp(`async\\s+${serviceMethod}\\s*\\([^)]*\\)\\s*:\\s*Promise<([^>]+)>`)
      ) : null;

      const serviceMethodMatch = inlineTypeMatch || namedTypeMatch;

      if (serviceMethodMatch) {
        let typeName = serviceMethodMatch[1].trim();

        // Check if this is an inline anonymous type (starts with '{')
        if (typeName.startsWith('{')) {
          // Inline anonymous type - create a named schema
          const schemaName = `${serviceMethod.charAt(0).toUpperCase()}${serviceMethod.slice(1)}_Response`;
          if (!schemasMap.has(schemaName)) {
            // Find the actual line number of the method
            const methodLineMatch = serviceContent.split('\n').findIndex(line =>
              line.includes(`async ${serviceMethod}(`) || line.includes(`async ${serviceMethod} (`)
            );
            const actualLine = methodLineMatch !== -1 ? methodLineMatch + 1 : undefined;

            schemasMap.set(schemaName, {
              name: schemaName,
              definition: `// Service method return type from ${path.basename(serviceFile)}\ntype ${schemaName} = ${typeName}`,
              file: path.relative(ROOT_DIR, serviceFile),
              line: actualLine,
            });
          }
          responseSchema = schemaName;
        } else {
          // Named type - continue with existing logic
          // Filter out internal cache/utility types - these are not API responses
          const ignoredTypes = ['any | null', 'null', 'void', 'boolean', 'string', 'number'];
          const isInternalType = ignoredTypes.includes(typeName) ||
                                 typeName.endsWith(' | null') && !typeName.includes('interface') &&
                                 !typeName.includes('export');

          if (!isInternalType) {
            // Extract type definition and store in schemas map
            if (!schemasMap.has(typeName)) {
              const typeDef = extractTypeDefinition(typeName, []);
              if (typeDef) {
                // Additional check: if definition is from cache.get(), skip it
                if (!typeDef.definition.includes('cache.get(') &&
                    !typeDef.definition.includes('this.cache')) {
                  schemasMap.set(typeName, typeDef);
                }
              }
            }
            responseSchema = typeName;
          }
        }
      }
    }
  }

  // Strategy 2: Extract from res.json() patterns for success responses
  if (!responseSchema) {
    // Pattern 1: res.status(2xx).json(successResponse(...)) OR res.json(successResponse(...))
    const successResponseMatch = methodCode.match(/res\.(status\(2\d{2}\)\.)?json\(successResponse\(/);
    if (successResponseMatch) {
      // Extract the object inside successResponse()
      const successResponseIndex = methodCode.indexOf('successResponse(');
      const afterSuccessResponse = methodCode.substring(successResponseIndex + 'successResponse('.length);

      // Find the complete object inside successResponse()
      let braceCount = 0;
      let inObject = false;
      let objectContent = '';
      let endIndex = 0;

      for (let i = 0; i < afterSuccessResponse.length; i++) {
        const char = afterSuccessResponse[i];
        if (char === '{') {
          braceCount++;
          inObject = true;
        }
        if (inObject) {
          objectContent += char;
        }
        if (char === '}') {
          braceCount--;
          if (braceCount === 0 && inObject) {
            endIndex = i;
            break;
          }
        }
      }

      // Check if the object is multi-line and complex
      if (objectContent && objectContent.split('\n').length > 3) {
        // Create a named schema for this complex response
        const schemaName = `${endpoint.handler?.replace(/\./g, '_') || 'SuccessResponse'}_Data`;
        if (!schemasMap.has(schemaName)) {
          schemasMap.set(schemaName, {
            name: schemaName,
            definition: `// Controller response data from ${endpoint.file}:${endpoint.line}\ntype ${schemaName} = ${objectContent}`,
            file: endpoint.file,
            line: endpoint.line,
          });
        }
        responseSchema = `{ status: "success", data: ${schemaName} }`;
      } else {
        // Simple response or no object literal - use generic T
        const hasPagination = /\{\s*(total|page|limit|totalPages|hasMore)\s*[,:}]/s.test(afterSuccessResponse) &&
                             !/successResponse\(\s*\{[^}]*(total|page|limit)/s.test(afterSuccessResponse);
        responseSchema = hasPagination
          ? '{ status: "success", data: T, meta: PaginationMeta }'
          : '{ status: "success", data: T }';
      }
    } else {
      // Pattern 2: res.status(2xx).json(paginatedResponse(...)) OR res.json(paginatedResponse(...))
      const paginatedMatch = methodCode.match(/res\.(status\(2\d{2}\)\.)?json\(paginatedResponse\(/);
      if (paginatedMatch) {
        responseSchema = '{ status: "success", data: T[], meta: PaginationMeta }';
      } else {
        // Pattern 2.5: res.status(2xx).json(mapperFunction(...)) - e.g., mapCouponToApiType(), mapUserToApiType()
        const mapperMatch = methodCode.match(/res\.status\(2\d{2}\)\.json\(map([A-Z][a-zA-Z0-9]*)ToApiType\(/);
        if (mapperMatch) {
          // Extract type name from mapper function (e.g., mapCouponToApiType -> Coupon)
          responseSchema = mapperMatch[1];
        } else {
          // Check for other common mapper patterns
          const genericMapperMatch = methodCode.match(/res\.status\(2\d{2}\)\.json\(([a-zA-Z0-9_]+Mapper|to[A-Z][a-zA-Z0-9]*)\(/);
          if (genericMapperMatch) {
            // Try to infer type from mapper name (e.g., userMapper -> User, toDTO -> DTO)
            const mapperName = genericMapperMatch[1];
            if (mapperName.endsWith('Mapper')) {
              const typeName = mapperName.replace(/Mapper$/, '');
              responseSchema = typeName.charAt(0).toUpperCase() + typeName.slice(1);
            } else if (mapperName.startsWith('to')) {
              responseSchema = mapperName.substring(2);
            }
          }
        }
      }

      if (!responseSchema) {
        // Pattern 2.6: sendPaginatedResponse(res, data, ...) helper function
        const sendPaginatedMatch = methodCode.match(/sendPaginatedResponse\(res,\s*([a-zA-Z_][a-zA-Z0-9_]*)/);
        if (sendPaginatedMatch) {
          responseSchema = 'PaginatedResponse<T>'; // Generic paginated type
        }
      }

      if (!responseSchema) {
        // Pattern 2.7: res.redirect(...) - redirect-only endpoint
        const redirectMatch = methodCode.match(/res\.redirect\(/);
        if (redirectMatch) {
          responseSchema = 'Redirect'; // Special marker for redirects
        }
      }

      if (!responseSchema) {
        // Pattern 3: Wrapped response with data field - res.json({ success/status: ..., data: variable })
        // Matches: res.json({ success: true, data: variable }) OR res.status(200).json({ status: 'success', data: variable })
        const wrappedMatch = methodCode.match(/res\.(status\(\d{3}\)\.)?json\(\s*\{\s*(?:success|status):\s*['"true success'",]+\s*,\s*data:\s*([a-zA-Z_][a-zA-Z0-9_]*)/);
        if (wrappedMatch) {
          const dataVariable = wrappedMatch[2];

          // Trace the data variable to its source
          // Pattern 3a: const dataVariable = await service.method(...)
          const serviceCallPattern = new RegExp(`const\\s+${dataVariable}\\s*=\\s*await\\s+this\\.([a-zA-Z0-9_]+)\\.([a-zA-Z0-9_]+)\\(`, 'm');
          const serviceCallMatch = methodCode.match(serviceCallPattern);

          if (serviceCallMatch) {
            const [, serviceName, serviceMethod] = serviceCallMatch;
            const serviceType = extractServiceMethodType(serviceName, serviceMethod);

            if (serviceType) {
              // Wrap the extracted type in the response wrapper
              responseSchema = `{ success: true, data: ${serviceType} }`;
            }
          } else {
            // Pattern 3b: const dataVariable = inline object/array construction
            // Use generic wrapper
            responseSchema = '{ success: true, data: T }';
          }
        }
      }

      if (!responseSchema) {
        // Pattern 3.5: res.status(2xx).json(variableName) - variable passed to json()
        // Check this BEFORE Pattern 4 (direct object literal) to prioritize variable tracing
        const variableMatch = methodCode.match(/res\.status\(2\d{2}\)\.json\(([a-zA-Z_][a-zA-Z0-9_]*)\)/);

        if (variableMatch) {
          const variableName = variableMatch[1];

          // Look for variable assignment: const variableName = await service.method(...)
          const assignmentPattern = new RegExp(`const\\s+${variableName}\\s*=\\s*await\\s+this\\.([a-zA-Z0-9_]+)\\.([a-zA-Z0-9_]+)\\(`, 'm');
          const assignmentMatch = methodCode.match(assignmentPattern);

          if (assignmentMatch) {
            const [, serviceName, serviceMethod] = assignmentMatch;

            // Use existing service type extraction logic
            const serviceType = extractServiceMethodType(serviceName, serviceMethod);

            if (serviceType) {
              responseSchema = serviceType;
            }
          }
        }
      }

      if (!responseSchema) {
        // Pattern 4: res.status(2xx).json({ ... }) OR res.json({ ... })
        const directJsonMatch = methodCode.match(/res\.(status\(2\d{2}\)\.)?json\(\s*\{/);
        if (directJsonMatch) {
          // Extract the inline object literal
          // Prefer success responses (status 2xx) over error responses
          const successJsonMatch = methodCode.match(/res\.status\(2\d{2}\)\.json\(\s*\{/);
          const anyJsonMatch = methodCode.match(/res\.json\(\s*\{/);

          let jsonStartIndex = -1;
          if (successJsonMatch) {
            jsonStartIndex = methodCode.indexOf(successJsonMatch[0]);
          } else if (anyJsonMatch) {
            jsonStartIndex = methodCode.indexOf(anyJsonMatch[0]);
          }

          if (jsonStartIndex !== -1) {
            const startIndex = methodCode.indexOf('{', jsonStartIndex);
            let braceCount = 0;
            let endIndex = startIndex;
            for (let i = startIndex; i < methodCode.length; i++) {
              if (methodCode[i] === '{') braceCount++;
              if (methodCode[i] === '}') braceCount--;
              if (braceCount === 0) {
                endIndex = i;
                break;
              }
            }

            const objectLiteral = methodCode.substring(startIndex, endIndex + 1);

            // Skip if this is an error object (contains error: { code: ... })
            if (objectLiteral.includes('error:') && objectLiteral.includes('code:')) {
              // Don't extract error responses as schemas
              responseSchema = undefined;
            } else if (objectLiteral.split('\n').length > 3) {
              // Multi-line object - create a named schema
              const schemaName = `${endpoint.handler?.replace(/\./g, '_') || 'Inline'}_Response`;
              if (!schemasMap.has(schemaName)) {
                schemasMap.set(schemaName, {
                  name: schemaName,
                  definition: `// Inline response from ${endpoint.file}:${endpoint.line}\ntype ${schemaName} = ${objectLiteral}`,
                  file: endpoint.file,
                  line: endpoint.line,
                });
              }
              responseSchema = schemaName;
            } else {
              // Simple single-line object - keep as inline
              responseSchema = objectLiteral.replace(/\n/g, ' ').replace(/\s+/g, ' ');
            }
          } else {
            responseSchema = 'Object';
          }
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
    new RegExp(`axios\\.(${endpoint.method.toLowerCase()}|request)(<[^>]+>)?\\s*\\([^)]*['"\`]([^'"\`]*${pathPattern.replace(/^\//, '')}[^'"\`]*)['"\`]`, 'gi'),
    new RegExp(`apiClient\\.(${endpoint.method.toLowerCase()}|request)(<[^>]+>)?\\s*\\([^)]*['"\`]([^'"\`]*${pathPattern.replace(/^\//, '')}[^'"\`]*)['"\`]`, 'gi'),
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
  const schemasMap = new Map<string, SchemaDefinition>();
  endpoints.forEach(endpoint => {
    const schemas = extractSchemas(endpoint, schemasMap);
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
    schemas: schemasMap,
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

  // Extract schemas for each endpoint
  const schemasMap = new Map<string, SchemaDefinition>();
  endpoints.forEach(endpoint => {
    const schemas = extractSchemas(endpoint, schemasMap);
    endpoint.responseSchema = schemas.responseSchema;
    endpoint.errorSchemas = schemas.errorSchemas;
  });

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
    schemas: schemasMap,
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

    // Count endpoints excluding root endpoint
    const displayedEndpoints = project.endpoints.filter(e => e.path !== '/');
    markdown += `**Total Endpoints:** ${displayedEndpoints.length}\n\n`;

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

      // Format response schema - if it contains newlines, it's already been extracted to schemas
      // Only wrap in backticks if it's a single-line value
      let responseSchemaCell = '-';
      if (endpoint.responseSchema) {
        if (endpoint.responseSchema.includes('\n')) {
          // Multi-line schema should have been converted to a named reference
          // This shouldn't happen, but if it does, sanitize it
          responseSchemaCell = `\`${endpoint.responseSchema.split('\n')[0]}...\``;
        } else {
          responseSchemaCell = `\`${endpoint.responseSchema}\``;
        }
      }

      const errorSchemas = endpoint.errorSchemas && endpoint.errorSchemas.length > 0
        ? endpoint.errorSchemas.map(e => `\`${e}\``).join('<br>')
        : '-';
      const middleware = endpoint.middleware ? endpoint.middleware.join(', ') : '-';

      // Get usages - consolidate duplicate files with semicolon-separated line numbers
      const key = `${endpoint.method} ${endpoint.path}`;
      const usages = project.usages.get(key);
      let usageStr = '-';

      if (usages && usages.length > 0) {
        // Group usages by file path
        const fileMap = new Map<string, number[]>();
        usages.forEach(u => {
          if (!fileMap.has(u.file)) {
            fileMap.set(u.file, []);
          }
          fileMap.get(u.file)!.push(u.line);
        });

        // Format as "file L:line1;line2;line3"
        const consolidatedUsages = Array.from(fileMap.entries()).map(([file, lines]) => {
          // Sort line numbers numerically
          const sortedLines = lines.sort((a, b) => a - b);
          return `${file} L:${sortedLines.join(';')}`;
        });

        usageStr = consolidatedUsages.join('<br>');
      }

      markdown += `| ${method} | \`${endpointPath}\` | \`${file}\` | \`${handler}\` | ${responseSchemaCell} | ${errorSchemas} | \`${middleware}\` | ${usageStr} |\n`;
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

  // Collect all unique schemas from all projects
  const allSchemas = new Map<string, SchemaDefinition>();
  projects.forEach(project => {
    project.schemas.forEach((schema, name) => {
      if (!allSchemas.has(name)) {
        allSchemas.set(name, schema);
      }
    });
  });

  // Add Schemas section if we have any
  if (allSchemas.size > 0) {
    markdown += `---\n\n`;
    markdown += `## Schemas\n\n`;
    markdown += `Referenced TypeScript types and interfaces used in API responses:\n\n`;

    // Sort schemas alphabetically
    const sortedSchemas = Array.from(allSchemas.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    sortedSchemas.forEach(([name, schema]) => {
      markdown += `### ${name}\n\n`;
      if (schema.file) {
        markdown += `**Source:** \`${schema.file}\` (Line ${schema.line})\n\n`;
      }
      markdown += `\`\`\`typescript\n`;
      markdown += schema.definition;
      markdown += `\n\`\`\`\n\n`;
    });
  }

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

    // Count endpoints excluding root endpoint
    const displayedEndpoints = project.endpoints.filter(e => e.path !== '/');
    markdown += `**Total Endpoints:** ${displayedEndpoints.length}\n\n`;

    // Group by HTTP method (exclude root endpoint)
    const methodGroups = new Map<string, EndpointDefinition[]>();
    project.endpoints.forEach(endpoint => {
      // Skip root endpoint (any method) - floods the document with usages
      if (endpoint.path === '/') {
        return;
      }

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

        if (endpoint.responseSchema) {
          markdown += `- **Response Schema:** \`${endpoint.responseSchema}\`\n`;
        }

        if (endpoint.errorSchemas && endpoint.errorSchemas.length > 0) {
          markdown += `- **Error Schemas:** ${endpoint.errorSchemas.map(e => `\`${e}\``).join(', ')}\n`;
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

  // Store at root for easy to navigate
  const outputFile = path.join(ROOT_DIR, `api-endpoints-index.md`);
  const outputFileWithNumber = path.join(ROOT_DIR, `api-endpoints-index-v${String(nextNumber).padStart(3,'0')}.md`);
  // const outputFile = path.join(docsAnalysisDir, `${String(nextNumber).padStart(3, '0')}-api-endpoints-analysis.md`);
  fs.writeFileSync(outputFile, markdown, 'utf-8');
  fs.writeFileSync(outputFileWithNumber, markdown, 'utf-8');

  console.log(`\n✅ Report generated: ${path.relative(ROOT_DIR, outputFile)}`);
  console.log(`   Total projects analyzed: ${projects.length}`);
  console.log(`   Total endpoints found: ${projects.reduce((sum, p) => sum + p.endpoints.length, 0)}`);
}

// Run the script
main();

#!/usr/bin/env ts-node
/**
 * Table Reference Analyzer
 *
 * Analyzes the codebase for potential table name mismatches between:
 * 1. Prisma schema model names
 * 2. Raw SQL queries in TypeScript files
 *
 * This script helps prevent runtime errors caused by referencing
 * non-existent database tables in raw SQL queries.
 *
 * Usage:
 *   ts-node scripts/analyze-table-references.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface TableReference {
  file: string;
  line: number;
  tableName: string;
  queryType: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'FROM' | 'JOIN';
  context: string;
}

interface AnalysisResult {
  schemaTableNames: string[];
  validReferences: TableReference[];
  invalidReferences: TableReference[];
  suspiciousReferences: TableReference[];
}

/**
 * Extract table names from Prisma schema
 */
function extractSchemaTableNames(schemaPath: string): string[] {
  const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
  const modelRegex = /^model\s+(\w+)\s*\{/gm;
  const tableNames: string[] = [];

  let match;
  while ((match = modelRegex.exec(schemaContent)) !== null) {
    tableNames.push(match[1]);
  }

  return tableNames;
}

/**
 * Extract table references from raw SQL queries in TypeScript files
 */
function extractTableReferencesFromFile(filePath: string): TableReference[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const references: TableReference[] = [];

  // Patterns to match raw SQL queries
  const rawSqlPatterns = [
    /prisma\.\$queryRaw/,
    /prisma\.\$executeRaw/,
    /prisma\.\$queryRawUnsafe/,
    /prisma\.\$executeRawUnsafe/,
  ];

  let inRawQuery = false;
  let queryStartLine = -1;
  let queryBuffer: string[] = [];

  lines.forEach((line, index) => {
    // Check if we're starting a raw SQL query
    const isQueryStart = rawSqlPatterns.some(pattern => pattern.test(line));

    if (isQueryStart) {
      inRawQuery = true;
      queryStartLine = index + 1;
      queryBuffer = [line];
    } else if (inRawQuery) {
      queryBuffer.push(line);

      // Check if query ends (look for closing backtick, semicolon, or closing paren)
      if (line.includes('`;') || line.includes(');') || line.trim() === '`') {
        // Analyze the complete query
        const fullQuery = queryBuffer.join('\n');
        const queryReferences = extractTableNamesFromQuery(fullQuery, filePath, queryStartLine);
        references.push(...queryReferences);

        inRawQuery = false;
        queryBuffer = [];
      }
    }
  });

  return references;
}

/**
 * Extract table names from a SQL query string
 */
function extractTableNamesFromQuery(
  query: string,
  filePath: string,
  lineNumber: number
): TableReference[] {
  const references: TableReference[] = [];

  // SQL keywords to ignore (false positives)
  const sqlKeywords = new Set([
    'as', 'desc', 'asc', 'where', 'and', 'or', 'not', 'null', 'true', 'false',
    'select', 'insert', 'update', 'delete', 'from', 'into', 'set', 'values',
    'order', 'group', 'having', 'limit', 'offset', 'union', 'join', 'left',
    'right', 'inner', 'outer', 'on', 'using', 'case', 'when', 'then', 'else',
    'end', 'exists', 'in', 'between', 'like', 'is', 'distinct', 'all', 'any',
    'now', 'count', 'sum', 'avg', 'min', 'max', 'extract', 'hour', 'day', 'month',
    'year', 'date', 'time', 'timestamp', 'interval', 'cast', 'convert', 'coalesce',
  ]);

  // Common column name patterns to ignore
  const columnPatterns = [
    /^[a-z]+_at$/i,      // created_at, updated_at, etc.
    /^[a-z]+_id$/i,      // user_id, provider_id, etc.
    /^[a-z]+_name$/i,    // model_name, provider_name, etc.
    /^[a-z]+_count$/i,   // total_count, etc.
  ];

  // Patterns to match table names in SQL
  const patterns = [
    { regex: /FROM\s+(["\w]+)/gi, type: 'FROM' as const },
    { regex: /JOIN\s+(["\w]+)/gi, type: 'JOIN' as const },
    { regex: /INSERT\s+INTO\s+(["\w]+)/gi, type: 'INSERT' as const },
    { regex: /UPDATE\s+(["\w]+)/gi, type: 'UPDATE' as const },
    { regex: /DELETE\s+FROM\s+(["\w]+)/gi, type: 'DELETE' as const },
  ];

  patterns.forEach(({ regex, type }) => {
    let match;
    while ((match = regex.exec(query)) !== null) {
      const tableName = match[1].replace(/["`]/g, ''); // Remove quotes
      const lowerTableName = tableName.toLowerCase();

      // Skip SQL keywords
      if (sqlKeywords.has(lowerTableName)) {
        continue;
      }

      // Skip column-like patterns
      if (columnPatterns.some(pattern => pattern.test(tableName))) {
        continue;
      }

      // Get context (surrounding lines)
      const contextLines = query.split('\n').slice(0, 5).join('\n');

      references.push({
        file: filePath,
        line: lineNumber,
        tableName,
        queryType: type,
        context: contextLines.trim(),
      });
    }
  });

  return references;
}

/**
 * Recursively find all TypeScript files
 */
function findTypeScriptFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip node_modules, dist, and build directories
      if (!['node_modules', 'dist', 'build', '.git'].includes(file)) {
        findTypeScriptFiles(filePath, fileList);
      }
    } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

/**
 * Analyze the codebase for table reference issues
 */
function analyzeTableReferences(rootDir: string, schemaPath: string): AnalysisResult {
  console.log('🔍 Analyzing table references in codebase...\n');

  // Step 1: Extract schema table names
  console.log('📋 Step 1: Extracting table names from Prisma schema...');
  const schemaTableNames = extractSchemaTableNames(schemaPath);
  console.log(`   Found ${schemaTableNames.length} tables in schema\n`);

  // Step 2: Find all TypeScript files
  console.log('📁 Step 2: Finding TypeScript files...');
  const tsFiles = findTypeScriptFiles(rootDir);
  console.log(`   Found ${tsFiles.length} TypeScript files\n`);

  // Step 3: Extract table references from all files
  console.log('🔎 Step 3: Extracting table references from raw SQL queries...');
  const allReferences: TableReference[] = [];
  let filesWithRawSQL = 0;

  tsFiles.forEach(file => {
    const references = extractTableReferencesFromFile(file);
    if (references.length > 0) {
      filesWithRawSQL++;
      allReferences.push(...references);
    }
  });

  console.log(`   Found ${allReferences.length} table references in ${filesWithRawSQL} files\n`);

  // Step 4: Categorize references
  console.log('✅ Step 4: Validating table references...\n');
  const validReferences: TableReference[] = [];
  const invalidReferences: TableReference[] = [];
  const suspiciousReferences: TableReference[] = [];

  allReferences.forEach(ref => {
    const exactMatch = schemaTableNames.includes(ref.tableName);

    if (exactMatch) {
      validReferences.push(ref);
    } else {
      // Check for potential singular/plural mismatches
      const singularMatch = schemaTableNames.find(
        table => table === ref.tableName + 's' || table + 's' === ref.tableName
      );

      if (singularMatch) {
        suspiciousReferences.push(ref);
      } else {
        invalidReferences.push(ref);
      }
    }
  });

  return {
    schemaTableNames,
    validReferences,
    invalidReferences,
    suspiciousReferences,
  };
}

/**
 * Print analysis results
 */
function printResults(results: AnalysisResult): void {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📊 ANALYSIS RESULTS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`✅ Valid references: ${results.validReferences.length}`);
  console.log(`⚠️  Suspicious references: ${results.suspiciousReferences.length}`);
  console.log(`❌ Invalid references: ${results.invalidReferences.length}\n`);

  if (results.suspiciousReferences.length > 0) {
    console.log('⚠️  SUSPICIOUS REFERENCES (Singular/Plural Mismatch):');
    console.log('───────────────────────────────────────────────────────────────\n');

    results.suspiciousReferences.forEach(ref => {
      const relativePath = path.relative(process.cwd(), ref.file);
      const possibleMatch = results.schemaTableNames.find(
        table => table === ref.tableName + 's' || table + 's' === ref.tableName
      );

      console.log(`📍 ${relativePath}:${ref.line}`);
      console.log(`   Table referenced: "${ref.tableName}"`);
      console.log(`   Possible correct name: "${possibleMatch}"`);
      console.log(`   Query type: ${ref.queryType}`);
      console.log(`   Context:\n${ref.context.split('\n').map(l => '      ' + l).join('\n')}\n`);
    });
  }

  if (results.invalidReferences.length > 0) {
    console.log('❌ INVALID REFERENCES (Table Not Found in Schema):');
    console.log('───────────────────────────────────────────────────────────────\n');

    results.invalidReferences.forEach(ref => {
      const relativePath = path.relative(process.cwd(), ref.file);

      console.log(`📍 ${relativePath}:${ref.line}`);
      console.log(`   Table referenced: "${ref.tableName}"`);
      console.log(`   Query type: ${ref.queryType}`);
      console.log(`   Context:\n${ref.context.split('\n').map(l => '      ' + l).join('\n')}\n`);
    });
  }

  if (results.suspiciousReferences.length === 0 && results.invalidReferences.length === 0) {
    console.log('🎉 No issues found! All table references are valid.\n');
  }

  // Print summary statistics
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📈 STATISTICS');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log(`Total tables in schema: ${results.schemaTableNames.length}`);
  console.log(`Total table references analyzed: ${results.validReferences.length + results.suspiciousReferences.length + results.invalidReferences.length}`);
  console.log(`Files with raw SQL queries: ${new Set([...results.validReferences, ...results.suspiciousReferences, ...results.invalidReferences].map(r => r.file)).size}\n`);

  // Print all schema tables for reference
  console.log('📋 Available tables in schema:');
  console.log('   ' + results.schemaTableNames.sort().join(', ') + '\n');
}

/**
 * Main execution
 */
function main() {
  const rootDir = path.join(__dirname, '../src');
  const schemaPath = path.join(__dirname, '../prisma/schema.prisma');

  // Check if paths exist
  if (!fs.existsSync(rootDir)) {
    console.error(`❌ Error: Source directory not found: ${rootDir}`);
    process.exit(1);
  }

  if (!fs.existsSync(schemaPath)) {
    console.error(`❌ Error: Prisma schema not found: ${schemaPath}`);
    process.exit(1);
  }

  // Run analysis
  const results = analyzeTableReferences(rootDir, schemaPath);

  // Print results
  printResults(results);

  // Exit with error code if issues found
  if (results.suspiciousReferences.length > 0 || results.invalidReferences.length > 0) {
    console.log('⚠️  Issues detected! Please review and fix the references above.\n');
    process.exit(1);
  } else {
    console.log('✅ All table references are valid!\n');
    process.exit(0);
  }
}

// Run the script
main();

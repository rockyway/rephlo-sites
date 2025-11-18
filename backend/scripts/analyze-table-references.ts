#!/usr/bin/env ts-node
/**
 * Table & Column Reference Analyzer
 *
 * Analyzes the codebase for potential schema mismatches between:
 * 1. Prisma schema (models, columns, enums)
 * 2. Raw SQL queries in TypeScript files
 *
 * This script helps prevent runtime errors caused by:
 * - Referencing non-existent database tables
 * - Referencing non-existent columns (e.g., summary_date vs date)
 * - Missing required columns in INSERT statements
 * - Missing enum type casts in SQL queries
 *
 * Features:
 * - Table name validation (detects typos and singular/plural mismatches)
 * - Column name validation (detects incorrect column names)
 * - Required column detection (ensures INSERT has all required fields)
 * - Enum cast validation (ensures proper ::enum_type casts)
 *
 * Usage:
 *   ts-node scripts/analyze-table-references.ts
 *
 * Exit Codes:
 *   0 - All validations passed
 *   1 - Issues found (see output for details)
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

interface EnumCastIssue {
  file: string;
  line: number;
  columnName: string;
  enumType: string;
  context: string;
}

interface ColumnReference {
  file: string;
  line: number;
  tableName: string;
  columnName: string;
  queryType: 'INSERT' | 'UPDATE' | 'SELECT';
  context: string;
}

interface TableSchema {
  tableName: string;
  columns: Map<string, ColumnInfo>; // column name -> column info
}

interface ColumnInfo {
  name: string;
  type: string;
  isRequired: boolean; // Not nullable and no default
  isEnum: boolean;
  enumType?: string;
}

interface AnalysisResult {
  schemaTableNames: string[];
  schemaEnumColumns: Map<string, string>; // column -> enum type
  tableSchemas: Map<string, TableSchema>; // table name -> schema
  validReferences: TableReference[];
  invalidReferences: TableReference[];
  suspiciousReferences: TableReference[];
  missingEnumCasts: EnumCastIssue[];
  invalidColumns: ColumnReference[];
  missingRequiredColumns: ColumnReference[];
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
 * Extract enum column mappings from Prisma schema
 * Returns Map of column name -> enum type
 */
function extractEnumColumns(schemaPath: string): Map<string, string> {
  const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
  const enumColumns = new Map<string, string>();

  // First, extract all enum type names
  const enumRegex = /^enum\s+(\w+)\s*\{/gm;
  const enumTypes = new Set<string>();
  let match;

  while ((match = enumRegex.exec(schemaContent)) !== null) {
    enumTypes.add(match[1]);
  }

  // Then find all columns with enum types
  const lines = schemaContent.split('\n');
  let inModel = false;

  for (const line of lines) {
    if (/^model\s+\w+\s*\{/.test(line)) {
      inModel = true;
      continue;
    }

    if (inModel && line.trim() === '}') {
      inModel = false;
      continue;
    }

    if (inModel) {
      // Match: column_name EnumType or column_name EnumType?
      const columnMatch = /^\s+(\w+)\s+(\w+)\??/.exec(line);
      if (columnMatch) {
        const [, columnName, typeName] = columnMatch;
        if (enumTypes.has(typeName)) {
          enumColumns.set(columnName, typeName);
        }
      }
    }
  }

  return enumColumns;
}

/**
 * Extract complete table schemas from Prisma schema
 * Returns Map of table name -> table schema with columns
 */
function extractTableSchemas(schemaPath: string): Map<string, TableSchema> {
  const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
  const tableSchemas = new Map<string, TableSchema>();

  // First extract all enum types
  const enumRegex = /^enum\s+(\w+)\s*\{/gm;
  const enumTypes = new Set<string>();
  let match;

  while ((match = enumRegex.exec(schemaContent)) !== null) {
    enumTypes.add(match[1]);
  }

  // Parse models and their columns
  const lines = schemaContent.split('\n');
  let currentModel: string | null = null;
  let currentColumns = new Map<string, ColumnInfo>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Start of model definition
    const modelMatch = /^model\s+(\w+)\s*\{/.exec(line);
    if (modelMatch) {
      currentModel = modelMatch[1];
      currentColumns = new Map<string, ColumnInfo>();
      continue;
    }

    // End of model definition
    if (currentModel && line.trim() === '}') {
      tableSchemas.set(currentModel, {
        tableName: currentModel,
        columns: currentColumns,
      });
      currentModel = null;
      currentColumns = new Map<string, ColumnInfo>();
      continue;
    }

    // Parse column definition
    if (currentModel) {
      // Match column patterns:
      // column_name Type
      // column_name Type?
      // column_name Type @default(...)
      // column_name Type? @default(...)
      const columnMatch = /^\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+([a-zA-Z0-9_]+)(\?)?/.exec(line);
      if (columnMatch) {
        const [, columnName, typeName, optional] = columnMatch;

        // Skip relation fields (all relations have @relation in our schema)
        if (line.includes('@relation')) {
          continue;
        }

        // Prisma primitive types (keep these): String, Int, Boolean, DateTime, Decimal, Float, BigInt, Bytes, Json
        // Enum types are lowercase_with_underscores (keep these too)
        // All other uppercase types would be relations, but they all have @relation in our schema

        // Check if it has a default value
        const hasDefault = line.includes('@default(') || line.includes('@updatedAt');

        // Check if it's an enum type
        const isEnum = enumTypes.has(typeName);

        // Required if: not optional AND no default
        const isRequired = !optional && !hasDefault;

        currentColumns.set(columnName, {
          name: columnName,
          type: typeName,
          isRequired,
          isEnum,
          enumType: isEnum ? typeName : undefined,
        });
      }
    }
  }

  return tableSchemas;
}

/**
 * Extract column references from INSERT/UPDATE queries
 */
function extractColumnReferencesFromFile(
  filePath: string,
  tableSchemas: Map<string, TableSchema>
): ColumnReference[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const references: ColumnReference[] = [];

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
    const isQueryStart = rawSqlPatterns.some(pattern => pattern.test(line));

    if (isQueryStart) {
      inRawQuery = true;
      queryStartLine = index + 1;
      queryBuffer = [line];
    } else if (inRawQuery) {
      queryBuffer.push(line);

      if (line.includes('`;') || line.includes(');') || line.trim() === '`') {
        const fullQuery = queryBuffer.join('\n');
        const columnRefs = extractColumnNamesFromQuery(fullQuery, filePath, queryStartLine, tableSchemas);
        references.push(...columnRefs);

        inRawQuery = false;
        queryBuffer = [];
      }
    }
  });

  return references;
}

/**
 * Extract column names from SQL queries and validate against schema
 */
function extractColumnNamesFromQuery(
  query: string,
  filePath: string,
  lineNumber: number,
  tableSchemas: Map<string, TableSchema>
): ColumnReference[] {
  const references: ColumnReference[] = [];

  // Extract table name from query
  const tableMatch = /(?:INSERT\s+INTO|UPDATE)\s+([a-zA-Z_][a-zA-Z0-9_]*)/i.exec(query);
  if (!tableMatch) {
    return references; // Skip if we can't determine the table
  }

  const tableName = tableMatch[1];
  const tableSchema = tableSchemas.get(tableName);
  if (!tableSchema) {
    return references; // Table not in schema, will be caught by table validation
  }

  const contextLines = query.split('\n').slice(0, 10).join('\n');

  // Extract column names from INSERT statement
  // Pattern: INSERT INTO table (col1, col2, col3)
  const insertMatch = /INSERT\s+INTO\s+\w+\s*\(([^)]+)\)/i.exec(query);
  if (insertMatch) {
    const columnList = insertMatch[1];
    const columnNames = columnList.split(',').map(c => c.trim());

    columnNames.forEach(columnName => {
      references.push({
        file: filePath,
        line: lineNumber,
        tableName,
        columnName,
        queryType: 'INSERT',
        context: contextLines.trim(),
      });
    });
  }

  // Extract column names from UPDATE statement
  // Pattern: UPDATE table SET col1 = val1, col2 = val2
  const updateMatches = query.matchAll(/SET\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=/gi);
  for (const match of updateMatches) {
    const columnName = match[1];
    references.push({
      file: filePath,
      line: lineNumber,
      tableName,
      columnName,
      queryType: 'UPDATE',
      context: contextLines.trim(),
    });
  }

  // Extract column names from WHERE clauses
  const whereMatches = query.matchAll(/WHERE\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*[=<>]/gi);
  for (const match of whereMatches) {
    const columnName = match[1];
    // Only add if not already found in INSERT/UPDATE
    if (!references.some(r => r.columnName === columnName && r.tableName === tableName)) {
      references.push({
        file: filePath,
        line: lineNumber,
        tableName,
        columnName,
        queryType: 'SELECT',
        context: contextLines.trim(),
      });
    }
  }

  return references;
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
 * Detect missing enum type casts in raw SQL queries
 */
function extractEnumCastIssuesFromFile(
  filePath: string,
  enumColumns: Map<string, string>
): EnumCastIssue[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const issues: EnumCastIssue[] = [];

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
    const isQueryStart = rawSqlPatterns.some(pattern => pattern.test(line));

    if (isQueryStart) {
      inRawQuery = true;
      queryStartLine = index + 1;
      queryBuffer = [line];
    } else if (inRawQuery) {
      queryBuffer.push(line);

      if (line.includes('`;') || line.includes(');') || line.trim() === '`') {
        const fullQuery = queryBuffer.join('\n');
        const queryIssues = detectMissingEnumCasts(fullQuery, filePath, queryStartLine, enumColumns);
        issues.push(...queryIssues);

        inRawQuery = false;
        queryBuffer = [];
      }
    }
  });

  return issues;
}

/**
 * Detect missing enum casts in a SQL query
 */
function detectMissingEnumCasts(
  query: string,
  filePath: string,
  lineNumber: number,
  enumColumns: Map<string, string>
): EnumCastIssue[] {
  const issues: EnumCastIssue[] = [];

  // Check for enum column comparisons without type casts
  // Pattern: column_name = ${variable} without ::enum_type
  enumColumns.forEach((enumType, columnName) => {
    // Match: column_name = ${variable} (not followed by ::)
    const regex = new RegExp(`${columnName}\\s*=\\s*\\$\\{[^}]+\\}(?!::)`, 'g');

    if (regex.test(query)) {
      const contextLines = query.split('\n').slice(0, 5).join('\n');

      issues.push({
        file: filePath,
        line: lineNumber,
        columnName,
        enumType,
        context: contextLines.trim(),
      });
    }
  });

  return issues;
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

  // Step 1: Extract schema table names, enum columns, and complete schemas
  console.log('📋 Step 1: Extracting table schemas from Prisma schema...');
  const schemaTableNames = extractSchemaTableNames(schemaPath);
  const schemaEnumColumns = extractEnumColumns(schemaPath);
  const tableSchemas = extractTableSchemas(schemaPath);
  console.log(`   Found ${schemaTableNames.length} tables and ${schemaEnumColumns.size} enum columns in schema`);
  console.log(`   Extracted schema details for ${tableSchemas.size} tables\n`);

  // Step 2: Find all TypeScript files
  console.log('📁 Step 2: Finding TypeScript files...');
  const tsFiles = findTypeScriptFiles(rootDir);
  console.log(`   Found ${tsFiles.length} TypeScript files\n`);

  // Step 3: Extract table references, column references, and enum cast issues
  console.log('🔎 Step 3: Extracting table/column references and checking enum casts...');
  const allReferences: TableReference[] = [];
  const allColumnReferences: ColumnReference[] = [];
  const allEnumIssues: EnumCastIssue[] = [];
  let filesWithRawSQL = 0;

  tsFiles.forEach(file => {
    const references = extractTableReferencesFromFile(file);
    const columnRefs = extractColumnReferencesFromFile(file, tableSchemas);
    const enumIssues = extractEnumCastIssuesFromFile(file, schemaEnumColumns);

    if (references.length > 0 || columnRefs.length > 0 || enumIssues.length > 0) {
      filesWithRawSQL++;
      allReferences.push(...references);
      allColumnReferences.push(...columnRefs);
      allEnumIssues.push(...enumIssues);
    }
  });

  console.log(`   Found ${allReferences.length} table references in ${filesWithRawSQL} files`);
  console.log(`   Found ${allColumnReferences.length} column references`);
  console.log(`   Found ${allEnumIssues.length} potential enum cast issues\n`);

  // Step 4: Categorize table references
  console.log('✅ Step 4: Validating table references...');
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

  console.log(`   ${validReferences.length} valid, ${suspiciousReferences.length} suspicious, ${invalidReferences.length} invalid\n`);

  // Step 5: Validate column references
  console.log('🔍 Step 5: Validating column references...');
  const invalidColumns: ColumnReference[] = [];
  const missingRequiredColumns: ColumnReference[] = [];

  // Group column references by table and query
  const queryGroups = new Map<string, ColumnReference[]>();

  allColumnReferences.forEach(ref => {
    const key = `${ref.file}:${ref.line}:${ref.tableName}`;
    if (!queryGroups.has(key)) {
      queryGroups.set(key, []);
    }
    queryGroups.get(key)!.push(ref);
  });

  // Validate each query group
  queryGroups.forEach((refs) => {
    const tableName = refs[0].tableName;
    const tableSchema = tableSchemas.get(tableName);

    if (!tableSchema) {
      return; // Table not in schema, already caught by table validation
    }

    // Check for invalid column names
    refs.forEach(ref => {
      if (!tableSchema.columns.has(ref.columnName)) {
        invalidColumns.push(ref);
      }
    });

    // For INSERT queries, check for missing required columns
    const insertRefs = refs.filter(r => r.queryType === 'INSERT');
    if (insertRefs.length > 0) {
      const insertedColumns = new Set(insertRefs.map(r => r.columnName));
      const requiredColumns = Array.from(tableSchema.columns.values()).filter(col => col.isRequired);

      requiredColumns.forEach(col => {
        if (!insertedColumns.has(col.name)) {
          // Create a reference for the missing column
          missingRequiredColumns.push({
            file: insertRefs[0].file,
            line: insertRefs[0].line,
            tableName,
            columnName: col.name,
            queryType: 'INSERT',
            context: insertRefs[0].context,
          });
        }
      });
    }
  });

  console.log(`   ${invalidColumns.length} invalid columns, ${missingRequiredColumns.length} missing required columns\n`);

  return {
    schemaTableNames,
    schemaEnumColumns,
    tableSchemas,
    validReferences,
    invalidReferences,
    suspiciousReferences,
    missingEnumCasts: allEnumIssues,
    invalidColumns,
    missingRequiredColumns,
  };
}

/**
 * Print analysis results
 */
function printResults(results: AnalysisResult): void {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📊 ANALYSIS RESULTS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`✅ Valid table references: ${results.validReferences.length}`);
  console.log(`⚠️  Suspicious table references: ${results.suspiciousReferences.length}`);
  console.log(`❌ Invalid table references: ${results.invalidReferences.length}`);
  console.log(`🔧 Missing enum casts: ${results.missingEnumCasts.length}`);
  console.log(`🚨 Invalid column references: ${results.invalidColumns.length}`);
  console.log(`⚠️  Missing required columns: ${results.missingRequiredColumns.length}\n`);

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

  if (results.missingEnumCasts.length > 0) {
    console.log('🔧 MISSING ENUM CASTS (Type Casting Required):');
    console.log('───────────────────────────────────────────────────────────────\n');

    results.missingEnumCasts.forEach(issue => {
      const relativePath = path.relative(process.cwd(), issue.file);

      console.log(`📍 ${relativePath}:${issue.line}`);
      console.log(`   Column: "${issue.columnName}"`);
      console.log(`   Required enum type: "${issue.enumType}"`);
      console.log(`   Fix: Add ::${issue.enumType} after the parameter`);
      console.log(`   Example: ${issue.columnName} = \${value}::${issue.enumType}`);
      console.log(`   Context:\n${issue.context.split('\n').map(l => '      ' + l).join('\n')}\n`);
    });
  }

  if (results.invalidColumns.length > 0) {
    console.log('🚨 INVALID COLUMN REFERENCES (Column Not Found in Schema):');
    console.log('───────────────────────────────────────────────────────────────\n');

    // Group by table for better readability
    const byTable = new Map<string, ColumnReference[]>();
    results.invalidColumns.forEach(ref => {
      if (!byTable.has(ref.tableName)) {
        byTable.set(ref.tableName, []);
      }
      byTable.get(ref.tableName)!.push(ref);
    });

    byTable.forEach((refs, tableName) => {
      const tableSchema = results.tableSchemas.get(tableName);
      const validColumns = tableSchema ? Array.from(tableSchema.columns.keys()) : [];

      console.log(`Table: "${tableName}"`);
      console.log(`Valid columns: ${validColumns.join(', ')}\n`);

      refs.forEach(ref => {
        const relativePath = path.relative(process.cwd(), ref.file);
        console.log(`   📍 ${relativePath}:${ref.line}`);
        console.log(`      Referenced column: "${ref.columnName}" ❌`);
        console.log(`      Query type: ${ref.queryType}`);
        console.log(`      Context:\n${ref.context.split('\n').map(l => '         ' + l).join('\n')}\n`);
      });
    });
  }

  if (results.missingRequiredColumns.length > 0) {
    console.log('⚠️  MISSING REQUIRED COLUMNS (Required Fields Not in INSERT):');
    console.log('───────────────────────────────────────────────────────────────\n');

    // Group by file and table
    const byFileTable = new Map<string, ColumnReference[]>();
    results.missingRequiredColumns.forEach(ref => {
      const key = `${ref.file}:${ref.tableName}`;
      if (!byFileTable.has(key)) {
        byFileTable.set(key, []);
      }
      byFileTable.get(key)!.push(ref);
    });

    byFileTable.forEach((refs) => {
      const relativePath = path.relative(process.cwd(), refs[0].file);
      const tableName = refs[0].tableName;

      console.log(`📍 ${relativePath}:${refs[0].line}`);
      console.log(`   Table: "${tableName}"`);
      console.log(`   Missing required columns:`);
      refs.forEach(ref => {
        const colInfo = results.tableSchemas.get(tableName)?.columns.get(ref.columnName);
        console.log(`      - "${ref.columnName}" (type: ${colInfo?.type || 'unknown'})`);
      });
      console.log(`   Context:\n${refs[0].context.split('\n').map(l => '      ' + l).join('\n')}\n`);
    });
  }

  if (
    results.suspiciousReferences.length === 0 &&
    results.invalidReferences.length === 0 &&
    results.missingEnumCasts.length === 0 &&
    results.invalidColumns.length === 0 &&
    results.missingRequiredColumns.length === 0
  ) {
    console.log('🎉 No issues found! All table/column references and enum casts are valid.\n');
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
  const hasIssues =
    results.suspiciousReferences.length > 0 ||
    results.invalidReferences.length > 0 ||
    results.missingEnumCasts.length > 0 ||
    results.invalidColumns.length > 0 ||
    results.missingRequiredColumns.length > 0;

  if (hasIssues) {
    console.log('⚠️  Issues detected! Please review and fix the references above.\n');
    process.exit(1);
  } else {
    console.log('✅ All table references, column references, and enum casts are valid!\n');
    process.exit(0);
  }
}

// Run the script
main();

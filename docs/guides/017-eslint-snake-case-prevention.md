# ESLint Configuration for snake_case Prevention

**Document Type**: Implementation Guide
**Date**: 2025-01-12
**Status**: Ready for Implementation
**Related**: docs/analysis/001-snake-case-api-violations.md, docs/reference/155-dto-pattern-guide.md

---

## Executive Summary

This guide provides a complete ESLint configuration for preventing snake_case violations in API responses while allowing them in Prisma database selectors. The configuration includes custom rules, TypeScript naming conventions, and CI/CD integration.

**Goal**: Prevent future snake_case violations through automated linting.

---

## Table of Contents

1. [Installation](#installation)
2. [ESLint Configuration](#eslint-configuration)
3. [Custom ESLint Plugin](#custom-eslint-plugin)
4. [Testing the Configuration](#testing-the-configuration)
5. [CI/CD Integration](#cicd-integration)
6. [Editor Integration](#editor-integration)

---

## Installation

### Step 1: Install ESLint Dependencies

```bash
cd backend

# Install ESLint core
npm install --save-dev eslint

# Install TypeScript ESLint plugins
npm install --save-dev @typescript-eslint/parser @typescript-eslint/eslint-plugin

# Install additional plugins
npm install --save-dev eslint-plugin-import eslint-plugin-node
```

### Step 2: Verify Installation

```bash
npx eslint --version
# Expected output: v8.x.x or higher
```

---

## ESLint Configuration

### Complete .eslintrc.js Configuration

Create `backend/.eslintrc.js`:

```javascript
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint', 'import', 'node'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:import/recommended',
    'plugin:import/typescript',
  ],
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    'coverage/',
    '*.config.js',
    '*.config.ts',
  ],
  rules: {
    // =========================================================================
    // SNAKE_CASE PREVENTION RULES
    // =========================================================================

    /**
     * Enforce camelCase naming for all object properties
     * Exceptions:
     * - Prisma selectors (select, include, where, orderBy, data)
     * - HTTP headers (allow snake_case for standard headers)
     * - External API payloads (explicitly marked with comments)
     */
    '@typescript-eslint/naming-convention': [
      'error',
      // Interfaces and type aliases: PascalCase
      {
        selector: 'typeLike',
        format: ['PascalCase'],
      },
      // Variables and parameters: camelCase
      {
        selector: ['variable', 'parameter'],
        format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
        leadingUnderscore: 'allow',
      },
      // Functions and methods: camelCase
      {
        selector: ['function', 'method'],
        format: ['camelCase'],
      },
      // Object properties: camelCase (with exceptions)
      {
        selector: 'objectLiteralProperty',
        format: ['camelCase', 'snake_case'],
        filter: {
          // Allow snake_case ONLY for Prisma query selectors
          regex: '^(select|include|where|orderBy|data|_count|_sum|_avg|_min|_max)$',
          match: false,
        },
        custom: {
          regex: '^[a-z][a-zA-Z0-9]*$',
          match: true,
        },
      },
      // Interface/type properties: camelCase (strict)
      {
        selector: 'typeProperty',
        format: ['camelCase'],
        filter: {
          // No exceptions for type properties
          regex: '.*',
          match: true,
        },
      },
    ],

    /**
     * Prevent direct Prisma result returns without DTO transformation
     * This rule catches patterns like: return this.prisma.user.findMany()
     */
    'no-restricted-syntax': [
      'error',
      {
        selector: 'ReturnStatement > CallExpression[callee.object.property.name="prisma"]',
        message:
          'Do not return Prisma results directly. Use DTO transformation (e.g., UserDTO.fromPrisma(result))',
      },
      {
        selector:
          'ReturnStatement > AwaitExpression > CallExpression[callee.object.property.name="prisma"]',
        message:
          'Do not return Prisma results directly. Use DTO transformation (e.g., UserDTO.fromPrisma(result))',
      },
    ],

    // =========================================================================
    // TYPESCRIPT RULES
    // =========================================================================

    '@typescript-eslint/explicit-function-return-type': [
      'warn',
      {
        allowExpressions: true,
        allowTypedFunctionExpressions: true,
      },
    ],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',

    // =========================================================================
    // IMPORT RULES
    // =========================================================================

    'import/order': [
      'warn',
      {
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index',
        ],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
      },
    ],
    'import/no-unresolved': 'off', // TypeScript handles this
    'import/no-duplicates': 'error',

    // =========================================================================
    // CODE QUALITY RULES
    // =========================================================================

    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-debugger': 'error',
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'warn',
    'prefer-template': 'warn',
  },

  overrides: [
    // Relaxed rules for test files
    {
      files: ['**/*.test.ts', '**/*.spec.ts', '**/__tests__/**/*.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-floating-promises': 'off',
        'no-restricted-syntax': 'off',
      },
    },
    // Relaxed rules for migration scripts
    {
      files: ['prisma/migrations/**/*.ts', 'prisma/seed.ts'],
      rules: {
        '@typescript-eslint/naming-convention': 'off',
        'no-restricted-syntax': 'off',
      },
    },
  ],
};
```

---

## Custom ESLint Plugin

For more sophisticated snake_case detection, create a custom ESLint plugin:

### Step 1: Create Plugin Directory

```bash
mkdir -p backend/eslint-plugins/snake-case-detector
cd backend/eslint-plugins/snake-case-detector
npm init -y
```

### Step 2: Create Custom Rule

Create `backend/eslint-plugins/snake-case-detector/index.js`:

```javascript
/**
 * Custom ESLint Plugin: snake_case Detector
 * Detects snake_case in return statement object literals
 */

module.exports = {
  rules: {
    'no-snake-case-in-return': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Disallow snake_case field names in return statement objects',
          category: 'Best Practices',
          recommended: true,
        },
        schema: [
          {
            type: 'object',
            properties: {
              allowedPatterns: {
                type: 'array',
                items: { type: 'string' },
                description:
                  'Regex patterns for properties that are allowed to be snake_case',
              },
            },
            additionalProperties: false,
          },
        ],
        messages: {
          snakeCaseInReturn:
            "Property '{{propertyName}}' uses snake_case in return statement. Use camelCase instead.",
        },
      },
      create(context) {
        const options = context.options[0] || {};
        const allowedPatterns = (options.allowedPatterns || []).map(
          (pattern) => new RegExp(pattern)
        );

        /**
         * Check if property name is snake_case
         */
        function isSnakeCase(name) {
          // Matches: word_word, word_word_word, etc.
          return /^[a-z]+(_[a-z]+)+$/.test(name);
        }

        /**
         * Check if property is allowed (matches allowed patterns)
         */
        function isAllowedProperty(name) {
          return allowedPatterns.some((pattern) => pattern.test(name));
        }

        /**
         * Check if we're inside a Prisma query
         * (select, include, where, orderBy, data)
         */
        function isInsidePrismaQuery(node) {
          let current = node;
          while (current) {
            if (
              current.type === 'ObjectExpression' &&
              current.parent?.type === 'Property'
            ) {
              const parentKey = current.parent.key;
              if (
                parentKey?.type === 'Identifier' &&
                ['select', 'include', 'where', 'orderBy', 'data'].includes(
                  parentKey.name
                )
              ) {
                return true;
              }
            }
            current = current.parent;
          }
          return false;
        }

        return {
          'ReturnStatement > ObjectExpression > Property'(node) {
            // Skip if inside Prisma query
            if (isInsidePrismaQuery(node)) {
              return;
            }

            const propertyName =
              node.key.type === 'Identifier' ? node.key.name : null;

            if (!propertyName) {
              return; // Skip computed properties
            }

            // Check if snake_case
            if (isSnakeCase(propertyName)) {
              // Check if allowed
              if (isAllowedProperty(propertyName)) {
                return;
              }

              // Report violation
              context.report({
                node: node.key,
                messageId: 'snakeCaseInReturn',
                data: {
                  propertyName,
                },
              });
            }
          },
        };
      },
    },
  },
};
```

### Step 3: Register Custom Plugin

Update `backend/.eslintrc.js`:

```javascript
module.exports = {
  // ... existing config

  plugins: [
    '@typescript-eslint',
    'import',
    'node',
    './eslint-plugins/snake-case-detector', // Add custom plugin
  ],

  rules: {
    // ... existing rules

    // Enable custom rule
    './eslint-plugins/snake-case-detector/no-snake-case-in-return': [
      'error',
      {
        allowedPatterns: [
          // Allow _count, _sum, _avg (Prisma aggregates)
          '^_[a-z]+$',
        ],
      },
    ],
  },
};
```

---

## Testing the Configuration

### Step 1: Create Test File

Create `backend/src/__tests__/eslint-test.ts`:

```typescript
// This file tests ESLint snake_case detection
// Run: npx eslint src/__tests__/eslint-test.ts

// ❌ Should fail: snake_case in return statement
function badExample1() {
  return {
    user_id: '123', // ❌ ESLint error
    total_credits: 1000, // ❌ ESLint error
  };
}

// ✅ Should pass: camelCase in return statement
function goodExample1() {
  return {
    userId: '123', // ✅ OK
    totalCredits: 1000, // ✅ OK
  };
}

// ✅ Should pass: snake_case in Prisma selector
async function goodExample2(prisma: any) {
  const user = await prisma.user.findUnique({
    select: {
      credit_balance: true, // ✅ OK (Prisma selector)
      updated_at: true, // ✅ OK (Prisma selector)
    },
  });

  return {
    creditBalance: user.credit_balance, // ✅ OK (camelCase)
    updatedAt: user.updated_at, // ✅ OK (camelCase)
  };
}

// ❌ Should fail: Direct Prisma return
async function badExample2(prisma: any) {
  return await prisma.user.findMany(); // ❌ ESLint error (no DTO)
}
```

### Step 2: Run ESLint

```bash
# Test specific file
npx eslint src/__tests__/eslint-test.ts

# Expected output:
#   4:5  error  Property 'user_id' uses snake_case        @typescript-eslint/naming-convention
#   5:5  error  Property 'total_credits' uses snake_case  @typescript-eslint/naming-convention
#  39:10 error  Do not return Prisma results directly     no-restricted-syntax
```

### Step 3: Test Fix Mode

```bash
# Auto-fix some violations
npx eslint src/__tests__/eslint-test.ts --fix

# Note: snake_case violations must be fixed manually
#       Only whitespace/import order will be auto-fixed
```

---

## CI/CD Integration

### Step 1: Add NPM Scripts

Update `backend/package.json`:

```json
{
  "scripts": {
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "lint:check": "eslint src --ext .ts --max-warnings 0",
    "test:lint": "npm run lint:check"
  }
}
```

### Step 2: GitHub Actions Workflow

Create `.github/workflows/lint.yml`:

```yaml
name: Lint

on:
  pull_request:
    branches: [main, master, develop]
  push:
    branches: [main, master, develop]

jobs:
  eslint:
    name: ESLint Check
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: Install Dependencies
        working-directory: backend
        run: npm ci

      - name: Run ESLint
        working-directory: backend
        run: npm run lint:check

      - name: Annotate Code
        if: failure()
        uses: ataylorme/eslint-annotate-action@v2
        with:
          repo-token: ${{ secrets.GITHUB_TOKEN }}
          report-json: 'eslint-report.json'
```

### Step 3: Pre-commit Hook

Install Husky for pre-commit hooks:

```bash
cd backend
npm install --save-dev husky lint-staged

# Initialize husky
npx husky install

# Create pre-commit hook
npx husky add .husky/pre-commit "cd backend && npm run lint:check"
```

Update `backend/package.json`:

```json
{
  "lint-staged": {
    "src/**/*.ts": ["eslint --fix", "git add"]
  }
}
```

---

## Editor Integration

### VS Code Configuration

Create `backend/.vscode/settings.json`:

```json
{
  "eslint.enable": true,
  "eslint.validate": ["typescript"],
  "eslint.workingDirectories": ["./backend"],
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "eslint.options": {
    "extensions": [".ts"]
  }
}
```

### WebStorm/IntelliJ IDEA Configuration

1. Go to **Settings** → **Languages & Frameworks** → **JavaScript** → **Code Quality Tools** → **ESLint**
2. Enable **Automatic ESLint configuration**
3. Enable **Run eslint --fix on save**

---

## Quick Start Commands

```bash
# Install ESLint
cd backend
npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin

# Create config
cat > .eslintrc.js << 'EOF'
# (paste configuration from above)
EOF

# Run lint
npm run lint

# Fix auto-fixable issues
npm run lint:fix

# Check for violations (CI mode)
npm run lint:check
```

---

## Troubleshooting

### Issue 1: ESLint Not Finding TypeScript Files

**Solution**: Ensure `tsconfig.json` is in the same directory as `.eslintrc.js`:

```javascript
// .eslintrc.js
parserOptions: {
  project: './tsconfig.json',
  tsconfigRootDir: __dirname,
}
```

### Issue 2: Too Many Violations

**Solution**: Gradually enable rules:

```javascript
// Start with warnings
'@typescript-eslint/naming-convention': 'warn',

// After fixing all violations, change to error
'@typescript-eslint/naming-convention': 'error',
```

### Issue 3: False Positives in Prisma Queries

**Solution**: Add to allowed patterns in custom rule:

```javascript
allowedPatterns: [
  '^_[a-z]+$',        // Prisma aggregates
  '^[a-z]+_at$',      // Timestamps (created_at, updated_at)
  '^[a-z]+_id$',      // Foreign keys (user_id, model_id)
],
```

---

## Summary

### What This Configuration Does

✅ **Prevents snake_case** in return statement objects
✅ **Allows snake_case** in Prisma query selectors
✅ **Enforces camelCase** for all API response fields
✅ **Blocks direct Prisma returns** (encourages DTO pattern)
✅ **Integrates with CI/CD** (GitHub Actions, pre-commit hooks)
✅ **Works in editors** (VS Code, WebStorm auto-fix)

### Expected Outcome

After implementing this configuration:

1. **Development**: Developers get instant feedback when typing snake_case
2. **Pre-commit**: Violations are caught before commit
3. **CI/CD**: Pull requests with violations are blocked
4. **Consistency**: Entire codebase maintains camelCase convention

---

**Document Owner**: Claude Code
**Last Updated**: 2025-01-12
**Status**: Ready for Implementation
**Next Steps**: Install ESLint, create configuration, integrate with CI/CD

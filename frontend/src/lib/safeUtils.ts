/**
 * Safe Utilities
 *
 * Defensive programming utilities to prevent runtime errors from undefined/null values.
 * These utilities provide safe defaults and type guards for common operations.
 *
 * Use these utilities throughout the application to:
 * - Prevent "Cannot read properties of undefined" errors
 * - Provide graceful fallbacks for missing data
 * - Improve UI resilience when API data is incomplete
 */

// ============================================================================
// Number Safety
// ============================================================================

/**
 * Safely convert value to number, with fallback
 * @param value - Value to convert
 * @param fallback - Fallback value (default: 0)
 * @returns Valid number or fallback
 */
export function safeNumber(value: unknown, fallback = 0): number {
  if (value === undefined || value === null) {
    return fallback;
  }

  const num = typeof value === 'number' ? value : Number(value);

  if (isNaN(num) || !isFinite(num)) {
    return fallback;
  }

  return num;
}

/**
 * Safely format number with abbreviations (K, M, B)
 * @param value - Numeric value
 * @param fallback - Fallback string (default: '0')
 * @returns Formatted string
 */
export function safeFormatNumber(value: unknown, fallback = '0'): string {
  const num = safeNumber(value, 0);

  if (num === 0 && value === undefined) {
    return fallback;
  }

  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(1)}B`;
  }
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }

  return num.toString();
}

/**
 * Safely call toFixed on a number
 * @param value - Numeric value
 * @param decimals - Number of decimal places (default: 1)
 * @param fallback - Fallback number (default: 0)
 * @returns Formatted number string
 */
export function safeToFixed(
  value: unknown,
  decimals = 1,
  fallback = 0
): string {
  const num = safeNumber(value, fallback);
  return num.toFixed(decimals);
}

/**
 * Safely format percentage value
 * @param value - Percentage value (0-100)
 * @param decimals - Number of decimal places (default: 1)
 * @param fallback - Fallback string (default: '0.0%')
 * @returns Formatted percentage string
 */
export function safeFormatPercentage(
  value: unknown,
  decimals = 1,
  fallback = '0.0%'
): string {
  const num = safeNumber(value, NaN);

  if (isNaN(num)) {
    return fallback;
  }

  return `${num.toFixed(decimals)}%`;
}

/**
 * Safely format currency value
 * @param value - Currency value
 * @param fallback - Fallback string (default: '$0.00')
 * @returns Formatted currency string
 */
export function safeFormatCurrency(value: unknown, fallback = '$0.00'): string {
  const num = safeNumber(value, NaN);

  if (isNaN(num)) {
    return fallback;
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

// ============================================================================
// Array Safety
// ============================================================================

/**
 * Safely access array, ensuring it's defined and is an array
 * @param value - Value to check
 * @param fallback - Fallback array (default: [])
 * @returns Valid array or fallback
 */
export function safeArray<T>(value: unknown, fallback: T[] = []): T[] {
  if (Array.isArray(value)) {
    return value;
  }
  return fallback;
}

/**
 * Safely get array length
 * @param value - Array to check
 * @param fallback - Fallback value (default: 0)
 * @returns Array length or fallback
 */
export function safeArrayLength(value: unknown, fallback = 0): number {
  const arr = safeArray(value);
  return arr.length || fallback;
}

/**
 * Safely check if array is empty
 * @param value - Array to check
 * @returns True if array is undefined, null, or empty
 */
export function isArrayEmpty(value: unknown): boolean {
  const arr = safeArray(value);
  return arr.length === 0;
}

/**
 * Safely get first element of array
 * @param value - Array to check
 * @param fallback - Fallback value
 * @returns First element or fallback
 */
export function safeArrayFirst<T>(value: unknown, fallback?: T): T | undefined {
  const arr = safeArray<T>(value);
  return arr.length > 0 ? arr[0] : fallback;
}

/**
 * Safely get last element of array
 * @param value - Array to check
 * @param fallback - Fallback value
 * @returns Last element or fallback
 */
export function safeArrayLast<T>(value: unknown, fallback?: T): T | undefined {
  const arr = safeArray<T>(value);
  return arr.length > 0 ? arr[arr.length - 1] : fallback;
}

// ============================================================================
// String Safety
// ============================================================================

/**
 * Safely convert value to string
 * @param value - Value to convert
 * @param fallback - Fallback string (default: '')
 * @returns String or fallback
 */
export function safeString(value: unknown, fallback = ''): string {
  if (value === undefined || value === null) {
    return fallback;
  }

  return String(value);
}

/**
 * Safely trim string
 * @param value - Value to trim
 * @param fallback - Fallback string (default: '')
 * @returns Trimmed string or fallback
 */
export function safeTrim(value: unknown, fallback = ''): string {
  const str = safeString(value, fallback);
  return str.trim();
}

/**
 * Safely check if string is empty (after trimming)
 * @param value - Value to check
 * @returns True if undefined, null, or empty after trimming
 */
export function isStringEmpty(value: unknown): boolean {
  const str = safeTrim(value);
  return str.length === 0;
}

// ============================================================================
// Object Safety
// ============================================================================

/**
 * Safely access object property with type safety
 * @param obj - Object to access
 * @param key - Property key
 * @param fallback - Fallback value
 * @returns Property value or fallback
 */
export function safeGet<T, K extends keyof T>(
  obj: T | undefined | null,
  key: K,
  fallback?: T[K]
): T[K] | undefined {
  if (obj === undefined || obj === null) {
    return fallback;
  }

  const value = obj[key];
  return value !== undefined ? value : fallback;
}

/**
 * Safely check if object has property
 * @param obj - Object to check
 * @param key - Property key
 * @returns True if object has property
 */
export function safeHas<T extends object>(obj: T | undefined | null, key: keyof T): boolean {
  if (obj === undefined || obj === null || typeof obj !== 'object') {
    return false;
  }

  return key in obj;
}

/**
 * Safely get nested property using path
 * @param obj - Object to access
 * @param path - Property path (e.g., 'user.address.city')
 * @param fallback - Fallback value
 * @returns Property value or fallback
 */
export function safeGetNested<T = any>(
  obj: any,
  path: string,
  fallback?: T
): T | undefined {
  if (obj === undefined || obj === null) {
    return fallback;
  }

  const keys = path.split('.');
  let result = obj;

  for (const key of keys) {
    if (result === undefined || result === null) {
      return fallback;
    }
    result = result[key];
  }

  return result !== undefined ? result : fallback;
}

// ============================================================================
// Date Safety
// ============================================================================

/**
 * Safely parse date
 * @param value - Date value (string, Date, or number)
 * @param fallback - Fallback date
 * @returns Valid Date or fallback
 */
export function safeDate(value: unknown, fallback?: Date): Date | undefined {
  if (value === undefined || value === null) {
    return fallback;
  }

  if (value instanceof Date) {
    return isNaN(value.getTime()) ? fallback : value;
  }

  const date = new Date(value as string | number);
  return isNaN(date.getTime()) ? fallback : date;
}

/**
 * Safely format date to locale string
 * @param value - Date value
 * @param fallback - Fallback string (default: 'N/A')
 * @returns Formatted date or fallback
 */
export function safeFormatDate(value: unknown, fallback = 'N/A'): string {
  const date = safeDate(value);

  if (!date) {
    return fallback;
  }

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Safely format date with time
 * @param value - Date value
 * @param fallback - Fallback string (default: 'N/A')
 * @returns Formatted date/time or fallback
 */
export function safeFormatDateTime(value: unknown, fallback = 'N/A'): string {
  const date = safeDate(value);

  if (!date) {
    return fallback;
  }

  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ============================================================================
// Boolean Safety
// ============================================================================

/**
 * Safely convert value to boolean
 * @param value - Value to convert
 * @param fallback - Fallback boolean (default: false)
 * @returns Boolean value
 */
export function safeBoolean(value: unknown, fallback = false): boolean {
  if (value === undefined || value === null) {
    return fallback;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    if (lower === 'true' || lower === '1' || lower === 'yes') {
      return true;
    }
    if (lower === 'false' || lower === '0' || lower === 'no') {
      return false;
    }
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  return fallback;
}

// ============================================================================
// Conditional Rendering Helpers
// ============================================================================

/**
 * Check if value is defined (not undefined or null)
 * @param value - Value to check
 * @returns True if value is defined
 */
export function isDefined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null;
}

/**
 * Check if value is undefined or null
 * @param value - Value to check
 * @returns True if value is undefined or null
 */
export function isNullish(value: unknown): value is undefined | null {
  return value === undefined || value === null;
}

/**
 * Provide fallback value if original is nullish
 * @param value - Value to check
 * @param fallback - Fallback value
 * @returns Original value or fallback
 */
export function withFallback<T>(value: T | undefined | null, fallback: T): T {
  return isDefined(value) ? value : fallback;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if value is a valid number (not NaN or Infinity)
 * @param value - Value to check
 * @returns True if valid number
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && isFinite(value) && !isNaN(value);
}

/**
 * Check if value is a non-empty string
 * @param value - Value to check
 * @returns True if non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Check if value is a non-empty array
 * @param value - Value to check
 * @returns True if non-empty array
 */
export function isNonEmptyArray<T>(value: unknown): value is T[] {
  return Array.isArray(value) && value.length > 0;
}

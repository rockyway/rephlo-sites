/**
 * Password Strength Validation Utility
 *
 * Provides functions for validating password strength according to security requirements.
 * Password Requirements:
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character (!@#$%^&*)
 *
 * Reference: docs/plan/103-auth-endpoints-implementation.md (Phase 1)
 */

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate password strength
 * @param password - The password to validate
 * @returns Validation result with detailed error messages
 */
export function validatePasswordStrength(password: string): PasswordValidationResult {
  const errors: string[] = [];

  // Check minimum length
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  // Check maximum length
  if (password.length > 100) {
    errors.push('Password must be less than 100 characters');
  }

  // Check for uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  // Check for lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  // Check for number
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  // Check for special character
  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate password strength score (0-5)
 * @param password - The password to evaluate
 * @returns Strength score from 0 (weakest) to 5 (strongest)
 */
export function calculatePasswordStrength(password: string): number {
  let score = 0;

  // Length score (0-2 points)
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;

  // Character variety (0-4 points)
  if (/[a-z]/.test(password)) score += 1; // Lowercase
  if (/[A-Z]/.test(password)) score += 1; // Uppercase
  if (/[0-9]/.test(password)) score += 1; // Numbers
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 1; // Special chars

  return Math.min(score, 5);
}

/**
 * Get password strength label
 * @param password - The password to evaluate
 * @returns Strength label (Very Weak, Weak, Fair, Good, Strong)
 */
export function getPasswordStrengthLabel(password: string): string {
  const score = calculatePasswordStrength(password);

  switch (score) {
    case 0:
    case 1:
      return 'Very Weak';
    case 2:
      return 'Weak';
    case 3:
      return 'Fair';
    case 4:
      return 'Good';
    case 5:
      return 'Strong';
    default:
      return 'Unknown';
  }
}

/**
 * Check if password contains common patterns (weak passwords)
 * @param password - The password to check
 * @returns True if password contains common weak patterns
 */
export function containsCommonPatterns(password: string): boolean {
  const commonPatterns = [
    /^password/i,
    /^123456/,
    /^qwerty/i,
    /^abc123/i,
    /^letmein/i,
    /^welcome/i,
    /^monkey/i,
    /^dragon/i,
    /^master/i,
    /^sunshine/i,
  ];

  return commonPatterns.some((pattern) => pattern.test(password));
}

/**
 * Comprehensive password validation with additional checks
 * @param password - The password to validate
 * @returns Detailed validation result
 */
export function validatePasswordComprehensive(password: string): PasswordValidationResult {
  const result = validatePasswordStrength(password);

  // Additional checks
  if (containsCommonPatterns(password)) {
    result.errors.push('Password contains common weak patterns. Please choose a more unique password.');
    result.valid = false;
  }

  return result;
}

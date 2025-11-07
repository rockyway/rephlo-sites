/**
 * Unit Tests for Password Strength Utility
 *
 * Tests all password validation functions including:
 * - validatePasswordStrength()
 * - calculatePasswordStrength()
 * - getPasswordStrengthLabel()
 * - containsCommonPatterns()
 * - validatePasswordComprehensive()
 */

import {
  validatePasswordStrength,
  calculatePasswordStrength,
  getPasswordStrengthLabel,
  containsCommonPatterns,
  validatePasswordComprehensive,
} from '../../../src/utils/password-strength';

describe('Password Strength Utility', () => {
  describe('validatePasswordStrength', () => {
    describe('Valid passwords', () => {
      it('should accept password with all requirements', () => {
        const result = validatePasswordStrength('Test@1234');

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should accept password with multiple special characters', () => {
        const result = validatePasswordStrength('Test@1234!#$');

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should accept password at minimum length', () => {
        const result = validatePasswordStrength('Test@123');

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should accept very long password', () => {
        const longPassword = 'Test@123' + 'a'.repeat(90);
        const result = validatePasswordStrength(longPassword);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('Invalid passwords - length', () => {
      it('should reject password shorter than 8 characters', () => {
        const result = validatePasswordStrength('Test@12');

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Password must be at least 8 characters long');
      });

      it('should reject password longer than 100 characters', () => {
        const longPassword = 'Test@123' + 'a'.repeat(95);
        const result = validatePasswordStrength(longPassword);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Password must be less than 100 characters');
      });

      it('should reject empty password', () => {
        const result = validatePasswordStrength('');

        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    describe('Invalid passwords - missing character types', () => {
      it('should reject password without uppercase letter', () => {
        const result = validatePasswordStrength('test@1234');

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Password must contain at least one uppercase letter');
      });

      it('should reject password without lowercase letter', () => {
        const result = validatePasswordStrength('TEST@1234');

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Password must contain at least one lowercase letter');
      });

      it('should reject password without number', () => {
        const result = validatePasswordStrength('Test@test');

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Password must contain at least one number');
      });

      it('should reject password without special character', () => {
        const result = validatePasswordStrength('Test1234');

        expect(result.valid).toBe(false);
        expect(result.errors).toContain(
          'Password must contain at least one special character (!@#$%^&*)'
        );
      });
    });

    describe('Invalid passwords - multiple violations', () => {
      it('should list all errors for completely invalid password', () => {
        const result = validatePasswordStrength('abc');

        expect(result.valid).toBe(false);
        expect(result.errors).toHaveLength(4); // Too short, no uppercase, no number, no special char
      });

      it('should list multiple errors for password missing multiple requirements', () => {
        const result = validatePasswordStrength('testtest');

        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(1);
      });
    });

    describe('Edge cases', () => {
      it('should handle password with Unicode characters', () => {
        const result = validatePasswordStrength('Test@123😀');

        expect(result.valid).toBe(true);
      });

      it('should handle password with only required special chars', () => {
        const result = validatePasswordStrength('Test!1234');

        expect(result.valid).toBe(true);
      });

      it('should handle password with spaces', () => {
        const result = validatePasswordStrength('Test @123 4');

        expect(result.valid).toBe(true);
      });

      it('should handle password with tabs and newlines', () => {
        const result = validatePasswordStrength('Test@\t123\n4');

        expect(result.valid).toBe(true);
      });
    });
  });

  describe('calculatePasswordStrength', () => {
    it('should return 0 for empty password', () => {
      expect(calculatePasswordStrength('')).toBe(0);
    });

    it('should return 1 for very weak password (short, single type)', () => {
      expect(calculatePasswordStrength('abc')).toBe(1);
    });

    it('should return 2 for weak password (8+ chars, 2 types)', () => {
      expect(calculatePasswordStrength('abcdefgh')).toBe(2);
    });

    it('should return 3 for fair password (8+ chars, 3 types)', () => {
      expect(calculatePasswordStrength('Abcdefgh')).toBe(3);
    });

    it('should return 4 for good password (8+ chars, 4 types)', () => {
      expect(calculatePasswordStrength('Abcd1234')).toBe(4);
    });

    it('should return 5 for strong password (12+ chars, 4 types)', () => {
      expect(calculatePasswordStrength('Abcd1234!@#$')).toBe(5);
    });

    it('should cap score at 5', () => {
      const veryStrongPassword = 'Abcd1234!@#$' + 'a'.repeat(50);
      expect(calculatePasswordStrength(veryStrongPassword)).toBe(5);
    });

    it('should give 1 point for 8+ characters', () => {
      expect(calculatePasswordStrength('12345678')).toBeGreaterThanOrEqual(1);
    });

    it('should give 2 points for 12+ characters', () => {
      expect(calculatePasswordStrength('123456789012')).toBeGreaterThanOrEqual(2);
    });
  });

  describe('getPasswordStrengthLabel', () => {
    it('should return "Very Weak" for score 0', () => {
      expect(getPasswordStrengthLabel('')).toBe('Very Weak');
    });

    it('should return "Very Weak" for score 1', () => {
      expect(getPasswordStrengthLabel('abc')).toBe('Very Weak');
    });

    it('should return "Weak" for score 2', () => {
      expect(getPasswordStrengthLabel('abcdefgh')).toBe('Weak');
    });

    it('should return "Fair" for score 3', () => {
      expect(getPasswordStrengthLabel('Abcdefgh')).toBe('Fair');
    });

    it('should return "Good" for score 4', () => {
      expect(getPasswordStrengthLabel('Abcd1234')).toBe('Good');
    });

    it('should return "Strong" for score 5', () => {
      expect(getPasswordStrengthLabel('Abcd1234!@#$')).toBe('Strong');
    });
  });

  describe('containsCommonPatterns', () => {
    it('should detect "password" pattern', () => {
      expect(containsCommonPatterns('password123')).toBe(true);
      expect(containsCommonPatterns('Password@123')).toBe(true);
      expect(containsCommonPatterns('PASSWORD123')).toBe(true);
    });

    it('should detect "123456" pattern', () => {
      expect(containsCommonPatterns('123456789')).toBe(true);
      expect(containsCommonPatterns('123456')).toBe(true);
    });

    it('should detect "qwerty" pattern', () => {
      expect(containsCommonPatterns('qwerty123')).toBe(true);
      expect(containsCommonPatterns('Qwerty@123')).toBe(true);
    });

    it('should detect "abc123" pattern', () => {
      expect(containsCommonPatterns('abc123456')).toBe(true);
      expect(containsCommonPatterns('ABC123test')).toBe(true);
    });

    it('should detect "letmein" pattern', () => {
      expect(containsCommonPatterns('letmein123')).toBe(true);
    });

    it('should detect "welcome" pattern', () => {
      expect(containsCommonPatterns('welcome123')).toBe(true);
    });

    it('should detect "monkey" pattern', () => {
      expect(containsCommonPatterns('monkey123')).toBe(true);
    });

    it('should detect "dragon" pattern', () => {
      expect(containsCommonPatterns('dragon123')).toBe(true);
    });

    it('should detect "master" pattern', () => {
      expect(containsCommonPatterns('master123')).toBe(true);
    });

    it('should detect "sunshine" pattern', () => {
      expect(containsCommonPatterns('sunshine123')).toBe(true);
    });

    it('should not detect patterns in strong unique passwords', () => {
      expect(containsCommonPatterns('Xk9$mP2@vL7!')).toBe(false);
      expect(containsCommonPatterns('Test@1234')).toBe(false);
      expect(containsCommonPatterns('MyStr0ng!Pass')).toBe(false);
    });
  });

  describe('validatePasswordComprehensive', () => {
    it('should pass for strong unique password', () => {
      const result = validatePasswordComprehensive('MyStr0ng!Pass');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail for password with common patterns', () => {
      const result = validatePasswordComprehensive('Password@123');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Password contains common weak patterns. Please choose a more unique password.'
      );
    });

    it('should fail for weak password with common pattern', () => {
      const result = validatePasswordComprehensive('password');

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.errors).toContain(
        'Password contains common weak patterns. Please choose a more unique password.'
      );
    });

    it('should include all validation errors', () => {
      const result = validatePasswordComprehensive('abc123');

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });

    it('should pass for meeting all requirements without common patterns', () => {
      const result = validatePasswordComprehensive('Xk9$mP2@vL7!');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Integration - Real-world scenarios', () => {
    it('should validate typical user passwords', () => {
      const passwords = [
        { pass: 'Test@123', shouldPass: true },
        { pass: 'MyP@ssw0rd!', shouldPass: true },
        { pass: 'Str0ng!Password', shouldPass: true },
        { pass: 'weak', shouldPass: false },
        { pass: 'NoSpecialChar1', shouldPass: false },
        { pass: 'no_uppercase@123', shouldPass: false },
      ];

      passwords.forEach(({ pass, shouldPass }) => {
        const result = validatePasswordStrength(pass);
        expect(result.valid).toBe(shouldPass);
      });
    });

    it('should handle edge cases gracefully', () => {
      const edgeCases = ['', ' ', '\t', '\n'];

      edgeCases.forEach((testCase) => {
        const result = validatePasswordStrength(testCase);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
  });
});

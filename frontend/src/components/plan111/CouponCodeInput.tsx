/**
 * CouponCodeInput Component
 *
 * Specialized input component for coupon codes with:
 * - Auto-conversion to uppercase
 * - Format validation (alphanumeric only)
 * - Live validation feedback
 */

import { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import Input from '@/components/common/Input';
import { cn } from '@/lib/utils';
import { formatCouponCode, validateCouponCode } from '@/lib/plan111.utils';

interface CouponCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  onValidationChange?: (isValid: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  showValidation?: boolean;
}

export default function CouponCodeInput({
  value,
  onChange,
  onValidationChange,
  disabled = false,
  placeholder = 'Enter coupon code (e.g., SUMMER25)',
  className,
  showValidation = true,
}: CouponCodeInputProps) {
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    error?: string;
  }>({ isValid: true });

  useEffect(() => {
    if (!value || value.trim().length === 0) {
      setValidationResult({ isValid: true });
      onValidationChange?.(true);
      return;
    }

    const result = validateCouponCode(value);
    setValidationResult(result);
    onValidationChange?.(result.isValid);
  }, [value, onValidationChange]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCouponCode(e.target.value);
    onChange(formatted);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Input
          type="text"
          value={value}
          onChange={handleChange}
          disabled={disabled}
          placeholder={placeholder}
          className={cn(
            className,
            value &&
              showValidation &&
              (validationResult.isValid
                ? 'border-green-300 focus:border-green-500 focus:ring-green-500'
                : 'border-red-300 focus:border-red-500 focus:ring-red-500')
          )}
        />
        {value && showValidation && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            {validationResult.isValid ? (
              <Check className="h-5 w-5 text-green-500" />
            ) : (
              <X className="h-5 w-5 text-red-500" />
            )}
          </div>
        )}
      </div>
      {value && showValidation && !validationResult.isValid && (
        <p className="mt-1 text-sm text-red-600">{validationResult.error}</p>
      )}
      {value && showValidation && validationResult.isValid && value.length >= 4 && (
        <p className="mt-1 text-sm text-green-600">Valid coupon code format</p>
      )}
    </div>
  );
}

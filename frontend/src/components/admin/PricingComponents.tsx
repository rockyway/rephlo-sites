import { ReactNode } from 'react';
import { AlertCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * MultiplierInput Component
 * Input field for margin multiplier with validation and margin % display
 */
interface MultiplierInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  error?: string;
  showMargin?: boolean;
}

export function MultiplierInput({
  value,
  onChange,
  min = 1.0,
  max = 3.0,
  step = 0.05,
  disabled = false,
  error,
  showMargin = true,
}: MultiplierInputProps) {
  // Calculate margin percentage from multiplier
  const marginPercent = ((value - 1) / value) * 100;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    if (!isNaN(newValue) && newValue >= min && newValue <= max) {
      onChange(newValue);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <input
          type="number"
          value={value}
          onChange={handleChange}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          className={cn(
            'flex h-10 w-32 rounded-md border border-deep-navy-300 bg-white px-3 py-2 text-body',
            'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rephlo-blue/20',
            'focus-visible:border-rephlo-blue transition-all duration-fast',
            disabled && 'opacity-50 cursor-not-allowed',
            error && 'border-red-500'
          )}
        />
        <span className="text-body-sm text-deep-navy-600">×</span>
        {showMargin && (
          <div className="flex items-center gap-2">
            <span className="text-caption text-deep-navy-400">=</span>
            <MarginBadge marginPercent={marginPercent} targetMargin={marginPercent} />
          </div>
        )}
      </div>
      {error && (
        <p className="text-caption text-red-600 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
      <div className="flex items-center gap-2">
        <input
          type="range"
          value={value}
          onChange={handleChange}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          className="flex-1 h-2 bg-deep-navy-200 rounded-lg appearance-none cursor-pointer accent-rephlo-blue"
        />
        <span className="text-caption text-deep-navy-400 w-12 text-right">
          {value.toFixed(2)}x
        </span>
      </div>
    </div>
  );
}

/**
 * MarginBadge Component
 * Color-coded badge showing margin percentage with variance indicator
 */
interface MarginBadgeProps {
  marginPercent: number;
  targetMargin?: number;
  size?: 'sm' | 'md' | 'lg';
}

export function MarginBadge({ marginPercent, targetMargin, size = 'md' }: MarginBadgeProps) {
  const variance = targetMargin !== undefined ? marginPercent - targetMargin : 0;

  // Determine color based on variance
  let colorClass = 'bg-green-100 text-green-700';
  if (targetMargin !== undefined) {
    if (variance < -5) colorClass = 'bg-red-100 text-red-700';
    else if (variance < -2) colorClass = 'bg-amber-100 text-amber-700';
    else if (variance > 2) colorClass = 'bg-blue-100 text-blue-700';
  }

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-caption',
    md: 'px-3 py-1 text-body-sm',
    lg: 'px-4 py-1.5 text-body',
  };

  return (
    <div className="flex items-center gap-2">
      <span className={cn('rounded-full font-medium', colorClass, sizeClasses[size])}>
        {marginPercent.toFixed(1)}%
      </span>
      {targetMargin !== undefined && variance !== 0 && (
        <span className="flex items-center gap-0.5 text-caption text-deep-navy-500">
          {variance > 0 ? (
            <TrendingUp className="h-3 w-3 text-green-600" />
          ) : variance < 0 ? (
            <TrendingDown className="h-3 w-3 text-red-600" />
          ) : (
            <Minus className="h-3 w-3 text-deep-navy-400" />
          )}
          {Math.abs(variance).toFixed(1)}%
        </span>
      )}
    </div>
  );
}

/**
 * ImpactPreview Component
 * Displays simulated impact of pricing changes
 */
interface ImpactPreviewProps {
  additionalMargin?: number;
  marginChange?: number;
  affectedUsers?: number;
  creditCostIncrease?: number;
  revenueImpact?: number;
  churnImpact?: { min: number; max: number };
  netBenefit?: number;
  isPositive?: boolean;
}

export function ImpactPreview({
  additionalMargin,
  marginChange,
  affectedUsers,
  creditCostIncrease,
  revenueImpact,
  churnImpact,
  netBenefit,
  isPositive = true,
}: ImpactPreviewProps) {
  return (
    <div className="bg-deep-navy-50 rounded-lg p-4 space-y-3">
      <h4 className="text-body-sm font-semibold text-deep-navy-700">Impact Preview</h4>

      <div className="grid grid-cols-2 gap-3">
        {additionalMargin !== undefined && (
          <div>
            <p className="text-caption text-deep-navy-500">Additional Margin</p>
            <p className={cn('text-body font-semibold', isPositive ? 'text-green-600' : 'text-red-600')}>
              ${additionalMargin.toLocaleString()}
            </p>
          </div>
        )}

        {marginChange !== undefined && (
          <div>
            <p className="text-caption text-deep-navy-500">Margin Change</p>
            <p className={cn('text-body font-semibold', marginChange >= 0 ? 'text-green-600' : 'text-red-600')}>
              {marginChange >= 0 ? '+' : ''}{marginChange.toFixed(1)}%
            </p>
          </div>
        )}

        {affectedUsers !== undefined && (
          <div>
            <p className="text-caption text-deep-navy-500">Affected Users</p>
            <p className="text-body font-semibold text-deep-navy-800">
              {affectedUsers.toLocaleString()}
            </p>
          </div>
        )}

        {creditCostIncrease !== undefined && (
          <div>
            <p className="text-caption text-deep-navy-500">Credit Cost Change</p>
            <p className={cn('text-body font-semibold', creditCostIncrease >= 0 ? 'text-amber-600' : 'text-green-600')}>
              {creditCostIncrease >= 0 ? '+' : ''}{creditCostIncrease.toFixed(1)}%
            </p>
          </div>
        )}

        {revenueImpact !== undefined && (
          <div>
            <p className="text-caption text-deep-navy-500">Revenue Impact</p>
            <p className={cn('text-body font-semibold', revenueImpact >= 0 ? 'text-green-600' : 'text-red-600')}>
              ${revenueImpact.toLocaleString()}
            </p>
          </div>
        )}

        {churnImpact && (
          <div>
            <p className="text-caption text-deep-navy-500">Est. Churn Impact</p>
            <p className="text-body font-semibold text-amber-600">
              {churnImpact.min}-{churnImpact.max} users
            </p>
          </div>
        )}
      </div>

      {netBenefit !== undefined && (
        <div className="pt-3 border-t border-deep-navy-200">
          <p className="text-caption text-deep-navy-500">Net Financial Impact</p>
          <p className={cn('text-h4 font-bold', netBenefit >= 0 ? 'text-green-600' : 'text-red-600')}>
            {netBenefit >= 0 ? '+' : ''}${netBenefit.toLocaleString()}/month
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * PricingConfigForm Component
 * Reusable form for creating/editing pricing configurations
 */
interface PricingConfigFormProps {
  initialValues?: {
    scopeType?: 'tier' | 'provider' | 'model' | 'combination';
    subscriptionTier?: string;
    providerId?: string;
    modelId?: string;
    marginMultiplier?: number;
    reason?: string;
    reasonDetails?: string;
  };
  onSubmit: (values: any) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  tiers?: string[];
  providers?: Array<{ id: string; name: string }>;
  models?: Array<{ id: string; name: string }>;
}

export function PricingConfigForm({
  initialValues = {},
  onSubmit,
  onCancel,
  isSubmitting = false,
  tiers = ['free', 'pro', 'pro_max', 'enterprise_pro', 'enterprise_max'],
  providers = [],
  models = [],
}: PricingConfigFormProps) {
  const [formData, setFormData] = React.useState({
    scopeType: initialValues.scopeType || 'tier',
    subscriptionTier: initialValues.subscriptionTier || '',
    providerId: initialValues.providerId || '',
    modelId: initialValues.modelId || '',
    marginMultiplier: initialValues.marginMultiplier || 1.5,
    reason: initialValues.reason || 'tier_optimization',
    reasonDetails: initialValues.reasonDetails || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-body-sm font-medium text-deep-navy-700 mb-2">
          Scope
        </label>
        <select
          value={formData.scopeType}
          onChange={(e) => setFormData({ ...formData, scopeType: e.target.value as any })}
          className="flex h-10 w-full rounded-md border border-deep-navy-300 bg-white px-3 py-2 text-body focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rephlo-blue/20 focus-visible:border-rephlo-blue"
        >
          <option value="tier">Tier</option>
          <option value="provider">Provider</option>
          <option value="model">Model</option>
          <option value="combination">Combination (Tier + Provider + Model)</option>
        </select>
      </div>

      {(formData.scopeType === 'tier' || formData.scopeType === 'combination') && (
        <div>
          <label className="block text-body-sm font-medium text-deep-navy-700 mb-2">
            Subscription Tier
          </label>
          <select
            value={formData.subscriptionTier}
            onChange={(e) => setFormData({ ...formData, subscriptionTier: e.target.value })}
            className="flex h-10 w-full rounded-md border border-deep-navy-300 bg-white px-3 py-2 text-body focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rephlo-blue/20 focus-visible:border-rephlo-blue"
          >
            <option value="">Select tier...</option>
            {tiers.map((tier) => (
              <option key={tier} value={tier}>
                {tier.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              </option>
            ))}
          </select>
        </div>
      )}

      {(formData.scopeType === 'provider' || formData.scopeType === 'combination') && (
        <div>
          <label className="block text-body-sm font-medium text-deep-navy-700 mb-2">
            Provider
          </label>
          <select
            value={formData.providerId}
            onChange={(e) => setFormData({ ...formData, providerId: e.target.value })}
            className="flex h-10 w-full rounded-md border border-deep-navy-300 bg-white px-3 py-2 text-body focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rephlo-blue/20 focus-visible:border-rephlo-blue"
          >
            <option value="">Select provider...</option>
            {providers.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {(formData.scopeType === 'model' || formData.scopeType === 'combination') && (
        <div>
          <label className="block text-body-sm font-medium text-deep-navy-700 mb-2">
            Model
          </label>
          <select
            value={formData.modelId}
            onChange={(e) => setFormData({ ...formData, modelId: e.target.value })}
            className="flex h-10 w-full rounded-md border border-deep-navy-300 bg-white px-3 py-2 text-body focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rephlo-blue/20 focus-visible:border-rephlo-blue"
          >
            <option value="">Select model...</option>
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-body-sm font-medium text-deep-navy-700 mb-2">
          Margin Multiplier
        </label>
        <MultiplierInput
          value={formData.marginMultiplier}
          onChange={(value) => setFormData({ ...formData, marginMultiplier: value })}
        />
      </div>

      <div>
        <label className="block text-body-sm font-medium text-deep-navy-700 mb-2">
          Reason
        </label>
        <select
          value={formData.reason}
          onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
          className="flex h-10 w-full rounded-md border border-deep-navy-300 bg-white px-3 py-2 text-body focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rephlo-blue/20 focus-visible:border-rephlo-blue"
        >
          <option value="initial_setup">Initial Setup</option>
          <option value="vendor_price_change">Vendor Price Change</option>
          <option value="tier_optimization">Tier Optimization</option>
          <option value="margin_protection">Margin Protection</option>
          <option value="manual_adjustment">Manual Adjustment</option>
        </select>
      </div>

      <div>
        <label className="block text-body-sm font-medium text-deep-navy-700 mb-2">
          Details (Optional)
        </label>
        <textarea
          value={formData.reasonDetails}
          onChange={(e) => setFormData({ ...formData, reasonDetails: e.target.value })}
          rows={3}
          placeholder="Provide additional context for this change..."
          className="flex w-full rounded-md border border-deep-navy-300 bg-white px-3 py-2 text-body focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rephlo-blue/20 focus-visible:border-rephlo-blue resize-none"
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-deep-navy-200">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 text-body-sm font-medium text-deep-navy-700 bg-white border border-deep-navy-300 rounded-md hover:bg-deep-navy-50 disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-body-sm font-medium text-white bg-rephlo-blue rounded-md hover:bg-rephlo-blue-600 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </form>
  );
}

// Fix React import for useState
import React from 'react';

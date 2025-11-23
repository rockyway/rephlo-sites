import { useState, useEffect } from 'react';
import { Plus, Trash2, AlertCircle, Info, X } from 'lucide-react';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import { cn } from '@/lib/utils';

/**
 * Parameter Constraint Type
 * Matches backend/src/config/providers/base-provider-spec.ts
 */
interface ParameterConstraint {
  supported: boolean;
  min?: number;
  max?: number;
  default?: number | string | boolean;
  allowedValues?: (number | string | boolean)[];
  mutuallyExclusiveWith?: string[];
  alternativeName?: string;
  reason?: string;
  apiVersion?: string;
}

/**
 * Parameter Constraints Map (stored in models.meta.parameterConstraints)
 */
export type ParameterConstraints = Record<string, ParameterConstraint>;

interface ParameterConstraintsEditorProps {
  provider: string;
  constraints: ParameterConstraints;
  onChange: (constraints: ParameterConstraints) => void;
  disabled?: boolean;
}

/**
 * Common parameter templates based on provider
 * These match the provider specs from Plan 205
 */
const PARAMETER_TEMPLATES: Record<string, ParameterConstraints> = {
  openai_gpt4: {
    temperature: {
      supported: true,
      min: 0,
      max: 2.0,
      default: 0.7,
      reason: 'Controls randomness (0 = deterministic, 2 = very creative)',
    },
    max_tokens: {
      supported: true,
      min: 1,
      max: 4096,
      default: 1000,
      reason: 'Maximum tokens to generate',
    },
    top_p: {
      supported: true,
      min: 0,
      max: 1.0,
      default: 1.0,
      reason: 'Nucleus sampling (use either temperature OR top_p)',
    },
    frequency_penalty: {
      supported: true,
      min: -2.0,
      max: 2.0,
      default: 0,
      reason: 'Penalize repeated tokens',
    },
    presence_penalty: {
      supported: true,
      min: -2.0,
      max: 2.0,
      default: 0,
      reason: 'Penalize already mentioned tokens',
    },
  },
  openai_gpt5: {
    temperature: {
      supported: true,
      allowedValues: [1.0],
      default: 1.0,
      reason: 'GPT-5 restricted models only support temperature=1.0',
    },
    max_tokens: {
      supported: true,
      min: 1,
      max: 4096,
      default: 1000,
      alternativeName: 'max_completion_tokens',
      reason: 'GPT-5 uses max_completion_tokens parameter',
    },
  },
  anthropic_claude3: {
    temperature: {
      supported: true,
      min: 0.0,
      max: 1.0,
      default: 1.0,
      reason: 'Randomness control (0 = deterministic)',
    },
    max_tokens: {
      supported: true,
      min: 1,
      max: 200000,
      default: 4096,
      reason: 'Required parameter',
    },
    top_p: {
      supported: true,
      min: 0,
      max: 1.0,
      reason: 'Nucleus sampling',
    },
    top_k: {
      supported: true,
      min: 0,
      max: 100,
      default: 40,
      reason: 'Advanced use only',
    },
  },
  anthropic_claude45: {
    temperature: {
      supported: true,
      min: 0.0,
      max: 1.0,
      default: 1.0,
      mutuallyExclusiveWith: ['top_p'],
      reason: 'Claude 4.5 only supports temperature OR top_p, not both',
    },
    max_tokens: {
      supported: true,
      min: 1,
      max: 64000,
      default: 4096,
      reason: 'Claude 4 Sonnet supports 64K output',
    },
    top_p: {
      supported: true,
      min: 0,
      max: 1.0,
      mutuallyExclusiveWith: ['temperature'],
      reason: 'Claude 4.5 only supports temperature OR top_p, not both',
    },
  },
  google_gemini: {
    temperature: {
      supported: true,
      allowedValues: [1.0],
      default: 1.0,
      reason: 'Gemini 3 models require temperature=1.0 to prevent looping',
    },
    max_tokens: {
      supported: true,
      min: 1,
      max: 8192,
      default: 2048,
      alternativeName: 'maxOutputTokens',
      reason: 'Google uses camelCase',
    },
    top_p: {
      supported: true,
      min: 0,
      max: 1.0,
      default: 0.95,
      alternativeName: 'topP',
    },
    top_k: {
      supported: true,
      min: 0,
      max: 100,
      default: 40,
      alternativeName: 'topK',
    },
  },
};

/**
 * ParameterConstraintsEditor Component
 *
 * UI for configuring parameter constraints per model.
 * Supports:
 * - Loading from provider templates
 * - Range constraints (min/max)
 * - Allowed values (discrete set)
 * - Mutually exclusive parameters
 * - Custom parameters
 */
export default function ParameterConstraintsEditor({
  provider: _provider, // Intentionally unused, reserved for future template suggestions
  constraints,
  onChange,
  disabled = false,
}: ParameterConstraintsEditorProps) {
  const [localConstraints, setLocalConstraints] = useState<ParameterConstraints>(constraints);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [newParamName, setNewParamName] = useState<string>('');
  const [constraintType, setConstraintType] = useState<'range' | 'allowedValues'>('range');

  // Sync local state with props
  useEffect(() => {
    setLocalConstraints(constraints);
  }, [constraints]);

  // Update parent when local changes
  useEffect(() => {
    onChange(localConstraints);
  }, [localConstraints, onChange]);

  const handleLoadTemplate = (templateKey: string) => {
    const template = PARAMETER_TEMPLATES[templateKey];
    if (template) {
      setLocalConstraints(template);
      setSelectedTemplate(templateKey);
    }
  };

  const handleAddParameter = () => {
    if (!newParamName.trim() || localConstraints[newParamName]) return;

    const newConstraint: ParameterConstraint = {
      supported: true,
      ...(constraintType === 'range' ? { min: 0, max: 1, default: 0.5 } : { allowedValues: [] }),
    };

    setLocalConstraints({
      ...localConstraints,
      [newParamName.trim()]: newConstraint,
    });
    setNewParamName('');
  };

  const handleRemoveParameter = (paramName: string) => {
    const updated = { ...localConstraints };
    delete updated[paramName];
    setLocalConstraints(updated);
  };

  const handleUpdateConstraint = (
    paramName: string,
    field: keyof ParameterConstraint,
    value: any
  ) => {
    setLocalConstraints({
      ...localConstraints,
      [paramName]: {
        ...localConstraints[paramName],
        [field]: value,
      },
    });
  };

  const handleAddAllowedValue = (paramName: string, value: string) => {
    const constraint = localConstraints[paramName];
    if (!constraint || !value.trim()) return;

    const parsedValue = isNaN(Number(value)) ? value : Number(value);
    const allowedValues = [...(constraint.allowedValues || []), parsedValue];

    setLocalConstraints({
      ...localConstraints,
      [paramName]: {
        ...constraint,
        allowedValues,
      },
    });
  };

  const handleRemoveAllowedValue = (paramName: string, index: number) => {
    const constraint = localConstraints[paramName];
    if (!constraint || !constraint.allowedValues) return;

    const allowedValues = constraint.allowedValues.filter((_, i) => i !== index);

    setLocalConstraints({
      ...localConstraints,
      [paramName]: {
        ...constraint,
        allowedValues,
      },
    });
  };

  const parameterEntries = Object.entries(localConstraints);

  return (
    <div className="space-y-4">
      {/* Template Selector */}
      <div className="bg-rephlo-blue/5 dark:bg-electric-cyan/5 border border-rephlo-blue/20 dark:border-electric-cyan/20 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Info className="h-5 w-5 text-rephlo-blue dark:text-electric-cyan" />
          <h4 className="text-body font-semibold text-deep-navy-800 dark:text-white">
            Load Parameter Template
          </h4>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleLoadTemplate('openai_gpt4')}
            disabled={disabled}
            className="text-left justify-start"
          >
            OpenAI GPT-4
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleLoadTemplate('openai_gpt5')}
            disabled={disabled}
            className="text-left justify-start"
          >
            OpenAI GPT-5
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleLoadTemplate('anthropic_claude3')}
            disabled={disabled}
            className="text-left justify-start"
          >
            Claude 3
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleLoadTemplate('anthropic_claude45')}
            disabled={disabled}
            className="text-left justify-start"
          >
            Claude 4.5
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleLoadTemplate('google_gemini')}
            disabled={disabled}
            className="text-left justify-start"
          >
            Google Gemini
          </Button>
        </div>
        {selectedTemplate && (
          <p className="mt-2 text-caption text-green-700 dark:text-green-300">
            ✓ Loaded {selectedTemplate.replace('_', ' ')} template
          </p>
        )}
      </div>

      {/* Parameter List */}
      {parameterEntries.length > 0 ? (
        <div className="space-y-3">
          <h4 className="text-body font-semibold text-deep-navy-800 dark:text-white">
            Configured Parameters ({parameterEntries.length})
          </h4>
          {parameterEntries.map(([paramName, constraint]) => (
            <div
              key={paramName}
              className="border border-deep-navy-200 dark:border-deep-navy-700 rounded-md p-4 space-y-3"
            >
              {/* Parameter Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h5 className="font-mono font-semibold text-deep-navy-900 dark:text-white">
                    {paramName}
                  </h5>
                  {constraint.alternativeName && (
                    <span className="text-caption text-deep-navy-600 dark:text-deep-navy-400">
                      (API: {constraint.alternativeName})
                    </span>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRemoveParameter(paramName)}
                  disabled={disabled}
                  className="text-red-600 hover:text-red-700 dark:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Constraint Type Toggle */}
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    checked={!constraint.allowedValues || constraint.allowedValues.length === 0}
                    onChange={() =>
                      handleUpdateConstraint(paramName, 'allowedValues', undefined)
                    }
                    disabled={disabled}
                    className="h-4 w-4"
                  />
                  <span className="text-body-sm text-deep-navy-700 dark:text-deep-navy-200">
                    Range (min/max)
                  </span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    checked={!!constraint.allowedValues && constraint.allowedValues.length > 0}
                    onChange={() => handleUpdateConstraint(paramName, 'allowedValues', [])}
                    disabled={disabled}
                    className="h-4 w-4"
                  />
                  <span className="text-body-sm text-deep-navy-700 dark:text-deep-navy-200">
                    Allowed Values
                  </span>
                </label>
              </div>

              {/* Range Constraints */}
              {(!constraint.allowedValues || constraint.allowedValues.length === 0) && (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-caption text-deep-navy-600 dark:text-deep-navy-300 mb-1">
                      Min
                    </label>
                    <Input
                      type="number"
                      step="0.1"
                      value={constraint.min ?? ''}
                      onChange={(e) =>
                        handleUpdateConstraint(paramName, 'min', parseFloat(e.target.value))
                      }
                      disabled={disabled}
                    />
                  </div>
                  <div>
                    <label className="block text-caption text-deep-navy-600 dark:text-deep-navy-300 mb-1">
                      Max
                    </label>
                    <Input
                      type="number"
                      step="0.1"
                      value={constraint.max ?? ''}
                      onChange={(e) =>
                        handleUpdateConstraint(paramName, 'max', parseFloat(e.target.value))
                      }
                      disabled={disabled}
                    />
                  </div>
                  <div>
                    <label className="block text-caption text-deep-navy-600 dark:text-deep-navy-300 mb-1">
                      Default
                    </label>
                    <Input
                      type="number"
                      step="0.1"
                      value={typeof constraint.default === 'boolean' ? '' : (constraint.default ?? '')}
                      onChange={(e) =>
                        handleUpdateConstraint(paramName, 'default', parseFloat(e.target.value))
                      }
                      disabled={disabled}
                    />
                  </div>
                </div>
              )}

              {/* Allowed Values */}
              {constraint.allowedValues && constraint.allowedValues.length > 0 && (
                <div>
                  <label className="block text-caption text-deep-navy-600 dark:text-deep-navy-300 mb-2">
                    Allowed Values
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {constraint.allowedValues.map((value, index) => (
                      <div
                        key={index}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-rephlo-blue/10 dark:bg-electric-cyan/10 rounded-md"
                      >
                        <span className="text-body-sm font-mono text-deep-navy-900 dark:text-white">
                          {String(value)}
                        </span>
                        <button
                          onClick={() => handleRemoveAllowedValue(paramName, index)}
                          disabled={disabled}
                          className="text-red-600 hover:text-red-700 dark:text-red-400"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Add value (e.g., 1.0)"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAddAllowedValue(paramName, e.currentTarget.value);
                          e.currentTarget.value = '';
                        }
                      }}
                      disabled={disabled}
                      className="max-w-xs"
                    />
                    <span className="text-caption text-deep-navy-600 dark:text-deep-navy-300">
                      Press Enter to add
                    </span>
                  </div>
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="block text-caption text-deep-navy-600 dark:text-deep-navy-300 mb-1">
                  Reason / Description
                </label>
                <Input
                  value={constraint.reason || ''}
                  onChange={(e) => handleUpdateConstraint(paramName, 'reason', e.target.value)}
                  placeholder="Explain the constraint..."
                  disabled={disabled}
                />
              </div>

              {/* Mutually Exclusive Warning */}
              {constraint.mutuallyExclusiveWith && constraint.mutuallyExclusiveWith.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-md p-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <p className="text-caption text-amber-800 dark:text-amber-200">
                      Cannot be used with: {constraint.mutuallyExclusiveWith.join(', ')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-deep-navy-600 dark:text-deep-navy-400">
          <p className="text-body-sm">No parameter constraints configured</p>
          <p className="text-caption mt-1">Load a template or add custom parameters below</p>
        </div>
      )}

      {/* Add New Parameter */}
      <div className="border-t border-deep-navy-200 dark:border-deep-navy-700 pt-4">
        <h4 className="text-body font-semibold text-deep-navy-800 dark:text-white mb-3">
          Add Custom Parameter
        </h4>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-caption text-deep-navy-600 dark:text-deep-navy-300 mb-1">
              Parameter Name
            </label>
            <Input
              value={newParamName}
              onChange={(e) => setNewParamName(e.target.value)}
              placeholder="e.g., top_p, stop, n"
              disabled={disabled}
            />
          </div>
          <div>
            <label className="block text-caption text-deep-navy-600 dark:text-deep-navy-300 mb-1">
              Type
            </label>
            <select
              value={constraintType}
              onChange={(e) => setConstraintType(e.target.value as any)}
              disabled={disabled}
              className={cn(
                'flex h-11 w-full rounded-md border bg-white dark:bg-deep-navy-800 px-3 py-2 text-body',
                'text-deep-navy-900 dark:text-deep-navy-100',
                'border-deep-navy-300 dark:border-deep-navy-700',
                'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rephlo-blue/20'
              )}
            >
              <option value="range">Range</option>
              <option value="allowedValues">Allowed Values</option>
            </select>
          </div>
          <Button onClick={handleAddParameter} disabled={disabled || !newParamName.trim()}>
            <Plus className="h-4 w-4 mr-1" />
            Add Parameter
          </Button>
        </div>
      </div>
    </div>
  );
}

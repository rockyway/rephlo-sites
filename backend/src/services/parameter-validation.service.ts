/**
 * Parameter Validation Service
 *
 * Validates and filters LLM request parameters against model constraints.
 * Enforces parameter ranges, allowed values, and mutually exclusive constraints.
 *
 * Integration point: Runs BEFORE provider API calls to prevent invalid parameters
 * from reaching the LLM provider.
 */

import { injectable, inject } from 'tsyringe';
import logger from '../utils/logger';
import { IModelService } from '../interfaces';

export interface ParameterConstraint {
  [key: string]: any; // Allow dynamic properties for extensibility
  supported?: boolean;
  reason?: string;
  allowedValues?: any[];
  min?: number;
  max?: number;
  default?: any;
  alternativeName?: string;
  mutuallyExclusiveWith?: string[];
  maxSequences?: number;
  customParameters?: Record<string, any>;
}

export interface ParameterValidationResult {
  valid: boolean;
  transformedParams: Record<string, any>; // Transformed params ready for provider
  errors: string[];
  warnings: string[];
}

@injectable()
export class ParameterValidationService {
  constructor(@inject('IModelService') private modelService: IModelService) {}

  /**
   * Validates and filters request parameters against model constraints
   *
   * @param modelId - Model ID
   * @param requestParams - Raw request parameters from client
   * @returns Validation result with transformed parameters
   */
  async validateParameters(
    modelId: string,
    requestParams: Record<string, any>
  ): Promise<ParameterValidationResult> {
    // Get model metadata including parameter constraints
    let model;
    try {
      model = await this.modelService.getModelForInference(modelId);
    } catch (error) {
      logger.error('ParameterValidationService: Model not found', {
        modelId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        valid: false,
        transformedParams: {},
        errors: [`Model '${modelId}' not found`],
        warnings: [],
      };
    }

    const constraints = (model.meta as any)?.parameterConstraints as Record<string, ParameterConstraint> | undefined;

    if (!constraints) {
      // No constraints defined, allow all parameters
      logger.debug('ParameterValidationService: No constraints for model', {
        modelId,
      });
      return {
        valid: true,
        transformedParams: requestParams,
        errors: [],
        warnings: [],
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    const transformedParams: Record<string, any> = {};

    // Extract parameters that need validation (skip model, messages, stream)
    const parametersToValidate = Object.entries(requestParams)
      .filter(([key]) => !['model', 'messages', 'stream'].includes(key))
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {} as Record<string, any>);

    // Validate each parameter
    for (const [paramName, paramValue] of Object.entries(
      parametersToValidate
    )) {
      const constraint = constraints[paramName] as ParameterConstraint | undefined;

      // Unknown parameter (not in constraints)
      if (!constraint) {
        // Check custom parameters
        const customConstraint = constraints.customParameters?.[paramName] as ParameterConstraint | undefined;
        if (customConstraint) {
          const result = this.validateParameter(
            paramName,
            paramValue,
            customConstraint
          );
          if (result.valid && result.value !== undefined) {
            const finalName = customConstraint.alternativeName || paramName;
            transformedParams[finalName] = result.value;
          } else {
            errors.push(...result.errors);
          }
        } else {
          // Unknown parameter, pass through with warning
          warnings.push(
            `Parameter '${paramName}' not configured for model, passing through`
          );
          transformedParams[paramName] = paramValue;
        }
        continue;
      }

      // Parameter not supported
      if (constraint.supported === false) {
        warnings.push(
          `Parameter '${paramName}' is not supported for this model${
            constraint.reason ? ': ' + constraint.reason : ''
          }`
        );
        continue; // Exclude from transformed params
      }

      // Null/undefined values: skip if supported but optional
      if (paramValue === null || paramValue === undefined) {
        // Apply default if specified
        if (constraint.default !== undefined) {
          const finalName = constraint.alternativeName || paramName;
          transformedParams[finalName] = constraint.default;
        }
        continue;
      }

      // Validate parameter value
      const result = this.validateParameter(paramName, paramValue, constraint);
      if (result.valid && result.value !== undefined) {
        // Use alternative name if specified (e.g., max_completion_tokens)
        const finalName = constraint.alternativeName || paramName;
        transformedParams[finalName] = result.value;
      } else {
        errors.push(...result.errors);
      }
    }

    // Check mutually exclusive parameters AFTER validation
    if (!errors.length) {
      for (const [paramName, constraint] of Object.entries(constraints)) {
        const constraintTyped = constraint as ParameterConstraint;
        if (constraintTyped.mutuallyExclusiveWith) {
          if (transformedParams[paramName] !== undefined) {
            for (const exclusive of constraintTyped.mutuallyExclusiveWith) {
              if (transformedParams[exclusive] !== undefined) {
                errors.push(
                  `Parameters '${paramName}' and '${exclusive}' cannot be used together${
                    constraintTyped.reason ? ': ' + constraintTyped.reason : ''
                  }`
                );
              }
            }
          }
        }
      }
    }

    // Apply defaults for missing parameters (only if no errors)
    if (!errors.length) {
      for (const [paramName, constraint] of Object.entries(constraints)) {
        const constraintTyped = constraint as ParameterConstraint;
        if (
          constraintTyped.supported &&
          constraintTyped.default !== undefined &&
          transformedParams[paramName] === undefined &&
          requestParams[paramName] === undefined
        ) {
          const finalName = constraintTyped.alternativeName || paramName;
          transformedParams[finalName] = constraintTyped.default;
        }
      }
    }

    logger.debug('ParameterValidationService: Validation complete', {
      modelId,
      originalParamNames: Object.keys(parametersToValidate),
      transformedParamNames: Object.keys(transformedParams),
      errorCount: errors.length,
      warningCount: warnings.length,
    });

    return {
      valid: errors.length === 0,
      transformedParams,
      errors,
      warnings,
    };
  }

  /**
   * Validates a single parameter value against its constraint
   *
   * @private
   * @returns Object with valid flag, transformed value, and error messages
   */
  private validateParameter(
    paramName: string,
    value: any,
    constraint: ParameterConstraint
  ): { valid: boolean; value?: any; errors: string[] } {
    const errors: string[] = [];

    // Allowed values (discrete set) - highest priority
    if (
      constraint.allowedValues &&
      Array.isArray(constraint.allowedValues) &&
      constraint.allowedValues.length > 0
    ) {
      if (!constraint.allowedValues.includes(value)) {
        errors.push(
          `Parameter '${paramName}' must be one of: [${constraint.allowedValues.join(
            ', '
          )}]. Got: ${value}`
        );
        return { valid: false, errors };
      }
      return { valid: true, value, errors: [] };
    }

    // Range validation (min/max) for numbers
    if (typeof value === 'number') {
      if (constraint.min !== undefined && value < constraint.min) {
        errors.push(
          `Parameter '${paramName}' must be >= ${constraint.min}. Got: ${value}`
        );
      }
      if (constraint.max !== undefined && value > constraint.max) {
        errors.push(
          `Parameter '${paramName}' must be <= ${constraint.max}. Got: ${value}`
        );
      }
    }

    // Array validation (e.g., stop sequences)
    if (Array.isArray(value) && constraint.maxSequences !== undefined) {
      if (value.length > constraint.maxSequences) {
        errors.push(
          `Parameter '${paramName}' can have max ${constraint.maxSequences} items. Got: ${value.length}`
        );
      }
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    return { valid: true, value, errors: [] };
  }
}

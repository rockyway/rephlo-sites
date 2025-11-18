/**
 * Type Validation Middleware
 * Validates request bodies and query parameters using Zod schemas
 * Provides compile-time type safety for API contracts
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import logger from '../utils/logger';

/**
 * Validation target type
 */
export type ValidationTarget = 'body' | 'query' | 'params';

/**
 * Validation options
 */
export interface ValidationOptions {
  /**
   * Whether to strip unknown keys from the validated data
   * @default true
   */
  stripUnknown?: boolean;

  /**
   * Whether to abort validation on first error
   * @default false
   */
  abortEarly?: boolean;

  /**
   * Custom error handler
   */
  onError?: (error: ZodError, req: Request, res: Response) => void;
}

/**
 * Create a validation middleware for request data
 *
 * @param schema Zod schema to validate against
 * @param target Validation target (body, query, or params)
 * @param options Validation options
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * import { validateRequest } from '@middleware/typeValidation.middleware';
 * import { CreateCouponRequestSchema } from '@rephlo/shared-types';
 *
 * router.post('/coupons',
 *   validateRequest(CreateCouponRequestSchema, 'body'),
 *   couponController.create
 * );
 * ```
 */
export function validateRequest<T>(
  schema: ZodSchema<T>,
  target: ValidationTarget = 'body',
  options: ValidationOptions = {}
): (req: Request, res: Response, next: NextFunction) => void {
  const {
    onError,
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Get the data to validate based on target
      const dataToValidate = req[target];

      // Parse with Zod schema
      const result = schema.safeParse(dataToValidate);

      if (!result.success) {
        const zodError = result.error;

        // Call custom error handler if provided
        if (onError) {
          onError(zodError, req, res);
          return;
        }

        // Format Zod errors for API response
        const formattedErrors = formatZodErrors(zodError);

        logger.warn('Request validation failed', {
          target,
          path: req.path,
          method: req.method,
          errors: formattedErrors,
          requestId: (req as any).id,
        });

        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: formattedErrors,
          },
        });
        return;
      }

      // Replace the original data with validated data
      // This ensures type safety downstream
      (req as any)[target] = result.data;

      next();
    } catch (error) {
      logger.error('Unexpected error in validation middleware', {
        error,
        path: req.path,
        method: req.method,
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred during validation',
        },
      });
    }
  };
}

/**
 * Validate response data against a Zod schema (development only)
 * Helps catch API contract violations during development
 *
 * @param schema Zod schema to validate against
 * @param options Validation options
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * if (process.env.NODE_ENV === 'development') {
 *   router.get('/users/:id',
 *     authenticate(),
 *     userController.getById,
 *     validateResponse(UserSchema)
 *   );
 * }
 * ```
 */
export function validateResponse<T>(
  schema: ZodSchema<T>,
  _options: ValidationOptions = {}
): (req: Request, res: Response, next: NextFunction) => void {
  // Only validate responses in development mode
  if (process.env.NODE_ENV !== 'development') {
    return (_req: Request, _res: Response, next: NextFunction): void => {
      next();
    };
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    // Intercept res.json() to validate the response
    const originalJson = res.json.bind(res);

    res.json = function (body: any): Response {
      try {
        // Extract data from response body
        const dataToValidate = body?.data || body;

        // Validate with Zod schema
        const result = schema.safeParse(dataToValidate);

        if (!result.success) {
          const zodError = result.error;
          const formattedErrors = formatZodErrors(zodError);

          logger.error('Response validation failed', {
            path: req.path,
            method: req.method,
            errors: formattedErrors,
            requestId: (req as any).id,
          });

          // In development, return validation error instead of original response
          return originalJson({
            success: false,
            error: {
              code: 'RESPONSE_VALIDATION_ERROR',
              message: 'Response does not match expected schema',
              details: formattedErrors,
            },
          });
        }

        logger.debug('Response validation passed', {
          path: req.path,
          method: req.method,
        });

        // Return original response if validation passes
        return originalJson(body);
      } catch (error) {
        logger.error('Unexpected error in response validation', {
          error,
          path: req.path,
          method: req.method,
        });

        // Return original response on error
        return originalJson(body);
      }
    };

    next();
  };
}

/**
 * Format Zod errors into a user-friendly structure
 *
 * @param error ZodError instance
 * @returns Formatted error details
 */
function formatZodErrors(error: ZodError): Array<{
  field: string;
  message: string;
  code: string;
}> {
  return error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code,
  }));
}

/**
 * Validate multiple targets in a single middleware
 *
 * @param schemas Object mapping targets to Zod schemas
 * @param options Validation options
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * router.patch('/users/:id',
 *   validateMultiple({
 *     params: z.object({ id: z.string().uuid() }),
 *     body: UpdateUserRequestSchema,
 *   }),
 *   userController.update
 * );
 * ```
 */
export function validateMultiple(
  schemas: Partial<Record<ValidationTarget, ZodSchema>>,
  _options: ValidationOptions = {}
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: Array<{
      target: ValidationTarget;
      field: string;
      message: string;
      code: string;
    }> = [];

    // Validate each target
    for (const [target, schema] of Object.entries(schemas)) {
      const dataToValidate = req[target as ValidationTarget];
      const result = schema.safeParse(dataToValidate);

      if (!result.success) {
        const zodError = result.error;
        const formattedErrors = formatZodErrors(zodError);

        // Add target information to each error
        formattedErrors.forEach((err) => {
          errors.push({
            target: target as ValidationTarget,
            ...err,
          });
        });
      } else {
        // Replace with validated data
        (req as any)[target] = result.data;
      }
    }

    // If there are errors, return validation error response
    if (errors.length > 0) {
      logger.warn('Multi-target validation failed', {
        path: req.path,
        method: req.method,
        errors,
        requestId: (req as any).id,
      });

      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: errors,
        },
      });
      return;
    }

    next();
  };
}

/**
 * Create a type-safe request handler wrapper
 * Validates request and response, and provides type-safe req.body
 *
 * @param requestSchema Zod schema for request body
 * @param responseSchema Zod schema for response data (development only)
 * @param handler Request handler function
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * router.post('/coupons',
 *   typeSafeHandler(
 *     CreateCouponRequestSchema,
 *     CouponSchema,
 *     async (req, res) => {
 *       // req.body is type-safe here
 *       const coupon = await couponService.create(req.body);
 *       res.json(createSuccessResponse(coupon));
 *     }
 *   )
 * );
 * ```
 */
export function typeSafeHandler<TRequest, TResponse>(
  requestSchema: ZodSchema<TRequest>,
  responseSchema: ZodSchema<TResponse>,
  handler: (
    req: Request & { body: TRequest },
    res: Response,
    next: NextFunction
  ) => Promise<void> | void
): Array<(req: Request, res: Response, next: NextFunction) => void> {
  const middlewares: Array<(req: Request, res: Response, next: NextFunction) => void> = [
    validateRequest(requestSchema, 'body'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        await handler(req as Request & { body: TRequest }, res, next);
      } catch (error) {
        next(error);
      }
    },
  ];

  // Add response validation in development
  if (process.env.NODE_ENV === 'development') {
    middlewares.push(validateResponse(responseSchema));
  }

  return middlewares;
}

/**
 * Utility to safely validate data programmatically
 * Useful in services or controllers for manual validation
 *
 * @param schema Zod schema
 * @param data Data to validate
 * @param context Context for error logging
 * @throws Error if validation fails
 * @returns Validated and type-safe data
 *
 * @example
 * ```typescript
 * const validatedCoupon = safeValidate(
 *   CouponSchema,
 *   apiResponse,
 *   'CouponService.create'
 * );
 * ```
 */
export function safeValidate<T>(
  schema: ZodSchema<T>,
  data: unknown,
  context?: string
): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    const formattedErrors = formatZodErrors(result.error);

    logger.error('Manual validation failed', {
      context,
      errors: formattedErrors,
    });

    throw new Error(
      `Validation failed${context ? ` in ${context}` : ''}: ${formattedErrors
        .map((e) => `${e.field}: ${e.message}`)
        .join(', ')}`
    );
  }

  return result.data;
}

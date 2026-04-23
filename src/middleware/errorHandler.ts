import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import logger from '@utils/logger.js';
import { config } from '@config/index.js';
import { AppError, ValidationError } from '@types/errors.js';

// Async route wrapper to catch errors
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Validation middleware factory
export const validate = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse({
        body: req.body,
        params: req.params,
        query: req.query,
      });
      req.validated = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.reduce(
          (acc, err) => {
            const path = err.path.join('.');
            if (!acc[path]) acc[path] = [];
            acc[path].push(err.message);
            return acc;
          },
          {} as Record<string, string[]>
        );
        return next(new ValidationError('Validation failed', errors));
      }
      next(error);
    }
  };
};

// Global error handler middleware
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log the error with full context
  logger.error('Error occurred', {
    name: err.name,
    message: err.message,
    url: req.url,
    method: req.method,
    ip: req.ip,
    stack: err.stack,
  });

  // Handle validation errors
  if (err instanceof ValidationError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        code: 'VALIDATION_ERROR',
        details: err.errors,
      },
    });
  }

  // Handle operational errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        code: err.constructor.name,
      },
    });
  }

  // Handle Zod validation errors (direct)
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: err.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      },
    });
  }

  // Handle unknown errors - don't expose stack traces in production
  const isProduction = config.server.nodeEnv === 'production';
  
  res.status(500).json({
    success: false,
    error: {
      message: isProduction ? 'Internal server error' : err.message,
      code: 'INTERNAL_ERROR',
      ...(config.server.isDevelopment && { stack: err.stack }),
    },
  });
};

// Not found handler
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Route not found: ${req.method} ${req.path}`,
      code: 'NOT_FOUND',
    },
  });
};

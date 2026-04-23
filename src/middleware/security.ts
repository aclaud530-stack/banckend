import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from '@config/index.js';
import logger from '@utils/logger.js';

// Helmet middleware - sets security headers
export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  frameguard: {
    action: 'deny',
  },
  noSniff: true,
  xssFilter: true,
});

// CORS middleware - configure cross-origin requests
export const corsMiddleware = cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      config.frontend.url,
      config.frontend.prodUrl,
      'http://localhost:3000',
      'http://localhost:3001',
    ];

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
});

// Rate limiting middleware
const createRateLimiter = (windowMs: number, max: number) =>
  rateLimit({
    windowMs,
    max,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => config.server.isDevelopment,
    keyGenerator: (req) => {
      return (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown';
    },
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', { ip: req.ip });
      res.status(429).json({
        error: 'Too many requests',
        retryAfter: req.rateLimit?.resetTime,
      });
    },
  });

// General API rate limiter
export const apiLimiter = createRateLimiter(
  config.rateLimit.windowMs,
  config.rateLimit.maxRequests
);

// Strict rate limiter for auth endpoints
export const authLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5 // 5 requests per 15 minutes
);

// WebSocket rate limiter
export const wsLimiter = createRateLimiter(
  1000, // 1 second
  10 // 10 requests per second
);

// Request logging middleware
export const requestLoggerMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
    });
  });

  next();
};

// Request sanitization middleware
export const sanitizationMiddleware = express.json({
  limit: '10mb',
});

export const urlEncodedMiddleware = express.urlencoded({
  limit: '10mb',
  extended: true,
});

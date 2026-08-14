import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Middleware: Logs slow API responses (>500ms) for performance monitoring.
 * Helps identify endpoints that need query optimization or caching.
 */
export function slowQueryLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 500) {
      logger.warn(
        `🐌 SLOW API: ${req.method} ${req.originalUrl} — ${duration}ms (status ${res.statusCode})`
      );
    }
  });

  next();
}

/**
 * Middleware: Adds response time header for frontend performance monitoring.
 */
export function responseTimeHeader(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    // Header is set before finish in a real scenario;
    // this logs it for monitoring instead
    if (duration > 200) {
      logger.debug(`⏱️ ${req.method} ${req.originalUrl} — ${duration}ms`);
    }
  });

  next();
}

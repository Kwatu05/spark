import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { 
  logError as loggerError, 
  logWarning, 
  logInfo, 
  logHttp, 
  logSecurity, 
  logPerformance,
  logUserAction,
  logAPI
} from '../utils/logger';

export type Metrics = {
  startTime: number;
  requestsTotal: number;
  requestsByRoute: Record<string, number>;
  errorsTotal: number;
  securityEvents: number;
  userActions: number;
  databaseQueries: number;
  responseTimeSum: number;
  getAverageResponseTime: () => number;
  getUptime: () => number;
  getErrorRate: () => number;
};

export const metrics: Metrics = {
  startTime: Date.now(),
  requestsTotal: 0,
  requestsByRoute: {},
  errorsTotal: 0,
  securityEvents: 0,
  userActions: 0,
  databaseQueries: 0,
  responseTimeSum: 0,
  getAverageResponseTime: () => metrics.responseTimeSum / Math.max(metrics.requestsTotal, 1),
  getUptime: () => Date.now() - metrics.startTime,
  getErrorRate: () => (metrics.errorsTotal / Math.max(metrics.requestsTotal, 1)) * 100
};

export function requestTracing(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime.bigint();
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();
  (req as any).requestId = requestId;
  res.setHeader('x-request-id', requestId);

  metrics.requestsTotal += 1;
  const key = `${req.method} ${req.path}`;
  metrics.requestsByRoute[key] = (metrics.requestsByRoute[key] || 0) + 1;

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    metrics.responseTimeSum += durationMs;
    
    const logData = {
      requestId,
      method: req.method,
      path: req.originalUrl || req.url,
      status: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
      userAgent: req.headers['user-agent'] || '',
      ip: req.ip,
      userId: (req as any).user?.userId
    };
    
    // Log using our enhanced logger
    logAPI(req.method, req.originalUrl || req.url, res.statusCode, durationMs, logData);
    
    // Log slow requests as warnings
    if (durationMs > 1000) {
      logWarning(`Slow request detected: ${req.method} ${req.originalUrl || req.url}`, logData);
    }
    
    // Log performance metrics for very fast requests
    if (durationMs < 50) {
      logPerformance(`Fast request: ${req.method} ${req.originalUrl || req.url}`, logData);
    }
    
    // Log security events for auth failures
    if (res.statusCode === 401 || res.statusCode === 403) {
      metrics.securityEvents++;
      logSecurity(`Authentication/Authorization failure: ${req.method} ${req.originalUrl || req.url}`, logData);
    }
  });

  res.on('close', () => {
    if (!res.writableEnded && res.statusCode >= 500) {
      metrics.errorsTotal += 1;
    }
  });

  next();
}

export function logError(err: any, req: Request, res: Response, next: NextFunction) {
  metrics.errorsTotal += 1;
  
  const errorInfo = {
    requestId: (req as any).requestId,
    method: req.method,
    path: req.originalUrl || req.url,
    status: res.statusCode,
    error: err?.message || String(err),
    stack: err?.stack,
    userId: (req as any).user?.userId,
    ip: req.ip,
    userAgent: req.headers['user-agent'] || '',
    timestamp: new Date().toISOString()
  };
  
  // Log different types of errors with appropriate levels
  if (res.statusCode === 401 || res.statusCode === 403) {
    logSecurity(`Authentication/Authorization error: ${err?.message || String(err)}`, errorInfo);
    metrics.securityEvents++;
  } else if (res.statusCode >= 500) {
    loggerError(`Server error: ${err?.message || String(err)}`, err, errorInfo);
  } else {
    logWarning(`Client error: ${err?.message || String(err)}`, errorInfo);
  }
  
  next(err);
}

// Additional logging utilities
export const logSecurityEvent = (event: string, req: Request, details?: any) => {
  metrics.securityEvents++;
  logSecurity(event, {
    requestId: (req as any).requestId,
    method: req.method,
    path: req.originalUrl || req.url,
    ip: req.ip,
    userAgent: req.headers['user-agent'] || '',
    userId: (req as any).user?.userId,
    timestamp: new Date().toISOString(),
    ...details
  });
};

export const logUserActionEvent = (action: string, req: Request, details?: any) => {
  metrics.userActions++;
  logUserAction(action, (req as any).user?.userId || 'anonymous', {
    requestId: (req as any).requestId,
    method: req.method,
    path: req.originalUrl || req.url,
    ip: req.ip,
    timestamp: new Date().toISOString(),
    ...details
  });
};

export const logDatabaseOperation = (operation: string, table: string, details?: any) => {
  metrics.databaseQueries++;
  logInfo(`Database operation: ${operation} on ${table}`, {
    type: 'database',
    operation,
    table,
    timestamp: new Date().toISOString(),
    ...details
  });
};



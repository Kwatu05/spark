import { Request, Response, NextFunction } from 'express';
import { gdprComplianceService } from '../services/gdprCompliance';
import { logInfo, logWarning } from '../utils/logger';

/**
 * GDPR compliance middleware
 * Ensures all data processing activities are logged and compliant
 */
export const gdprComplianceMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Log data processing activity
  if (req.user?.userId) {
    const activity = getActivityType(req.method, req.path);
    if (activity) {
      gdprComplianceService.auditDataProcessing(req.user.userId)
        .then(() => {
          logInfo('GDPR activity logged', { 
            userId: req.user?.userId, 
            activity, 
            path: req.path,
            method: req.method 
          });
        })
        .catch((error) => {
          logWarning('Failed to log GDPR activity', { error: error.message });
        });
    }
  }

  next();
};

/**
 * Consent validation middleware
 * Checks if user has given required consent for specific operations
 */
export const requireConsent = (consentType: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ ok: false, error: 'User not authenticated' });
      }

      const consentStatus = await gdprComplianceService.getConsentStatus(userId);
      const hasConsent = consentStatus.some(
        consent => consent.consentType === consentType && consent.granted
      );

      if (!hasConsent) {
        return res.status(403).json({
          ok: false,
          error: 'Consent required',
          message: `User consent for ${consentType} is required`,
          consentType
        });
      }

      next();
    } catch (error) {
      logWarning('Failed to check consent', { error: (error as Error).message });
      res.status(500).json({ ok: false, error: 'Failed to validate consent' });
    }
  };
};

/**
 * Data minimization middleware
 * Ensures only necessary data is collected and processed
 */
export const dataMinimization = (allowedFields: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.body && typeof req.body === 'object') {
      const filteredBody: any = {};
      
      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          filteredBody[field] = req.body[field];
        }
      });
      
      req.body = filteredBody;
    }
    
    next();
  };
};

/**
 * Data retention middleware
 * Automatically removes expired data
 */
export const dataRetentionCheck = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // This would typically run as a background job
    // For now, we'll just log that the check should be performed
    logInfo('Data retention check should be performed', { timestamp: new Date() });
    next();
  } catch (error) {
      logWarning('Data retention check failed', { error: (error as Error).message });
    next(); // Don't block the request
  }
};

/**
 * Privacy by design middleware
 * Ensures privacy considerations are built into the system
 */
export const privacyByDesign = (req: Request, res: Response, next: NextFunction) => {
  // Add privacy headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Add privacy notice header
  res.setHeader('X-Privacy-Notice', 'This service processes personal data in accordance with GDPR');
  
  next();
};

/**
 * Data subject rights middleware
 * Ensures data subject rights are respected
 */
export const respectDataSubjectRights = (req: Request, res: Response, next: NextFunction) => {
  // Check if this is a data subject rights request
  if (req.path.includes('/gdpr/') || req.path.includes('/privacy/')) {
    // Ensure proper authentication and authorization
    if (!req.user?.userId) {
      return res.status(401).json({ 
        ok: false, 
        error: 'Authentication required for data subject rights requests' 
      });
    }
    
    // Log the request
    logInfo('Data subject rights request', {
      userId: req.user.userId,
      path: req.path,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  }
  
  next();
};

/**
 * Breach detection middleware
 * Monitors for potential data breaches
 */
export const breachDetection = (req: Request, res: Response, next: NextFunction) => {
  // Monitor for suspicious activities
  const suspiciousPatterns = [
    /\.\.\//, // Path traversal
    /<script/i, // XSS attempts
    /union.*select/i, // SQL injection
    /javascript:/i // JavaScript injection
  ];
  
  const requestString = JSON.stringify({
    path: req.path,
    query: req.query,
    body: req.body,
    headers: req.headers
  });
  
  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(requestString));
  
  if (isSuspicious) {
    logWarning('Suspicious activity detected', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
      userId: req.user?.userId
    });
    
    // In a real implementation, this might trigger additional security measures
  }
  
  next();
};

/**
 * Cookie consent middleware
 * Ensures cookie consent is respected
 */
export const cookieConsent = (req: Request, res: Response, next: NextFunction) => {
  const cookieConsent = req.cookies?.cookieConsent;
  
  if (!cookieConsent && req.path !== '/gdpr/consent') {
    // Don't set non-essential cookies without consent
    const originalCookie = res.cookie;
    res.cookie = function(name: string, value: any, options: any = {}) {
      // Only set essential cookies without consent
      if (name === 'spark_session' || name === 'refresh_token') {
        return originalCookie.call(this, name, value);
      }
      return this;
    };
  }
  
  next();
};

// Helper function to determine activity type
function getActivityType(method: string, path: string): string | null {
  if (path.includes('/gdpr/')) {
    if (path.includes('/consent')) return 'consent_management';
    if (path.includes('/export')) return 'data_export';
    if (path.includes('/data') && method === 'DELETE') return 'data_deletion';
    if (path.includes('/data') && method === 'PUT') return 'data_update';
    if (path.includes('/restrict')) return 'data_restriction';
    return 'gdpr_request';
  }
  
  if (path.includes('/profile')) return 'profile_access';
  if (path.includes('/posts')) return 'content_access';
  if (path.includes('/messages')) return 'communication_access';
  
  return null;
}

export default {
  gdprComplianceMiddleware,
  requireConsent,
  dataMinimization,
  dataRetentionCheck,
  privacyByDesign,
  respectDataSubjectRights,
  breachDetection,
  cookieConsent
};


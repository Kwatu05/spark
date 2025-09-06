import express from 'express';
import { gdprComplianceService } from '../services/gdprCompliance';
import { requireAuth, requireRole } from '../middleware/auth';
import { logInfo, logError } from '../utils/logger';

const router = express.Router();

/**
 * Get user's consent status
 * GET /gdpr/consent
 */
router.get('/consent', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: 'User not authenticated' });
    }

    const consentStatus = await gdprComplianceService.getConsentStatus(userId);
    
    res.json({
      ok: true,
      data: consentStatus
    });
  } catch (error) {
    logError('Failed to get consent status', error as Error);
    res.status(500).json({ ok: false, error: 'Failed to get consent status' });
  }
});

/**
 * Record user consent
 * POST /gdpr/consent
 */
router.post('/consent', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: 'User not authenticated' });
    }

    const { consentType, granted, consentMethod = 'EXPLICIT' } = req.body;
    
    if (!consentType || typeof granted !== 'boolean') {
      return res.status(400).json({ 
        ok: false, 
        error: 'consentType and granted are required' 
      });
    }

    const metadata = {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      version: '1.0'
    };

    const success = await gdprComplianceService.recordConsent(
      userId,
      consentType,
      granted,
      consentMethod as any,
      metadata
    );

    if (success) {
      res.json({ ok: true, message: 'Consent recorded successfully' });
    } else {
      res.status(500).json({ ok: false, error: 'Failed to record consent' });
    }
  } catch (error) {
    logError('Failed to record consent', error as Error);
    res.status(500).json({ ok: false, error: 'Failed to record consent' });
  }
});

/**
 * Withdraw user consent
 * DELETE /gdpr/consent/:consentType
 */
router.delete('/consent/:consentType', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: 'User not authenticated' });
    }

    const { consentType } = req.params;
    const success = await gdprComplianceService.withdrawConsent(userId, consentType);

    if (success) {
      res.json({ ok: true, message: 'Consent withdrawn successfully' });
    } else {
      res.status(500).json({ ok: false, error: 'Failed to withdraw consent' });
    }
  } catch (error) {
    logError('Failed to withdraw consent', error as Error);
    res.status(500).json({ ok: false, error: 'Failed to withdraw consent' });
  }
});

/**
 * Export user data (Right to Data Portability)
 * GET /gdpr/export
 */
router.get('/export', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: 'User not authenticated' });
    }

    const { format = 'json' } = req.query;
    
    if (!['json', 'csv', 'xml'].includes(format as string)) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Format must be json, csv, or xml' 
      });
    }

    const dataExport = await gdprComplianceService.exportUserData(
      userId, 
      format as 'json' | 'csv' | 'xml'
    );

    // Set appropriate headers for download
    const filename = `spark-data-export-${userId}-${Date.now()}.${format}`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.json(dataExport);
    } else if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      // Convert to CSV format (simplified)
      res.send(convertToCSV(dataExport));
    } else if (format === 'xml') {
      res.setHeader('Content-Type', 'application/xml');
      res.send(convertToXML(dataExport));
    }
  } catch (error) {
    logError('Failed to export user data', error as Error);
    res.status(500).json({ ok: false, error: 'Failed to export user data' });
  }
});

/**
 * Delete user data (Right to be Forgotten)
 * DELETE /gdpr/data
 */
router.delete('/data', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: 'User not authenticated' });
    }

    const { reason = 'User requested data deletion' } = req.body;
    
    // Require explicit confirmation
    const { confirmed } = req.body;
    if (!confirmed) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Data deletion requires explicit confirmation',
        message: 'This action is irreversible. Please confirm by setting confirmed: true'
      });
    }

    const success = await gdprComplianceService.deleteUserData(userId, reason);

    if (success) {
      res.json({ ok: true, message: 'User data deleted successfully' });
    } else {
      res.status(500).json({ ok: false, error: 'Failed to delete user data' });
    }
  } catch (error) {
    logError('Failed to delete user data', error as Error);
    res.status(500).json({ ok: false, error: 'Failed to delete user data' });
  }
});

/**
 * Update user data (Right to Rectification)
 * PUT /gdpr/data
 */
router.put('/data', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: 'User not authenticated' });
    }

    const updates = req.body;
    const success = await gdprComplianceService.updateUserData(userId, updates);

    if (success) {
      res.json({ ok: true, message: 'User data updated successfully' });
    } else {
      res.status(500).json({ ok: false, error: 'Failed to update user data' });
    }
  } catch (error) {
    logError('Failed to update user data', error as Error);
    res.status(500).json({ ok: false, error: 'Failed to update user data' });
  }
});

/**
 * Restrict data processing (Right to Restriction)
 * POST /gdpr/restrict
 */
router.post('/restrict', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: 'User not authenticated' });
    }

    const { restrictions } = req.body;
    
    if (!Array.isArray(restrictions) || restrictions.length === 0) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Restrictions array is required' 
      });
    }

    const success = await gdprComplianceService.restrictDataProcessing(userId, restrictions);

    if (success) {
      res.json({ ok: true, message: 'Data processing restrictions applied successfully' });
    } else {
      res.status(500).json({ ok: false, error: 'Failed to apply data processing restrictions' });
    }
  } catch (error) {
    logError('Failed to restrict data processing', error as Error);
    res.status(500).json({ ok: false, error: 'Failed to restrict data processing' });
  }
});

/**
 * Get privacy policy
 * GET /gdpr/privacy-policy
 */
router.get('/privacy-policy', async (req, res) => {
  try {
    const privacyPolicy = await gdprComplianceService.generatePrivacyPolicy();
    
    res.json({
      ok: true,
      data: {
        content: privacyPolicy,
        version: '1.0',
        effectiveDate: new Date().toISOString()
      }
    });
  } catch (error) {
    logError('Failed to get privacy policy', error as Error);
    res.status(500).json({ ok: false, error: 'Failed to get privacy policy' });
  }
});

/**
 * Record data breach (Admin only)
 * POST /gdpr/breach
 */
router.post('/breach', requireAuth, requireRole(['ADMIN']), async (req, res) => {
  try {
    const {
      description,
      dataCategories,
      affectedUsers,
      severity,
      notificationRequired = false,
      actions = []
    } = req.body;

    if (!description || !dataCategories || !affectedUsers || !severity) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Description, dataCategories, affectedUsers, and severity are required' 
      });
    }

    const breachData = {
      description,
      dataCategories,
      affectedUsers,
      severity: severity.toUpperCase(),
      discoveredAt: new Date(),
      status: 'DISCOVERED' as any,
      notificationRequired,
      actions
    };

    const breachId = await gdprComplianceService.recordDataBreach(breachData);

    res.json({
      ok: true,
      data: { breachId },
      message: 'Data breach recorded successfully'
    });
  } catch (error) {
    logError('Failed to record data breach', error as Error);
    res.status(500).json({ ok: false, error: 'Failed to record data breach' });
  }
});

/**
 * Audit data processing activities (Admin only)
 * GET /gdpr/audit
 */
router.get('/audit', requireAuth, requireRole(['ADMIN']), async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const activities = await gdprComplianceService.auditDataProcessing(
      userId as string,
      start,
      end
    );

    res.json({
      ok: true,
      data: activities
    });
  } catch (error) {
    logError('Failed to audit data processing', error as Error);
    res.status(500).json({ ok: false, error: 'Failed to audit data processing' });
  }
});

// Helper functions for data export formatting

function convertToCSV(data: any): string {
  // Simplified CSV conversion
  const csvRows: string[] = [];
  
  // Add headers
  csvRows.push('Field,Value');
  
  // Add data rows
  Object.entries(data).forEach(([key, value]) => {
    if (typeof value === 'object' && value !== null) {
      csvRows.push(`${key},"${JSON.stringify(value).replace(/"/g, '""')}"`);
    } else {
      csvRows.push(`${key},"${String(value).replace(/"/g, '""')}"`);
    }
  });
  
  return csvRows.join('\n');
}

function convertToXML(data: any): string {
  // Simplified XML conversion
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<dataExport>\n';
  
  Object.entries(data).forEach(([key, value]) => {
    if (typeof value === 'object' && value !== null) {
      xml += `  <${key}>${JSON.stringify(value)}</${key}>\n`;
    } else {
      xml += `  <${key}>${String(value)}</${key}>\n`;
    }
  });
  
  xml += '</dataExport>';
  return xml;
}

export default router;

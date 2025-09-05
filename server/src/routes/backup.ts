import { Router } from 'express';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { backupManager } from '../utils/backup';
import { logUserActionEvent } from '../middleware/observability';
import { logInfo, logError } from '../utils/logger';

const router = Router();

// Create a new backup (Admin only)
router.post('/create', requireAuth, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const { name } = req.body;
    
    logUserActionEvent('backup_create', req, { backupName: name });
    
    const backupPath = await backupManager.createBackup(name);
    
    res.json({
      ok: true,
      message: 'Backup created successfully',
      backupPath,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logError('Failed to create backup', error as Error, {
      userId: req.user?.userId,
      backupName: req.body.name
    });
    
    res.status(500).json({
      ok: false,
      error: 'Failed to create backup'
    });
  }
});

// List all backups (Admin only)
router.get('/list', requireAuth, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const backups = await backupManager.listBackups();
    
    const formattedBackups = backups.map(backup => ({
      name: backup.name,
      size: backup.size,
      sizeFormatted: formatBytes(backup.size),
      created: backup.created.toISOString(),
      createdFormatted: backup.created.toLocaleString()
    }));
    
    res.json({
      ok: true,
      backups: formattedBackups,
      count: backups.length
    });
  } catch (error) {
    logError('Failed to list backups', error as Error, {
      userId: req.user?.userId
    });
    
    res.status(500).json({
      ok: false,
      error: 'Failed to list backups'
    });
  }
});

// Get backup statistics (Admin only)
router.get('/stats', requireAuth, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const stats = await backupManager.getBackupStats();
    
    res.json({
      ok: true,
      stats: {
        ...stats,
        totalSizeFormatted: formatBytes(stats.totalSize),
        oldestBackupFormatted: stats.oldestBackup?.toLocaleString() || null,
        newestBackupFormatted: stats.newestBackup?.toLocaleString() || null
      }
    });
  } catch (error) {
    logError('Failed to get backup stats', error as Error, {
      userId: req.user?.userId
    });
    
    res.status(500).json({
      ok: false,
      error: 'Failed to get backup statistics'
    });
  }
});

// Verify backup integrity (Admin only)
router.post('/verify/:backupName', requireAuth, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const { backupName } = req.params;
    const backups = await backupManager.listBackups();
    const backup = backups.find(b => b.name === backupName);
    
    if (!backup) {
      return res.status(404).json({
        ok: false,
        error: 'Backup not found'
      });
    }
    
    const isValid = await backupManager.verifyBackup(backup.path);
    
    logUserActionEvent('backup_verify', req, { 
      backupName,
      isValid 
    });
    
    res.json({
      ok: true,
      backupName,
      isValid,
      message: isValid ? 'Backup is valid' : 'Backup verification failed'
    });
  } catch (error) {
    logError('Failed to verify backup', error as Error, {
      userId: req.user?.userId,
      backupName: req.params.backupName
    });
    
    res.status(500).json({
      ok: false,
      error: 'Failed to verify backup'
    });
  }
});

// Restore from backup (Admin only) - DANGEROUS OPERATION
router.post('/restore/:backupName', requireAuth, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const { backupName } = req.params;
    const { confirm } = req.body;
    
    // Require explicit confirmation for restore operation
    if (confirm !== 'RESTORE_DATABASE') {
      return res.status(400).json({
        ok: false,
        error: 'Restore operation requires confirmation. Send confirm: "RESTORE_DATABASE" in request body.'
      });
    }
    
    const backups = await backupManager.listBackups();
    const backup = backups.find(b => b.name === backupName);
    
    if (!backup) {
      return res.status(404).json({
        ok: false,
        error: 'Backup not found'
      });
    }
    
    logUserActionEvent('backup_restore', req, { 
      backupName,
      warning: 'DANGEROUS_OPERATION' 
    });
    
    await backupManager.restoreBackup(backup.path);
    
    res.json({
      ok: true,
      message: 'Database restored successfully',
      backupName,
      timestamp: new Date().toISOString(),
      warning: 'Server restart may be required'
    });
  } catch (error) {
    logError('Failed to restore backup', error as Error, {
      userId: req.user?.userId,
      backupName: req.params.backupName
    });
    
    res.status(500).json({
      ok: false,
      error: 'Failed to restore backup'
    });
  }
});

// Delete backup (Admin only)
router.delete('/:backupName', requireAuth, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const { backupName } = req.params;
    const backups = await backupManager.listBackups();
    const backup = backups.find(b => b.name === backupName);
    
    if (!backup) {
      return res.status(404).json({
        ok: false,
        error: 'Backup not found'
      });
    }
    
    // Delete the backup file
    const fs = require('fs').promises;
    await fs.unlink(backup.path);
    
    logUserActionEvent('backup_delete', req, { backupName });
    
    res.json({
      ok: true,
      message: 'Backup deleted successfully',
      backupName
    });
  } catch (error) {
    logError('Failed to delete backup', error as Error, {
      userId: req.user?.userId,
      backupName: req.params.backupName
    });
    
    res.status(500).json({
      ok: false,
      error: 'Failed to delete backup'
    });
  }
});

// Helper function to format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default router;

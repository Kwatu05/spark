import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logInfo, logError, logWarning } from './logger';

const execAsync = promisify(exec);

interface BackupConfig {
  databasePath: string;
  backupDir: string;
  maxBackups: number;
  compressionEnabled: boolean;
  scheduleEnabled: boolean;
  scheduleInterval: string; // cron format
}

const defaultConfig: BackupConfig = {
  databasePath: './prisma/dev.db',
  backupDir: './backups',
  maxBackups: 30, // Keep 30 days of backups
  compressionEnabled: true,
  scheduleEnabled: true,
  scheduleInterval: '0 2 * * *' // Daily at 2 AM
};

export class DatabaseBackup {
  private config: BackupConfig;

  constructor(config: Partial<BackupConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.ensureBackupDirectory();
  }

  private ensureBackupDirectory(): void {
    if (!fs.existsSync(this.config.backupDir)) {
      fs.mkdirSync(this.config.backupDir, { recursive: true });
      logInfo('Created backup directory', { path: this.config.backupDir });
    }
  }

  /**
   * Create a backup of the database
   */
  async createBackup(backupName?: string): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const name = backupName || `backup-${timestamp}`;
      const backupPath = path.join(this.config.backupDir, `${name}.db`);
      const compressedPath = `${backupPath}.gz`;

      logInfo('Starting database backup', { 
        source: this.config.databasePath,
        destination: backupPath 
      });

      // Check if source database exists
      if (!fs.existsSync(this.config.databasePath)) {
        throw new Error(`Database file not found: ${this.config.databasePath}`);
      }

      // Copy database file
      await fs.promises.copyFile(this.config.databasePath, backupPath);
      
      let finalPath = backupPath;
      
      // Compress if enabled
      if (this.config.compressionEnabled) {
        await execAsync(`gzip "${backupPath}"`);
        finalPath = compressedPath;
        logInfo('Database backup compressed', { path: finalPath });
      }

      // Get file size
      const stats = await fs.promises.stat(finalPath);
      const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

      logInfo('Database backup completed successfully', {
        path: finalPath,
        size: `${fileSizeMB} MB`,
        timestamp: new Date().toISOString()
      });

      // Clean up old backups
      await this.cleanupOldBackups();

      return finalPath;
    } catch (error) {
      logError('Database backup failed', error as Error, {
        source: this.config.databasePath,
        destination: this.config.backupDir
      });
      throw error;
    }
  }

  /**
   * Restore database from backup
   */
  async restoreBackup(backupPath: string): Promise<void> {
    try {
      logInfo('Starting database restore', { 
        source: backupPath,
        destination: this.config.databasePath 
      });

      // Check if backup file exists
      if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup file not found: ${backupPath}`);
      }

      // Create backup of current database before restore
      const currentBackup = await this.createBackup(`pre-restore-${Date.now()}`);
      logInfo('Created pre-restore backup', { path: currentBackup });

      // Handle compressed backups
      let sourcePath = backupPath;
      if (backupPath.endsWith('.gz')) {
        const uncompressedPath = backupPath.replace('.gz', '');
        await execAsync(`gunzip -c "${backupPath}" > "${uncompressedPath}"`);
        sourcePath = uncompressedPath;
      }

      // Copy backup to database location
      await fs.promises.copyFile(sourcePath, this.config.databasePath);

      // Clean up temporary uncompressed file
      if (sourcePath !== backupPath) {
        await fs.promises.unlink(sourcePath);
      }

      logInfo('Database restore completed successfully', {
        source: backupPath,
        destination: this.config.databasePath,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logError('Database restore failed', error as Error, {
        source: backupPath,
        destination: this.config.databasePath
      });
      throw error;
    }
  }

  /**
   * List all available backups
   */
  async listBackups(): Promise<Array<{name: string, path: string, size: number, created: Date}>> {
    try {
      const files = await fs.promises.readdir(this.config.backupDir);
      const backups = [];

      for (const file of files) {
        if (file.endsWith('.db') || file.endsWith('.db.gz')) {
          const filePath = path.join(this.config.backupDir, file);
          const stats = await fs.promises.stat(filePath);
          
          backups.push({
            name: file,
            path: filePath,
            size: stats.size,
            created: stats.birthtime
          });
        }
      }

      // Sort by creation date (newest first)
      backups.sort((a, b) => b.created.getTime() - a.created.getTime());

      return backups;
    } catch (error) {
      logError('Failed to list backups', error as Error);
      throw error;
    }
  }

  /**
   * Clean up old backups based on maxBackups configuration
   */
  private async cleanupOldBackups(): Promise<void> {
    try {
      const backups = await this.listBackups();
      
      if (backups.length > this.config.maxBackups) {
        const toDelete = backups.slice(this.config.maxBackups);
        
        for (const backup of toDelete) {
          await fs.promises.unlink(backup.path);
          logInfo('Deleted old backup', { 
            name: backup.name,
            age: Math.round((Date.now() - backup.created.getTime()) / (1000 * 60 * 60 * 24)) + ' days'
          });
        }
      }
    } catch (error) {
      logWarning('Failed to cleanup old backups', { error: (error as Error).message });
    }
  }

  /**
   * Get backup statistics
   */
  async getBackupStats(): Promise<{
    totalBackups: number;
    totalSize: number;
    oldestBackup: Date | null;
    newestBackup: Date | null;
  }> {
    try {
      const backups = await this.listBackups();
      
      if (backups.length === 0) {
        return {
          totalBackups: 0,
          totalSize: 0,
          oldestBackup: null,
          newestBackup: null
        };
      }

      const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0);
      const oldestBackup = backups[backups.length - 1]?.created || null;
      const newestBackup = backups[0]?.created || null;

      return {
        totalBackups: backups.length,
        totalSize,
        oldestBackup,
        newestBackup
      };
    } catch (error) {
      logError('Failed to get backup stats', error as Error);
      throw error;
    }
  }

  /**
   * Verify backup integrity
   */
  async verifyBackup(backupPath: string): Promise<boolean> {
    try {
      // For SQLite, we can try to open the database and run a simple query
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      let dbPath = backupPath;
      
      // Handle compressed backups
      if (backupPath.endsWith('.gz')) {
        const tempPath = backupPath.replace('.gz', '.temp');
        await execAsync(`gunzip -c "${backupPath}" > "${tempPath}"`);
        dbPath = tempPath;
      }

      // Try to open the database and run a simple query
      await execAsync(`sqlite3 "${dbPath}" "SELECT COUNT(*) FROM sqlite_master;"`);
      
      // Clean up temporary file
      if (dbPath !== backupPath) {
        await fs.promises.unlink(dbPath);
      }

      logInfo('Backup verification successful', { path: backupPath });
      return true;
    } catch (error) {
      logError('Backup verification failed', error as Error, { path: backupPath });
      return false;
    }
  }
}

// Export singleton instance
export const backupManager = new DatabaseBackup();

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto-js';
import { logInfo, logError, logWarning } from '../utils/logger';

const prisma = new PrismaClient();

export interface DataSubject {
  id: string;
  email: string;
  name: string;
  dataCategories: string[];
  processingPurposes: string[];
  retentionPeriod: number; // in days
  consentGiven: boolean;
  consentDate?: Date;
  lastUpdated: Date;
}

export interface DataProcessingRecord {
  id: string;
  userId: string;
  dataCategory: string;
  processingPurpose: string;
  legalBasis: 'consent' | 'contract' | 'legal_obligation' | 'vital_interests' | 'public_task' | 'legitimate_interests';
  dataController: string;
  dataProcessor?: string;
  thirdParties?: string[];
  retentionPeriod: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConsentRecord {
  id: string;
  userId: string;
  consentType: 'marketing' | 'analytics' | 'personalization' | 'data_sharing' | 'cookies';
  granted: boolean;
  consentDate: Date;
  withdrawalDate?: Date;
  consentMethod: 'explicit' | 'opt_in' | 'opt_out';
  ipAddress?: string;
  userAgent?: string;
  version: string;
}

export interface DataBreachRecord {
  id: string;
  description: string;
  dataCategories: string[];
  affectedUsers: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  discoveredAt: Date;
  reportedAt?: Date;
  resolvedAt?: Date;
  status: 'discovered' | 'investigating' | 'reported' | 'resolved';
  notificationRequired: boolean;
  notificationDeadline?: Date;
  actions: string[];
}

export interface DataExport {
  userId: string;
  personalData: any;
  posts: any[];
  comments: any[];
  connections: any[];
  messages: any[];
  analytics: any[];
  preferences: any;
  consentHistory: any[];
  exportDate: Date;
  format: 'json' | 'csv' | 'xml';
}

export class GDPRComplianceService {
  private static instance: GDPRComplianceService;
  private encryptionKey: string;

  private constructor() {
    this.encryptionKey = process.env.GDPR_ENCRYPTION_KEY || 'default-encryption-key';
  }

  static getInstance(): GDPRComplianceService {
    if (!GDPRComplianceService.instance) {
      GDPRComplianceService.instance = new GDPRComplianceService();
    }
    return GDPRComplianceService.instance;
  }

  /**
   * Record user consent
   */
  async recordConsent(
    userId: string,
    consentType: string,
    granted: boolean,
    consentMethod: 'EXPLICIT' | 'OPT_IN' | 'OPT_OUT' = 'EXPLICIT',
    metadata?: {
      ipAddress?: string;
      userAgent?: string;
      version?: string;
    }
  ): Promise<boolean> {
    try {
      await prisma.consentRecord.create({
        data: {
          userId,
          consentType: consentType as any,
          granted,
          consentDate: new Date(),
          consentMethod,
          ipAddress: metadata?.ipAddress,
          userAgent: metadata?.userAgent,
          version: metadata?.version || '1.0'
        }
      });

      logInfo('Consent recorded', { userId, consentType, granted });
      return true;
    } catch (error) {
      logError('Failed to record consent', error as Error, { userId, consentType });
      return false;
    }
  }

  /**
   * Withdraw user consent
   */
  async withdrawConsent(userId: string, consentType: string): Promise<boolean> {
    try {
      await prisma.consentRecord.updateMany({
        where: {
          userId,
          consentType: consentType as any,
          granted: true
        },
        data: {
          granted: false,
          withdrawalDate: new Date()
        }
      });

      // Process data based on consent withdrawal
      await this.processConsentWithdrawal(userId, consentType);

      logInfo('Consent withdrawn', { userId, consentType });
      return true;
    } catch (error) {
      logError('Failed to withdraw consent', error as Error, { userId, consentType });
      return false;
    }
  }

  /**
   * Get user's consent status
   */
  async getConsentStatus(userId: string): Promise<ConsentRecord[]> {
    try {
      const consents = await prisma.consentRecord.findMany({
        where: { userId },
        orderBy: { consentDate: 'desc' }
      });

      return consents as any;
    } catch (error) {
      logError('Failed to get consent status', error as Error, { userId });
      return [];
    }
  }

  /**
   * Export user data (Right to Data Portability)
   */
  async exportUserData(userId: string, format: 'json' | 'csv' | 'xml' = 'json'): Promise<DataExport> {
    try {
      logInfo('Starting data export', { userId, format });

      // Get user's personal data
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          posts: true,
          comments: true,
          connections: true,
          verificationRequests: true,
          notifications: true,
          pushSubscriptions: true,
          notificationSettings: true
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Get user's messages (if applicable) - Note: Message model doesn't exist yet
      const messages: any[] = [];

      // Get user's analytics data
      const analytics = await this.getUserAnalyticsData(userId);

      // Get consent history
      const consentHistory = await this.getConsentStatus(userId);

      const dataExport: DataExport = {
        userId,
        personalData: this.sanitizePersonalData(user),
        posts: user.posts,
        comments: user.comments,
        connections: user.connections,
        messages,
        analytics,
        preferences: {
          notificationSettings: user.notificationSettings,
          pushSubscriptions: user.pushSubscriptions
        },
        consentHistory,
        exportDate: new Date(),
        format
      };

      // Log the export for audit purposes
      await this.logDataProcessingActivity(userId, 'data_export', 'User requested data export');

      logInfo('Data export completed', { userId, format });
      return dataExport;
    } catch (error) {
      logError('Failed to export user data', error as Error, { userId });
      throw error;
    }
  }

  /**
   * Delete user data (Right to be Forgotten)
   */
  async deleteUserData(userId: string, reason: string): Promise<boolean> {
    try {
      logInfo('Starting data deletion', { userId, reason });

      // Check if user has any legal obligations that prevent deletion
      const hasLegalObligations = await this.checkLegalObligations(userId);
      if (hasLegalObligations) {
        logWarning('Cannot delete user data due to legal obligations', { userId });
        return false;
      }

      // Anonymize instead of delete if required
      const shouldAnonymize = await this.shouldAnonymizeData(userId);
      
      if (shouldAnonymize) {
        await this.anonymizeUserData(userId);
      } else {
        await this.permanentlyDeleteUserData(userId);
      }

      // Log the deletion for audit purposes
      await this.logDataProcessingActivity(userId, 'data_deletion', reason);

      logInfo('Data deletion completed', { userId, reason, anonymized: shouldAnonymize });
      return true;
    } catch (error) {
      logError('Failed to delete user data', error as Error, { userId });
      return false;
    }
  }

  /**
   * Update user data (Right to Rectification)
   */
  async updateUserData(userId: string, updates: any): Promise<boolean> {
    try {
      // Validate updates
      const validatedUpdates = await this.validateDataUpdates(userId, updates);
      
      // Update user data
      await prisma.user.update({
        where: { id: userId },
        data: validatedUpdates
      });

      // Log the update for audit purposes
      await this.logDataProcessingActivity(userId, 'data_update', 'User requested data update');

      logInfo('User data updated', { userId, updates: Object.keys(validatedUpdates) });
      return true;
    } catch (error) {
      logError('Failed to update user data', error as Error, { userId });
      return false;
    }
  }

  /**
   * Restrict data processing (Right to Restriction)
   */
  async restrictDataProcessing(userId: string, restrictions: string[]): Promise<boolean> {
    try {
      // Create restriction record
      await prisma.dataProcessingRestriction.create({
        data: {
          userId,
          restrictions: JSON.stringify(restrictions),
          active: true,
          createdAt: new Date()
        }
      });

      // Apply restrictions
      await this.applyDataProcessingRestrictions(userId, restrictions);

      // Log the restriction for audit purposes
      await this.logDataProcessingActivity(userId, 'data_restriction', `Restrictions applied: ${restrictions.join(', ')}`);

      logInfo('Data processing restricted', { userId, restrictions });
      return true;
    } catch (error) {
      logError('Failed to restrict data processing', error as Error, { userId });
      return false;
    }
  }

  /**
   * Record data breach
   */
  async recordDataBreach(breachData: Omit<DataBreachRecord, 'id'>): Promise<string> {
    try {
      const breach = await prisma.dataBreachRecord.create({
        data: {
          description: breachData.description,
          dataCategories: JSON.stringify(breachData.dataCategories),
          affectedUsers: breachData.affectedUsers,
          severity: breachData.severity as any,
          discoveredAt: breachData.discoveredAt,
          reportedAt: breachData.reportedAt,
          resolvedAt: breachData.resolvedAt,
          status: breachData.status as any,
          notificationRequired: breachData.notificationRequired,
          notificationDeadline: breachData.notificationDeadline,
          actions: JSON.stringify(breachData.actions)
        }
      });

      // Send notifications if required
      if (breachData.notificationRequired) {
        await this.sendBreachNotifications(breach.id, { ...breachData, id: breach.id });
      }

      logInfo('Data breach recorded', { breachId: breach.id, severity: breachData.severity });
      return breach.id;
    } catch (error) {
      logError('Failed to record data breach', error as Error);
      throw error;
    }
  }

  /**
   * Generate privacy policy
   */
  async generatePrivacyPolicy(): Promise<string> {
    try {
      const dataCategories = await this.getDataCategories();
      const processingPurposes = await this.getProcessingPurposes();
      const thirdParties = await this.getThirdParties();

      const privacyPolicy = `
# Privacy Policy

## Data Controller
Spark Social Media Platform
Email: privacy@spark.com

## Data Categories We Process
${dataCategories.map(cat => `- ${cat}`).join('\n')}

## Processing Purposes
${processingPurposes.map(purpose => `- ${purpose}`).join('\n')}

## Legal Basis
- Consent (Article 6(1)(a) GDPR)
- Contract performance (Article 6(1)(b) GDPR)
- Legitimate interests (Article 6(1)(f) GDPR)

## Data Retention
Personal data is retained for the following periods:
- Account data: Until account deletion
- Posts and comments: Until account deletion
- Analytics data: 2 years
- Log data: 1 year

## Your Rights
- Right to access (Article 15 GDPR)
- Right to rectification (Article 16 GDPR)
- Right to erasure (Article 17 GDPR)
- Right to restrict processing (Article 18 GDPR)
- Right to data portability (Article 20 GDPR)
- Right to object (Article 21 GDPR)

## Third Parties
${thirdParties.map(party => `- ${party}`).join('\n')}

## Data Transfers
Data may be transferred to countries outside the EEA with appropriate safeguards.

## Contact
For privacy-related inquiries: privacy@spark.com
      `.trim();

      return privacyPolicy;
    } catch (error) {
      logError('Failed to generate privacy policy', error as Error);
      throw error;
    }
  }

  /**
   * Audit data processing activities
   */
  async auditDataProcessing(userId?: string, startDate?: Date, endDate?: Date): Promise<any[]> {
    try {
      const where: any = {};
      
      if (userId) where.userId = userId;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      const activities = await prisma.dataProcessingActivity.findMany({
        where,
        orderBy: { timestamp: 'desc' }
      });

      return activities;
    } catch (error) {
      logError('Failed to audit data processing', error as Error);
      return [];
    }
  }

  // Private helper methods

  private async processConsentWithdrawal(userId: string, consentType: string): Promise<void> {
    switch (consentType) {
      case 'marketing':
        // Stop sending marketing emails
        await prisma.user.update({
          where: { id: userId },
          data: { marketingEmails: false }
        });
        break;
      case 'analytics':
        // Stop analytics tracking
        await prisma.user.update({
          where: { id: userId },
          data: { analyticsTracking: false }
        });
        break;
      case 'data_sharing':
        // Stop sharing data with third parties
        await prisma.user.update({
          where: { id: userId },
          data: { dataSharing: false }
        });
        break;
    }
  }

  private sanitizePersonalData(user: any): any {
    // Remove sensitive fields and encrypt if necessary
    const sanitized = { ...user };
    delete sanitized.password;
    delete sanitized.refreshTokens;
    
    // Encrypt sensitive data
    if (sanitized.email) {
      sanitized.email = crypto.AES.encrypt(sanitized.email, this.encryptionKey).toString();
    }
    
    return sanitized;
  }

  private async getUserAnalyticsData(userId: string): Promise<any[]> {
    // Implementation would get user's analytics data
    return [];
  }

  private async checkLegalObligations(userId: string): Promise<boolean> {
    // Check if user has any legal obligations (e.g., pending transactions, legal disputes)
    return false;
  }

  private async shouldAnonymizeData(userId: string): Promise<boolean> {
    // Determine if data should be anonymized instead of deleted
    return false;
  }

  private async anonymizeUserData(userId: string): Promise<void> {
    // Anonymize user data instead of deleting
    await prisma.user.update({
      where: { id: userId },
      data: {
        email: `anonymized_${userId}@deleted.com`,
        name: 'Deleted User',
        username: `deleted_${userId}`,
        bio: null,
        location: null,
        profession: null,
        // isActive: false // Field doesn't exist in User model
      }
    });
  }

  private async permanentlyDeleteUserData(userId: string): Promise<void> {
    // Permanently delete all user data
    await prisma.user.delete({
      where: { id: userId }
    });
  }

  private async validateDataUpdates(userId: string, updates: any): Promise<any> {
    // Validate and sanitize data updates
    const allowedFields = ['name', 'bio', 'location', 'profession'];
    const validatedUpdates: any = {};
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        validatedUpdates[field] = updates[field];
      }
    }
    
    return validatedUpdates;
  }

  private async applyDataProcessingRestrictions(userId: string, restrictions: string[]): Promise<void> {
    // Apply data processing restrictions
    for (const restriction of restrictions) {
      switch (restriction) {
        case 'no_analytics':
          await prisma.user.update({
            where: { id: userId },
            data: { analyticsTracking: false }
          });
          break;
        case 'no_marketing':
          await prisma.user.update({
            where: { id: userId },
            data: { marketingEmails: false }
          });
          break;
      }
    }
  }

  private async sendBreachNotifications(breachId: string, breachData: DataBreachRecord): Promise<void> {
    // Send breach notifications to affected users and authorities
    logInfo('Sending breach notifications', { breachId, affectedUsers: breachData.affectedUsers });
  }

  private async getDataCategories(): Promise<string[]> {
    return [
      'Personal identification data',
      'Contact information',
      'Profile information',
      'Posts and content',
      'Messages and communications',
      'Usage analytics',
      'Device information',
      'Location data'
    ];
  }

  private async getProcessingPurposes(): Promise<string[]> {
    return [
      'Account management',
      'Service provision',
      'Communication',
      'Analytics and improvement',
      'Marketing (with consent)',
      'Legal compliance',
      'Security and fraud prevention'
    ];
  }

  private async getThirdParties(): Promise<string[]> {
    return [
      'Cloud storage providers',
      'Analytics services',
      'Email service providers',
      'Payment processors',
      'Customer support tools'
    ];
  }

  private async logDataProcessingActivity(userId: string, activity: string, description: string): Promise<void> {
    try {
      await prisma.dataProcessingActivity.create({
        data: {
          userId,
          activity,
          description,
          timestamp: new Date(),
          ipAddress: null, // Would be populated from request context
          userAgent: null  // Would be populated from request context
        }
      });
    } catch (error) {
      logError('Failed to log data processing activity', error as Error);
    }
  }
}

// Export singleton instance
export const gdprComplianceService = GDPRComplianceService.getInstance();

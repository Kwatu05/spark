import webpush from 'web-push';
import { PrismaClient } from '@prisma/client';
import { logInfo, logError, logWarning } from '../utils/logger';
import { config } from '../config/environment';

const prisma = new PrismaClient();

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  timestamp?: number;
}

export interface NotificationSettings {
  userId: string;
  pushEnabled: boolean;
  emailEnabled: boolean;
  likeNotifications: boolean;
  commentNotifications: boolean;
  followNotifications: boolean;
  mentionNotifications: boolean;
  systemNotifications: boolean;
  marketingNotifications: boolean;
}

export class PushNotificationService {
  private static instance: PushNotificationService;
  private isInitialized = false;

  private constructor() {
    this.initializeWebPush();
  }

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  /**
   * Initialize web-push with VAPID keys
   */
  private initializeWebPush(): void {
    try {
      const vapidKeys = {
        publicKey: config.pushNotifications.vapidPublicKey,
        privateKey: config.pushNotifications.vapidPrivateKey,
        subject: config.pushNotifications.vapidSubject
      };

      webpush.setVapidDetails(
        vapidKeys.subject,
        vapidKeys.publicKey,
        vapidKeys.privateKey
      );

      this.isInitialized = true;
      logInfo('Push notification service initialized');
    } catch (error) {
      logError('Failed to initialize push notification service', error as Error);
      this.isInitialized = false;
    }
  }

  /**
   * Subscribe a user to push notifications
   */
  async subscribeUser(userId: string, subscription: PushSubscription): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        logWarning('Push notification service not initialized');
        return false;
      }

      // Store subscription in database
      await prisma.pushSubscription.upsert({
        where: {
          userId_endpoint: {
            userId,
            endpoint: subscription.endpoint
          }
        },
        update: {
          p256dhKey: subscription.keys.p256dh,
          authKey: subscription.keys.auth,
          updatedAt: new Date()
        },
        create: {
          userId,
          endpoint: subscription.endpoint,
          p256dhKey: subscription.keys.p256dh,
          authKey: subscription.keys.auth
        }
      });

      logInfo('User subscribed to push notifications', { userId, endpoint: subscription.endpoint });
      return true;
    } catch (error) {
      logError('Failed to subscribe user to push notifications', error as Error, { userId });
      return false;
    }
  }

  /**
   * Unsubscribe a user from push notifications
   */
  async unsubscribeUser(userId: string, endpoint?: string): Promise<boolean> {
    try {
      const where = endpoint 
        ? { userId_endpoint: { userId, endpoint } }
        : { userId };

      await prisma.pushSubscription.deleteMany({
        where
      });

      logInfo('User unsubscribed from push notifications', { userId, endpoint });
      return true;
    } catch (error) {
      logError('Failed to unsubscribe user from push notifications', error as Error, { userId });
      return false;
    }
  }

  /**
   * Send push notification to a specific user
   */
  async sendToUser(userId: string, payload: PushNotificationPayload): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        logWarning('Push notification service not initialized');
        return false;
      }

      // Check user's notification settings
      const settings = await this.getUserNotificationSettings(userId);
      if (!settings.pushEnabled) {
        logInfo('Push notifications disabled for user', { userId });
        return false;
      }

      // Get user's push subscriptions
      const subscriptions = await prisma.pushSubscription.findMany({
        where: { userId }
      });

      if (subscriptions.length === 0) {
        logInfo('No push subscriptions found for user', { userId });
        return false;
      }

      // Send to all subscriptions
      const results = await Promise.allSettled(
        subscriptions.map(subscription => this.sendToSubscription(subscription, payload))
      );

      const successful = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.filter(result => result.status === 'rejected').length;

      // Remove failed subscriptions
      if (failed > 0) {
        const failedSubscriptions = subscriptions.filter((_, index) => 
          results[index].status === 'rejected'
        );
        
        for (const subscription of failedSubscriptions) {
          await this.removeFailedSubscription(subscription.id);
        }
      }

      logInfo('Push notification sent to user', { 
        userId, 
        successful, 
        failed, 
        total: subscriptions.length 
      });

      return successful > 0;
    } catch (error) {
      logError('Failed to send push notification to user', error as Error, { userId });
      return false;
    }
  }

  /**
   * Send push notification to multiple users
   */
  async sendToUsers(userIds: string[], payload: PushNotificationPayload): Promise<{ successful: number; failed: number }> {
    try {
      const results = await Promise.allSettled(
        userIds.map(userId => this.sendToUser(userId, payload))
      );

      const successful = results.filter(result => 
        result.status === 'fulfilled' && result.value === true
      ).length;
      const failed = results.length - successful;

      logInfo('Bulk push notification sent', { 
        total: userIds.length, 
        successful, 
        failed 
      });

      return { successful, failed };
    } catch (error) {
      logError('Failed to send bulk push notifications', error as Error, { userIds });
      return { successful: 0, failed: userIds.length };
    }
  }

  /**
   * Send push notification to all users
   */
  async sendToAllUsers(payload: PushNotificationPayload): Promise<{ successful: number; failed: number }> {
    try {
      const users = await prisma.user.findMany({
        select: { id: true }
      });

      const userIds = users.map(user => user.id);
      return await this.sendToUsers(userIds, payload);
    } catch (error) {
      logError('Failed to send push notification to all users', error as Error);
      return { successful: 0, failed: 0 };
    }
  }

  /**
   * Send push notification to a specific subscription
   */
  private async sendToSubscription(subscription: any, payload: PushNotificationPayload): Promise<void> {
    try {
      const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dhKey,
          auth: subscription.authKey
        }
      };

      const notificationPayload = JSON.stringify({
        ...payload,
        timestamp: payload.timestamp || Date.now()
      });

      await webpush.sendNotification(pushSubscription, notificationPayload);
    } catch (error) {
      logError('Failed to send push notification to subscription', error as Error, {
        subscriptionId: subscription.id,
        endpoint: subscription.endpoint
      });
      throw error;
    }
  }

  /**
   * Remove failed subscription
   */
  private async removeFailedSubscription(subscriptionId: string): Promise<void> {
    try {
      await prisma.pushSubscription.delete({
        where: { id: subscriptionId }
      });
      logInfo('Removed failed push subscription', { subscriptionId });
    } catch (error) {
      logError('Failed to remove failed subscription', error as Error, { subscriptionId });
    }
  }

  /**
   * Get user's notification settings
   */
  async getUserNotificationSettings(userId: string): Promise<NotificationSettings> {
    try {
      const settings = await prisma.notificationSettings.findUnique({
        where: { userId }
      });

      if (settings) {
        return {
          userId,
          pushEnabled: settings.pushEnabled,
          emailEnabled: settings.emailEnabled,
          likeNotifications: settings.likeNotifications,
          commentNotifications: settings.commentNotifications,
          followNotifications: settings.followNotifications,
          mentionNotifications: settings.mentionNotifications,
          systemNotifications: settings.systemNotifications,
          marketingNotifications: settings.marketingNotifications
        };
      }

      // Return default settings if none exist
      return {
        userId,
        pushEnabled: true,
        emailEnabled: true,
        likeNotifications: true,
        commentNotifications: true,
        followNotifications: true,
        mentionNotifications: true,
        systemNotifications: true,
        marketingNotifications: false
      };
    } catch (error) {
      logError('Failed to get user notification settings', error as Error, { userId });
      return {
        userId,
        pushEnabled: false,
        emailEnabled: false,
        likeNotifications: false,
        commentNotifications: false,
        followNotifications: false,
        mentionNotifications: false,
        systemNotifications: false,
        marketingNotifications: false
      };
    }
  }

  /**
   * Update user's notification settings
   */
  async updateUserNotificationSettings(userId: string, settings: Partial<NotificationSettings>): Promise<boolean> {
    try {
      await prisma.notificationSettings.upsert({
        where: { userId },
        update: {
          pushEnabled: settings.pushEnabled,
          emailEnabled: settings.emailEnabled,
          likeNotifications: settings.likeNotifications,
          commentNotifications: settings.commentNotifications,
          followNotifications: settings.followNotifications,
          mentionNotifications: settings.mentionNotifications,
          systemNotifications: settings.systemNotifications,
          marketingNotifications: settings.marketingNotifications,
          updatedAt: new Date()
        },
        create: {
          userId,
          pushEnabled: settings.pushEnabled ?? true,
          emailEnabled: settings.emailEnabled ?? true,
          likeNotifications: settings.likeNotifications ?? true,
          commentNotifications: settings.commentNotifications ?? true,
          followNotifications: settings.followNotifications ?? true,
          mentionNotifications: settings.mentionNotifications ?? true,
          systemNotifications: settings.systemNotifications ?? true,
          marketingNotifications: settings.marketingNotifications ?? false
        }
      });

      logInfo('User notification settings updated', { userId, settings });
      return true;
    } catch (error) {
      logError('Failed to update user notification settings', error as Error, { userId });
      return false;
    }
  }

  /**
   * Send like notification
   */
  async sendLikeNotification(postId: string, likerId: string, postOwnerId: string): Promise<boolean> {
    try {
      const settings = await this.getUserNotificationSettings(postOwnerId);
      if (!settings.likeNotifications) {
        return false;
      }

      const liker = await prisma.user.findUnique({
        where: { id: likerId },
        select: { name: true, username: true }
      });

      if (!liker) return false;

      const payload: PushNotificationPayload = {
        title: 'New Like! ❤️',
        body: `${liker.name || liker.username} liked your post`,
        icon: '/icons/heart.png',
        badge: '/icons/badge.png',
        data: {
          type: 'like',
          postId,
          likerId,
          action: 'view_post'
        },
        tag: `like-${postId}-${likerId}`,
        actions: [
          {
            action: 'view_post',
            title: 'View Post'
          }
        ]
      };

      return await this.sendToUser(postOwnerId, payload);
    } catch (error) {
      logError('Failed to send like notification', error as Error, { postId, likerId, postOwnerId });
      return false;
    }
  }

  /**
   * Send comment notification
   */
  async sendCommentNotification(postId: string, commenterId: string, postOwnerId: string): Promise<boolean> {
    try {
      const settings = await this.getUserNotificationSettings(postOwnerId);
      if (!settings.commentNotifications) {
        return false;
      }

      const commenter = await prisma.user.findUnique({
        where: { id: commenterId },
        select: { name: true, username: true }
      });

      if (!commenter) return false;

      const payload: PushNotificationPayload = {
        title: 'New Comment! 💬',
        body: `${commenter.name || commenter.username} commented on your post`,
        icon: '/icons/comment.png',
        badge: '/icons/badge.png',
        data: {
          type: 'comment',
          postId,
          commenterId,
          action: 'view_post'
        },
        tag: `comment-${postId}-${commenterId}`,
        actions: [
          {
            action: 'view_post',
            title: 'View Post'
          }
        ]
      };

      return await this.sendToUser(postOwnerId, payload);
    } catch (error) {
      logError('Failed to send comment notification', error as Error, { postId, commenterId, postOwnerId });
      return false;
    }
  }

  /**
   * Send follow notification
   */
  async sendFollowNotification(followerId: string, followingId: string): Promise<boolean> {
    try {
      const settings = await this.getUserNotificationSettings(followingId);
      if (!settings.followNotifications) {
        return false;
      }

      const follower = await prisma.user.findUnique({
        where: { id: followerId },
        select: { name: true, username: true }
      });

      if (!follower) return false;

      const payload: PushNotificationPayload = {
        title: 'New Follower! 👥',
        body: `${follower.name || follower.username} started following you`,
        icon: '/icons/user-plus.png',
        badge: '/icons/badge.png',
        data: {
          type: 'follow',
          followerId,
          action: 'view_profile'
        },
        tag: `follow-${followerId}-${followingId}`,
        actions: [
          {
            action: 'view_profile',
            title: 'View Profile'
          }
        ]
      };

      return await this.sendToUser(followingId, payload);
    } catch (error) {
      logError('Failed to send follow notification', error as Error, { followerId, followingId });
      return false;
    }
  }

  /**
   * Send system notification
   */
  async sendSystemNotification(userId: string, title: string, body: string, data?: any): Promise<boolean> {
    try {
      const settings = await this.getUserNotificationSettings(userId);
      if (!settings.systemNotifications) {
        return false;
      }

      const payload: PushNotificationPayload = {
        title,
        body,
        icon: '/icons/system.png',
        badge: '/icons/badge.png',
        data: {
          type: 'system',
          ...data
        },
        tag: `system-${Date.now()}`
      };

      return await this.sendToUser(userId, payload);
    } catch (error) {
      logError('Failed to send system notification', error as Error, { userId, title });
      return false;
    }
  }

  /**
   * Get push notification statistics
   */
  async getPushNotificationStats(): Promise<any> {
    try {
      const totalSubscriptions = await prisma.pushSubscription.count();
      const totalUsers = await prisma.user.count();
      const usersWithPushEnabled = await prisma.notificationSettings.count({
        where: { pushEnabled: true }
      });

      return {
        totalSubscriptions,
        totalUsers,
        usersWithPushEnabled,
        pushEnabledPercentage: totalUsers > 0 ? (usersWithPushEnabled / totalUsers) * 100 : 0
      };
    } catch (error) {
      logError('Failed to get push notification stats', error as Error);
      return {};
    }
  }

  /**
   * Clean up old subscriptions
   */
  async cleanupOldSubscriptions(): Promise<number> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await prisma.pushSubscription.deleteMany({
        where: {
          updatedAt: {
            lt: thirtyDaysAgo
          }
        }
      });

      logInfo('Cleaned up old push subscriptions', { count: result.count });
      return result.count;
    } catch (error) {
      logError('Failed to cleanup old subscriptions', error as Error);
      return 0;
    }
  }
}

// Export singleton instance
export const pushNotificationService = PushNotificationService.getInstance();

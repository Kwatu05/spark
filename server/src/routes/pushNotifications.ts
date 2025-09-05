import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { pushNotificationService } from '../services/pushNotifications';
import { logUserActionEvent } from '../middleware/observability';
import { logInfo, logError } from '../utils/logger';
import { config } from '../config/environment';

const router = Router();
const prisma = new PrismaClient();

// Subscribe to push notifications
router.post('/subscribe', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;
    const { subscription } = req.body;

    if (!userId) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({
        ok: false,
        error: 'Invalid push subscription data'
      });
    }

    const success = await pushNotificationService.subscribeUser(userId, subscription);

    if (success) {
      logUserActionEvent('push_subscribe', req, { userId });
      res.json({
        ok: true,
        message: 'Successfully subscribed to push notifications'
      });
    } else {
      res.status(500).json({
        ok: false,
        error: 'Failed to subscribe to push notifications'
      });
    }
  } catch (error) {
    logError('Push subscription failed', error as Error, {
      userId: req.user?.userId
    });
    
    res.status(500).json({
      ok: false,
      error: 'Failed to subscribe to push notifications'
    });
  }
});

// Unsubscribe from push notifications
router.post('/unsubscribe', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;
    const { endpoint } = req.body;

    if (!userId) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const success = await pushNotificationService.unsubscribeUser(userId, endpoint);

    if (success) {
      logUserActionEvent('push_unsubscribe', req, { userId, endpoint });
      res.json({
        ok: true,
        message: 'Successfully unsubscribed from push notifications'
      });
    } else {
      res.status(500).json({
        ok: false,
        error: 'Failed to unsubscribe from push notifications'
      });
    }
  } catch (error) {
    logError('Push unsubscription failed', error as Error, {
      userId: req.user?.userId
    });
    
    res.status(500).json({
      ok: false,
      error: 'Failed to unsubscribe from push notifications'
    });
  }
});

// Get VAPID public key
router.get('/vapid-key', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    res.json({
      ok: true,
      vapidPublicKey: config.pushNotifications.vapidPublicKey
    });
  } catch (error) {
    logError('Failed to get VAPID key', error as Error);
    
    res.status(500).json({
      ok: false,
      error: 'Failed to get VAPID key'
    });
  }
});

// Get notification settings
router.get('/settings', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const settings = await pushNotificationService.getUserNotificationSettings(userId);

    res.json({
      ok: true,
      settings
    });
  } catch (error) {
    logError('Failed to get notification settings', error as Error, {
      userId: req.user?.userId
    });
    
    res.status(500).json({
      ok: false,
      error: 'Failed to get notification settings'
    });
  }
});

// Update notification settings
router.patch('/settings', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;
    const {
      pushEnabled,
      emailEnabled,
      likeNotifications,
      commentNotifications,
      followNotifications,
      mentionNotifications,
      systemNotifications,
      marketingNotifications
    } = req.body;

    if (!userId) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const settings = {
      pushEnabled,
      emailEnabled,
      likeNotifications,
      commentNotifications,
      followNotifications,
      mentionNotifications,
      systemNotifications,
      marketingNotifications
    };

    const success = await pushNotificationService.updateUserNotificationSettings(userId, settings);

    if (success) {
      logUserActionEvent('push_settings_update', req, { userId, settings });
      res.json({
        ok: true,
        message: 'Notification settings updated successfully',
        settings
      });
    } else {
      res.status(500).json({
        ok: false,
        error: 'Failed to update notification settings'
      });
    }
  } catch (error) {
    logError('Failed to update notification settings', error as Error, {
      userId: req.user?.userId
    });
    
    res.status(500).json({
      ok: false,
      error: 'Failed to update notification settings'
    });
  }
});

// Send test notification (admin only)
router.post('/test', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;
    const { title, body, targetUserId } = req.body;

    if (!userId) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (user?.role !== 'ADMIN') {
      return res.status(403).json({
        ok: false,
        error: 'Admin access required'
      });
    }

    if (!title || !body) {
      return res.status(400).json({
        ok: false,
        error: 'Title and body are required'
      });
    }

    const targetUser = targetUserId || userId;
    const success = await pushNotificationService.sendSystemNotification(
      targetUser,
      title,
      body,
      { test: true }
    );

    if (success) {
      logUserActionEvent('push_test_notification', req, { userId, targetUser, title });
      res.json({
        ok: true,
        message: 'Test notification sent successfully'
      });
    } else {
      res.status(500).json({
        ok: false,
        error: 'Failed to send test notification'
      });
    }
  } catch (error) {
    logError('Failed to send test notification', error as Error, {
      userId: req.user?.userId
    });
    
    res.status(500).json({
      ok: false,
      error: 'Failed to send test notification'
    });
  }
});

// Get push notification statistics (admin only)
router.get('/stats', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;
    
    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (user?.role !== 'ADMIN') {
      return res.status(403).json({
        ok: false,
        error: 'Admin access required'
      });
    }

    const stats = await pushNotificationService.getPushNotificationStats();

    res.json({
      ok: true,
      stats
    });
  } catch (error) {
    logError('Failed to get push notification stats', error as Error, {
      userId: req.user?.userId
    });
    
    res.status(500).json({
      ok: false,
      error: 'Failed to get push notification statistics'
    });
  }
});

// Send notification to multiple users (admin only)
router.post('/broadcast', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;
    const { title, body, userIds, data } = req.body;

    if (!userId) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (user?.role !== 'ADMIN') {
      return res.status(403).json({
        ok: false,
        error: 'Admin access required'
      });
    }

    if (!title || !body) {
      return res.status(400).json({
        ok: false,
        error: 'Title and body are required'
      });
    }

    const targetUsers = userIds || [];
    const results = await pushNotificationService.sendToUsers(targetUsers, {
      title,
      body,
      icon: '/icons/system.png',
      badge: '/icons/badge.png',
      data: {
        type: 'system',
        ...data
      }
    });

    logUserActionEvent('push_broadcast', req, { userId, targetUsers, title, results });

    res.json({
      ok: true,
      message: 'Broadcast notification sent',
      results
    });
  } catch (error) {
    logError('Failed to send broadcast notification', error as Error, {
      userId: req.user?.userId
    });
    
    res.status(500).json({
      ok: false,
      error: 'Failed to send broadcast notification'
    });
  }
});

// Clean up old subscriptions (admin only)
router.post('/cleanup', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;
    
    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (user?.role !== 'ADMIN') {
      return res.status(403).json({
        ok: false,
        error: 'Admin access required'
      });
    }

    const cleanedCount = await pushNotificationService.cleanupOldSubscriptions();

    logUserActionEvent('push_cleanup', req, { userId, cleanedCount });

    res.json({
      ok: true,
      message: 'Old subscriptions cleaned up',
      cleanedCount
    });
  } catch (error) {
    logError('Failed to cleanup old subscriptions', error as Error, {
      userId: req.user?.userId
    });
    
    res.status(500).json({
      ok: false,
      error: 'Failed to cleanup old subscriptions'
    });
  }
});

export default router;

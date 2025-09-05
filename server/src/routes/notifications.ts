import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { webSocketService } from '../services/websocket';
import { logUserActionEvent } from '../middleware/observability';
import { logInfo, logError } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// Get user notifications
router.get('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const unreadOnly = req.query.unread === 'true';

    const where = {
      userId,
      ...(unreadOnly && { read: false })
    };

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          type: true,
          title: true,
          message: true,
          data: true,
          read: true,
          createdAt: true,
          readAt: true
        }
      }),
      prisma.notification.count({ where })
    ]);

    // Parse JSON data
    const parsedNotifications = notifications.map(notification => ({
      ...notification,
      data: notification.data ? JSON.parse(notification.data) : null
    }));

    res.json({
      ok: true,
      notifications: parsedNotifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logError('Get notifications error', error as Error, { userId: req.user?.userId });
    res.status(500).json({ ok: false, error: 'Failed to fetch notifications' });
  }
});

// Get unread notifications count
router.get('/unread-count', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const count = await prisma.notification.count({
      where: {
        userId,
        read: false
      }
    });

    res.json({
      ok: true,
      unreadCount: count
    });
  } catch (error) {
    logError('Get unread count error', error as Error, { userId: req.user?.userId });
    res.status(500).json({ ok: false, error: 'Failed to get unread count' });
  }
});

// Mark notification as read
router.patch('/:id/read', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const notification = await prisma.notification.updateMany({
      where: {
        id,
        userId
      },
      data: {
        read: true,
        readAt: new Date()
      }
    });

    if (notification.count === 0) {
      return res.status(404).json({ ok: false, error: 'Notification not found' });
    }

    logUserActionEvent('notification_read', req, { notificationId: id });

    res.json({
      ok: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    logError('Mark notification read error', error as Error, { 
      userId: req.user?.userId, 
      notificationId: req.params.id 
    });
    res.status(500).json({ ok: false, error: 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read
router.patch('/mark-all-read', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const result = await prisma.notification.updateMany({
      where: {
        userId,
        read: false
      },
      data: {
        read: true,
        readAt: new Date()
      }
    });

    logUserActionEvent('notifications_mark_all_read', req, { count: result.count });

    res.json({
      ok: true,
      message: 'All notifications marked as read',
      updatedCount: result.count
    });
  } catch (error) {
    logError('Mark all notifications read error', error as Error, { userId: req.user?.userId });
    res.status(500).json({ ok: false, error: 'Failed to mark all notifications as read' });
  }
});

// Delete notification
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const notification = await prisma.notification.deleteMany({
      where: {
        id,
        userId
      }
    });

    if (notification.count === 0) {
      return res.status(404).json({ ok: false, error: 'Notification not found' });
    }

    logUserActionEvent('notification_delete', req, { notificationId: id });

    res.json({
      ok: true,
      message: 'Notification deleted'
    });
  } catch (error) {
    logError('Delete notification error', error as Error, { 
      userId: req.user?.userId, 
      notificationId: req.params.id 
    });
    res.status(500).json({ ok: false, error: 'Failed to delete notification' });
  }
});

// Delete all notifications
router.delete('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const result = await prisma.notification.deleteMany({
      where: { userId }
    });

    logUserActionEvent('notifications_delete_all', req, { count: result.count });

    res.json({
      ok: true,
      message: 'All notifications deleted',
      deletedCount: result.count
    });
  } catch (error) {
    logError('Delete all notifications error', error as Error, { userId: req.user?.userId });
    res.status(500).json({ ok: false, error: 'Failed to delete all notifications' });
  }
});

// Create notification (admin only)
router.post('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;
    const { targetUserId, type, title, message, data } = req.body;

    if (!userId) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (user?.role !== 'ADMIN') {
      return res.status(403).json({ ok: false, error: 'Admin access required' });
    }

    if (!targetUserId || !type || !title || !message) {
      return res.status(400).json({ 
        ok: false, 
        error: 'targetUserId, type, title, and message are required' 
      });
    }

    await webSocketService.sendNotification(targetUserId, {
      type,
      title,
      message,
      data,
      read: false
    });

    logUserActionEvent('notification_create', req, { targetUserId, type, title });

    res.json({
      ok: true,
      message: 'Notification sent successfully'
    });
  } catch (error) {
    logError('Create notification error', error as Error, { 
      userId: req.user?.userId, 
      targetUserId: req.body.targetUserId 
    });
    res.status(500).json({ ok: false, error: 'Failed to create notification' });
  }
});

// Get notification settings
router.get('/settings', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    // In a real implementation, you would have notification settings in the database
    const settings = {
      emailNotifications: true,
      pushNotifications: true,
      likeNotifications: true,
      commentNotifications: true,
      followNotifications: true,
      mentionNotifications: true,
      systemNotifications: true
    };

    res.json({
      ok: true,
      settings
    });
  } catch (error) {
    logError('Get notification settings error', error as Error, { userId: req.user?.userId });
    res.status(500).json({ ok: false, error: 'Failed to get notification settings' });
  }
});

// Update notification settings
router.patch('/settings', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const {
      emailNotifications,
      pushNotifications,
      likeNotifications,
      commentNotifications,
      followNotifications,
      mentionNotifications,
      systemNotifications
    } = req.body;

    // In a real implementation, you would save these settings to the database
    const settings = {
      emailNotifications: emailNotifications ?? true,
      pushNotifications: pushNotifications ?? true,
      likeNotifications: likeNotifications ?? true,
      commentNotifications: commentNotifications ?? true,
      followNotifications: followNotifications ?? true,
      mentionNotifications: mentionNotifications ?? true,
      systemNotifications: systemNotifications ?? true
    };

    logUserActionEvent('notification_settings_update', req, { settings });

    res.json({
      ok: true,
      message: 'Notification settings updated',
      settings
    });
  } catch (error) {
    logError('Update notification settings error', error as Error, { userId: req.user?.userId });
    res.status(500).json({ ok: false, error: 'Failed to update notification settings' });
  }
});

export default router;
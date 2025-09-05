import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { analyticsService } from '../services/analytics';
import { logUserActionEvent } from '../middleware/observability';
import { logInfo, logError } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// Track analytics event
router.post('/track', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;
    const { eventName, properties, sessionId, metadata } = req.body;

    if (!eventName) {
      return res.status(400).json({
        ok: false,
        error: 'Event name is required'
      });
    }

    await analyticsService.trackEvent(
      eventName,
      properties || {},
      userId,
      sessionId,
      {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip,
        referrer: req.get('Referer'),
        ...metadata
      }
    );

    res.json({
      ok: true,
      message: 'Event tracked successfully'
    });
  } catch (error) {
    logError('Failed to track analytics event', error as Error, {
      userId: req.user?.userId,
      eventName: req.body.eventName
    });
    
    res.status(500).json({
      ok: false,
      error: 'Failed to track event'
    });
  }
});

// Track page view
router.post('/page-view', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;
    const { page, sessionId, duration, metadata } = req.body;

    if (!page) {
      return res.status(400).json({
        ok: false,
        error: 'Page is required'
      });
    }

    await analyticsService.trackPageView(
      page,
      userId,
      sessionId,
      {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip,
        referrer: req.get('Referer'),
        duration,
        ...metadata
      }
    );

    res.json({
      ok: true,
      message: 'Page view tracked successfully'
    });
  } catch (error) {
    logError('Failed to track page view', error as Error, {
      userId: req.user?.userId,
      page: req.body.page
    });
    
    res.status(500).json({
      ok: false,
      error: 'Failed to track page view'
    });
  }
});

// Track engagement
router.post('/engagement', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;
    const { action, targetId, sessionId, metadata } = req.body;

    if (!action || !targetId) {
      return res.status(400).json({
        ok: false,
        error: 'Action and target ID are required'
      });
    }

    const validActions = ['like', 'comment', 'post', 'follow', 'share', 'view'];
    if (!validActions.includes(action)) {
      return res.status(400).json({
        ok: false,
        error: 'Invalid action type'
      });
    }

    await analyticsService.trackEngagement(
      action as any,
      targetId,
      userId,
      sessionId,
      metadata
    );

    res.json({
      ok: true,
      message: 'Engagement tracked successfully'
    });
  } catch (error) {
    logError('Failed to track engagement', error as Error, {
      userId: req.user?.userId,
      action: req.body.action,
      targetId: req.body.targetId
    });
    
    res.status(500).json({
      ok: false,
      error: 'Failed to track engagement'
    });
  }
});

// Start session
router.post('/session/start', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;
    const { metadata } = req.body;

    const session = await analyticsService.startSession(userId, {
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip,
      referrer: req.get('Referer'),
      page: metadata?.page,
      ...metadata
    });

    res.json({
      ok: true,
      session
    });
  } catch (error) {
    logError('Failed to start analytics session', error as Error, {
      userId: req.user?.userId
    });
    
    res.status(500).json({
      ok: false,
      error: 'Failed to start session'
    });
  }
});

// End session
router.post('/session/end', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        ok: false,
        error: 'Session ID is required'
      });
    }

    await analyticsService.endSession(sessionId);

    res.json({
      ok: true,
      message: 'Session ended successfully'
    });
  } catch (error) {
    logError('Failed to end analytics session', error as Error, {
      userId: req.user?.userId,
      sessionId: req.body.sessionId
    });
    
    res.status(500).json({
      ok: false,
      error: 'Failed to end session'
    });
  }
});

// Get analytics metrics (admin only)
router.get('/metrics', requireAuth, async (req: AuthenticatedRequest, res) => {
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

    const {
      startDate,
      endDate,
      userId: filterUserId,
      eventType,
      page,
      device,
      browser,
      location
    } = req.query;

    const filters = {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      userId: filterUserId as string,
      eventType: eventType as string,
      page: page as string,
      device: device as string,
      browser: browser as string,
      location: location as string
    };

    const metrics = await analyticsService.getMetrics(filters);

    logUserActionEvent('analytics_metrics_view', req, { filters });

    res.json({
      ok: true,
      metrics
    });
  } catch (error) {
    logError('Failed to get analytics metrics', error as Error, {
      userId: req.user?.userId
    });
    
    res.status(500).json({
      ok: false,
      error: 'Failed to get analytics metrics'
    });
  }
});

// Get user behavior analytics
router.get('/user/:userId/behavior', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const currentUserId = req.user?.userId;
    const { userId } = req.params;
    const { days = 30 } = req.query;

    // Check if user is admin or viewing their own data
    const user = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { role: true }
    });

    if (user?.role !== 'ADMIN' && currentUserId !== userId) {
      return res.status(403).json({
        ok: false,
        error: 'Access denied'
      });
    }

    const behavior = await analyticsService.getUserBehavior(userId, parseInt(days as string));

    logUserActionEvent('analytics_user_behavior_view', req, { userId, days });

    res.json({
      ok: true,
      behavior
    });
  } catch (error) {
    logError('Failed to get user behavior', error as Error, {
      userId: req.user?.userId,
      targetUserId: req.params.userId
    });
    
    res.status(500).json({
      ok: false,
      error: 'Failed to get user behavior'
    });
  }
});

// Get real-time analytics (admin only)
router.get('/realtime', requireAuth, async (req: AuthenticatedRequest, res) => {
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

    const realtimeData = await analyticsService.getRealTimeAnalytics();

    res.json({
      ok: true,
      realtime: realtimeData
    });
  } catch (error) {
    logError('Failed to get real-time analytics', error as Error, {
      userId: req.user?.userId
    });
    
    res.status(500).json({
      ok: false,
      error: 'Failed to get real-time analytics'
    });
  }
});

// Export analytics data (admin only)
router.get('/export', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;
    const { format = 'json', ...filters } = req.query;
    
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

    const analyticsFilters = {
      startDate: filters.startDate ? new Date(filters.startDate as string) : undefined,
      endDate: filters.endDate ? new Date(filters.endDate as string) : undefined,
      userId: filters.userId as string,
      eventType: filters.eventType as string,
      page: filters.page as string,
      device: filters.device as string,
      browser: filters.browser as string,
      location: filters.location as string
    };

    const data = await analyticsService.exportAnalytics(format as 'json' | 'csv', analyticsFilters);

    const contentType = format === 'csv' ? 'text/csv' : 'application/json';
    const filename = `analytics-export-${new Date().toISOString().split('T')[0]}.${format}`;

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(data);

    logUserActionEvent('analytics_export', req, { format, filters: analyticsFilters });
  } catch (error) {
    logError('Failed to export analytics', error as Error, {
      userId: req.user?.userId,
      format: req.query.format
    });
    
    res.status(500).json({
      ok: false,
      error: 'Failed to export analytics data'
    });
  }
});

// Get analytics dashboard data (admin only)
router.get('/dashboard', requireAuth, async (req: AuthenticatedRequest, res) => {
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

    const { period = '30d' } = req.query;
    
    let startDate: Date;
    const endDate = new Date();
    
    switch (period) {
      case '7d':
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const [metrics, realtimeData] = await Promise.all([
      analyticsService.getMetrics({ startDate, endDate }),
      analyticsService.getRealTimeAnalytics()
    ]);

    const dashboard = {
      period,
      dateRange: { startDate, endDate },
      metrics,
      realtime: realtimeData,
      summary: {
        growthRate: 0, // Implementation would calculate growth rate
        topPerformingContent: [], // Implementation would get top content
        userRetention: 0, // Implementation would calculate retention
        engagementTrend: [] // Implementation would get engagement trend
      }
    };

    res.json({
      ok: true,
      dashboard
    });
  } catch (error) {
    logError('Failed to get analytics dashboard', error as Error, {
      userId: req.user?.userId
    });
    
    res.status(500).json({
      ok: false,
      error: 'Failed to get analytics dashboard'
    });
  }
});

export default router;
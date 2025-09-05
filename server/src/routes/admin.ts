import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { metrics } from '../middleware/observability';

const router = Router();
const prisma = new PrismaClient();

// All admin routes require authentication and admin/moderator role
router.use(requireAuth);
router.use(requireRole(['ADMIN', 'MODERATOR']));

// Types
type QueueItem = { id: string; type: 'post' | 'comment' | 'user'; reason: string; reportedAt: string };
type FeatureFlag = { key: string; enabled: boolean; description: string; rolloutPercentage: number };
type SystemStats = {
  users: { total: number; active: number; newToday: number };
  posts: { total: number; today: number };
  analytics: { totalEvents: number; topEvents: Array<{ event: string; count: number }> };
  system: { uptime: number; requestsTotal: number; errorsTotal: number; avgResponseTime: number };
};

type ApprovalItem<TData = any> = {
  id: string;
  submittedAt: string;
  submittedBy: string;
  data: TData;
};

// In-memory storage (in production, use Redis or database)
let moderationQueue: QueueItem[] = [
  { id: 'q1', type: 'post', reason: 'nudity', reportedAt: new Date(Date.now() - 3600_000).toISOString() },
  { id: 'q2', type: 'comment', reason: 'harassment', reportedAt: new Date(Date.now() - 7200_000).toISOString() },
];

let outageBanner: { active: boolean; message: string } = { active: false, message: '' };

let featureFlags: FeatureFlag[] = [
  { key: 'feed_experiments', enabled: true, description: 'Enable feed ranking experiments', rolloutPercentage: 100 },
  { key: 'premium_features', enabled: false, description: 'Premium subscription features', rolloutPercentage: 0 },
  { key: 'video_posts', enabled: true, description: 'Allow video post uploads', rolloutPercentage: 50 },
  { key: 'ai_matching', enabled: false, description: 'AI-powered matching algorithm', rolloutPercentage: 0 },
  { key: 'live_streaming', enabled: false, description: 'Live streaming functionality', rolloutPercentage: 0 },
];

let analyticsEvents: Array<{ event: string; timestamp: number; userId?: string; metadata?: any }> = [
  { event: 'app_loaded', timestamp: Date.now() - 1000, userId: 'user1' },
  { event: 'user_login', timestamp: Date.now() - 2000, userId: 'user1' },
  { event: 'post_spark', timestamp: Date.now() - 3000, userId: 'user2', metadata: { postId: 'post1' } },
  { event: 'connection_initiated', timestamp: Date.now() - 4000, userId: 'user1', metadata: { targetUserId: 'user2' } },
];

// Approval Queue (verifications only, in-memory)
let approvals = {
  verifications: [
    { id: 'av1', submittedAt: new Date().toISOString(), submittedBy: 'user5', data: { method: 'photo_selfie' } },
  ] as ApprovalItem[],
};

// Reports & Safety queue (in-memory)
type ReportItem = { id: string; targetType: 'user' | 'post' | 'comment' | 'group' | 'event'; targetId: string; reason: string; reportedBy: string; reportedAt: string };
let reportsQueue: ReportItem[] = [
  { id: 'r1', targetType: 'user', targetId: 'user9', reason: 'Impersonation', reportedBy: 'user3', reportedAt: new Date().toISOString() },
];

// Groups and Events (in-memory)
type Group = { id: string; name: string; description?: string; createdAt: string; createdBy: string; members: string[] };
type Event = { id: string; title: string; description?: string; date: string; createdAt: string; createdBy: string; attendees: string[] };
let groups: Group[] = [
  { id: 'g1', name: 'Hikers in SF', description: 'Weekend hikes', createdAt: new Date().toISOString(), createdBy: 'admin1', members: ['user1','user2'] },
];
let events: Event[] = [
  { id: 'e1', title: 'Sunset picnic', description: 'At Dolores Park', date: new Date(Date.now()+86400000).toISOString(), createdAt: new Date().toISOString(), createdBy: 'admin1', attendees: ['user2'] },
];

// Premium management (in-memory map userId -> plan)
let premiumUsers: Record<string, { plan: 'GOLD' | 'PLATINUM'; grantedAt: string }> = {};

// Approvals API
const isValidApprovalType = (t: string): t is keyof typeof approvals => {
  return ['verifications'].includes(t);
};

router.get('/approvals/:type', async (req, res) => {
  const { type } = req.params;
  if (!isValidApprovalType(type)) {
    return res.status(400).json({ ok: false, error: 'Invalid type' });
  }
  
  if (type === 'verifications') {
    try {
      const verificationRequests = await prisma.verificationRequest.findMany({
        where: { status: 'PENDING' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              name: true,
              email: true,
              avatar: true
            }
          }
        },
        orderBy: { submittedAt: 'asc' }
      });

      res.json({ ok: true, items: verificationRequests });
    } catch (error) {
      console.error('Get verification requests error:', error);
      res.status(500).json({ ok: false, error: 'Failed to fetch verification requests' });
    }
  } else {
    res.json({ ok: true, items: approvals[type] });
  }
});

router.post('/approvals/:type/:id/approve', async (req, res) => {
  try {
    const { type, id } = req.params;
    const { adminNotes } = req.body;
    const adminUserId = (req as AuthenticatedRequest).user?.userId;
    
    if (!isValidApprovalType(type)) return res.status(400).json({ ok: false, error: 'Invalid type' });

    if (type === 'verifications') {
      // Find the verification request
      const verificationRequest = await prisma.verificationRequest.findUnique({
        where: { id },
        include: { user: true }
      });

      if (!verificationRequest) {
        return res.status(404).json({ ok: false, error: 'Verification request not found' });
      }

      if (verificationRequest.status !== 'PENDING') {
        return res.status(400).json({ ok: false, error: 'Verification request already processed' });
      }

      // Update verification request status
      await prisma.verificationRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          reviewedAt: new Date(),
          reviewedBy: adminUserId,
          adminNotes
        }
      });

      // Update user verification status
      await prisma.user.update({
        where: { id: verificationRequest.userId },
        data: { isVerified: true }
      });

      res.json({ ok: true, message: 'Verification approved successfully' });
    } else {
      const queue = approvals[type as keyof typeof approvals];
      const item = queue.find((i: any) => i.id === id);
      if (!item) return res.status(404).json({ ok: false, error: 'Not found' });

      // In a real system, persist approved item changes to DB
      (approvals as any)[type] = queue.filter((i: any) => i.id !== id);
      return res.json({ ok: true });
    }
  } catch (e) {
    console.error('Approval error:', e);
    res.status(500).json({ ok: false, error: 'Approval failed' });
  }
});

router.post('/approvals/:type/:id/reject', async (req, res) => {
  try {
    const { type, id } = req.params;
    const { reason, adminNotes } = req.body || {};
    const adminUserId = (req as AuthenticatedRequest).user?.userId;
    
    if (!isValidApprovalType(type)) return res.status(400).json({ ok: false, error: 'Invalid type' });

    if (type === 'verifications') {
      // Find the verification request
      const verificationRequest = await prisma.verificationRequest.findUnique({
        where: { id }
      });

      if (!verificationRequest) {
        return res.status(404).json({ ok: false, error: 'Verification request not found' });
      }

      if (verificationRequest.status !== 'PENDING') {
        return res.status(400).json({ ok: false, error: 'Verification request already processed' });
      }

      // Update verification request status
      await prisma.verificationRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          reviewedAt: new Date(),
          reviewedBy: adminUserId,
          rejectionReason: reason,
          adminNotes
        }
      });

      res.json({ ok: true, message: 'Verification rejected successfully' });
    } else {
      const queue = approvals[type as keyof typeof approvals];
      const item = queue.find((i: any) => i.id === id);
      if (!item) return res.status(404).json({ ok: false, error: 'Not found' });
      // Optionally log reason or notify user
      (approvals as any)[type] = queue.filter((i: any) => i.id !== id);
      return res.json({ ok: true });
    }
  } catch (e) {
    console.error('Rejection error:', e);
    res.status(500).json({ ok: false, error: 'Rejection failed' });
  }
});

// Reports & Safety
router.get('/reports', (_req, res) => {
  res.json({ ok: true, items: reportsQueue });
});

router.post('/reports/:id/resolve', (req, res) => {
  const { id } = req.params;
  const { action = 'dismiss' } = req.body || {};
  reportsQueue = reportsQueue.filter(r => r.id !== id);
  // In production, take action like ban user, remove content, etc.
  res.json({ ok: true, action });
});

// Groups management (admin-only creators)
router.get('/groups', (_req, res) => {
  res.json({ ok: true, groups });
});

router.post('/groups', (req, res) => {
  const { name, description } = req.body || {};
  if (!name) return res.status(400).json({ ok: false, error: 'Name required' });
  const id = `g_${Math.random().toString(36).slice(2, 9)}`;
  const grp: Group = { id, name, description, createdAt: new Date().toISOString(), createdBy: (req as any).user?.id || 'admin', members: [] };
  groups.push(grp);
  res.json({ ok: true, group: grp });
});

router.delete('/groups/:id', (req, res) => {
  const { id } = req.params;
  groups = groups.filter(g => g.id !== id);
  res.json({ ok: true });
});

router.post('/groups/:id/members/:userId/remove', (req, res) => {
  const { id, userId } = req.params;
  const g = groups.find(x => x.id === id);
  if (!g) return res.status(404).json({ ok: false, error: 'Group not found' });
  g.members = g.members.filter(m => m !== userId);
  res.json({ ok: true, group: g });
});

// Events management (admin-only creators)
router.get('/events', (_req, res) => {
  res.json({ ok: true, events });
});

router.post('/events', (req, res) => {
  const { title, description, date } = req.body || {};
  if (!title || !date) return res.status(400).json({ ok: false, error: 'Title and date required' });
  const id = `e_${Math.random().toString(36).slice(2, 9)}`;
  const ev: Event = { id, title, description, date, createdAt: new Date().toISOString(), createdBy: (req as any).user?.id || 'admin', attendees: [] };
  events.push(ev);
  res.json({ ok: true, event: ev });
});

router.delete('/events/:id', (req, res) => {
  const { id } = req.params;
  events = events.filter(e => e.id !== id);
  res.json({ ok: true });
});

router.post('/events/:id/attendees/:userId/remove', (req, res) => {
  const { id, userId } = req.params;
  const e = events.find(x => x.id === id);
  if (!e) return res.status(404).json({ ok: false, error: 'Event not found' });
  e.attendees = e.attendees.filter(a => a !== userId);
  res.json({ ok: true, event: e });
});

// Premium controls
router.get('/premium', (_req, res) => {
  res.json({ ok: true, users: premiumUsers });
});

router.post('/premium/grant', (req, res) => {
  const { userId, plan } = req.body || {};
  if (!userId || !['GOLD','PLATINUM'].includes(plan)) return res.status(400).json({ ok: false, error: 'userId and valid plan required' });
  premiumUsers[userId] = { plan, grantedAt: new Date().toISOString() } as any;
  res.json({ ok: true, userId, plan });
});

router.post('/premium/revoke', (req, res) => {
  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ ok: false, error: 'userId required' });
  delete premiumUsers[userId];
  res.json({ ok: true, userId });
});

// Dashboard Overview
router.get('/dashboard', async (_req, res) => {
  try {
    const users = await prisma.user.findMany();
    const posts = await prisma.post.findMany();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const newUsersToday = users.filter(u => u.createdAt >= today).length;
    const postsToday = posts.filter(p => p.createdAt >= today).length;

    // Calculate top events
    const eventCounts = analyticsEvents.reduce((acc, event) => {
      acc[event.event] = (acc[event.event] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topEvents = Object.entries(eventCounts)
      .map(([event, count]) => ({ event, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const stats: SystemStats = {
      users: {
        total: users.length,
        active: users.filter(u => u.updatedAt >= new Date(Date.now() - 24 * 60 * 60 * 1000)).length,
        newToday: newUsersToday
      },
      posts: {
        total: posts.length,
        today: postsToday
      },
      analytics: {
        totalEvents: analyticsEvents.length,
        topEvents
      },
      system: {
        uptime: Math.round((Date.now() - metrics.startTime) / 1000),
        requestsTotal: metrics.requestsTotal,
        errorsTotal: metrics.errorsTotal,
        avgResponseTime: metrics.requestsTotal > 0 ? Math.round(metrics.responseTimeSum / metrics.requestsTotal) : 0
      }
    };

    res.json({ ok: true, stats });
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Failed to fetch dashboard data' });
  }
});

// User Management
router.get('/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const role = req.query.role as string;

    let where: any = {};
    if (search) {
      where.OR = [
        { username: { contains: search } },
        { email: { contains: search } },
        { name: { contains: search } }
      ];
    }
    if (role) {
      where.role = role;
    }

    const users = await prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { posts: true } }
      }
    });

    const total = await prisma.user.count({ where });

    res.json({ ok: true, users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Failed to fetch users' });
  }
});

router.patch('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { role, isVerified } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: { role, isVerified },
      select: { id: true, username: true, email: true, name: true, role: true, isVerified: true }
    });

    res.json({ ok: true, user });
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Failed to update user' });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.user.delete({ where: { id } });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Failed to delete user' });
  }
});

// Feature Flags Management
router.get('/feature-flags', (_req, res) => {
  res.json({ ok: true, flags: featureFlags });
});

router.post('/feature-flags', (req, res) => {
  const { key, enabled, description, rolloutPercentage } = req.body;
  
  const existingIndex = featureFlags.findIndex(f => f.key === key);
  if (existingIndex >= 0) {
    featureFlags[existingIndex] = { key, enabled, description, rolloutPercentage };
  } else {
    featureFlags.push({ key, enabled, description, rolloutPercentage });
  }
  
  res.json({ ok: true, flags: featureFlags });
});

router.delete('/feature-flags/:key', (req, res) => {
  const { key } = req.params;
  featureFlags = featureFlags.filter(f => f.key !== key);
  res.json({ ok: true, flags: featureFlags });
});

// Analytics Management
router.get('/analytics', (req, res) => {
  const { event, userId, startDate, endDate } = req.query;
  
  let filteredEvents = [...analyticsEvents];
  
  if (event) {
    filteredEvents = filteredEvents.filter(e => e.event === event);
  }
  if (userId) {
    filteredEvents = filteredEvents.filter(e => e.userId === userId);
  }
  if (startDate) {
    const start = new Date(startDate as string).getTime();
    filteredEvents = filteredEvents.filter(e => e.timestamp >= start);
  }
  if (endDate) {
    const end = new Date(endDate as string).getTime();
    filteredEvents = filteredEvents.filter(e => e.timestamp <= end);
  }
  
  // Group by event type
  const eventCounts = filteredEvents.reduce((acc, event) => {
    acc[event.event] = (acc[event.event] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  res.json({ 
    ok: true, 
    events: filteredEvents.slice(-100), // Last 100 events
    summary: Object.entries(eventCounts).map(([event, count]) => ({ event, count }))
  });
});

router.post('/analytics/track', (req, res) => {
  const { event, userId, metadata } = req.body;
  
  analyticsEvents.push({
    event,
    userId,
    metadata,
    timestamp: Date.now()
  });
  
  // Keep only last 1000 events
  if (analyticsEvents.length > 1000) {
    analyticsEvents = analyticsEvents.slice(-1000);
  }
  
  res.json({ ok: true });
});

// System Monitoring
router.get('/system/health', (_req, res) => {
  const health = {
    status: 'healthy',
    uptime: Math.round((Date.now() - metrics.startTime) / 1000),
    requestsTotal: metrics.requestsTotal,
    errorsTotal: metrics.errorsTotal,
    errorRate: metrics.requestsTotal > 0 ? (metrics.errorsTotal / metrics.requestsTotal * 100).toFixed(2) : '0',
    avgResponseTime: metrics.requestsTotal > 0 ? Math.round(metrics.responseTimeSum / metrics.requestsTotal) : 0,
    requestsByRoute: metrics.requestsByRoute,
    memoryUsage: process.memoryUsage(),
    timestamp: new Date().toISOString()
  };
  
  res.json({ ok: true, health });
});

router.get('/system/logs', (req, res) => {
  const { level, limit = 100 } = req.query;
  
  // In production, this would query from a log aggregation service
  const mockLogs = [
    { level: 'info', message: 'Server started', timestamp: new Date().toISOString() },
    { level: 'warn', message: 'High memory usage detected', timestamp: new Date(Date.now() - 1000).toISOString() },
    { level: 'error', message: 'Database connection failed', timestamp: new Date(Date.now() - 2000).toISOString() },
  ];
  
  let filteredLogs = mockLogs;
  if (level) {
    filteredLogs = filteredLogs.filter(log => log.level === level);
  }
  
  res.json({ ok: true, logs: filteredLogs.slice(0, parseInt(limit as string)) });
});

// Moderation Queue (existing)
router.get('/moderation/queue', (_req, res) => {
  res.json({ ok: true, items: moderationQueue });
});

router.post('/moderation/resolve/:id', (req, res) => {
  const { id } = req.params;
  moderationQueue = moderationQueue.filter(i => i.id !== id);
  res.json({ ok: true });
});

// Outage Banner (existing)
router.get('/outage-banner', (_req, res) => {
  res.json({ ok: true, banner: outageBanner });
});

router.post('/outage-banner', (req, res) => {
  const { active, message } = req.body || {};
  outageBanner = { active: !!active, message: typeof message === 'string' ? message : '' };
  res.json({ ok: true, banner: outageBanner });
});

export default router;



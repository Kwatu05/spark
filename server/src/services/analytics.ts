import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { logInfo, logError, logWarning } from '../utils/logger';
import { cacheService } from './cache';

const prisma = new PrismaClient();

export interface AnalyticsEvent {
  id: string;
  userId?: string;
  sessionId: string;
  eventType: string;
  eventName: string;
  properties: Record<string, any>;
  timestamp: Date;
  userAgent?: string;
  ipAddress?: string;
  referrer?: string;
  page?: string;
  duration?: number;
}

export interface UserSession {
  id: string;
  userId?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  pageViews: number;
  events: number;
  userAgent?: string;
  ipAddress?: string;
  referrer?: string;
  isActive: boolean;
}

export interface AnalyticsMetrics {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  returningUsers: number;
  totalSessions: number;
  averageSessionDuration: number;
  bounceRate: number;
  pageViews: number;
  uniquePageViews: number;
  topPages: Array<{ page: string; views: number; uniqueViews: number }>;
  topEvents: Array<{ event: string; count: number }>;
  userEngagement: {
    likes: number;
    comments: number;
    posts: number;
    follows: number;
  };
  deviceStats: {
    desktop: number;
    mobile: number;
    tablet: number;
    unknown: number;
  };
  browserStats: Array<{ browser: string; count: number }>;
  locationStats: Array<{ location: string; count: number }>;
  timeStats: {
    hourly: Array<{ hour: number; count: number }>;
    daily: Array<{ day: string; count: number }>;
    weekly: Array<{ week: string; count: number }>;
  };
}

export interface AnalyticsFilters {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  eventType?: string;
  page?: string;
  device?: string;
  browser?: string;
  location?: string;
}

export class AnalyticsService {
  private static instance: AnalyticsService;
  private activeSessions: Map<string, UserSession> = new Map();
  private eventQueue: AnalyticsEvent[] = [];
  private readonly BATCH_SIZE = 100;
  private readonly FLUSH_INTERVAL = 30000; // 30 seconds
  private flushTimer?: NodeJS.Timeout;

  private constructor() {
    this.startEventFlushTimer();
  }

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  /**
   * Track a user event
   */
  async trackEvent(
    eventName: string,
    properties: Record<string, any> = {},
    userId?: string,
    sessionId?: string,
    metadata?: {
      userAgent?: string;
      ipAddress?: string;
      referrer?: string;
      page?: string;
      duration?: number;
    }
  ): Promise<void> {
    try {
      const event: AnalyticsEvent = {
        id: uuidv4(),
        userId,
        sessionId: sessionId || this.getOrCreateSession(userId, metadata).id,
        eventType: this.getEventType(eventName),
        eventName,
        properties,
        timestamp: new Date(),
        userAgent: metadata?.userAgent,
        ipAddress: metadata?.ipAddress,
        referrer: metadata?.referrer,
        page: metadata?.page,
        duration: metadata?.duration
      };

      // Add to queue for batch processing
      this.eventQueue.push(event);

      // Update session
      if (sessionId) {
        this.updateSession(sessionId, eventName, metadata?.page);
      }

      // Flush if queue is full
      if (this.eventQueue.length >= this.BATCH_SIZE) {
        await this.flushEvents();
      }

      logInfo('Event tracked', { eventName, userId, sessionId: event.sessionId });
    } catch (error) {
      logError('Failed to track event', error as Error, { eventName, userId });
    }
  }

  /**
   * Start a new user session
   */
  async startSession(
    userId?: string,
    metadata?: {
      userAgent?: string;
      ipAddress?: string;
      referrer?: string;
      page?: string;
    }
  ): Promise<UserSession> {
    try {
      const sessionId = uuidv4();
      const session: UserSession = {
        id: sessionId,
        userId,
        startTime: new Date(),
        pageViews: 1,
        events: 0,
        userAgent: metadata?.userAgent,
        ipAddress: metadata?.ipAddress,
        referrer: metadata?.referrer,
        isActive: true
      };

      this.activeSessions.set(sessionId, session);

      // Track session start event
      await this.trackEvent('session_start', {
        sessionId,
        userId,
        ...metadata
      }, userId, sessionId, metadata);

      logInfo('Session started', { sessionId, userId });
      return session;
    } catch (error) {
      logError('Failed to start session', error as Error, { userId });
      throw error;
    }
  }

  /**
   * End a user session
   */
  async endSession(sessionId: string): Promise<void> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        logWarning('Session not found for ending', { sessionId });
        return;
      }

      session.endTime = new Date();
      session.duration = session.endTime.getTime() - session.startTime.getTime();
      session.isActive = false;

      // Track session end event
      await this.trackEvent('session_end', {
        sessionId,
        userId: session.userId,
        duration: session.duration,
        pageViews: session.pageViews,
        events: session.events
      }, session.userId, sessionId);

      // Store session in database
      await this.storeSession(session);

      this.activeSessions.delete(sessionId);
      logInfo('Session ended', { sessionId, duration: session.duration });
    } catch (error) {
      logError('Failed to end session', error as Error, { sessionId });
    }
  }

  /**
   * Track page view
   */
  async trackPageView(
    page: string,
    userId?: string,
    sessionId?: string,
    metadata?: {
      userAgent?: string;
      ipAddress?: string;
      referrer?: string;
      duration?: number;
    }
  ): Promise<void> {
    try {
      const currentSessionId = sessionId || this.getOrCreateSession(userId, metadata).id;
      
      await this.trackEvent('page_view', {
        page,
        userId,
        sessionId: currentSessionId
      }, userId, currentSessionId, {
        ...metadata,
        page
      });

      // Update session page views
      this.updateSession(currentSessionId, 'page_view', page);
      
      logInfo('Page view tracked', { page, userId, sessionId: currentSessionId });
    } catch (error) {
      logError('Failed to track page view', error as Error, { page, userId });
    }
  }

  /**
   * Track user engagement events
   */
  async trackEngagement(
    action: 'like' | 'comment' | 'post' | 'follow' | 'share' | 'view',
    targetId: string,
    userId?: string,
    sessionId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const eventName = `engagement_${action}`;
      const properties = {
        action,
        targetId,
        ...metadata
      };

      await this.trackEvent(eventName, properties, userId, sessionId);
      
      logInfo('Engagement tracked', { action, targetId, userId });
    } catch (error) {
      logError('Failed to track engagement', error as Error, { action, targetId, userId });
    }
  }

  /**
   * Get analytics metrics
   */
  async getMetrics(filters?: AnalyticsFilters): Promise<AnalyticsMetrics> {
    try {
      const cacheKey = `analytics:metrics:${JSON.stringify(filters || {})}`;
      const cached = await cacheService.get(cacheKey);
      
      if (cached) {
        return cached as AnalyticsMetrics;
      }

      const startDate = filters?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const endDate = filters?.endDate || new Date();

      const [
        totalUsers,
        activeUsers,
        newUsers,
        returningUsers,
        totalSessions,
        averageSessionDuration,
        bounceRate,
        pageViews,
        uniquePageViews,
        topPages,
        topEvents,
        userEngagement,
        deviceStats,
        browserStats,
        locationStats,
        timeStats
      ] = await Promise.all([
        this.getTotalUsers(startDate, endDate),
        this.getActiveUsers(startDate, endDate),
        this.getNewUsers(startDate, endDate),
        this.getReturningUsers(startDate, endDate),
        this.getTotalSessions(startDate, endDate),
        this.getAverageSessionDuration(startDate, endDate),
        this.getBounceRate(startDate, endDate),
        this.getPageViews(startDate, endDate),
        this.getUniquePageViews(startDate, endDate),
        this.getTopPages(startDate, endDate),
        this.getTopEvents(startDate, endDate),
        this.getUserEngagement(startDate, endDate),
        this.getDeviceStats(startDate, endDate),
        this.getBrowserStats(startDate, endDate),
        this.getLocationStats(startDate, endDate),
        this.getTimeStats(startDate, endDate)
      ]);

      const metrics: AnalyticsMetrics = {
        totalUsers,
        activeUsers,
        newUsers,
        returningUsers,
        totalSessions,
        averageSessionDuration,
        bounceRate,
        pageViews,
        uniquePageViews,
        topPages,
        topEvents,
        userEngagement,
        deviceStats,
        browserStats,
        locationStats,
        timeStats
      };

      // Cache for 5 minutes
      await cacheService.set(cacheKey, metrics, { ttl: 300 });

      return metrics;
    } catch (error) {
      logError('Failed to get analytics metrics', error as Error, { filters });
      throw error;
    }
  }

  /**
   * Get user behavior analytics
   */
  async getUserBehavior(userId: string, days: number = 30): Promise<any> {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const [
        sessions,
        events,
        pageViews,
        engagement
      ] = await Promise.all([
        this.getUserSessions(userId, startDate, endDate),
        this.getUserEvents(userId, startDate, endDate),
        this.getUserPageViews(userId, startDate, endDate),
        this.getUserEngagementForUser(userId, startDate, endDate)
      ]);

      return {
        userId,
        period: { startDate, endDate, days },
        sessions,
        events,
        pageViews,
        engagement,
        summary: {
          totalSessions: sessions.length,
          totalEvents: events.length,
          totalPageViews: pageViews.length,
          averageSessionDuration: sessions.reduce((acc, s) => acc + (s.duration || 0), 0) / sessions.length,
          mostActiveHour: this.getMostActiveHour(events),
          favoritePages: this.getFavoritePages(pageViews),
          engagementScore: this.calculateEngagementScore(engagement)
        }
      };
    } catch (error) {
      logError('Failed to get user behavior', error as Error, { userId });
      throw error;
    }
  }

  /**
   * Get real-time analytics
   */
  async getRealTimeAnalytics(): Promise<any> {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const [
        activeUsers,
        activeSessions,
        recentEvents,
        topPages
      ] = await Promise.all([
        this.getActiveUsers(oneHourAgo, now),
        this.activeSessions.size,
        this.getRecentEvents(oneHourAgo, now),
        this.getTopPages(oneHourAgo, now)
      ]);

      return {
        timestamp: now,
        activeUsers,
        activeSessions,
        recentEvents: recentEvents.slice(0, 10),
        topPages: topPages.slice(0, 5),
        systemHealth: {
          eventQueueSize: this.eventQueue.length,
          activeSessionsCount: this.activeSessions.size,
          lastFlushTime: this.getLastFlushTime()
        }
      };
    } catch (error) {
      logError('Failed to get real-time analytics', error as Error);
      throw error;
    }
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(
    format: 'json' | 'csv',
    filters?: AnalyticsFilters
  ): Promise<string> {
    try {
      const data = await this.getAnalyticsData(filters);
      
      if (format === 'csv') {
        return this.convertToCSV(data);
      }
      
      return JSON.stringify(data, null, 2);
    } catch (error) {
      logError('Failed to export analytics', error as Error, { format, filters });
      throw error;
    }
  }

  // Private helper methods

  private getOrCreateSession(userId?: string, metadata?: any): UserSession {
    // Find existing active session for user
    for (const session of this.activeSessions.values()) {
      if (session.userId === userId && session.isActive) {
        return session;
      }
    }

    // Create new session
    const sessionId = uuidv4();
    const session: UserSession = {
      id: sessionId,
      userId,
      startTime: new Date(),
      pageViews: 0,
      events: 0,
      userAgent: metadata?.userAgent,
      ipAddress: metadata?.ipAddress,
      referrer: metadata?.referrer,
      isActive: true
    };

    this.activeSessions.set(sessionId, session);
    return session;
  }

  private updateSession(sessionId: string, eventName: string, page?: string): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.events++;
      if (eventName === 'page_view' && page) {
        session.pageViews++;
      }
    }
  }

  private getEventType(eventName: string): string {
    if (eventName.startsWith('engagement_')) return 'engagement';
    if (eventName === 'page_view') return 'page_view';
    if (eventName.startsWith('session_')) return 'session';
    return 'custom';
  }

  private startEventFlushTimer(): void {
    this.flushTimer = setInterval(async () => {
      if (this.eventQueue.length > 0) {
        await this.flushEvents();
      }
    }, this.FLUSH_INTERVAL);
  }

  private async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    try {
      const eventsToFlush = this.eventQueue.splice(0, this.BATCH_SIZE);
      
      // Store events in database
      await this.storeEvents(eventsToFlush);
      
      logInfo('Events flushed to database', { count: eventsToFlush.length });
    } catch (error) {
      logError('Failed to flush events', error as Error);
      // Re-add events to queue for retry
      this.eventQueue.unshift(...this.eventQueue);
    }
  }

  private async storeEvents(events: AnalyticsEvent[]): Promise<void> {
    // Implementation would store events in database
    // For now, we'll just log them
    logInfo('Storing analytics events', { count: events.length });
  }

  private async storeSession(session: UserSession): Promise<void> {
    // Implementation would store session in database
    logInfo('Storing analytics session', { sessionId: session.id });
  }

  // Analytics calculation methods
  private async getTotalUsers(startDate: Date, endDate: Date): Promise<number> {
    return await prisma.user.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    });
  }

  private async getActiveUsers(startDate: Date, endDate: Date): Promise<number> {
    // Implementation would count unique users with activity
    return 0;
  }

  private async getNewUsers(startDate: Date, endDate: Date): Promise<number> {
    return await prisma.user.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    });
  }

  private async getReturningUsers(startDate: Date, endDate: Date): Promise<number> {
    // Implementation would count users with activity before startDate
    return 0;
  }

  private async getTotalSessions(startDate: Date, endDate: Date): Promise<number> {
    // Implementation would count sessions
    return 0;
  }

  private async getAverageSessionDuration(startDate: Date, endDate: Date): Promise<number> {
    // Implementation would calculate average session duration
    return 0;
  }

  private async getBounceRate(startDate: Date, endDate: Date): Promise<number> {
    // Implementation would calculate bounce rate
    return 0;
  }

  private async getPageViews(startDate: Date, endDate: Date): Promise<number> {
    // Implementation would count page views
    return 0;
  }

  private async getUniquePageViews(startDate: Date, endDate: Date): Promise<number> {
    // Implementation would count unique page views
    return 0;
  }

  private async getTopPages(startDate: Date, endDate: Date): Promise<Array<{ page: string; views: number; uniqueViews: number }>> {
    // Implementation would return top pages
    return [];
  }

  private async getTopEvents(startDate: Date, endDate: Date): Promise<Array<{ event: string; count: number }>> {
    // Implementation would return top events
    return [];
  }

  private async getUserEngagement(startDate: Date, endDate: Date): Promise<{ likes: number; comments: number; posts: number; follows: number }> {
    const [likes, comments, posts, follows] = await Promise.all([
      prisma.like.count({ where: { createdAt: { gte: startDate, lte: endDate } } }),
      prisma.comment.count({ where: { createdAt: { gte: startDate, lte: endDate } } }),
      prisma.post.count({ where: { createdAt: { gte: startDate, lte: endDate } } }),
      prisma.connection.count({ where: { createdAt: { gte: startDate, lte: endDate } } })
    ]);

    return { likes, comments, posts, follows };
  }

  private async getDeviceStats(startDate: Date, endDate: Date): Promise<{ desktop: number; mobile: number; tablet: number; unknown: number }> {
    // Implementation would analyze user agents
    return { desktop: 0, mobile: 0, tablet: 0, unknown: 0 };
  }

  private async getBrowserStats(startDate: Date, endDate: Date): Promise<Array<{ browser: string; count: number }>> {
    // Implementation would analyze user agents
    return [];
  }

  private async getLocationStats(startDate: Date, endDate: Date): Promise<Array<{ location: string; count: number }>> {
    // Implementation would analyze IP addresses or user locations
    return [];
  }

  private async getTimeStats(startDate: Date, endDate: Date): Promise<{ hourly: Array<{ hour: number; count: number }>; daily: Array<{ day: string; count: number }>; weekly: Array<{ week: string; count: number }> }> {
    // Implementation would analyze time-based patterns
    return { hourly: [], daily: [], weekly: [] };
  }

  private async getUserSessions(userId: string, startDate: Date, endDate: Date): Promise<any[]> {
    // Implementation would return user sessions
    return [];
  }

  private async getUserEvents(userId: string, startDate: Date, endDate: Date): Promise<any[]> {
    // Implementation would return user events
    return [];
  }

  private async getUserPageViews(userId: string, startDate: Date, endDate: Date): Promise<any[]> {
    // Implementation would return user page views
    return [];
  }

  private async getUserEngagementForUser(userId: string, startDate: Date, endDate: Date): Promise<any> {
    // Implementation would return user-specific engagement data
    return {};
  }

  private async getRecentEvents(startDate: Date, endDate: Date): Promise<any[]> {
    // Implementation would return recent events
    return [];
  }

  private async getAnalyticsData(filters?: AnalyticsFilters): Promise<any> {
    // Implementation would return raw analytics data
    return {};
  }

  private convertToCSV(data: any): string {
    // Implementation would convert data to CSV format
    return '';
  }

  private getMostActiveHour(events: any[]): number {
    // Implementation would find most active hour
    return 0;
  }

  private getFavoritePages(pageViews: any[]): string[] {
    // Implementation would find favorite pages
    return [];
  }

  private calculateEngagementScore(engagement: any): number {
    // Implementation would calculate engagement score
    return 0;
  }

  private getLastFlushTime(): Date {
    return new Date();
  }

  /**
   * Cleanup method
   */
  async cleanup(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    // Flush remaining events
    if (this.eventQueue.length > 0) {
      await this.flushEvents();
    }
    
    // End all active sessions
    for (const sessionId of this.activeSessions.keys()) {
      await this.endSession(sessionId);
    }
  }
}

// Export singleton instance
export const analyticsService = AnalyticsService.getInstance();

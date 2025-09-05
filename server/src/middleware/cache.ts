import { Request, Response, NextFunction } from 'express';
import { cacheService, CacheKeys } from '../services/cache';
import { logInfo, logWarning } from '../utils/logger';
import { AuthenticatedRequest } from './auth';

/**
 * Cache middleware for Express routes
 */
export function cacheMiddleware(ttl: number = 300, keyGenerator?: (req: Request) => string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!cacheService.isAvailable()) {
      return next();
    }

    try {
      // Generate cache key
      const cacheKey = keyGenerator 
        ? keyGenerator(req) 
        : `${req.method}:${req.originalUrl}`;

      // Try to get from cache
      const cached = await cacheService.get(cacheKey);
      
      if (cached) {
        logInfo('Cache hit', { key: cacheKey, url: req.originalUrl });
        return res.json(cached);
      }

      // Store original res.json
      const originalJson = res.json;
      res.json = function(data: any) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cacheService.set(cacheKey, data, { ttl }).catch(error => {
            logWarning('Failed to cache response', { key: cacheKey, error: error.message });
          });
        }
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      logWarning('Cache middleware error', { error: (error as Error).message });
      next();
    }
  };
}

/**
 * Cache user profile data
 */
export function cacheUserProfile(ttl: number = 1800) { // 30 minutes
  return cacheMiddleware(ttl, (req: Request) => {
    const userId = (req as AuthenticatedRequest).user?.userId || req.params.userId;
    return CacheKeys.userProfile(userId);
  });
}

/**
 * Cache post data
 */
export function cachePost(ttl: number = 900) { // 15 minutes
  return cacheMiddleware(ttl, (req: Request) => {
    const postId = req.params.id || req.params.postId;
    return CacheKeys.post(postId);
  });
}

/**
 * Cache feed data
 */
export function cacheFeed(ttl: number = 300) { // 5 minutes
  return cacheMiddleware(ttl, (req: Request) => {
    const userId = (req as AuthenticatedRequest).user?.userId || 'anonymous';
    const page = parseInt(req.query.page as string) || 1;
    return CacheKeys.feed(userId, page);
  });
}

/**
 * Cache user posts
 */
export function cacheUserPosts(ttl: number = 600) { // 10 minutes
  return cacheMiddleware(ttl, (req: Request) => {
    const userId = req.params.userId;
    const page = parseInt(req.query.page as string) || 1;
    return CacheKeys.posts(userId, page);
  });
}

/**
 * Cache connections data
 */
export function cacheConnections(ttl: number = 1200) { // 20 minutes
  return cacheMiddleware(ttl, (req: Request) => {
    const userId = (req as AuthenticatedRequest).user?.userId || req.params.userId;
    return CacheKeys.connections(userId);
  });
}

/**
 * Cache comments data
 */
export function cacheComments(ttl: number = 300) { // 5 minutes
  return cacheMiddleware(ttl, (req: Request) => {
    const postId = req.params.id || req.params.postId;
    const page = parseInt(req.query.page as string) || 1;
    return CacheKeys.comments(postId, page);
  });
}

/**
 * Cache verification status
 */
export function cacheVerification(ttl: number = 3600) { // 1 hour
  return cacheMiddleware(ttl, (req: Request) => {
    const userId = (req as AuthenticatedRequest).user?.userId || req.params.userId;
    return CacheKeys.verification(userId);
  });
}

/**
 * Cache analytics data
 */
export function cacheAnalytics(ttl: number = 1800) { // 30 minutes
  return cacheMiddleware(ttl, (req: Request) => {
    const type = req.params.type || 'general';
    const date = req.query.date as string || new Date().toISOString().split('T')[0];
    return CacheKeys.analytics(type, date);
  });
}

/**
 * Invalidate cache for a specific user
 */
export async function invalidateUserCache(userId: string): Promise<void> {
  if (!cacheService.isAvailable()) return;

  try {
    const patterns = [
      CacheKeys.user(userId),
      CacheKeys.userProfile(userId),
      CacheKeys.connections(userId),
      CacheKeys.verification(userId),
      `posts:${userId}:*`,
      `feed:${userId}:*`
    ];

    for (const pattern of patterns) {
      if (pattern.includes('*')) {
        await cacheService.delPattern(pattern);
      } else {
        await cacheService.del(pattern);
      }
    }

    logInfo('User cache invalidated', { userId });
  } catch (error) {
    logWarning('Failed to invalidate user cache', { userId, error: (error as Error).message });
  }
}

/**
 * Invalidate cache for a specific post
 */
export async function invalidatePostCache(postId: string, userId?: string): Promise<void> {
  if (!cacheService.isAvailable()) return;

  try {
    const patterns = [
      CacheKeys.post(postId),
      CacheKeys.likes(postId),
      `comments:${postId}:*`
    ];

    // If we have the userId, also invalidate their feed and posts cache
    if (userId) {
      patterns.push(
        `posts:${userId}:*`,
        `feed:${userId}:*`
      );
    }

    for (const pattern of patterns) {
      if (pattern.includes('*')) {
        await cacheService.delPattern(pattern);
      } else {
        await cacheService.del(pattern);
      }
    }

    logInfo('Post cache invalidated', { postId, userId });
  } catch (error) {
    logWarning('Failed to invalidate post cache', { postId, userId, error: (error as Error).message });
  }
}

/**
 * Invalidate cache for connections
 */
export async function invalidateConnectionsCache(userId: string): Promise<void> {
  if (!cacheService.isAvailable()) return;

  try {
    await cacheService.del(CacheKeys.connections(userId));
    logInfo('Connections cache invalidated', { userId });
  } catch (error) {
    logWarning('Failed to invalidate connections cache', { userId, error: (error as Error).message });
  }
}

/**
 * Invalidate cache for verification
 */
export async function invalidateVerificationCache(userId: string): Promise<void> {
  if (!cacheService.isAvailable()) return;

  try {
    await cacheService.del(CacheKeys.verification(userId));
    logInfo('Verification cache invalidated', { userId });
  } catch (error) {
    logWarning('Failed to invalidate verification cache', { userId, error: (error as Error).message });
  }
}

/**
 * Cache warming middleware - preload frequently accessed data
 */
export async function warmCache(): Promise<void> {
  if (!cacheService.isAvailable()) return;

  try {
    logInfo('Starting cache warming...');
    
    // In a real implementation, you would:
    // 1. Get popular posts
    // 2. Get active users
    // 3. Get trending content
    // 4. Preload analytics data
    
    logInfo('Cache warming completed');
  } catch (error) {
    logWarning('Cache warming failed', { error: (error as Error).message });
  }
}

/**
 * Cache health check
 */
export async function checkCacheHealth(): Promise<{ healthy: boolean; stats: any }> {
  try {
    const stats = await cacheService.getStats();
    const healthy = cacheService.isAvailable() && stats.hitRate > 0;
    
    return { healthy, stats };
  } catch (error) {
    return { 
      healthy: false, 
      stats: { error: (error as Error).message } 
    };
  }
}

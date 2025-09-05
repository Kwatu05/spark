import { Router } from 'express';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { cacheService, CacheKeys } from '../services/cache';
import { 
  invalidateUserCache, 
  invalidatePostCache, 
  invalidateConnectionsCache,
  invalidateVerificationCache,
  warmCache,
  checkCacheHealth
} from '../middleware/cache';
import { logUserActionEvent } from '../middleware/observability';
import { logInfo, logError } from '../utils/logger';

const router = Router();

// Get cache statistics
router.get('/stats', requireAuth, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const stats = await cacheService.getStats();
    
    res.json({
      ok: true,
      stats
    });
  } catch (error) {
    logError('Failed to get cache stats', error as Error);
    
    res.status(500).json({
      ok: false,
      error: 'Failed to get cache statistics'
    });
  }
});

// Get cache health status
router.get('/health', requireAuth, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const health = await checkCacheHealth();
    
    res.json({
      ok: true,
      health
    });
  } catch (error) {
    logError('Failed to get cache health', error as Error);
    
    res.status(500).json({
      ok: false,
      error: 'Failed to get cache health'
    });
  }
});

// Clear all cache
router.post('/clear', requireAuth, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const result = await cacheService.flush();
    
    logUserActionEvent('cache_clear', req, {});
    
    res.json({
      ok: true,
      message: 'Cache cleared successfully',
      success: result
    });
  } catch (error) {
    logError('Failed to clear cache', error as Error);
    
    res.status(500).json({
      ok: false,
      error: 'Failed to clear cache'
    });
  }
});

// Clear cache for specific user
router.post('/clear/user/:userId', requireAuth, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const { userId } = req.params;
    
    await invalidateUserCache(userId);
    
    logUserActionEvent('cache_clear_user', req, { userId });
    
    res.json({
      ok: true,
      message: `Cache cleared for user ${userId}`,
      userId
    });
  } catch (error) {
    logError('Failed to clear user cache', error as Error, { userId: req.params.userId });
    
    res.status(500).json({
      ok: false,
      error: 'Failed to clear user cache'
    });
  }
});

// Clear cache for specific post
router.post('/clear/post/:postId', requireAuth, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const { postId } = req.params;
    const { userId } = req.body;
    
    await invalidatePostCache(postId, userId);
    
    logUserActionEvent('cache_clear_post', req, { postId, userId });
    
    res.json({
      ok: true,
      message: `Cache cleared for post ${postId}`,
      postId,
      userId
    });
  } catch (error) {
    logError('Failed to clear post cache', error as Error, { postId: req.params.postId });
    
    res.status(500).json({
      ok: false,
      error: 'Failed to clear post cache'
    });
  }
});

// Clear cache by pattern
router.post('/clear/pattern', requireAuth, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const { pattern } = req.body;
    
    if (!pattern) {
      return res.status(400).json({
        ok: false,
        error: 'Pattern is required'
      });
    }
    
    const deletedCount = await cacheService.delPattern(pattern);
    
    logUserActionEvent('cache_clear_pattern', req, { pattern, deletedCount });
    
    res.json({
      ok: true,
      message: `Cache cleared for pattern ${pattern}`,
      pattern,
      deletedCount
    });
  } catch (error) {
    logError('Failed to clear cache pattern', error as Error, { pattern: req.body.pattern });
    
    res.status(500).json({
      ok: false,
      error: 'Failed to clear cache pattern'
    });
  }
});

// Warm cache
router.post('/warm', requireAuth, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    await warmCache();
    
    logUserActionEvent('cache_warm', req, {});
    
    res.json({
      ok: true,
      message: 'Cache warming completed'
    });
  } catch (error) {
    logError('Failed to warm cache', error as Error);
    
    res.status(500).json({
      ok: false,
      error: 'Failed to warm cache'
    });
  }
});

// Get cache keys matching pattern
router.get('/keys', requireAuth, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const { pattern = '*' } = req.query;
    
    const keys = await cacheService.keys(pattern as string);
    
    res.json({
      ok: true,
      keys,
      count: keys.length,
      pattern
    });
  } catch (error) {
    logError('Failed to get cache keys', error as Error, { pattern: req.query.pattern });
    
    res.status(500).json({
      ok: false,
      error: 'Failed to get cache keys'
    });
  }
});

// Get specific cache value
router.get('/get/:key', requireAuth, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const { key } = req.params;
    
    const value = await cacheService.get(key);
    
    res.json({
      ok: true,
      key,
      value,
      exists: value !== null
    });
  } catch (error) {
    logError('Failed to get cache value', error as Error, { key: req.params.key });
    
    res.status(500).json({
      ok: false,
      error: 'Failed to get cache value'
    });
  }
});

// Set specific cache value
router.post('/set', requireAuth, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const { key, value, ttl } = req.body;
    
    if (!key || value === undefined) {
      return res.status(400).json({
        ok: false,
        error: 'Key and value are required'
      });
    }
    
    const success = await cacheService.set(key, value, { ttl });
    
    logUserActionEvent('cache_set', req, { key, ttl });
    
    res.json({
      ok: true,
      message: 'Cache value set successfully',
      key,
      success
    });
  } catch (error) {
    logError('Failed to set cache value', error as Error, { key: req.body.key });
    
    res.status(500).json({
      ok: false,
      error: 'Failed to set cache value'
    });
  }
});

// Delete specific cache key
router.delete('/delete/:key', requireAuth, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const { key } = req.params;
    
    const success = await cacheService.del(key);
    
    logUserActionEvent('cache_delete', req, { key });
    
    res.json({
      ok: true,
      message: 'Cache key deleted successfully',
      key,
      success
    });
  } catch (error) {
    logError('Failed to delete cache key', error as Error, { key: req.params.key });
    
    res.status(500).json({
      ok: false,
      error: 'Failed to delete cache key'
    });
  }
});

// Get cache memory usage
router.get('/memory', requireAuth, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const stats = await cacheService.getStats();
    
    res.json({
      ok: true,
      memory: {
        usage: stats.memoryUsage,
        connectedClients: stats.connectedClients
      }
    });
  } catch (error) {
    logError('Failed to get cache memory info', error as Error);
    
    res.status(500).json({
      ok: false,
      error: 'Failed to get cache memory information'
    });
  }
});

export default router;

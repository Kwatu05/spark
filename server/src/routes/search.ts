import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { searchService } from '../services/search';
import { logUserActionEvent } from '../middleware/observability';
import { logInfo, logError } from '../utils/logger';
import { cacheService } from '../services/cache';

const prisma = new PrismaClient();

const router = Router();

// Main search endpoint
router.get('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      q: query,
      type = 'all',
      limit = 20,
      page = 1,
      sort = 'relevance',
      location,
      tags,
      verified,
      dateFrom,
      dateTo
    } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        ok: false,
        error: 'Search query is required'
      });
    }

    const userId = req.user?.userId;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    // Check cache first
    const cacheKey = `search:${query}:${type}:${page}:${sort}:${location}:${tags}:${verified}:${dateFrom}:${dateTo}`;
    const cached = await cacheService.get(cacheKey);
    
    if (cached) {
      logInfo('Search cache hit', { query, type, userId });
      return res.json(cached);
    }

    // Prepare filters
    const filters: any = {};
    if (location) filters.location = location as string;
    if (tags) filters.tags = (tags as string).split(',');
    if (verified !== undefined) filters.verified = verified === 'true';
    if (dateFrom || dateTo) {
      filters.dateRange = {
        start: dateFrom ? new Date(dateFrom as string) : new Date(0),
        end: dateTo ? new Date(dateTo as string) : new Date()
      };
    }

    // Perform search
    const searchOptions = {
      query: query.trim(),
      type: type as 'all' | 'users' | 'posts' | 'comments',
      limit: parseInt(limit as string),
      offset,
      sortBy: sort as 'relevance' | 'date' | 'popularity',
      filters
    };

    const results = await searchService.search(searchOptions);

    // Cache results for 5 minutes
    await cacheService.set(cacheKey, {
      ok: true,
      ...results
    }, { ttl: 300 });

    // Log search action
    logUserActionEvent('search', req, {
      query,
      type,
      resultsCount: results.results.length,
      total: results.total
    });

    res.json({
      ok: true,
      ...results
    });
  } catch (error) {
    logError('Search failed', error as Error, {
      userId: req.user?.userId,
      query: req.query.q
    });
    
    res.status(500).json({
      ok: false,
      error: 'Search failed'
    });
  }
});

// Search suggestions endpoint
router.get('/suggestions', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { q: query } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        ok: false,
        error: 'Search query is required'
      });
    }

    // Check cache
    const cacheKey = `search:suggestions:${query}`;
    const cached = await cacheService.get(cacheKey);
    
    if (cached) {
      return res.json(cached);
    }

    // Get suggestions from search service
    const suggestions = await searchService.generateSuggestions(query.trim());

    // Cache suggestions for 10 minutes
    await cacheService.set(cacheKey, {
      ok: true,
      suggestions
    }, { ttl: 600 });

    res.json({
      ok: true,
      suggestions
    });
  } catch (error) {
    logError('Search suggestions failed', error as Error, {
      userId: req.user?.userId,
      query: req.query.q
    });
    
    res.status(500).json({
      ok: false,
      error: 'Failed to get suggestions'
    });
  }
});

// Search analytics endpoint (admin only)
router.get('/analytics', requireAuth, async (req: AuthenticatedRequest, res) => {
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

    const analytics = await searchService.getSearchAnalytics();

    res.json({
      ok: true,
      analytics
    });
  } catch (error) {
    logError('Search analytics failed', error as Error, {
      userId: req.user?.userId
    });
    
    res.status(500).json({
      ok: false,
      error: 'Failed to get search analytics'
    });
  }
});

// Rebuild search indexes (admin only)
router.post('/rebuild-indexes', requireAuth, async (req: AuthenticatedRequest, res) => {
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

    await searchService.rebuildIndexes();

    logUserActionEvent('search_rebuild_indexes', req, {});

    res.json({
      ok: true,
      message: 'Search indexes rebuilt successfully'
    });
  } catch (error) {
    logError('Search index rebuild failed', error as Error, {
      userId: req.user?.userId
    });
    
    res.status(500).json({
      ok: false,
      error: 'Failed to rebuild search indexes'
    });
  }
});

// Clear search cache (admin only)
router.post('/clear-cache', requireAuth, async (req: AuthenticatedRequest, res) => {
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

    await searchService.clearSearchCache();

    logUserActionEvent('search_clear_cache', req, {});

    res.json({
      ok: true,
      message: 'Search cache cleared successfully'
    });
  } catch (error) {
    logError('Search cache clear failed', error as Error, {
      userId: req.user?.userId
    });
    
    res.status(500).json({
      ok: false,
      error: 'Failed to clear search cache'
    });
  }
});

// Advanced search endpoint
router.post('/advanced', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      query,
      type = 'all',
      limit = 20,
      page = 1,
      sortBy = 'relevance',
      filters = {}
    } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        ok: false,
        error: 'Search query is required'
      });
    }

    const userId = req.user?.userId;
    const offset = (page - 1) * limit;

    // Check cache
    const cacheKey = `search:advanced:${JSON.stringify({ query, type, page, sortBy, filters })}`;
    const cached = await cacheService.get(cacheKey);
    
    if (cached) {
      logInfo('Advanced search cache hit', { query, type, userId });
      return res.json(cached);
    }

    // Perform advanced search
    const searchOptions = {
      query: query.trim(),
      type: type as 'all' | 'users' | 'posts' | 'comments',
      limit,
      offset,
      sortBy: sortBy as 'relevance' | 'date' | 'popularity',
      filters
    };

    const results = await searchService.search(searchOptions);

    // Cache results for 5 minutes
    await cacheService.set(cacheKey, {
      ok: true,
      ...results
    }, { ttl: 300 });

    // Log search action
    logUserActionEvent('advanced_search', req, {
      query,
      type,
      resultsCount: results.results.length,
      total: results.total,
      filters
    });

    res.json({
      ok: true,
      ...results
    });
  } catch (error) {
    logError('Advanced search failed', error as Error, {
      userId: req.user?.userId,
      query: req.body.query
    });
    
    res.status(500).json({
      ok: false,
      error: 'Advanced search failed'
    });
  }
});

// Search trending topics
router.get('/trending', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { limit = 10 } = req.query;

    // Check cache
    const cacheKey = `search:trending:${limit}`;
    const cached = await cacheService.get(cacheKey);
    
    if (cached) {
      return res.json(cached);
    }

    // Get trending data
    const analytics = await searchService.getSearchAnalytics();
    const trending = {
      tags: analytics.popularTags?.slice(0, parseInt(limit as string)) || [],
      locations: analytics.popularLocations?.slice(0, parseInt(limit as string)) || []
    };

    // Cache for 1 hour
    await cacheService.set(cacheKey, {
      ok: true,
      trending
    }, { ttl: 3600 });

    res.json({
      ok: true,
      trending
    });
  } catch (error) {
    logError('Trending search failed', error as Error, {
      userId: req.user?.userId
    });
    
    res.status(500).json({
      ok: false,
      error: 'Failed to get trending topics'
    });
  }
});

export default router;

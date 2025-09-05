import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { loadTestingService } from '../services/loadTesting';
import { logUserActionEvent } from '../middleware/observability';
import { logInfo, logError } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// Run single load test (admin only)
router.post('/test', requireAuth, async (req: AuthenticatedRequest, res) => {
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
      url,
      connections = 10,
      duration = 10,
      requests = 0,
      headers = {},
      body,
      method = 'GET'
    } = req.body;

    if (!url) {
      return res.status(400).json({
        ok: false,
        error: 'URL is required'
      });
    }

    const result = await loadTestingService.runLoadTest({
      url,
      connections,
      duration,
      requests,
      headers,
      body,
      method
    });

    logUserActionEvent('load_test_run', req, { url, connections, duration });

    res.json({
      ok: true,
      result
    });
  } catch (error) {
    logError('Load test failed', error as Error, {
      userId: req.user?.userId,
      url: req.body.url
    });
    
    res.status(500).json({
      ok: false,
      error: 'Load test failed'
    });
  }
});

// Run comprehensive load tests (admin only)
router.post('/comprehensive', requireAuth, async (req: AuthenticatedRequest, res) => {
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

    const { baseUrl } = req.body;

    const results = await loadTestingService.runComprehensiveTests(baseUrl);

    logUserActionEvent('comprehensive_load_test_run', req, { baseUrl });

    res.json({
      ok: true,
      ...results
    });
  } catch (error) {
    logError('Comprehensive load test failed', error as Error, {
      userId: req.user?.userId
    });
    
    res.status(500).json({
      ok: false,
      error: 'Comprehensive load test failed'
    });
  }
});

// Run stress test (admin only)
router.post('/stress', requireAuth, async (req: AuthenticatedRequest, res) => {
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

    const { baseUrl } = req.body;

    const results = await loadTestingService.runStressTest(baseUrl);

    logUserActionEvent('stress_test_run', req, { baseUrl });

    res.json({
      ok: true,
      ...results
    });
  } catch (error) {
    logError('Stress test failed', error as Error, {
      userId: req.user?.userId
    });
    
    res.status(500).json({
      ok: false,
      error: 'Stress test failed'
    });
  }
});

// Start performance monitoring (admin only)
router.post('/monitor', requireAuth, async (req: AuthenticatedRequest, res) => {
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

    const { duration = 300 } = req.body;

    // Start monitoring in background
    loadTestingService.runPerformanceMonitoring(duration).catch(error => {
      logError('Performance monitoring failed', error as Error);
    });

    logUserActionEvent('performance_monitoring_start', req, { duration });

    res.json({
      ok: true,
      message: 'Performance monitoring started',
      duration
    });
  } catch (error) {
    logError('Failed to start performance monitoring', error as Error, {
      userId: req.user?.userId
    });
    
    res.status(500).json({
      ok: false,
      error: 'Failed to start performance monitoring'
    });
  }
});

// Generate performance report (admin only)
router.post('/report', requireAuth, async (req: AuthenticatedRequest, res) => {
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

    const { results } = req.body;

    if (!results || !Array.isArray(results)) {
      return res.status(400).json({
        ok: false,
        error: 'Test results array is required'
      });
    }

    const report = loadTestingService.generatePerformanceReport(results);

    logUserActionEvent('performance_report_generated', req, { resultsCount: results.length });

    res.json({
      ok: true,
      report
    });
  } catch (error) {
    logError('Failed to generate performance report', error as Error, {
      userId: req.user?.userId
    });
    
    res.status(500).json({
      ok: false,
      error: 'Failed to generate performance report'
    });
  }
});

// Get load testing status (admin only)
router.get('/status', requireAuth, async (req: AuthenticatedRequest, res) => {
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

    // Get system performance metrics
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const uptime = process.uptime();

    const status = {
      isRunning: false, // Would be tracked in the service
      systemMetrics: {
        memory: {
          used: memoryUsage.heapUsed,
          total: memoryUsage.heapTotal,
          external: memoryUsage.external,
          rss: memoryUsage.rss
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system
        },
        uptime: uptime
      },
      recommendations: [
        'Run comprehensive load tests to identify bottlenecks',
        'Monitor memory usage during high load',
        'Test database performance under stress',
        'Validate caching effectiveness'
      ]
    };

    res.json({
      ok: true,
      status
    });
  } catch (error) {
    logError('Failed to get load testing status', error as Error, {
      userId: req.user?.userId
    });
    
    res.status(500).json({
      ok: false,
      error: 'Failed to get load testing status'
    });
  }
});

// Get performance benchmarks (admin only)
router.get('/benchmarks', requireAuth, async (req: AuthenticatedRequest, res) => {
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

    const benchmarks = {
      targets: {
        responseTime: {
          excellent: 100, // ms
          good: 500,
          acceptable: 1000,
          poor: 2000
        },
        throughput: {
          excellent: 1000, // req/s
          good: 500,
          acceptable: 100,
          poor: 10
        },
        errorRate: {
          excellent: 0.1, // %
          good: 0.5,
          acceptable: 1.0,
          poor: 5.0
        },
        availability: {
          excellent: 99.99, // %
          good: 99.9,
          acceptable: 99.0,
          poor: 95.0
        }
      },
      currentMetrics: {
        responseTime: 0, // Would be populated from actual metrics
        throughput: 0,
        errorRate: 0,
        availability: 0
      },
      recommendations: [
        'Implement response time monitoring',
        'Set up throughput alerts',
        'Monitor error rates continuously',
        'Track system availability'
      ]
    };

    res.json({
      ok: true,
      benchmarks
    });
  } catch (error) {
    logError('Failed to get performance benchmarks', error as Error, {
      userId: req.user?.userId
    });
    
    res.status(500).json({
      ok: false,
      error: 'Failed to get performance benchmarks'
    });
  }
});

export default router;

import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/auth';
import queueService, { 
  addMediaProcessingJob, 
  addEmailJob, 
  addPushNotificationJob, 
  addAnalyticsJob, 
  addDataProcessingJob,
  getQueueStats,
  cleanupQueues
} from '../services/queueService';
import { logInfo, logError } from '../utils/logger';

const router = Router();

// Get queue statistics
router.get('/stats', requireAuth, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const stats = await getQueueStats();
    
    res.json({
      ok: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logError('Failed to get queue stats', error as Error);
    res.status(500).json({
      ok: false,
      error: 'Failed to get queue statistics'
    });
  }
});

// Get specific queue details
router.get('/queue/:queueName', requireAuth, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const { queueName } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    const queue = queueService[`${queueName}Queue` as keyof typeof queueService];
    
    if (!queue) {
      return res.status(404).json({
        ok: false,
        error: 'Queue not found'
      });
    }
    
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaiting(Number(page), Number(limit)),
      queue.getActive(Number(page), Number(limit)),
      queue.getCompleted(Number(page), Number(limit)),
      queue.getFailed(Number(page), Number(limit)),
      queue.getDelayed(Number(page), Number(limit))
    ]);
    
    res.json({
      ok: true,
      data: {
        queue: queueName,
        waiting: waiting.map(job => ({
          id: job.id,
          name: job.name,
          data: job.data,
          progress: job.progress(),
          timestamp: job.timestamp,
          delay: job.delay
        })),
        active: active.map(job => ({
          id: job.id,
          name: job.name,
          data: job.data,
          progress: job.progress(),
          timestamp: job.timestamp,
          processedOn: job.processedOn
        })),
        completed: completed.map(job => ({
          id: job.id,
          name: job.name,
          data: job.data,
          returnvalue: job.returnvalue,
          timestamp: job.timestamp,
          finishedOn: job.finishedOn
        })),
        failed: failed.map(job => ({
          id: job.id,
          name: job.name,
          data: job.data,
          failedReason: job.failedReason,
          timestamp: job.timestamp,
          finishedOn: job.finishedOn,
          attemptsMade: job.attemptsMade
        })),
        delayed: delayed.map(job => ({
          id: job.id,
          name: job.name,
          data: job.data,
          timestamp: job.timestamp,
          delay: job.delay
        }))
      }
    });
  } catch (error) {
    logError('Failed to get queue details', error as Error);
    res.status(500).json({
      ok: false,
      error: 'Failed to get queue details'
    });
  }
});

// Retry failed job
router.post('/queue/:queueName/job/:jobId/retry', requireAuth, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const { queueName, jobId } = req.params;
    
    const queue = queueService[`${queueName}Queue` as keyof typeof queueService];
    
    if (!queue) {
      return res.status(404).json({
        ok: false,
        error: 'Queue not found'
      });
    }
    
    const job = await queue.getJob(jobId);
    
    if (!job) {
      return res.status(404).json({
        ok: false,
        error: 'Job not found'
      });
    }
    
    await job.retry();
    
    logInfo('Job retried', { queueName, jobId, adminId: req.user?.userId });
    
    res.json({
      ok: true,
      message: 'Job retried successfully'
    });
  } catch (error) {
    logError('Failed to retry job', error as Error);
    res.status(500).json({
      ok: false,
      error: 'Failed to retry job'
    });
  }
});

// Remove job
router.delete('/queue/:queueName/job/:jobId', requireAuth, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const { queueName, jobId } = req.params;
    
    const queue = queueService[`${queueName}Queue` as keyof typeof queueService];
    
    if (!queue) {
      return res.status(404).json({
        ok: false,
        error: 'Queue not found'
      });
    }
    
    const job = await queue.getJob(jobId);
    
    if (!job) {
      return res.status(404).json({
        ok: false,
        error: 'Job not found'
      });
    }
    
    await job.remove();
    
    logInfo('Job removed', { queueName, jobId, adminId: req.user?.userId });
    
    res.json({
      ok: true,
      message: 'Job removed successfully'
    });
  } catch (error) {
    logError('Failed to remove job', error as Error);
    res.status(500).json({
      ok: false,
      error: 'Failed to remove job'
    });
  }
});

// Pause queue
router.post('/queue/:queueName/pause', requireAuth, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const { queueName } = req.params;
    
    const queue = queueService[`${queueName}Queue` as keyof typeof queueService];
    
    if (!queue) {
      return res.status(404).json({
        ok: false,
        error: 'Queue not found'
      });
    }
    
    await queue.pause();
    
    logInfo('Queue paused', { queueName, adminId: req.user?.userId });
    
    res.json({
      ok: true,
      message: 'Queue paused successfully'
    });
  } catch (error) {
    logError('Failed to pause queue', error as Error);
    res.status(500).json({
      ok: false,
      error: 'Failed to pause queue'
    });
  }
});

// Resume queue
router.post('/queue/:queueName/resume', requireAuth, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const { queueName } = req.params;
    
    const queue = queueService[`${queueName}Queue` as keyof typeof queueService];
    
    if (!queue) {
      return res.status(404).json({
        ok: false,
        error: 'Queue not found'
      });
    }
    
    await queue.resume();
    
    logInfo('Queue resumed', { queueName, adminId: req.user?.userId });
    
    res.json({
      ok: true,
      message: 'Queue resumed successfully'
    });
  } catch (error) {
    logError('Failed to resume queue', error as Error);
    res.status(500).json({
      ok: false,
      error: 'Failed to resume queue'
    });
  }
});

// Clean queue
router.post('/queue/:queueName/clean', requireAuth, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const { queueName } = req.params;
    const { type = 'completed', grace = 24 * 60 * 60 * 1000 } = req.body; // Default 24 hours
    
    const queue = queueService[`${queueName}Queue` as keyof typeof queueService];
    
    if (!queue) {
      return res.status(404).json({
        ok: false,
        error: 'Queue not found'
      });
    }
    
    const cleaned = await queue.clean(grace, type);
    
    logInfo('Queue cleaned', { queueName, type, grace, cleaned, adminId: req.user?.userId });
    
    res.json({
      ok: true,
      message: 'Queue cleaned successfully',
      cleaned
    });
  } catch (error) {
    logError('Failed to clean queue', error as Error);
    res.status(500).json({
      ok: false,
      error: 'Failed to clean queue'
    });
  }
});

// Clean all queues
router.post('/cleanup', requireAuth, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    await cleanupQueues();
    
    logInfo('All queues cleaned', { adminId: req.user?.userId });
    
    res.json({
      ok: true,
      message: 'All queues cleaned successfully'
    });
  } catch (error) {
    logError('Failed to clean all queues', error as Error);
    res.status(500).json({
      ok: false,
      error: 'Failed to clean all queues'
    });
  }
});

// Add test job (for development)
router.post('/test/:queueName', requireAuth, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const { queueName } = req.params;
    const { jobData } = req.body;
    
    let job;
    
    switch (queueName) {
      case 'media':
        job = await addMediaProcessingJob(jobData);
        break;
      case 'email':
        job = await addEmailJob(jobData);
        break;
      case 'push':
        job = await addPushNotificationJob(jobData);
        break;
      case 'analytics':
        job = await addAnalyticsJob(jobData);
        break;
      case 'data':
        job = await addDataProcessingJob(jobData);
        break;
      default:
        return res.status(400).json({
          ok: false,
          error: 'Invalid queue name'
        });
    }
    
    logInfo('Test job added', { queueName, jobId: job.id, adminId: req.user?.userId });
    
    res.json({
      ok: true,
      message: 'Test job added successfully',
      jobId: job.id
    });
  } catch (error) {
    logError('Failed to add test job', error as Error);
    res.status(500).json({
      ok: false,
      error: 'Failed to add test job'
    });
  }
});

// Get queue health
router.get('/health', requireAuth, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const stats = await getQueueStats();
    
    // Check if any queue has too many failed jobs
    const unhealthyQueues = [];
    for (const [queueName, queueStats] of Object.entries(stats)) {
      if (queueStats.failed > 100) { // Threshold for unhealthy
        unhealthyQueues.push(queueName);
      }
    }
    
    const isHealthy = unhealthyQueues.length === 0;
    
    res.json({
      ok: true,
      healthy: isHealthy,
      unhealthyQueues,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logError('Failed to check queue health', error as Error);
    res.status(500).json({
      ok: false,
      error: 'Failed to check queue health'
    });
  }
});

export default router;

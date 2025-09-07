import Queue from 'bull';
import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
import { logInfo, logError, logWarn } from '../utils/logger';

const prisma = new PrismaClient();

// Redis connection for Bull queues
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true
});

// Queue definitions
export const mediaProcessingQueue = new Queue('media processing', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

export const emailQueue = new Queue('email notifications', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },
  defaultJobOptions: {
    removeOnComplete: 200,
    removeOnFail: 100,
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
});

export const pushNotificationQueue = new Queue('push notifications', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 3000,
    },
  },
});

export const analyticsQueue = new Queue('analytics processing', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 25,
    attempts: 2,
    backoff: {
      type: 'fixed',
      delay: 1000,
    },
  },
});

export const dataProcessingQueue = new Queue('data processing', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },
  defaultJobOptions: {
    removeOnComplete: 20,
    removeOnFail: 10,
    attempts: 1,
    backoff: {
      type: 'fixed',
      delay: 5000,
    },
  },
});

// Job interfaces
export interface MediaProcessingJob {
  type: 'image' | 'video' | 'thumbnail';
  filePath: string;
  userId: string;
  postId?: string;
  options?: {
    width?: number;
    height?: number;
    quality?: number;
    format?: string;
  };
}

export interface EmailJob {
  type: 'welcome' | 'verification' | 'notification' | 'marketing';
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
  priority?: 'low' | 'normal' | 'high';
}

export interface PushNotificationJob {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  badge?: number;
  sound?: string;
  priority?: 'low' | 'normal' | 'high';
}

export interface AnalyticsJob {
  type: 'user_action' | 'post_interaction' | 'page_view' | 'search';
  userId?: string;
  data: Record<string, any>;
  timestamp: Date;
}

export interface DataProcessingJob {
  type: 'export' | 'anonymize' | 'backup' | 'cleanup';
  userId?: string;
  data: Record<string, any>;
  priority?: 'low' | 'normal' | 'high';
}

// Media Processing Job Handler
mediaProcessingQueue.process('image', 5, async (job) => {
  const { filePath, userId, postId, options } = job.data as MediaProcessingJob;
  
  try {
    logInfo('Processing image', { filePath, userId, postId, jobId: job.id });
    
    const inputBuffer = await fs.readFile(filePath);
    const outputDir = path.dirname(filePath);
    const baseName = path.basename(filePath, path.extname(filePath));
    
    // Generate different sizes
    const sizes = [
      { name: 'thumbnail', width: 150, height: 150 },
      { name: 'small', width: 400, height: 400 },
      { name: 'medium', width: 800, height: 800 },
      { name: 'large', width: 1200, height: 1200 }
    ];
    
    const processedFiles: string[] = [];
    
    for (const size of sizes) {
      const outputPath = path.join(outputDir, `${baseName}_${size.name}.webp`);
      
      await sharp(inputBuffer)
        .resize(size.width, size.height, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .webp({ quality: options?.quality || 85 })
        .toFile(outputPath);
        
      processedFiles.push(outputPath);
    }
    
    // Update database with processed file paths
    if (postId) {
      await prisma.post.update({
        where: { id: postId },
        data: {
          mediaProcessed: true,
          mediaUrls: processedFiles
        }
      });
    }
    
    logInfo('Image processing completed', { 
      filePath, 
      processedFiles: processedFiles.length,
      jobId: job.id 
    });
    
    return { success: true, processedFiles };
  } catch (error) {
    logError('Image processing failed', error as Error, { filePath, jobId: job.id });
    throw error;
  }
});

mediaProcessingQueue.process('video', 2, async (job) => {
  const { filePath, userId, postId } = job.data as MediaProcessingJob;
  
  try {
    logInfo('Processing video', { filePath, userId, postId, jobId: job.id });
    
    // For now, we'll just generate a thumbnail
    // In production, you'd use FFmpeg for video processing
    const outputDir = path.dirname(filePath);
    const baseName = path.basename(filePath, path.extname(filePath));
    const thumbnailPath = path.join(outputDir, `${baseName}_thumbnail.jpg`);
    
    // Placeholder for video thumbnail generation
    // In production: ffmpeg -i input.mp4 -ss 00:00:01 -vframes 1 thumbnail.jpg
    
    logInfo('Video processing completed', { filePath, jobId: job.id });
    
    return { success: true, thumbnailPath };
  } catch (error) {
    logError('Video processing failed', error as Error, { filePath, jobId: job.id });
    throw error;
  }
});

// Email Job Handler
emailQueue.process('send', 10, async (job) => {
  const { type, to, subject, template, data, priority } = job.data as EmailJob;
  
  try {
    logInfo('Sending email', { type, to, subject, jobId: job.id });
    
    // Simulate email sending
    // In production, integrate with SendGrid, AWS SES, or similar
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Log email activity
    await prisma.dataProcessingActivity.create({
      data: {
        userId: data.userId || 'system',
        activity: 'email_sent',
        description: `Email sent: ${type} to ${to}`,
        metadata: JSON.stringify({ type, subject, template })
      }
    });
    
    logInfo('Email sent successfully', { type, to, jobId: job.id });
    
    return { success: true, messageId: `email_${Date.now()}` };
  } catch (error) {
    logError('Email sending failed', error as Error, { type, to, jobId: job.id });
    throw error;
  }
});

// Push Notification Job Handler
pushNotificationQueue.process('send', 15, async (job) => {
  const { userId, title, body, data, badge, sound, priority } = job.data as PushNotificationJob;
  
  try {
    logInfo('Sending push notification', { userId, title, jobId: job.id });
    
    // Get user's push subscriptions
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId }
    });
    
    if (subscriptions.length === 0) {
      logWarn('No push subscriptions found', { userId });
      return { success: false, reason: 'No subscriptions' };
    }
    
    // Simulate push notification sending
    // In production, use web-push library
    for (const subscription of subscriptions) {
      // webpush.sendNotification(subscription, JSON.stringify({ title, body, data }))
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    logInfo('Push notification sent', { 
      userId, 
      subscriptions: subscriptions.length,
      jobId: job.id 
    });
    
    return { success: true, sent: subscriptions.length };
  } catch (error) {
    logError('Push notification failed', error as Error, { userId, jobId: job.id });
    throw error;
  }
});

// Analytics Job Handler
analyticsQueue.process('track', 20, async (job) => {
  const { type, userId, data, timestamp } = job.data as AnalyticsJob;
  
  try {
    logInfo('Processing analytics', { type, userId, jobId: job.id });
    
    // Store analytics data
    // In production, send to analytics service (Google Analytics, Mixpanel, etc.)
    await prisma.dataProcessingActivity.create({
      data: {
        userId: userId || 'anonymous',
        activity: `analytics_${type}`,
        description: `Analytics event: ${type}`,
        timestamp,
        metadata: JSON.stringify(data)
      }
    });
    
    logInfo('Analytics processed', { type, userId, jobId: job.id });
    
    return { success: true };
  } catch (error) {
    logError('Analytics processing failed', error as Error, { type, userId, jobId: job.id });
    throw error;
  }
});

// Data Processing Job Handler
dataProcessingQueue.process('export', 1, async (job) => {
  const { userId, data } = job.data as DataProcessingJob;
  
  try {
    logInfo('Processing data export', { userId, jobId: job.id });
    
    // Export user data
    const userData = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        posts: true,
        comments: true,
        likes: true,
        connections: true
      }
    });
    
    // In production, save to secure storage and send download link
    const exportData = {
      user: userData,
      exportedAt: new Date(),
      format: 'json'
    };
    
    logInfo('Data export completed', { userId, jobId: job.id });
    
    return { success: true, dataSize: JSON.stringify(exportData).length };
  } catch (error) {
    logError('Data export failed', error as Error, { userId, jobId: job.id });
    throw error;
  }
});

dataProcessingQueue.process('cleanup', 1, async (job) => {
  const { data } = job.data as DataProcessingJob;
  
  try {
    logInfo('Processing data cleanup', { jobId: job.id });
    
    // Clean up old data based on retention policies
    const retentionPolicies = await prisma.dataRetentionPolicy.findMany({
      where: { active: true }
    });
    
    let cleanedCount = 0;
    
    for (const policy of retentionPolicies) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - policy.retentionPeriod);
      
      // Clean up old data (example: old notifications)
      if (policy.dataCategory === 'notifications') {
        const result = await prisma.notification.deleteMany({
          where: {
            createdAt: { lt: cutoffDate },
            read: true
          }
        });
        cleanedCount += result.count;
      }
    }
    
    logInfo('Data cleanup completed', { cleanedCount, jobId: job.id });
    
    return { success: true, cleanedCount };
  } catch (error) {
    logError('Data cleanup failed', error as Error, { jobId: job.id });
    throw error;
  }
});

// Queue event handlers
const setupQueueEventHandlers = () => {
  const queues = [mediaProcessingQueue, emailQueue, pushNotificationQueue, analyticsQueue, dataProcessingQueue];
  
  queues.forEach(queue => {
    queue.on('completed', (job, result) => {
      logInfo('Job completed', { 
        queue: queue.name, 
        jobId: job.id, 
        jobType: job.name,
        duration: Date.now() - job.timestamp
      });
    });
    
    queue.on('failed', (job, err) => {
      logError('Job failed', err, { 
        queue: queue.name, 
        jobId: job.id, 
        jobType: job.name,
        attempts: job.attemptsMade
      });
    });
    
    queue.on('stalled', (job) => {
      logWarn('Job stalled', { 
        queue: queue.name, 
        jobId: job.id, 
        jobType: job.name 
      });
    });
  });
};

// Queue management functions
export const addMediaProcessingJob = async (jobData: MediaProcessingJob) => {
  return await mediaProcessingQueue.add(jobData.type, jobData, {
    priority: jobData.type === 'thumbnail' ? 1 : 5
  });
};

export const addEmailJob = async (jobData: EmailJob) => {
  const priority = jobData.priority === 'high' ? 1 : jobData.priority === 'low' ? 10 : 5;
  return await emailQueue.add('send', jobData, { priority });
};

export const addPushNotificationJob = async (jobData: PushNotificationJob) => {
  const priority = jobData.priority === 'high' ? 1 : jobData.priority === 'low' ? 10 : 5;
  return await pushNotificationQueue.add('send', jobData, { priority });
};

export const addAnalyticsJob = async (jobData: AnalyticsJob) => {
  return await analyticsQueue.add('track', jobData);
};

export const addDataProcessingJob = async (jobData: DataProcessingJob) => {
  const priority = jobData.priority === 'high' ? 1 : jobData.priority === 'low' ? 10 : 5;
  return await dataProcessingQueue.add(jobData.type, jobData, { priority });
};

// Queue statistics
export const getQueueStats = async () => {
  const queues = [mediaProcessingQueue, emailQueue, pushNotificationQueue, analyticsQueue, dataProcessingQueue];
  const stats = {};
  
  for (const queue of queues) {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed(),
      queue.getDelayed()
    ]);
    
    stats[queue.name] = {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length
    };
  }
  
  return stats;
};

// Cleanup function
export const cleanupQueues = async () => {
  const queues = [mediaProcessingQueue, emailQueue, pushNotificationQueue, analyticsQueue, dataProcessingQueue];
  
  for (const queue of queues) {
    await queue.clean(24 * 60 * 60 * 1000, 'completed'); // Clean completed jobs older than 24 hours
    await queue.clean(7 * 24 * 60 * 60 * 1000, 'failed'); // Clean failed jobs older than 7 days
  }
};

// Initialize queue system
export const initializeQueues = async () => {
  try {
    await redis.connect();
    setupQueueEventHandlers();
    
    // Start cleanup job
    setInterval(cleanupQueues, 60 * 60 * 1000); // Cleanup every hour
    
    logInfo('Queue system initialized successfully');
  } catch (error) {
    logError('Failed to initialize queue system', error as Error);
    throw error;
  }
};

// Graceful shutdown
export const shutdownQueues = async () => {
  const queues = [mediaProcessingQueue, emailQueue, pushNotificationQueue, analyticsQueue, dataProcessingQueue];
  
  for (const queue of queues) {
    await queue.close();
  }
  
  await redis.disconnect();
  logInfo('Queue system shutdown completed');
};

export default {
  mediaProcessingQueue,
  emailQueue,
  pushNotificationQueue,
  analyticsQueue,
  dataProcessingQueue,
  addMediaProcessingJob,
  addEmailJob,
  addPushNotificationJob,
  addAnalyticsJob,
  addDataProcessingJob,
  getQueueStats,
  cleanupQueues,
  initializeQueues,
  shutdownQueues
};

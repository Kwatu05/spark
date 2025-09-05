import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config, validateConfig, getConfigSummary, isProduction, isDevelopment } from './config/environment';
import { cacheService } from './services/cache';
import { WebSocketService } from './services/websocket';
import { searchService } from './services/search';
import { analyticsService } from './services/analytics';
import authRouter from './routes/auth';
import feedRouter from './routes/feed';
import momentsRouter from './routes/moments';
import usersRouter from './routes/users';
import connectionsRouter from './routes/connections';
import profileRouter from './routes/profile';
import postsRouter from './routes/posts';
import messagesRouter from './routes/messages';
import moderationRouter from './routes/moderation';
import billingRouter from './routes/billing';
import boostsRouter from './routes/boosts';
import giftsRouter from './routes/gifts';
import groupsRouter from './routes/groups';
import eventsRouter from './routes/events';
import gamificationRouter from './routes/gamification';
import digestsRouter from './routes/digests';
import adminRouter from './routes/admin';
import analyticsRouter from './routes/analytics';
import verificationRouter from './routes/verification';
import uploadRouter from './routes/upload';
import mediaRouter from './routes/media';
import cacheRouter from './routes/cache';
import notificationsRouter from './routes/notifications';
import searchRouter from './routes/search';
import pushNotificationsRouter from './routes/pushNotifications';
import backupRouter from './routes/backup';
import { metrics, requestTracing, logError } from './middleware/observability';
import { 
  generalLimiter, 
  authLimiter, 
  uploadLimiter, 
  postLimiter, 
  commentLimiter, 
  engagementLimiter, 
  adminLimiter 
} from './middleware/rateLimiting';
import { 
  securityHeaders, 
  corsConfig, 
  sanitizeRequest, 
  requestSizeLimiter 
} from './middleware/security';

// Validate configuration
const configValidation = validateConfig();
if (!configValidation.valid) {
  console.error('Configuration validation failed:');
  configValidation.errors.forEach(error => console.error(`  - ${error}`));
  process.exit(1);
}

// Log configuration summary
console.log('Starting Spark Backend with configuration:');
console.log(JSON.stringify(getConfigSummary(), null, 2));

const app = express();

// Trust proxy for accurate IP addresses
app.set('trust proxy', config.server.trustProxy);

// Security middleware
app.use(securityHeaders);
app.use(cors({
  origin: config.server.corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Rate-Limit-Remaining'],
  maxAge: 86400 // 24 hours
}));
app.use(sanitizeRequest);
app.use(requestSizeLimiter(config.server.maxRequestSize));

// Body parsing middleware
app.use(express.json({ limit: config.server.maxRequestSize }));
app.use(express.urlencoded({ extended: true, limit: config.server.maxRequestSize }));
app.use(cookieParser());
app.use(requestTracing);

// Apply general rate limiting to all routes
app.use(generalLimiter);

// Serve static files from uploads directory
app.use('/uploads', express.static(config.fileUpload.uploadPath));

// Health check endpoint
app.get(config.monitoring.healthCheckPath, (_req, res) => {
  res.json({ 
    ok: true, 
    service: config.appName,
    version: config.appVersion,
    environment: config.environment,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes with specific rate limiting
app.use('/auth', authLimiter, authRouter);
app.use('/feed', engagementLimiter, feedRouter);
app.use('/moments', postLimiter, momentsRouter);
app.use('/notifications', notificationsRouter);
app.use('/users', usersRouter);
app.use('/connections', connectionsRouter);
app.use('/profile', profileRouter);
app.use('/posts', postLimiter, postsRouter);
app.use('/messages', messagesRouter);
app.use('/moderation', moderationRouter);
app.use('/billing', billingRouter);
app.use('/boosts', boostsRouter);
app.use('/gifts', giftsRouter);
app.use('/groups', groupsRouter);
app.use('/events', eventsRouter);
app.use('/gamification', gamificationRouter);
app.use('/digests', digestsRouter);
app.use('/admin', adminLimiter, adminRouter);
app.use('/analytics', analyticsRouter);
app.use('/verification', verificationRouter);
app.use('/upload', uploadLimiter, uploadRouter);
app.use('/media', uploadLimiter, mediaRouter);
app.use('/cache', adminLimiter, cacheRouter);
app.use('/notifications', notificationsRouter);
app.use('/search', searchRouter);
app.use('/push-notifications', pushNotificationsRouter);
app.use('/backup', backupRouter);
// Enhanced metrics endpoint
app.get(config.monitoring.metricsPath, (_req, res) => {
  res.json({
    ok: true,
    uptime: {
      seconds: Math.round(metrics.getUptime() / 1000),
      human: formatUptime(metrics.getUptime())
    },
    requests: {
      total: metrics.requestsTotal,
      byRoute: metrics.requestsByRoute,
      averageResponseTime: Math.round(metrics.getAverageResponseTime() * 100) / 100
    },
    errors: {
      total: metrics.errorsTotal,
      rate: Math.round(metrics.getErrorRate() * 100) / 100
    },
    security: {
      events: metrics.securityEvents
    },
    user: {
      actions: metrics.userActions
    },
    database: {
      queries: metrics.databaseQueries
    },
    timestamp: new Date().toISOString()
  });
});

// Helper function to format uptime
function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

// Error logger (kept after routes to capture thrown errors)
app.use(logError);

// Initialize services
async function initializeServices() {
  try {
    await cacheService.connect();
    console.log('✅ Cache service initialized');
  } catch (error) {
    console.warn('⚠️  Cache service unavailable:', (error as Error).message);
  }

  try {
    // Initialize search service (this will build indexes)
    console.log('🔍 Initializing search service...');
    // Search service initializes automatically in constructor
    console.log('✅ Search service initialized');
  } catch (error) {
    console.warn('⚠️  Search service unavailable:', (error as Error).message);
  }

  try {
    // Initialize analytics service
    console.log('📊 Initializing analytics service...');
    // Analytics service initializes automatically in constructor
    console.log('✅ Analytics service initialized');
  } catch (error) {
    console.warn('⚠️  Analytics service unavailable:', (error as Error).message);
  }
}

// Start server
const server = app.listen(config.server.port, config.server.host, async () => {
  console.log(`🚀 ${config.appName} v${config.appVersion} running on ${config.server.host}:${config.server.port}`);
  console.log(`📊 Metrics available at http://${config.server.host}:${config.server.port}${config.monitoring.metricsPath}`);
  console.log(`🏥 Health check at http://${config.server.host}:${config.server.port}${config.monitoring.healthCheckPath}`);
  console.log(`🌍 Environment: ${config.environment}`);
  console.log(`🔧 Debug mode: ${config.debug ? 'enabled' : 'disabled'}`);
  
  // Initialize services
  await initializeServices();
  
  // Initialize WebSocket service
  WebSocketService.getInstance(server);
  console.log('🔌 WebSocket service initialized');
});

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  console.log(`${signal} received, shutting down gracefully`);
  
          try {
          // Close cache connection
          await cacheService.disconnect();
          console.log('Cache service disconnected');
        } catch (error) {
          console.warn('Error disconnecting cache service:', (error as Error).message);
        }

        try {
          // Cleanup analytics service
          await analyticsService.cleanup();
          console.log('Analytics service cleaned up');
        } catch (error) {
          console.warn('Error cleaning up analytics service:', (error as Error).message);
        }
  
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

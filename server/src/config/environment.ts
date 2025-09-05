import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

export type Environment = 'development' | 'staging' | 'production' | 'test';

export interface DatabaseConfig {
  url: string;
  maxConnections: number;
  connectionTimeout: number;
  queryTimeout: number;
}

export interface ServerConfig {
  port: number;
  host: string;
  corsOrigins: string[];
  trustProxy: boolean;
  requestTimeout: number;
  maxRequestSize: string;
}

export interface SecurityConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  refreshTokenExpiresIn: string;
  bcryptRounds: number;
  rateLimitWindowMs: number;
  rateLimitMax: number;
  allowedIPs: string[];
}

export interface FileUploadConfig {
  maxFileSize: string;
  allowedMimeTypes: string[];
  uploadPath: string;
  compressionEnabled: boolean;
  imageQuality: number;
  thumbnailSize: number;
}

export interface LoggingConfig {
  level: string;
  enableConsole: boolean;
  enableFile: boolean;
  logDirectory: string;
  maxLogFiles: number;
  maxLogSize: string;
}

export interface BackupConfig {
  enabled: boolean;
  schedule: string;
  maxBackups: number;
  compressionEnabled: boolean;
  backupPath: string;
}

export interface MonitoringConfig {
  enableMetrics: boolean;
  metricsPath: string;
  healthCheckPath: string;
  enableHealthChecks: boolean;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  keyPrefix: string;
  defaultTTL: number;
}

export interface PushNotificationConfig {
  vapidPublicKey: string;
  vapidPrivateKey: string;
  vapidSubject: string;
  enabled: boolean;
}

export interface AppConfig {
  environment: Environment;
  nodeEnv: string;
  appName: string;
  appVersion: string;
  debug: boolean;
  database: DatabaseConfig;
  server: ServerConfig;
  security: SecurityConfig;
  fileUpload: FileUploadConfig;
  logging: LoggingConfig;
  backup: BackupConfig;
  monitoring: MonitoringConfig;
  redis: RedisConfig;
  pushNotifications: PushNotificationConfig;
}

// Validate required environment variables
function validateEnvironment(): void {
  const required = [
    'JWT_SECRET',
    'DATABASE_URL'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Get environment with fallback
function getEnvironment(): Environment {
  const env = process.env.NODE_ENV?.toLowerCase();
  
  switch (env) {
    case 'development':
    case 'dev':
      return 'development';
    case 'staging':
    case 'stage':
      return 'staging';
    case 'production':
    case 'prod':
      return 'production';
    case 'test':
      return 'test';
    default:
      return 'development';
  }
}

// Parse comma-separated string to array
function parseArray(value: string | undefined, defaultValue: string[] = []): string[] {
  if (!value) return defaultValue;
  return value.split(',').map(item => item.trim()).filter(Boolean);
}

// Parse size string to bytes
function parseSize(size: string): number {
  const units: { [key: string]: number } = {
    'b': 1,
    'kb': 1024,
    'mb': 1024 * 1024,
    'gb': 1024 * 1024 * 1024
  };
  
  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/);
  if (!match) return 0;
  
  const value = parseFloat(match[1]);
  const unit = match[2] || 'b';
  
  return Math.floor(value * (units[unit] || 1));
}

// Create configuration object
function createConfig(): AppConfig {
  const environment = getEnvironment();
  const isProduction = environment === 'production';
  const isDevelopment = environment === 'development';
  
  // Validate environment in production
  if (isProduction) {
    validateEnvironment();
  }
  
  return {
    environment,
    nodeEnv: process.env.NODE_ENV || 'development',
    appName: process.env.APP_NAME || 'Spark Backend',
    appVersion: process.env.APP_VERSION || '1.0.0',
    debug: process.env.DEBUG === 'true' || isDevelopment,
    
    database: {
      url: process.env.DATABASE_URL || 'file:./prisma/dev.db',
      maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10'),
      connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000'),
      queryTimeout: parseInt(process.env.DB_QUERY_TIMEOUT || '30000')
    },
    
    server: {
      port: parseInt(process.env.PORT || '4000'),
      host: process.env.HOST || '0.0.0.0',
      corsOrigins: parseArray(process.env.CORS_ORIGINS, isDevelopment ? ['http://localhost:3000', 'http://localhost:5173'] : []),
      trustProxy: process.env.TRUST_PROXY === 'true' || isProduction,
      requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || '30000'),
      maxRequestSize: process.env.MAX_REQUEST_SIZE || '10mb'
    },
    
    security: {
      jwtSecret: process.env.JWT_SECRET || (isDevelopment ? 'dev-secret-key' : ''),
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
      refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
      bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
      rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
      rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100'),
      allowedIPs: parseArray(process.env.ALLOWED_IPS)
    },
    
    fileUpload: {
      maxFileSize: process.env.MAX_FILE_SIZE || '10mb',
      allowedMimeTypes: parseArray(process.env.ALLOWED_MIME_TYPES, [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'video/mp4',
        'video/webm',
        'audio/mpeg',
        'audio/wav'
      ]),
      uploadPath: process.env.UPLOAD_PATH || './uploads',
      compressionEnabled: process.env.COMPRESSION_ENABLED !== 'false',
      imageQuality: parseInt(process.env.IMAGE_QUALITY || '80'),
      thumbnailSize: parseInt(process.env.THUMBNAIL_SIZE || '300')
    },
    
    logging: {
      level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
      enableConsole: process.env.LOG_CONSOLE !== 'false',
      enableFile: process.env.LOG_FILE !== 'false',
      logDirectory: process.env.LOG_DIRECTORY || './logs',
      maxLogFiles: parseInt(process.env.MAX_LOG_FILES || '30'),
      maxLogSize: process.env.MAX_LOG_SIZE || '20mb'
    },
    
    backup: {
      enabled: process.env.BACKUP_ENABLED !== 'false',
      schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *', // Daily at 2 AM
      maxBackups: parseInt(process.env.MAX_BACKUPS || '30'),
      compressionEnabled: process.env.BACKUP_COMPRESSION !== 'false',
      backupPath: process.env.BACKUP_PATH || './backups'
    },
    
    monitoring: {
      enableMetrics: process.env.ENABLE_METRICS !== 'false',
      metricsPath: process.env.METRICS_PATH || '/metrics',
      healthCheckPath: process.env.HEALTH_CHECK_PATH || '/health',
      enableHealthChecks: process.env.ENABLE_HEALTH_CHECKS !== 'false'
    },
    
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || '0'),
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'spark',
      defaultTTL: parseInt(process.env.REDIS_DEFAULT_TTL || '3600') // 1 hour
    },
    
    pushNotifications: {
      vapidPublicKey: process.env.VAPID_PUBLIC_KEY || '',
      vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || '',
      vapidSubject: process.env.VAPID_SUBJECT || 'mailto:admin@spark.com',
      enabled: process.env.PUSH_NOTIFICATIONS_ENABLED !== 'false'
    }
  };
}

// Export configuration
export const config = createConfig();

// Export individual config sections for convenience
export const {
  environment,
  nodeEnv,
  appName,
  appVersion,
  debug,
  database,
  server,
  security,
  fileUpload,
  logging,
  backup,
  monitoring
} = config;

// Environment-specific utilities
export const isProduction = environment === 'production';
export const isDevelopment = environment === 'development';
export const isStaging = environment === 'staging';
export const isTest = environment === 'test';

// Configuration validation
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Validate JWT secret in production
  if (isProduction && (!security.jwtSecret || security.jwtSecret.length < 32)) {
    errors.push('JWT_SECRET must be at least 32 characters in production');
  }
  
  // Validate database URL
  if (!database.url) {
    errors.push('DATABASE_URL is required');
  }
  
  // Validate port
  if (server.port < 1 || server.port > 65535) {
    errors.push('PORT must be between 1 and 65535');
  }
  
  // Validate file upload size
  const maxFileSizeBytes = parseSize(fileUpload.maxFileSize);
  if (maxFileSizeBytes === 0) {
    errors.push('MAX_FILE_SIZE must be a valid size (e.g., 10mb)');
  }
  
  // Validate CORS origins in production
  if (isProduction && server.corsOrigins.length === 0) {
    errors.push('CORS_ORIGINS must be specified in production');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Get configuration summary (safe for logging)
export function getConfigSummary(): Record<string, any> {
  return {
    environment,
    nodeEnv,
    appName,
    appVersion,
    debug,
    server: {
      port: server.port,
      host: server.host,
      corsOrigins: server.corsOrigins,
      trustProxy: server.trustProxy
    },
    database: {
      url: database.url.replace(/\/\/.*@/, '//***:***@'), // Hide credentials
      maxConnections: database.maxConnections
    },
    security: {
      jwtExpiresIn: security.jwtExpiresIn,
      refreshTokenExpiresIn: security.refreshTokenExpiresIn,
      bcryptRounds: security.bcryptRounds,
      rateLimitMax: security.rateLimitMax
    },
    fileUpload: {
      maxFileSize: fileUpload.maxFileSize,
      allowedMimeTypes: fileUpload.allowedMimeTypes,
      compressionEnabled: fileUpload.compressionEnabled
    },
    logging: {
      level: logging.level,
      enableConsole: logging.enableConsole,
      enableFile: logging.enableFile
    },
    backup: {
      enabled: backup.enabled,
      maxBackups: backup.maxBackups,
      compressionEnabled: backup.compressionEnabled
    },
    monitoring: {
      enableMetrics: monitoring.enableMetrics,
      enableHealthChecks: monitoring.enableHealthChecks
    }
  };
}

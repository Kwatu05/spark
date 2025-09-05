import Redis from 'ioredis';
import { logInfo, logError, logWarning } from '../utils/logger';
import { config } from '../config/environment';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
  serialize?: boolean;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalOperations: number;
  memoryUsage: string;
  connectedClients: number;
}

export class CacheService {
  private static instance: CacheService;
  private redis: Redis;
  private stats = {
    hits: 0,
    misses: 0,
    totalOperations: 0
  };
  private isConnected = false;

  private constructor() {
    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      connectTimeout: 10000,
      commandTimeout: 5000
    });

    this.setupEventHandlers();
  }

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      this.isConnected = true;
      logInfo('Redis connected successfully');
    });

    this.redis.on('ready', () => {
      logInfo('Redis ready for operations');
    });

    this.redis.on('error', (error) => {
      this.isConnected = false;
      logError('Redis connection error', error);
    });

    this.redis.on('close', () => {
      this.isConnected = false;
      logWarning('Redis connection closed');
    });

    this.redis.on('reconnecting', () => {
      logInfo('Redis reconnecting...');
    });
  }

  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    try {
      await this.redis.connect();
      logInfo('Cache service initialized');
    } catch (error) {
      logError('Failed to connect to Redis', error as Error);
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    try {
      await this.redis.quit();
      this.isConnected = false;
      logInfo('Cache service disconnected');
    } catch (error) {
      logError('Failed to disconnect from Redis', error as Error);
    }
  }

  /**
   * Check if cache is available
   */
  isAvailable(): boolean {
    return this.isConnected;
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      this.stats.totalOperations++;
      const fullKey = this.buildKey(key, options.prefix);
      const value = await this.redis.get(fullKey);

      if (value === null) {
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      return options.serialize !== false ? JSON.parse(value) : value as T;
    } catch (error) {
      logError('Cache get error', error as Error, { key });
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Set a value in cache
   */
  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const fullKey = this.buildKey(key, options.prefix);
      const serializedValue = options.serialize !== false ? JSON.stringify(value) : String(value);
      const ttl = options.ttl || config.redis.defaultTTL;

      await this.redis.setex(fullKey, ttl, serializedValue);
      return true;
    } catch (error) {
      logError('Cache set error', error as Error, { key });
      return false;
    }
  }

  /**
   * Delete a value from cache
   */
  async del(key: string, options: CacheOptions = {}): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const fullKey = this.buildKey(key, options.prefix);
      const result = await this.redis.del(fullKey);
      return result > 0;
    } catch (error) {
      logError('Cache delete error', error as Error, { key });
      return false;
    }
  }

  /**
   * Check if a key exists in cache
   */
  async exists(key: string, options: CacheOptions = {}): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const fullKey = this.buildKey(key, options.prefix);
      const result = await this.redis.exists(fullKey);
      return result === 1;
    } catch (error) {
      logError('Cache exists error', error as Error, { key });
      return false;
    }
  }

  /**
   * Set expiration for a key
   */
  async expire(key: string, ttl: number, options: CacheOptions = {}): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const fullKey = this.buildKey(key, options.prefix);
      const result = await this.redis.expire(fullKey, ttl);
      return result === 1;
    } catch (error) {
      logError('Cache expire error', error as Error, { key });
      return false;
    }
  }

  /**
   * Get multiple values from cache
   */
  async mget<T>(keys: string[], options: CacheOptions = {}): Promise<(T | null)[]> {
    if (!this.isAvailable()) {
      return keys.map(() => null);
    }

    try {
      const fullKeys = keys.map(key => this.buildKey(key, options.prefix));
      const values = await this.redis.mget(...fullKeys);
      
      return values.map(value => {
        if (value === null) {
          this.stats.misses++;
          return null;
        }
        this.stats.hits++;
        return options.serialize !== false ? JSON.parse(value) : value as T;
      });
    } catch (error) {
      logError('Cache mget error', error as Error, { keys });
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple values in cache
   */
  async mset<T>(keyValuePairs: Record<string, T>, options: CacheOptions = {}): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const pipeline = this.redis.pipeline();
      const ttl = options.ttl || config.redis.defaultTTL;

      for (const [key, value] of Object.entries(keyValuePairs)) {
        const fullKey = this.buildKey(key, options.prefix);
        const serializedValue = options.serialize !== false ? JSON.stringify(value) : String(value);
        pipeline.setex(fullKey, ttl, serializedValue);
      }

      await pipeline.exec();
      return true;
    } catch (error) {
      logError('Cache mset error', error as Error, { keys: Object.keys(keyValuePairs) });
      return false;
    }
  }

  /**
   * Increment a numeric value in cache
   */
  async incr(key: string, options: CacheOptions = {}): Promise<number | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const fullKey = this.buildKey(key, options.prefix);
      const result = await this.redis.incr(fullKey);
      
      // Set TTL if this is a new key
      if (result === 1) {
        const ttl = options.ttl || config.redis.defaultTTL;
        await this.redis.expire(fullKey, ttl);
      }
      
      return result;
    } catch (error) {
      logError('Cache incr error', error as Error, { key });
      return null;
    }
  }

  /**
   * Decrement a numeric value in cache
   */
  async decr(key: string, options: CacheOptions = {}): Promise<number | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const fullKey = this.buildKey(key, options.prefix);
      return await this.redis.decr(fullKey);
    } catch (error) {
      logError('Cache decr error', error as Error, { key });
      return null;
    }
  }

  /**
   * Get keys matching a pattern
   */
  async keys(pattern: string, options: CacheOptions = {}): Promise<string[]> {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      const fullPattern = this.buildKey(pattern, options.prefix);
      return await this.redis.keys(fullPattern);
    } catch (error) {
      logError('Cache keys error', error as Error, { pattern });
      return [];
    }
  }

  /**
   * Delete keys matching a pattern
   */
  async delPattern(pattern: string, options: CacheOptions = {}): Promise<number> {
    if (!this.isAvailable()) {
      return 0;
    }

    try {
      const fullPattern = this.buildKey(pattern, options.prefix);
      const keys = await this.redis.keys(fullPattern);
      
      if (keys.length === 0) {
        return 0;
      }

      const result = await this.redis.del(...keys);
      return result;
    } catch (error) {
      logError('Cache delPattern error', error as Error, { pattern });
      return 0;
    }
  }

  /**
   * Clear all cache data
   */
  async flush(): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      await this.redis.flushdb();
      logInfo('Cache flushed successfully');
      return true;
    } catch (error) {
      logError('Cache flush error', error as Error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    const hitRate = this.stats.totalOperations > 0 
      ? (this.stats.hits / this.stats.totalOperations) * 100 
      : 0;

    let memoryUsage = '0B';
    let connectedClients = 0;

    if (this.isAvailable()) {
      try {
        const info = await this.redis.info('memory');
        const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
        if (memoryMatch) {
          memoryUsage = memoryMatch[1];
        }

        const clientsInfo = await this.redis.info('clients');
        const clientsMatch = clientsInfo.match(/connected_clients:(\d+)/);
        if (clientsMatch) {
          connectedClients = parseInt(clientsMatch[1]);
        }
      } catch (error) {
        logError('Failed to get Redis info', error as Error);
      }
    }

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: Math.round(hitRate * 100) / 100,
      totalOperations: this.stats.totalOperations,
      memoryUsage,
      connectedClients
    };
  }

  /**
   * Build cache key with prefix
   */
  private buildKey(key: string, prefix?: string): string {
    const basePrefix = config.redis.keyPrefix;
    const fullPrefix = prefix ? `${basePrefix}:${prefix}` : basePrefix;
    return `${fullPrefix}:${key}`;
  }

  /**
   * Cache middleware for Express routes
   */
  cacheMiddleware(ttl: number = 300, prefix?: string) {
    return async (req: any, res: any, next: any) => {
      if (!this.isAvailable()) {
        return next();
      }

      const cacheKey = `${req.method}:${req.originalUrl}`;
      const cached = await this.get(cacheKey, { ttl, prefix });

      if (cached) {
        res.json(cached);
        return;
      }

      // Store original res.json
      const originalJson = res.json;
      res.json = function(data: any) {
        // Cache the response
        cacheService.set(cacheKey, data, { ttl, prefix });
        return originalJson.call(this, data);
      };

      next();
    };
  }
}

// Export singleton instance
export const cacheService = CacheService.getInstance();

// Cache key generators for common use cases
export const CacheKeys = {
  user: (userId: string) => `user:${userId}`,
  userProfile: (userId: string) => `user:profile:${userId}`,
  post: (postId: string) => `post:${postId}`,
  posts: (userId: string, page: number = 1) => `posts:${userId}:${page}`,
  feed: (userId: string, page: number = 1) => `feed:${userId}:${page}`,
  connections: (userId: string) => `connections:${userId}`,
  likes: (postId: string) => `likes:${postId}`,
  comments: (postId: string, page: number = 1) => `comments:${postId}:${page}`,
  verification: (userId: string) => `verification:${userId}`,
  analytics: (type: string, date: string) => `analytics:${type}:${date}`,
  metrics: (type: string) => `metrics:${type}`,
  session: (sessionId: string) => `session:${sessionId}`,
  rateLimit: (ip: string, endpoint: string) => `ratelimit:${ip}:${endpoint}`
};

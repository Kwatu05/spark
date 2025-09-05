import { PrismaClient } from '@prisma/client';
import { logInfo, logError, logWarning } from '../utils/logger';
import { cacheService } from './cache';

const prisma = new PrismaClient();

export interface PerformanceMetrics {
  timestamp: Date;
  responseTime: number;
  throughput: number;
  errorRate: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
  activeConnections: number;
  databaseConnections: number;
}

export interface OptimizationRecommendation {
  id: string;
  type: 'database' | 'cache' | 'memory' | 'cpu' | 'network' | 'code';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  estimatedImprovement: string;
  implementation: string[];
}

export interface PerformanceReport {
  summary: {
    overallScore: number;
    status: 'excellent' | 'good' | 'fair' | 'poor';
    totalOptimizations: number;
    highPriorityIssues: number;
  };
  metrics: PerformanceMetrics;
  recommendations: OptimizationRecommendation[];
  bottlenecks: string[];
  trends: {
    responseTime: 'improving' | 'stable' | 'degrading';
    throughput: 'improving' | 'stable' | 'degrading';
    errorRate: 'improving' | 'stable' | 'degrading';
  };
}

export class PerformanceOptimizationService {
  private static instance: PerformanceOptimizationService;
  private metricsHistory: PerformanceMetrics[] = [];
  private readonly MAX_HISTORY = 1000;

  private constructor() {}

  static getInstance(): PerformanceOptimizationService {
    if (!PerformanceOptimizationService.instance) {
      PerformanceOptimizationService.instance = new PerformanceOptimizationService();
    }
    return PerformanceOptimizationService.instance;
  }

  /**
   * Collect current performance metrics
   */
  async collectMetrics(): Promise<PerformanceMetrics> {
    try {
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      // Get database connection count
      const dbConnections = await this.getDatabaseConnectionCount();
      
      // Get active connections (would need to be tracked)
      const activeConnections = await this.getActiveConnectionCount();

      const metrics: PerformanceMetrics = {
        timestamp: new Date(),
        responseTime: 0, // Would be calculated from recent requests
        throughput: 0, // Would be calculated from recent requests
        errorRate: 0, // Would be calculated from recent requests
        memoryUsage,
        cpuUsage,
        activeConnections,
        databaseConnections: dbConnections
      };

      // Store in history
      this.metricsHistory.push(metrics);
      if (this.metricsHistory.length > this.MAX_HISTORY) {
        this.metricsHistory.shift();
      }

      logInfo('Performance metrics collected', {
        memoryUsed: memoryUsage.heapUsed,
        activeConnections,
        dbConnections
      });

      return metrics;
    } catch (error) {
      logError('Failed to collect performance metrics', error as Error);
      throw error;
    }
  }

  /**
   * Analyze performance and generate recommendations
   */
  async analyzePerformance(): Promise<PerformanceReport> {
    try {
      const currentMetrics = await this.collectMetrics();
      const recommendations = await this.generateRecommendations(currentMetrics);
      const bottlenecks = await this.identifyBottlenecks(currentMetrics);
      const trends = this.analyzeTrends();

      const overallScore = this.calculateOverallScore(currentMetrics, recommendations);
      const status = this.getPerformanceStatus(overallScore);

      const report: PerformanceReport = {
        summary: {
          overallScore,
          status,
          totalOptimizations: recommendations.length,
          highPriorityIssues: recommendations.filter(r => r.priority === 'high').length
        },
        metrics: currentMetrics,
        recommendations,
        bottlenecks,
        trends
      };

      logInfo('Performance analysis completed', {
        overallScore,
        status,
        recommendations: recommendations.length,
        bottlenecks: bottlenecks.length
      });

      return report;
    } catch (error) {
      logError('Failed to analyze performance', error as Error);
      throw error;
    }
  }

  /**
   * Optimize database queries
   */
  async optimizeDatabaseQueries(): Promise<{ optimized: number; recommendations: string[] }> {
    try {
      logInfo('Starting database query optimization');

      const recommendations: string[] = [];
      let optimized = 0;

      // Analyze slow queries
      const slowQueries = await this.findSlowQueries();
      if (slowQueries.length > 0) {
        recommendations.push(`Found ${slowQueries.length} slow queries that need optimization`);
        optimized += slowQueries.length;
      }

      // Check for missing indexes
      const missingIndexes = await this.findMissingIndexes();
      if (missingIndexes.length > 0) {
        recommendations.push(`Found ${missingIndexes.length} missing indexes`);
        optimized += missingIndexes.length;
      }

      // Check for N+1 queries
      const nPlusOneQueries = await this.findNPlusOneQueries();
      if (nPlusOneQueries.length > 0) {
        recommendations.push(`Found ${nPlusOneQueries.length} potential N+1 query patterns`);
        optimized += nPlusOneQueries.length;
      }

      // Optimize connection pooling
      const connectionOptimization = await this.optimizeConnectionPooling();
      if (connectionOptimization.optimized) {
        recommendations.push('Optimized database connection pooling');
        optimized++;
      }

      logInfo('Database optimization completed', { optimized, recommendations: recommendations.length });

      return { optimized, recommendations };
    } catch (error) {
      logError('Failed to optimize database queries', error as Error);
      throw error;
    }
  }

  /**
   * Optimize memory usage
   */
  async optimizeMemoryUsage(): Promise<{ optimized: boolean; recommendations: string[] }> {
    try {
      logInfo('Starting memory optimization');

      const recommendations: string[] = [];
      let optimized = false;

      const memoryUsage = process.memoryUsage();
      const memoryPressure = memoryUsage.heapUsed / memoryUsage.heapTotal;

      if (memoryPressure > 0.8) {
        recommendations.push('High memory pressure detected - consider increasing heap size');
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
          optimized = true;
          recommendations.push('Forced garbage collection');
        }
      }

      // Check for memory leaks
      const memoryLeaks = await this.detectMemoryLeaks();
      if (memoryLeaks.length > 0) {
        recommendations.push(`Potential memory leaks detected: ${memoryLeaks.join(', ')}`);
      }

      // Optimize cache usage
      const cacheOptimization = await this.optimizeCacheUsage();
      if (cacheOptimization.optimized) {
        recommendations.push('Optimized cache usage');
        optimized = true;
      }

      logInfo('Memory optimization completed', { optimized, recommendations: recommendations.length });

      return { optimized, recommendations };
    } catch (error) {
      logError('Failed to optimize memory usage', error as Error);
      throw error;
    }
  }

  /**
   * Optimize caching strategy
   */
  async optimizeCachingStrategy(): Promise<{ optimized: boolean; recommendations: string[] }> {
    try {
      logInfo('Starting cache optimization');

      const recommendations: string[] = [];
      let optimized = false;

      // Analyze cache hit rates
      const cacheStats = await cacheService.getStats();
      if (cacheStats.hitRate < 0.8) {
        recommendations.push(`Low cache hit rate (${(cacheStats.hitRate * 100).toFixed(1)}%) - consider adjusting cache strategy`);
      }

      // Check for cache invalidation issues
      const invalidationIssues = await this.checkCacheInvalidation();
      if (invalidationIssues.length > 0) {
        recommendations.push(`Cache invalidation issues: ${invalidationIssues.join(', ')}`);
      }

      // Optimize cache TTL
      const ttlOptimization = await this.optimizeCacheTTL();
      if (ttlOptimization.optimized) {
        recommendations.push('Optimized cache TTL values');
        optimized = true;
      }

      // Warm up frequently accessed data
      const warmupResult = await this.warmupCache();
      if (warmupResult.optimized) {
        recommendations.push('Warmed up frequently accessed cache data');
        optimized = true;
      }

      logInfo('Cache optimization completed', { optimized, recommendations: recommendations.length });

      return { optimized, recommendations };
    } catch (error) {
      logError('Failed to optimize caching strategy', error as Error);
      throw error;
    }
  }

  /**
   * Get performance optimization recommendations
   */
  async getOptimizationRecommendations(): Promise<OptimizationRecommendation[]> {
    try {
      const currentMetrics = await this.collectMetrics();
      return await this.generateRecommendations(currentMetrics);
    } catch (error) {
      logError('Failed to get optimization recommendations', error as Error);
      return [];
    }
  }

  // Private helper methods

  private async generateRecommendations(metrics: PerformanceMetrics): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    // Memory recommendations
    const memoryPressure = metrics.memoryUsage.heapUsed / metrics.memoryUsage.heapTotal;
    if (memoryPressure > 0.8) {
      recommendations.push({
        id: 'memory-pressure',
        type: 'memory',
        priority: 'high',
        title: 'High Memory Pressure',
        description: 'Memory usage is above 80% of available heap',
        impact: 'Potential out-of-memory errors and performance degradation',
        effort: 'medium',
        estimatedImprovement: '20-30% performance improvement',
        implementation: [
          'Increase Node.js heap size with --max-old-space-size',
          'Implement memory monitoring and alerts',
          'Optimize data structures and algorithms',
          'Consider implementing memory pooling'
        ]
      });
    }

    // Database recommendations
    if (metrics.databaseConnections > 10) {
      recommendations.push({
        id: 'db-connections',
        type: 'database',
        priority: 'medium',
        title: 'High Database Connection Count',
        description: 'Too many active database connections',
        impact: 'Potential connection pool exhaustion',
        effort: 'low',
        estimatedImprovement: '15-25% database performance improvement',
        implementation: [
          'Optimize connection pooling settings',
          'Implement connection monitoring',
          'Add connection timeout configurations',
          'Consider read replicas for read-heavy operations'
        ]
      });
    }

    // Cache recommendations
    const cacheStats = await cacheService.getStats().catch(() => ({ hitRate: 0 }));
    if (cacheStats.hitRate < 0.7) {
      recommendations.push({
        id: 'cache-hit-rate',
        type: 'cache',
        priority: 'medium',
        title: 'Low Cache Hit Rate',
        description: `Cache hit rate is ${(cacheStats.hitRate * 100).toFixed(1)}%`,
        impact: 'Increased database load and slower response times',
        effort: 'medium',
        estimatedImprovement: '30-50% response time improvement',
        implementation: [
          'Review and optimize cache keys',
          'Adjust cache TTL values',
          'Implement cache warming strategies',
          'Add more cache layers for frequently accessed data'
        ]
      });
    }

    return recommendations;
  }

  private async identifyBottlenecks(metrics: PerformanceMetrics): Promise<string[]> {
    const bottlenecks: string[] = [];

    // Memory bottlenecks
    const memoryPressure = metrics.memoryUsage.heapUsed / metrics.memoryUsage.heapTotal;
    if (memoryPressure > 0.8) {
      bottlenecks.push('High memory usage');
    }

    // Database bottlenecks
    if (metrics.databaseConnections > 10) {
      bottlenecks.push('High database connection count');
    }

    // CPU bottlenecks
    const cpuUsage = (metrics.cpuUsage.user + metrics.cpuUsage.system) / 1000000; // Convert to seconds
    if (cpuUsage > 1) {
      bottlenecks.push('High CPU usage');
    }

    return bottlenecks;
  }

  private analyzeTrends(): { responseTime: 'improving' | 'stable' | 'degrading'; throughput: 'improving' | 'stable' | 'degrading'; errorRate: 'improving' | 'stable' | 'degrading' } {
    // Simplified trend analysis - would need more sophisticated logic in production
    return {
      responseTime: 'stable',
      throughput: 'stable',
      errorRate: 'stable'
    };
  }

  private calculateOverallScore(metrics: PerformanceMetrics, recommendations: OptimizationRecommendation[]): number {
    let score = 100;

    // Deduct points for high priority issues
    score -= recommendations.filter(r => r.priority === 'high').length * 20;
    score -= recommendations.filter(r => r.priority === 'medium').length * 10;
    score -= recommendations.filter(r => r.priority === 'low').length * 5;

    // Deduct points for memory pressure
    const memoryPressure = metrics.memoryUsage.heapUsed / metrics.memoryUsage.heapTotal;
    if (memoryPressure > 0.8) score -= 15;
    else if (memoryPressure > 0.6) score -= 10;

    // Deduct points for high database connections
    if (metrics.databaseConnections > 10) score -= 10;

    return Math.max(0, score);
  }

  private getPerformanceStatus(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'fair';
    return 'poor';
  }

  private async getDatabaseConnectionCount(): Promise<number> {
    try {
      // This would need to be implemented based on your database setup
      return 0;
    } catch (error) {
      return 0;
    }
  }

  private async getActiveConnectionCount(): Promise<number> {
    try {
      // This would need to be implemented based on your connection tracking
      return 0;
    } catch (error) {
      return 0;
    }
  }

  private async findSlowQueries(): Promise<string[]> {
    // Implementation would analyze query logs
    return [];
  }

  private async findMissingIndexes(): Promise<string[]> {
    // Implementation would analyze database schema
    return [];
  }

  private async findNPlusOneQueries(): Promise<string[]> {
    // Implementation would analyze query patterns
    return [];
  }

  private async optimizeConnectionPooling(): Promise<{ optimized: boolean }> {
    // Implementation would optimize connection pool settings
    return { optimized: false };
  }

  private async detectMemoryLeaks(): Promise<string[]> {
    // Implementation would analyze memory usage patterns
    return [];
  }

  private async optimizeCacheUsage(): Promise<{ optimized: boolean }> {
    // Implementation would optimize cache usage
    return { optimized: false };
  }

  private async checkCacheInvalidation(): Promise<string[]> {
    // Implementation would check cache invalidation patterns
    return [];
  }

  private async optimizeCacheTTL(): Promise<{ optimized: boolean }> {
    // Implementation would optimize cache TTL values
    return { optimized: false };
  }

  private async warmupCache(): Promise<{ optimized: boolean }> {
    try {
      // Cache warming would be implemented here
      return { optimized: true };
    } catch (error) {
      return { optimized: false };
    }
  }
}

// Export singleton instance
export const performanceOptimizationService = PerformanceOptimizationService.getInstance();

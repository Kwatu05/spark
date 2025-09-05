import autocannon from 'autocannon';
import { logInfo, logError, logWarning } from '../utils/logger';
import { config } from '../config/environment';

export interface LoadTestConfig {
  url: string;
  connections: number;
  duration: number;
  requests: number;
  headers?: Record<string, string>;
  body?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
}

export interface LoadTestResult {
  title: string;
  url: string;
  connections: number;
  pipelining: number;
  duration: number;
  start: Date;
  finish: Date;
  requests: {
    total: number;
    average: number;
    min: number;
    max: number;
    stddev: number;
    p1: number;
    p2_5: number;
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    p95: number;
    p97_5: number;
    p99: number;
    p99_9: number;
    p99_99: number;
    p99_999: number;
  };
  latency: {
    average: number;
    min: number;
    max: number;
    stddev: number;
    p1: number;
    p2_5: number;
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    p95: number;
    p97_5: number;
    p99: number;
    p99_9: number;
    p99_99: number;
    p99_999: number;
  };
  throughput: {
    average: number;
    mean: number;
    stddev: number;
    min: number;
    max: number;
    total: number;
  };
  errors: number;
  timeouts: number;
  non2xx: number;
  resets: number;
  '1xx': number;
  '2xx': number;
  '3xx': number;
  '4xx': number;
  '5xx': number;
}

export interface PerformanceMetrics {
  averageResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
  throughput: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
  timestamp: Date;
}

export class LoadTestingService {
  private static instance: LoadTestingService;
  private isRunning = false;
  private currentTests: Map<string, any> = new Map();

  private constructor() {}

  static getInstance(): LoadTestingService {
    if (!LoadTestingService.instance) {
      LoadTestingService.instance = new LoadTestingService();
    }
    return LoadTestingService.instance;
  }

  /**
   * Run a single load test
   */
  async runLoadTest(testConfig: LoadTestConfig): Promise<LoadTestResult> {
    try {
      if (this.isRunning) {
        throw new Error('Load test is already running');
      }

      this.isRunning = true;
      logInfo('Starting load test', { url: testConfig.url, connections: testConfig.connections });

      const result = await autocannon({
        url: testConfig.url,
        connections: testConfig.connections,
        duration: testConfig.duration,
        amount: testConfig.requests,
        headers: testConfig.headers,
        body: testConfig.body,
        method: testConfig.method || 'GET',
        timeout: 30,
        pipelining: 1,
        bailout: 10
      });

      this.isRunning = false;
      logInfo('Load test completed', { 
        url: testConfig.url, 
        requests: result.requests.total,
        averageLatency: result.latency.average,
        throughput: result.throughput.average
      });

      return this.formatResult(result, testConfig);
    } catch (error) {
      this.isRunning = false;
      logError('Load test failed', error as Error, { url: testConfig.url });
      throw error;
    }
  }

  /**
   * Run comprehensive API load tests
   */
  async runComprehensiveTests(baseUrl: string = `http://localhost:${config.server.port}`): Promise<{
    results: LoadTestResult[];
    summary: any;
  }> {
    try {
      logInfo('Starting comprehensive load tests', { baseUrl });

      const testConfigs: Array<LoadTestConfig & { name: string }> = [
        {
          name: 'Health Check',
          url: `${baseUrl}/health`,
          connections: 10,
          duration: 10,
          requests: 0,
          method: 'GET'
        },
        {
          name: 'Metrics Endpoint',
          url: `${baseUrl}/metrics`,
          connections: 5,
          duration: 10,
          requests: 0,
          method: 'GET'
        },
        {
          name: 'Feed Endpoint (Light Load)',
          url: `${baseUrl}/feed`,
          connections: 20,
          duration: 30,
          requests: 0,
          method: 'GET',
          headers: {
            'Authorization': 'Bearer test-token'
          }
        },
        {
          name: 'Search Endpoint (Light Load)',
          url: `${baseUrl}/search?q=test`,
          connections: 15,
          duration: 20,
          requests: 0,
          method: 'GET',
          headers: {
            'Authorization': 'Bearer test-token'
          }
        },
        {
          name: 'User Profile (Light Load)',
          url: `${baseUrl}/profile`,
          connections: 10,
          duration: 15,
          requests: 0,
          method: 'GET',
          headers: {
            'Authorization': 'Bearer test-token'
          }
        },
        {
          name: 'Feed Endpoint (Medium Load)',
          url: `${baseUrl}/feed`,
          connections: 50,
          duration: 60,
          requests: 0,
          method: 'GET',
          headers: {
            'Authorization': 'Bearer test-token'
          }
        },
        {
          name: 'Search Endpoint (Medium Load)',
          url: `${baseUrl}/search?q=test&type=all`,
          connections: 30,
          duration: 45,
          requests: 0,
          method: 'GET',
          headers: {
            'Authorization': 'Bearer test-token'
          }
        },
        {
          name: 'Feed Endpoint (Heavy Load)',
          url: `${baseUrl}/feed`,
          connections: 100,
          duration: 120,
          requests: 0,
          method: 'GET',
          headers: {
            'Authorization': 'Bearer test-token'
          }
        }
      ];

      const results: LoadTestResult[] = [];
      const startTime = Date.now();

      for (const testConfig of testConfigs) {
        try {
          logInfo(`Running test: ${testConfig.name}`);
          const result = await this.runLoadTest(testConfig);
          results.push(result);
          
          // Wait between tests to avoid overwhelming the server
          await this.sleep(5000);
        } catch (error) {
          logError(`Test failed: ${testConfig.name}`, error as Error);
          // Continue with other tests
        }
      }

      const endTime = Date.now();
      const totalDuration = endTime - startTime;

      const summary = this.generateSummary(results, totalDuration);
      
      logInfo('Comprehensive load tests completed', { 
        totalTests: results.length,
        totalDuration: totalDuration,
        averageResponseTime: summary.averageResponseTime,
        averageThroughput: summary.averageThroughput
      });

      return { results, summary };
    } catch (error) {
      logError('Comprehensive load tests failed', error as Error);
      throw error;
    }
  }

  /**
   * Run stress test to find breaking point
   */
  async runStressTest(baseUrl: string = `http://localhost:${config.server.port}`): Promise<{
    results: LoadTestResult[];
    breakingPoint: number;
  }> {
    try {
      logInfo('Starting stress test', { baseUrl });

      const results: LoadTestResult[] = [];
      let connections = 10;
      let breakingPoint = 0;
      const maxConnections = 1000;
      const increment = 50;

      while (connections <= maxConnections) {
        try {
          logInfo(`Testing with ${connections} connections`);
          
          const result = await this.runLoadTest({
            url: `${baseUrl}/feed`,
            connections,
            duration: 30,
            requests: 0,
            method: 'GET',
            headers: {
              'Authorization': 'Bearer test-token'
            }
          });

          results.push(result);

          // Check if we've hit the breaking point
          if (result.errors > 0 || result['5xx'] > 0 || result.timeouts > 0) {
            breakingPoint = connections;
            logWarning('Breaking point detected', { connections, errors: result.errors });
            break;
          }

          // Check if response time is too high
          if (result.latency.average > 5000) { // 5 seconds
            breakingPoint = connections;
            logWarning('Response time threshold exceeded', { 
              connections, 
              averageLatency: result.latency.average 
            });
            break;
          }

          connections += increment;
          
          // Wait between tests
          await this.sleep(10000);
        } catch (error) {
          logError(`Stress test failed at ${connections} connections`, error as Error);
          breakingPoint = connections;
          break;
        }
      }

      logInfo('Stress test completed', { 
        breakingPoint,
        maxConnectionsTested: connections,
        totalTests: results.length
      });

      return { results, breakingPoint };
    } catch (error) {
      logError('Stress test failed', error as Error);
      throw error;
    }
  }

  /**
   * Run performance monitoring
   */
  async runPerformanceMonitoring(duration: number = 300): Promise<PerformanceMetrics[]> {
    try {
      logInfo('Starting performance monitoring', { duration });

      const metrics: PerformanceMetrics[] = [];
      const startTime = Date.now();
      const interval = 10000; // 10 seconds

      const monitoringInterval = setInterval(async () => {
        try {
          const metric = await this.collectPerformanceMetric();
          metrics.push(metric);
          
          logInfo('Performance metric collected', {
            timestamp: metric.timestamp,
            averageResponseTime: metric.averageResponseTime,
            requestsPerSecond: metric.requestsPerSecond,
            memoryUsage: metric.memoryUsage.heapUsed
          });
        } catch (error) {
          logError('Failed to collect performance metric', error as Error);
        }
      }, interval);

      // Wait for the specified duration
      await this.sleep(duration * 1000);

      clearInterval(monitoringInterval);

      logInfo('Performance monitoring completed', { 
        duration,
        metricsCollected: metrics.length
      });

      return metrics;
    } catch (error) {
      logError('Performance monitoring failed', error as Error);
      throw error;
    }
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(results: LoadTestResult[]): any {
    try {
      const report = {
        summary: {
          totalTests: results.length,
          totalRequests: results.reduce((sum, r) => sum + r.requests.total, 0),
          totalErrors: results.reduce((sum, r) => sum + r.errors, 0),
          averageResponseTime: results.reduce((sum, r) => sum + r.latency.average, 0) / results.length,
          averageThroughput: results.reduce((sum, r) => sum + r.throughput.average, 0) / results.length,
          p95ResponseTime: results.reduce((sum, r) => sum + r.latency.p95, 0) / results.length,
          p99ResponseTime: results.reduce((sum, r) => sum + r.latency.p99, 0) / results.length
        },
        recommendations: this.generateRecommendations(results),
        bottlenecks: this.identifyBottlenecks(results),
        scalability: this.assessScalability(results)
      };

      logInfo('Performance report generated', { 
        totalTests: report.summary.totalTests,
        averageResponseTime: report.summary.averageResponseTime,
        recommendations: report.recommendations.length
      });

      return report;
    } catch (error) {
      logError('Failed to generate performance report', error as Error);
      throw error;
    }
  }

  // Private helper methods

  private formatResult(result: any, config: LoadTestConfig): LoadTestResult {
    return {
      title: config.url,
      url: config.url,
      connections: config.connections,
      pipelining: 1,
      duration: config.duration,
      start: new Date(result.start),
      finish: new Date(result.finish),
      requests: result.requests,
      latency: result.latency,
      throughput: result.throughput,
      errors: result.errors,
      timeouts: result.timeouts,
      non2xx: result.non2xx,
      resets: result.resets,
      '1xx': result['1xx'],
      '2xx': result['2xx'],
      '3xx': result['3xx'],
      '4xx': result['4xx'],
      '5xx': result['5xx']
    };
  }

  private generateSummary(results: LoadTestResult[], totalDuration: number): any {
    const totalRequests = results.reduce((sum, r) => sum + r.requests.total, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);
    const averageResponseTime = results.reduce((sum, r) => sum + r.latency.average, 0) / results.length;
    const averageThroughput = results.reduce((sum, r) => sum + r.throughput.average, 0) / results.length;

    return {
      totalTests: results.length,
      totalDuration,
      totalRequests,
      totalErrors,
      errorRate: (totalErrors / totalRequests) * 100,
      averageResponseTime,
      averageThroughput,
      p95ResponseTime: results.reduce((sum, r) => sum + r.latency.p95, 0) / results.length,
      p99ResponseTime: results.reduce((sum, r) => sum + r.latency.p99, 0) / results.length
    };
  }

  private generateRecommendations(results: LoadTestResult[]): string[] {
    const recommendations: string[] = [];
    
    const averageResponseTime = results.reduce((sum, r) => sum + r.latency.average, 0) / results.length;
    const errorRate = results.reduce((sum, r) => sum + r.errors, 0) / results.reduce((sum, r) => sum + r.requests.total, 0) * 100;
    const p95ResponseTime = results.reduce((sum, r) => sum + r.latency.p95, 0) / results.length;

    if (averageResponseTime > 1000) {
      recommendations.push('Consider implementing caching to reduce response times');
    }

    if (errorRate > 1) {
      recommendations.push('High error rate detected - investigate error handling and server stability');
    }

    if (p95ResponseTime > 2000) {
      recommendations.push('95th percentile response time is high - optimize slow endpoints');
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance looks good - continue monitoring');
    }

    return recommendations;
  }

  private identifyBottlenecks(results: LoadTestResult[]): string[] {
    const bottlenecks: string[] = [];
    
    results.forEach(result => {
      if (result.latency.average > 2000) {
        bottlenecks.push(`${result.url}: High average response time (${result.latency.average}ms)`);
      }
      
      if (result.errors > 0) {
        bottlenecks.push(`${result.url}: ${result.errors} errors detected`);
      }
      
      if (result.throughput.average < 10) {
        bottlenecks.push(`${result.url}: Low throughput (${result.throughput.average} req/s)`);
      }
    });

    return bottlenecks;
  }

  private assessScalability(results: LoadTestResult[]): any {
    const lightLoad = results.find(r => r.connections <= 20);
    const heavyLoad = results.find(r => r.connections >= 100);

    if (!lightLoad || !heavyLoad) {
      return { status: 'insufficient_data', message: 'Need both light and heavy load tests for scalability assessment' };
    }

    const responseTimeDegradation = (heavyLoad.latency.average - lightLoad.latency.average) / lightLoad.latency.average * 100;
    const throughputScaling = heavyLoad.throughput.average / lightLoad.throughput.average;

    let status = 'good';
    if (responseTimeDegradation > 200) status = 'poor';
    else if (responseTimeDegradation > 100) status = 'fair';

    return {
      status,
      responseTimeDegradation: `${responseTimeDegradation.toFixed(1)}%`,
      throughputScaling: `${throughputScaling.toFixed(2)}x`,
      recommendation: status === 'good' ? 'System scales well' : 'Consider horizontal scaling or optimization'
    };
  }

  private async collectPerformanceMetric(): Promise<PerformanceMetrics> {
    const startCpu = process.cpuUsage();
    const startTime = Date.now();

    // Make a test request to measure response time
    const testResult = await autocannon({
      url: `http://localhost:${config.server.port}/health`,
      connections: 1,
      duration: 1,
      amount: 1
    });

    const endTime = Date.now();
    const endCpu = process.cpuUsage(startCpu);

    return {
      averageResponseTime: testResult.latency.average,
      requestsPerSecond: testResult.throughput.average,
      errorRate: (testResult.errors / testResult.requests.total) * 100,
      throughput: testResult.throughput.average,
      p95ResponseTime: (testResult.latency as any).p95 || 0,
      p99ResponseTime: (testResult.latency as any).p99 || 0,
      memoryUsage: process.memoryUsage(),
      cpuUsage: endCpu,
      timestamp: new Date()
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const loadTestingService = LoadTestingService.getInstance();

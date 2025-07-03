/**
 * Performance monitoring and metrics collection
 */

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}

export interface DatabaseQueryMetric {
  query: string;
  duration: number;
  timestamp: number;
  success: boolean;
  table?: string;
}

export interface CacheMetric {
  operation: 'hit' | 'miss' | 'set' | 'delete';
  key: string;
  duration?: number;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private dbMetrics: DatabaseQueryMetric[] = [];
  private cacheMetrics: CacheMetric[] = [];
  private readonly MAX_METRICS = 1000; // Keep last 1000 metrics

  /**
   * Record a performance metric
   */
  recordMetric(name: string, value: number, tags?: Record<string, string>) {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      tags,
    };

    this.metrics.push(metric);
    
    // Keep only recent metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }

    // Log significant performance issues
    if (this.shouldAlert(name, value)) {
      console.warn(`Performance alert: ${name} = ${value}ms`, tags);
    }
  }

  /**
   * Record database query performance
   */
  recordDbQuery(query: string, duration: number, success: boolean, table?: string) {
    const metric: DatabaseQueryMetric = {
      query: query.substring(0, 100), // Truncate long queries
      duration,
      timestamp: Date.now(),
      success,
      table,
    };

    this.dbMetrics.push(metric);
    
    if (this.dbMetrics.length > this.MAX_METRICS) {
      this.dbMetrics = this.dbMetrics.slice(-this.MAX_METRICS);
    }

    // Alert on slow queries
    if (duration > 1000) { // > 1 second
      console.warn(`Slow database query (${duration}ms):`, query.substring(0, 50));
    }
  }

  /**
   * Record cache operation performance
   */
  recordCacheOperation(operation: CacheMetric['operation'], key: string, duration?: number) {
    const metric: CacheMetric = {
      operation,
      key,
      duration,
      timestamp: Date.now(),
    };

    this.cacheMetrics.push(metric);
    
    if (this.cacheMetrics.length > this.MAX_METRICS) {
      this.cacheMetrics = this.cacheMetrics.slice(-this.MAX_METRICS);
    }
  }

  /**
   * Get performance statistics
   */
  getStats() {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    // Filter recent metrics
    const recentMetrics = this.metrics.filter(m => m.timestamp > oneHourAgo);
    const recentDbMetrics = this.dbMetrics.filter(m => m.timestamp > oneHourAgo);
    const recentCacheMetrics = this.cacheMetrics.filter(m => m.timestamp > oneHourAgo);

    // Calculate averages
    const avgResponseTime = this.calculateAverage(
      recentMetrics.filter(m => m.name === 'api_response_time').map(m => m.value)
    );

    const avgDbQueryTime = this.calculateAverage(
      recentDbMetrics.map(m => m.duration)
    );

    // Cache hit rate
    const cacheHits = recentCacheMetrics.filter(m => m.operation === 'hit').length;
    const cacheMisses = recentCacheMetrics.filter(m => m.operation === 'miss').length;
    const cacheHitRate = cacheHits + cacheMisses > 0 ? (cacheHits / (cacheHits + cacheMisses)) * 100 : 0;

    return {
      period: '1 hour',
      requests: recentMetrics.filter(m => m.name === 'api_request').length,
      avgResponseTime: Math.round(avgResponseTime),
      avgDbQueryTime: Math.round(avgDbQueryTime),
      slowQueries: recentDbMetrics.filter(m => m.duration > 1000).length,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      cacheOperations: recentCacheMetrics.length,
      errors: recentDbMetrics.filter(m => !m.success).length,
      memory: process.memoryUsage(),
    };
  }

  /**
   * Create a timer for measuring operation duration
   */
  createTimer(name: string, tags?: Record<string, string>) {
    const start = Date.now();
    
    return {
      end: () => {
        const duration = Date.now() - start;
        this.recordMetric(name, duration, tags);
        return duration;
      },
    };
  }

  /**
   * Middleware for Express to measure API response times
   */
  expressMiddleware() {
    return (req: any, res: any, next: any) => {
      const timer = this.createTimer('api_response_time', {
        method: req.method,
        route: req.route?.path || 'unknown',
      });

      // Record request
      this.recordMetric('api_request', 1, {
        method: req.method,
        path: req.path,
      });

      // Measure response time
      res.on('finish', () => {
        timer.end();
        
        // Record status code metrics
        this.recordMetric('api_status_code', res.statusCode, {
          method: req.method,
          path: req.path,
        });
      });

      next();
    };
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private shouldAlert(name: string, value: number): boolean {
    const thresholds: Record<string, number> = {
      'api_response_time': 2000, // 2 seconds
      'balance_calculation_time': 5000, // 5 seconds
      'database_query_time': 1000, // 1 second
    };

    return thresholds[name] ? value > thresholds[name] : false;
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Decorator for measuring function execution time
 */
export function measurePerformance(metricName: string, tags?: Record<string, string>) {
  return function (_target: any, _propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const timer = performanceMonitor.createTimer(metricName, tags);
      
      try {
        const result = await method.apply(this, args);
        timer.end();
        return result;
      } catch (error) {
        timer.end();
        performanceMonitor.recordMetric(`${metricName}_error`, 1, tags);
        throw error;
      }
    };

    return descriptor;
  };
}

export default performanceMonitor;
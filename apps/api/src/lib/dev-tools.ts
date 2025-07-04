/**
 * Development tools and debugging utilities for Splitwise API
 */

import { Express, Request, Response } from 'express';
import { performanceMonitor } from './performance';
import prisma from './db';
import { z } from 'zod';

// Request logging utility
class RequestLogger {
  private static requests: Array<{
    id: string;
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: any;
    query?: any;
    params?: any;
    timestamp: number;
    ip: string;
    userAgent?: string;
    userId?: string;
  }> = [];

  private static readonly MAX_REQUESTS = 100;

  static logRequest(req: Request) {
    if (process.env.NODE_ENV === 'production') return;

    const requestLog = {
      id: crypto.randomUUID(),
      method: req.method,
      url: req.originalUrl,
      headers: this.sanitizeHeaders(req.headers as Record<string, string>),
      body: this.sanitizeBody(req.body),
      query: req.query,
      params: req.params,
      timestamp: Date.now(),
      ip: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent'),
      userId: (req as any).user?.id,
    };

    this.requests.push(requestLog);

    // Keep only recent requests
    if (this.requests.length > this.MAX_REQUESTS) {
      this.requests = this.requests.slice(-this.MAX_REQUESTS);
    }

    // Log important requests
    if (req.method !== 'GET' || req.originalUrl.includes('/health')) {
      console.log(`🔍 [${req.method}] ${req.originalUrl}`, {
        userId: requestLog.userId,
        ip: requestLog.ip,
        timestamp: new Date(requestLog.timestamp).toISOString(),
      });
    }
  }

  static getRequests(limit = 20) {
    return this.requests
      .slice(-limit)
      .reverse()
      .map(req => ({
        ...req,
        timestamp: new Date(req.timestamp).toISOString(),
      }));
  }

  static clearRequests() {
    this.requests = [];
  }

  private static sanitizeHeaders(headers: Record<string, string>) {
    const sanitized = { ...headers };
    if (sanitized.authorization) {
      sanitized.authorization = sanitized.authorization.substring(0, 20) + '...';
    }
    if (sanitized.cookie) {
      sanitized.cookie = '[REDACTED]';
    }
    return sanitized;
  }

  private static sanitizeBody(body: any) {
    if (!body) return body;
    
    const sanitized = { ...body };
    if (sanitized.password) {
      sanitized.password = '[REDACTED]';
    }
    if (sanitized.currentPassword) {
      sanitized.currentPassword = '[REDACTED]';
    }
    if (sanitized.newPassword) {
      sanitized.newPassword = '[REDACTED]';
    }
    return sanitized;
  }
}

// Database inspection utilities
class DatabaseInspector {
  static async getStats() {
    try {
      const [
        userCount,
        groupCount,
        expenseCount,
        settlementCount,
        balanceCount,
        recentExpenses,
        recentUsers,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.group.count(),
        prisma.expense.count(),
        prisma.settlement.count(),
        // Count distinct user-group combinations for balance tracking
        prisma.groupMember.count(),
        // Recent expenses (last 24 hours)
        prisma.expense.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
        }),
        // Recent users (last 7 days)
        prisma.user.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        }),
      ]);

      return {
        totalUsers: userCount,
        totalGroups: groupCount,
        totalExpenses: expenseCount,
        totalSettlements: settlementCount,
        totalGroupMemberships: balanceCount,
        recentActivity: {
          expensesLast24h: recentExpenses,
          usersLast7d: recentUsers,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error getting database stats:', error);
      throw new Error('Failed to retrieve database statistics');
    }
  }

  static async getTableSizes() {
    try {
      // Fallback to individual counts for compatibility
      return await this.getFallbackTableSizes();
    } catch (error) {
      console.error('Error getting table sizes:', error);
      return [];
    }
  }

  private static async getFallbackTableSizes() {
    const tables = [
      { name: 'User', count: await prisma.user.count() },
      { name: 'Group', count: await prisma.group.count() },
      { name: 'GroupMember', count: await prisma.groupMember.count() },
      { name: 'Expense', count: await prisma.expense.count() },
      { name: 'ExpenseSplit', count: await prisma.expenseSplit.count() },
      { name: 'Settlement', count: await prisma.settlement.count() },
    ];

    return tables.map(table => ({
      tableName: table.name,
      rowCount: table.count,
    }));
  }

  static async getRecentActivity(hours = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    try {
      const [recentExpenses, recentSettlements, recentUsers, recentGroups] = await Promise.all([
        prisma.expense.findMany({
          where: { createdAt: { gte: since } },
          include: {
            payer: { select: { name: true, email: true } },
            group: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
        prisma.settlement.findMany({
          where: { createdAt: { gte: since } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
        prisma.user.findMany({
          where: { createdAt: { gte: since } },
          select: { id: true, name: true, email: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
        prisma.group.findMany({
          where: { createdAt: { gte: since } },
          select: { id: true, name: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
      ]);

      return {
        expenses: recentExpenses.map(expense => ({
          id: expense.id,
          amount: Number(expense.amount),
          description: expense.description,
          payer: expense.payer.name,
          group: expense.group.name,
          createdAt: expense.createdAt,
        })),
        settlements: recentSettlements.map(settlement => ({
          id: settlement.id,
          amount: Number(settlement.amount),
          status: settlement.status,
          fromUser: settlement.fromUser,
          toUser: settlement.toUser,
          createdAt: settlement.createdAt,
        })),
        users: recentUsers,
        groups: recentGroups,
      };
    } catch (error) {
      console.error('Error getting recent activity:', error);
      throw new Error('Failed to retrieve recent activity');
    }
  }
}

// API testing utility
class APITester {
  static generateTestData() {
    return {
      users: [
        {
          email: `test-${Date.now()}@example.com`,
          name: 'Test User',
          password: 'testPassword123!',
        },
        {
          email: `alice-${Date.now()}@example.com`,
          name: 'Alice Johnson',
          password: 'alicePassword123!',
        },
        {
          email: `bob-${Date.now()}@example.com`,
          name: 'Bob Smith',
          password: 'bobPassword123!',
        },
      ],
      groups: [
        {
          name: `Test Group ${Date.now()}`,
          description: 'A test group for API testing',
        },
        {
          name: `Weekend Trip ${Date.now()}`,
          description: 'Expenses for weekend getaway',
        },
      ],
      expenses: [
        {
          amount: 120.50,
          description: 'Dinner at restaurant',
          category: 'FOOD' as const,
        },
        {
          amount: 45.00,
          description: 'Gas for the trip',
          category: 'TRANSPORTATION' as const,
        },
        {
          amount: 80.25,
          description: 'Movie tickets',
          category: 'ENTERTAINMENT' as const,
        },
      ],
    };
  }

  static validateResponseSchema(data: any, expectedSchema: z.ZodSchema) {
    try {
      const result = expectedSchema.safeParse(data);
      return {
        valid: result.success,
        errors: result.success ? null : result.error.flatten(),
        data: result.success ? result.data : null,
      };
    } catch (error) {
      return {
        valid: false,
        errors: { general: ['Schema validation failed'] },
        data: null,
      };
    }
  }

  static generateCurlExamples(baseUrl = 'http://localhost:3001') {
    return {
      auth: {
        register: `curl -X POST ${baseUrl}/api/v1/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "test@example.com",
    "name": "Test User",
    "password": "testPassword123!"
  }'`,
        login: `curl -X POST ${baseUrl}/api/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "test@example.com",
    "password": "testPassword123!"
  }'`,
      },
      groups: {
        create: `curl -X POST ${baseUrl}/api/v1/groups \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -d '{
    "name": "Weekend Trip",
    "description": "Expenses for weekend getaway"
  }'`,
        list: `curl -X GET ${baseUrl}/api/v1/groups \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"`,
      },
      expenses: {
        create: `curl -X POST ${baseUrl}/api/v1/expenses \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -d '{
    "groupId": "GROUP_ID",
    "amount": 120.50,
    "description": "Dinner at restaurant",
    "category": "FOOD",
    "paidBy": "USER_ID",
    "splits": [
      {"userId": "USER_ID_1", "amount": 60.25},
      {"userId": "USER_ID_2", "amount": 60.25}
    ]
  }'`,
      },
    };
  }
}

// Health check utilities
class HealthChecker {
  static async performHealthCheck() {
    const checks = {
      database: false,
      memory: false,
    };

    try {
      // Database check
      await prisma.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch (error) {
      console.error('Database health check failed:', error);
    }

    try {
      // Memory check (warn if > 80% of 512MB)
      const memoryUsage = process.memoryUsage();
      const maxMemory = 512 * 1024 * 1024; // 512MB
      checks.memory = memoryUsage.heapUsed < maxMemory * 0.8;
    } catch (error) {
      console.error('Memory health check failed:', error);
    }

    return {
      overall: Object.values(checks).every(Boolean),
      checks,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version,
    };
  }
}

// Development middleware
export function setupDevTools(app: Express) {
  if (process.env.NODE_ENV === 'production') {
    console.log('⚠️  Development tools disabled in production');
    return;
  }

  // Request logging middleware
  app.use((req, res, next) => {
    RequestLogger.logRequest(req);
    next();
  });

  // Development dashboard
  app.get('/dev/dashboard', async (req, res) => {
    try {
      const [dbStats, tableStats, recentActivity, healthCheck, requests] = await Promise.all([
        DatabaseInspector.getStats(),
        DatabaseInspector.getTableSizes(),
        DatabaseInspector.getRecentActivity(),
        HealthChecker.performHealthCheck(),
        Promise.resolve(RequestLogger.getRequests()),
      ]);

      res.json({
        title: 'Splitwise API Development Dashboard',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        database: dbStats,
        tables: tableStats,
        recentActivity,
        health: healthCheck,
        performance: performanceMonitor.getStats(),
        recentRequests: requests,
        links: {
          swagger: '/api/docs',
          health: '/health',
          metrics: '/metrics',
          logs: '/dev/logs',
          testData: '/dev/test-data',
          curlExamples: '/dev/curl-examples',
        },
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to generate development dashboard',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Recent logs endpoint
  app.get('/dev/logs', (req, res) => {
    const limit = parseInt(req.query.limit as string) || 50;
    res.json({
      requests: RequestLogger.getRequests(limit),
      performance: performanceMonitor.getStats(),
    });
  });

  // Test data generator
  app.get('/dev/test-data', (req, res) => {
    res.json({
      testData: APITester.generateTestData(),
      note: 'Use this data structure for testing API endpoints',
    });
  });

  // cURL examples
  app.get('/dev/curl-examples', (req, res) => {
    const baseUrl = req.query.baseUrl as string || `${req.protocol}://${req.get('host')}`;
    res.json({
      examples: APITester.generateCurlExamples(baseUrl),
      note: 'Replace YOUR_JWT_TOKEN, GROUP_ID, and USER_ID with actual values',
    });
  });

  // Clear logs endpoint
  app.post('/dev/clear-logs', (req, res) => {
    RequestLogger.clearRequests();
    res.json({
      success: true,
      message: 'Request logs cleared',
    });
  });

  console.log('🛠️  Development tools available at:');
  console.log('   📊 Dashboard: http://localhost:3001/dev/dashboard');
  console.log('   📋 Logs: http://localhost:3001/dev/logs');
  console.log('   🧪 Test Data: http://localhost:3001/dev/test-data');
  console.log('   💻 cURL Examples: http://localhost:3001/dev/curl-examples');
}

export { RequestLogger, DatabaseInspector, APITester, HealthChecker };
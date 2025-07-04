#!/usr/bin/env tsx

/**
 * API Test Runner - Comprehensive testing utility for Splitwise API
 * 
 * Usage:
 *   pnpm run api-test         # Run all tests
 *   pnpm run api-test auth    # Run auth tests only
 *   pnpm run api-test groups  # Run group tests only
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { z } from 'zod';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const API_URL = `${BASE_URL}/api/v1`;

// Response schemas for validation
const AuthResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: z.object({
    user: z.object({
      id: z.string(),
      email: z.string().email(),
      name: z.string(),
    }),
    token: z.string(),
  }),
});

const GroupResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    members: z.array(z.object({
      id: z.string(),
      userId: z.string(),
      role: z.enum(['ADMIN', 'MEMBER']),
      user: z.object({
        id: z.string(),
        email: z.string().email(),
        name: z.string(),
      }),
    })),
  }),
});

const ExpenseResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    id: z.string(),
    groupId: z.string(),
    amount: z.number(),
    description: z.string(),
    category: z.string(),
    paidBy: z.string(),
    splits: z.array(z.object({
      id: z.string(),
      userId: z.string(),
      amountOwed: z.number(),
    })),
  }),
});

// Test configuration
interface TestConfig {
  baseUrl: string;
  timeout: number;
  verbose: boolean;
}

interface TestContext {
  users: Array<{
    email: string;
    password: string;
    token?: string;
    id?: string;
    name: string;
  }>;
  groups: Array<{
    id?: string;
    name: string;
    description?: string;
  }>;
  expenses: Array<{
    id?: string;
    amount: number;
    description: string;
    category: string;
  }>;
}

class APITestRunner {
  private client: AxiosInstance;
  private config: TestConfig;
  private context: TestContext;
  private testResults: Array<{
    suite: string;
    test: string;
    passed: boolean;
    duration: number;
    error?: string;
  }> = [];

  constructor(config: TestConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout,
      validateStatus: () => true, // Don't throw on non-2xx status codes
    });

    this.context = {
      users: [
        {
          email: `test-admin-${Date.now()}@example.com`,
          password: 'testPassword123!',
          name: 'Test Admin User',
        },
        {
          email: `test-member-${Date.now()}@example.com`,
          password: 'testPassword123!',
          name: 'Test Member User',
        },
        {
          email: `test-guest-${Date.now()}@example.com`,
          password: 'testPassword123!',
          name: 'Test Guest User',
        },
      ],
      groups: [
        {
          name: `Test Group ${Date.now()}`,
          description: 'A test group for API testing',
        },
      ],
      expenses: [
        {
          amount: 120.50,
          description: 'Test dinner expense',
          category: 'FOOD',
        },
        {
          amount: 45.00,
          description: 'Test transport expense',
          category: 'TRANSPORTATION',
        },
      ],
    };
  }

  private log(message: string, level: 'info' | 'warn' | 'error' | 'success' = 'info') {
    if (!this.config.verbose && level === 'info') return;

    const colors = {
      info: '\\x1b[36m',    // Cyan
      warn: '\\x1b[33m',    // Yellow
      error: '\\x1b[31m',   // Red
      success: '\\x1b[32m', // Green
    };
    
    const reset = '\\x1b[0m';
    console.log(`${colors[level]}${message}${reset}`);
  }

  private async runTest(
    suite: string,
    testName: string,
    testFn: () => Promise<void>
  ): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      this.log(`  ▶ ${testName}`, 'info');
      await testFn();
      
      const duration = Date.now() - startTime;
      this.testResults.push({
        suite,
        test: testName,
        passed: true,
        duration,
      });
      
      this.log(`  ✓ ${testName} (${duration}ms)`, 'success');
      return true;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.testResults.push({
        suite,
        test: testName,
        passed: false,
        duration,
        error: errorMessage,
      });
      
      this.log(`  ✗ ${testName} (${duration}ms): ${errorMessage}`, 'error');
      return false;
    }
  }

  private async testHealthCheck() {
    this.log('\\n🏥 Health Check Tests', 'info');
    
    await this.runTest('health', 'API health endpoint responds', async () => {
      const response = await this.client.get('/health');
      
      if (response.status !== 200) {
        throw new Error(`Expected status 200, got ${response.status}`);
      }
      
      if (!response.data.status) {
        throw new Error('Health check response missing status field');
      }
    });
  }

  private async testAuthentication() {
    this.log('\\n🔐 Authentication Tests', 'info');
    
    // Test user registration
    await this.runTest('auth', 'User registration', async () => {
      const user = this.context.users[0];
      const response = await this.client.post('/auth/register', {
        email: user.email,
        name: user.name,
        password: user.password,
      });
      
      if (response.status !== 201) {
        throw new Error(`Registration failed: ${response.data.error || response.statusText}`);
      }
      
      const result = AuthResponseSchema.safeParse(response.data);
      if (!result.success) {
        throw new Error(`Invalid response format: ${result.error.message}`);
      }
      
      user.token = result.data.data.token;
      user.id = result.data.data.user.id;
    });

    // Test duplicate email registration
    await this.runTest('auth', 'Duplicate email registration fails', async () => {
      const user = this.context.users[0];
      const response = await this.client.post('/auth/register', {
        email: user.email,
        name: 'Another User',
        password: 'anotherPassword123!',
      });
      
      if (response.status !== 400) {
        throw new Error(`Expected status 400 for duplicate email, got ${response.status}`);
      }
    });

    // Test user login
    await this.runTest('auth', 'User login', async () => {
      const user = this.context.users[0];
      const response = await this.client.post('/auth/login', {
        email: user.email,
        password: user.password,
      });
      
      if (response.status !== 200) {
        throw new Error(`Login failed: ${response.data.error || response.statusText}`);
      }
      
      const result = AuthResponseSchema.safeParse(response.data);
      if (!result.success) {
        throw new Error(`Invalid response format: ${result.error.message}`);
      }
    });

    // Test invalid login
    await this.runTest('auth', 'Invalid login fails', async () => {
      const response = await this.client.post('/auth/login', {
        email: 'nonexistent@example.com',
        password: 'wrongpassword',
      });
      
      if (response.status !== 401) {
        throw new Error(`Expected status 401 for invalid login, got ${response.status}`);
      }
    });

    // Test protected route with token
    await this.runTest('auth', 'Protected route with token', async () => {
      const user = this.context.users[0];
      const response = await this.client.get('/auth/me', {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });
      
      if (response.status !== 200) {
        throw new Error(`Protected route failed: ${response.data.error || response.statusText}`);
      }
      
      if (!response.data.data.user.id) {
        throw new Error('User information not returned');
      }
    });

    // Test protected route without token
    await this.runTest('auth', 'Protected route without token fails', async () => {
      const response = await this.client.get('/auth/me');
      
      if (response.status !== 401) {
        throw new Error(`Expected status 401 for unauthenticated request, got ${response.status}`);
      }
    });

    // Register additional test users
    for (let i = 1; i < this.context.users.length; i++) {
      const user = this.context.users[i];
      const response = await this.client.post('/auth/register', {
        email: user.email,
        name: user.name,
        password: user.password,
      });
      
      if (response.status === 201) {
        const result = AuthResponseSchema.safeParse(response.data);
        if (result.success) {
          user.token = result.data.data.token;
          user.id = result.data.data.user.id;
        }
      }
    }
  }

  private async testGroupManagement() {
    this.log('\\n👥 Group Management Tests', 'info');
    
    const adminUser = this.context.users[0];
    const memberUser = this.context.users[1];
    
    // Test group creation
    await this.runTest('groups', 'Group creation', async () => {
      const group = this.context.groups[0];
      const response = await this.client.post('/groups', group, {
        headers: {
          Authorization: `Bearer ${adminUser.token}`,
        },
      });
      
      if (response.status !== 201) {
        throw new Error(`Group creation failed: ${response.data.error || response.statusText}`);
      }
      
      const result = GroupResponseSchema.safeParse(response.data);
      if (!result.success) {
        throw new Error(`Invalid response format: ${result.error.message}`);
      }
      
      group.id = result.data.data.id;
      
      // Verify admin role
      const adminMember = result.data.data.members.find(m => m.userId === adminUser.id);
      if (!adminMember || adminMember.role !== 'ADMIN') {
        throw new Error('Creator should be admin of the group');
      }
    });

    // Test group listing
    await this.runTest('groups', 'Group listing', async () => {
      const response = await this.client.get('/groups', {
        headers: {
          Authorization: `Bearer ${adminUser.token}`,
        },
      });
      
      if (response.status !== 200) {
        throw new Error(`Group listing failed: ${response.statusText}`);
      }
      
      if (!Array.isArray(response.data.data)) {
        throw new Error('Groups should be returned as an array');
      }
      
      const createdGroup = response.data.data.find((g: any) => g.id === this.context.groups[0].id);
      if (!createdGroup) {
        throw new Error('Created group not found in listing');
      }
    });

    // Test adding member to group
    await this.runTest('groups', 'Adding member to group', async () => {
      const group = this.context.groups[0];
      const response = await this.client.post(`/groups/${group.id}/members`, {
        email: memberUser.email,
        role: 'MEMBER',
      }, {
        headers: {
          Authorization: `Bearer ${adminUser.token}`,
        },
      });
      
      if (response.status !== 201) {
        throw new Error(`Adding member failed: ${response.data.error || response.statusText}`);
      }
      
      // Verify member was added
      const member = response.data.data.members.find((m: any) => m.userId === memberUser.id);
      if (!member) {
        throw new Error('Member not found in group after adding');
      }
    });

    // Test non-admin cannot add members
    await this.runTest('groups', 'Non-admin cannot add members', async () => {
      const group = this.context.groups[0];
      const guestUser = this.context.users[2];
      
      const response = await this.client.post(`/groups/${group.id}/members`, {
        email: guestUser.email,
        role: 'MEMBER',
      }, {
        headers: {
          Authorization: `Bearer ${memberUser.token}`,
        },
      });
      
      if (response.status !== 403) {
        throw new Error(`Expected status 403 for non-admin adding member, got ${response.status}`);
      }
    });
  }

  private async testExpenseManagement() {
    this.log('\\n💰 Expense Management Tests', 'info');
    
    const adminUser = this.context.users[0];
    const memberUser = this.context.users[1];
    const group = this.context.groups[0];
    
    // Test expense creation
    await this.runTest('expenses', 'Expense creation', async () => {
      const expense = this.context.expenses[0];
      const response = await this.client.post('/expenses', {
        groupId: group.id,
        amount: expense.amount,
        description: expense.description,
        category: expense.category,
        paidBy: adminUser.id,
        splits: [
          { userId: adminUser.id!, amount: expense.amount / 2 },
          { userId: memberUser.id!, amount: expense.amount / 2 },
        ],
      }, {
        headers: {
          Authorization: `Bearer ${adminUser.token}`,
        },
      });
      
      if (response.status !== 201) {
        throw new Error(`Expense creation failed: ${response.data.error || response.statusText}`);
      }
      
      const result = ExpenseResponseSchema.safeParse(response.data);
      if (!result.success) {
        throw new Error(`Invalid response format: ${result.error.message}`);
      }
      
      expense.id = result.data.data.id;
      
      // Verify splits
      if (result.data.data.splits.length !== 2) {
        throw new Error('Expected 2 splits for the expense');
      }
    });

    // Test invalid split amounts
    await this.runTest('expenses', 'Invalid split amounts fail', async () => {
      const expense = this.context.expenses[1];
      const response = await this.client.post('/expenses', {
        groupId: group.id,
        amount: expense.amount,
        description: expense.description,
        category: expense.category,
        paidBy: adminUser.id,
        splits: [
          { userId: adminUser.id!, amount: 10.00 }, // Wrong amount
          { userId: memberUser.id!, amount: 20.00 }, // Total doesn't match
        ],
      }, {
        headers: {
          Authorization: `Bearer ${adminUser.token}`,
        },
      });
      
      if (response.status !== 400) {
        throw new Error(`Expected status 400 for invalid split amounts, got ${response.status}`);
      }
    });

    // Test expense listing for group
    await this.runTest('expenses', 'Group expense listing', async () => {
      const response = await this.client.get(`/groups/${group.id}/expenses`, {
        headers: {
          Authorization: `Bearer ${adminUser.token}`,
        },
      });
      
      if (response.status !== 200) {
        throw new Error(`Expense listing failed: ${response.statusText}`);
      }
      
      if (!Array.isArray(response.data.data.expenses)) {
        throw new Error('Expenses should be returned as an array');
      }
      
      const createdExpense = response.data.data.expenses.find((e: any) => e.id === this.context.expenses[0].id);
      if (!createdExpense) {
        throw new Error('Created expense not found in listing');
      }
    });
  }

  async runAllTests() {
    this.log('🚀 Starting API Test Suite', 'info');
    this.log(`Base URL: ${this.config.baseUrl}`, 'info');
    
    const startTime = Date.now();
    
    try {
      await this.testHealthCheck();
      await this.testAuthentication();
      await this.testGroupManagement();
      await this.testExpenseManagement();
    } catch (error) {
      this.log(`Test suite failed: ${error}`, 'error');
    }
    
    const totalTime = Date.now() - startTime;
    this.printSummary(totalTime);
  }

  async runSpecificTests(suite: string) {
    this.log(`🎯 Running ${suite} tests only`, 'info');
    
    const startTime = Date.now();
    
    try {
      switch (suite.toLowerCase()) {
        case 'health':
          await this.testHealthCheck();
          break;
        case 'auth':
          await this.testAuthentication();
          break;
        case 'groups':
          await this.testAuthentication();
          await this.testGroupManagement();
          break;
        case 'expenses':
          await this.testAuthentication();
          await this.testGroupManagement();
          await this.testExpenseManagement();
          break;
        default:
          throw new Error(`Unknown test suite: ${suite}`);
      }
    } catch (error) {
      this.log(`Test suite failed: ${error}`, 'error');
    }
    
    const totalTime = Date.now() - startTime;
    this.printSummary(totalTime);
  }

  private printSummary(totalTime: number) {
    this.log('\\n📊 Test Summary', 'info');
    
    const passed = this.testResults.filter(r => r.passed).length;
    const failed = this.testResults.filter(r => !r.passed).length;
    const total = this.testResults.length;
    
    this.log(`Total tests: ${total}`, 'info');
    this.log(`Passed: ${passed}`, passed === total ? 'success' : 'info');
    if (failed > 0) {
      this.log(`Failed: ${failed}`, 'error');
    }
    this.log(`Total time: ${totalTime}ms`, 'info');
    
    if (failed > 0) {
      this.log('\\n❌ Failed Tests:', 'error');
      this.testResults
        .filter(r => !r.passed)
        .forEach(r => {
          this.log(`  ${r.suite}/${r.test}: ${r.error}`, 'error');
        });
    }
    
    const successRate = ((passed / total) * 100).toFixed(1);
    this.log(`\\n${passed === total ? '✅' : '⚠️'} Success rate: ${successRate}%`, 
             passed === total ? 'success' : 'warn');
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const suite = args[0];
  
  const config: TestConfig = {
    baseUrl: API_URL,
    timeout: 10000,
    verbose: process.env.VERBOSE === 'true' || args.includes('--verbose'),
  };
  
  const runner = new APITestRunner(config);
  
  if (suite) {
    await runner.runSpecificTests(suite);
  } else {
    await runner.runAllTests();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

export { APITestRunner };
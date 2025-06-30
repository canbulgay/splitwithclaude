import { z } from 'zod'

// User schemas
export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1).max(100),
  avatarUrl: z.string().url().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  password: z.string().min(8).max(100),
  avatarUrl: z.string().url().optional(),
})

// Group schemas
export const groupSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  createdBy: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
})

// Expense schemas
export const expenseSchema = z.object({
  id: z.string().uuid(),
  groupId: z.string().uuid(),
  amount: z.number().positive().multipleOf(0.01),
  description: z.string().min(1).max(200),
  paidBy: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const createExpenseSchema = z.object({
  groupId: z.string().uuid(),
  amount: z.number().positive().multipleOf(0.01),
  description: z.string().min(1).max(200),
  paidBy: z.string().uuid(),
  splits: z.array(z.object({
    userId: z.string().uuid(),
    amount: z.number().positive().multipleOf(0.01),
  })),
})

// Split schemas
export const splitSchema = z.object({
  method: z.enum(['equal', 'exact', 'percentage']),
  splits: z.array(z.object({
    userId: z.string().uuid(),
    amount: z.number().positive().multipleOf(0.01).optional(),
    percentage: z.number().min(0).max(100).optional(),
  })),
})

// Settlement schemas
export const settlementSchema = z.object({
  id: z.string().uuid(),
  fromUser: z.string().uuid(),
  toUser: z.string().uuid(),
  amount: z.number().positive().multipleOf(0.01),
  settledAt: z.date(),
  expenseIds: z.array(z.string().uuid()),
})

export const createSettlementSchema = z.object({
  fromUser: z.string().uuid(),
  toUser: z.string().uuid(),
  amount: z.number().positive().multipleOf(0.01),
  expenseIds: z.array(z.string().uuid()),
})

// API response schemas
export const apiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
})

export const paginationSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive().max(100),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
})
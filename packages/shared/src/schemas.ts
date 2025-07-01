import { z } from 'zod'
import { Role } from './types'

// User schemas
export const userSchema = z.object({
  id: z.string().cuid(),
  email: z.string().email(),
  name: z.string().min(1).max(100),
  password: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  provider: z.string().default('credentials'),
  providerId: z.string().optional(),
  emailVerified: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  password: z.string().min(8).max(100),
  avatarUrl: z.string().url().optional(),
})

// Authentication schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
})

export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character'),
  avatarUrl: z.string().url().optional(),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character'),
})

export const authResponseSchema = z.object({
  user: userSchema.omit({ password: true }),
  token: z.string(),
})

// Group schemas
export const groupSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  createdBy: z.string().cuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const groupMemberSchema = z.object({
  groupId: z.string().cuid(),
  userId: z.string().cuid(),
  role: z.nativeEnum(Role),
  joinedAt: z.date(),
})

export const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
})

// Expense schemas
export const expenseSchema = z.object({
  id: z.string().cuid(),
  groupId: z.string().cuid(),
  amount: z.number().positive().multipleOf(0.01),
  description: z.string().min(1).max(200),
  paidBy: z.string().cuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const expenseSplitSchema = z.object({
  expenseId: z.string().cuid(),
  userId: z.string().cuid(),
  amountOwed: z.number().positive().multipleOf(0.01),
})

export const createExpenseSchema = z.object({
  groupId: z.string().cuid(),
  amount: z.number().positive().multipleOf(0.01),
  description: z.string().min(1).max(200),
  paidBy: z.string().cuid(),
  splits: z.array(z.object({
    userId: z.string().cuid(),
    amount: z.number().positive().multipleOf(0.01),
  })),
})

// Split schemas
export const splitSchema = z.object({
  method: z.enum(['equal', 'exact', 'percentage']),
  splits: z.array(z.object({
    userId: z.string().cuid(),
    amount: z.number().positive().multipleOf(0.01).optional(),
    percentage: z.number().min(0).max(100).optional(),
  })),
})

// Settlement schemas
export const settlementSchema = z.object({
  id: z.string().cuid(),
  fromUser: z.string().cuid(),
  toUser: z.string().cuid(),
  amount: z.number().positive().multipleOf(0.01),
  settledAt: z.date(),
})

export const settlementExpenseSchema = z.object({
  settlementId: z.string().cuid(),
  expenseId: z.string().cuid(),
})

export const createSettlementSchema = z.object({
  fromUser: z.string().cuid(),
  toUser: z.string().cuid(),
  amount: z.number().positive().multipleOf(0.01),
  expenseIds: z.array(z.string().cuid()).optional(),
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
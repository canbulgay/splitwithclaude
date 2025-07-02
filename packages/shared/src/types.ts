// Core domain types for Splitwise MVP (matching Prisma schema)

export interface User {
  id: string
  email: string
  name: string
  password?: string // Optional for OAuth users
  avatarUrl?: string
  provider: string
  providerId?: string
  emailVerified: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Group {
  id: string
  name: string
  description?: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface GroupMember {
  groupId: string
  userId: string
  role: Role
  joinedAt: Date
}

export interface Expense {
  id: string
  groupId: string
  amount: number
  description: string
  category: ExpenseCategory
  paidBy: string
  createdAt: Date
  updatedAt: Date
}

export interface ExpenseSplit {
  expenseId: string
  userId: string
  amountOwed: number
}

export interface Settlement {
  id: string
  fromUser: string
  toUser: string
  amount: number
  settledAt: Date
}

export interface SettlementExpense {
  settlementId: string
  expenseId: string
}

// Enums
export enum Role {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

export enum ExpenseCategory {
  GENERAL = 'GENERAL',
  FOOD = 'FOOD',
  TRANSPORTATION = 'TRANSPORTATION',
  ENTERTAINMENT = 'ENTERTAINMENT',
  UTILITIES = 'UTILITIES',
  SHOPPING = 'SHOPPING',
  HEALTHCARE = 'HEALTHCARE',
  TRAVEL = 'TRAVEL',
  EDUCATION = 'EDUCATION',
  OTHER = 'OTHER',
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Authentication types
export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  name: string
  password: string
  avatarUrl?: string
}

export interface AuthResponse {
  user: Omit<User, 'password'>
  token: string
}

export interface AuthTokenPayload {
  userId: string
  email: string
  iat?: number
  exp?: number
}

// Split method types
export type SplitMethod = 'equal' | 'exact' | 'percentage'

export interface SplitData {
  method: SplitMethod
  splits: Array<{
    userId: string
    amount?: number
    percentage?: number
  }>
}
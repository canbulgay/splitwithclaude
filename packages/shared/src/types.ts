// Core domain types for Splitwise MVP (matching Prisma schema)

export interface User {
  id: string
  email: string
  name: string
  avatarUrl?: string
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
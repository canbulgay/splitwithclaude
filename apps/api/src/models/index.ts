// Export all database models
export { UserModel } from './User'
export { GroupModel } from './Group'
export { ExpenseModel } from './Expense'
export { SettlementModel } from './Settlement'

// Re-export Prisma types for convenience
export type {
  User,
  Group,
  GroupMember,
  Expense,
  ExpenseSplit,
  Settlement,
  SettlementExpense,
  Role,
  Prisma,
} from '@prisma/client'
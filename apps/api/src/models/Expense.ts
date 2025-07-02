import { Expense as PrismaExpense, Prisma, ExpenseCategory } from '@prisma/client'
import prisma from '../lib/db'

interface ExpenseSplitInput {
  userId: string
  amountOwed: number
}

export class ExpenseModel {
  /**
   * Create a new expense with splits
   */
  static async createWithSplits(
    expenseData: Omit<Prisma.ExpenseCreateInput, 'splits'>,
    splits: ExpenseSplitInput[]
  ) {
    return prisma.$transaction(async (tx) => {
      // Create the expense
      const expense = await tx.expense.create({
        data: expenseData,
      })

      // Create the splits
      await tx.expenseSplit.createMany({
        data: splits.map(split => ({
          expenseId: expense.id,
          userId: split.userId,
          amountOwed: split.amountOwed,
        })),
      })

      return expense
    })
  }

  /**
   * Find expense by ID
   */
  static async findById(id: string): Promise<PrismaExpense | null> {
    return prisma.expense.findUnique({
      where: { id },
    })
  }

  /**
   * Find expense with splits
   */
  static async findWithSplits(id: string) {
    return prisma.expense.findUnique({
      where: { id },
      include: {
        payer: true,
        group: true,
        splits: {
          include: {
            user: true,
          },
        },
      },
    })
  }

  /**
   * Update expense
   */
  static async update(id: string, data: Prisma.ExpenseUpdateInput): Promise<PrismaExpense> {
    return prisma.expense.update({
      where: { id },
      data,
    })
  }

  /**
   * Update expense with new splits
   */
  static async updateWithSplits(
    id: string,
    expenseData: Prisma.ExpenseUpdateInput,
    splits: ExpenseSplitInput[]
  ) {
    return prisma.$transaction(async (tx) => {
      // Update the expense
      const expense = await tx.expense.update({
        where: { id },
        data: expenseData,
      })

      // Delete existing splits
      await tx.expenseSplit.deleteMany({
        where: { expenseId: id },
      })

      // Create new splits
      await tx.expenseSplit.createMany({
        data: splits.map(split => ({
          expenseId: id,
          userId: split.userId,
          amountOwed: split.amountOwed,
        })),
      })

      return expense
    })
  }

  /**
   * Delete expense
   */
  static async delete(id: string): Promise<PrismaExpense> {
    return prisma.expense.delete({
      where: { id },
    })
  }

  /**
   * Get expenses for a group
   */
  static async findByGroupId(
    groupId: string,
    options?: {
      skip?: number
      take?: number
      orderBy?: Prisma.ExpenseOrderByWithRelationInput
    }
  ) {
    return prisma.expense.findMany({
      where: { groupId },
      include: {
        payer: true,
        splits: {
          include: {
            user: true,
          },
        },
      },
      skip: options?.skip,
      take: options?.take,
      orderBy: options?.orderBy || { createdAt: 'desc' },
    })
  }

  /**
   * Get expenses for a group with filtering and pagination
   */
  static async findByGroupIdWithFilters(
    groupId: string,
    filters: {
      page?: number
      limit?: number
      category?: ExpenseCategory
      paidBy?: string
      minAmount?: number
      maxAmount?: number
      startDate?: string
      endDate?: string
      sortBy?: 'createdAt' | 'amount' | 'description'
      sortOrder?: 'asc' | 'desc'
    }
  ) {
    const {
      page = 1,
      limit = 20,
      category,
      paidBy,
      minAmount,
      maxAmount,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters

    // Build where clause
    const where: Prisma.ExpenseWhereInput = {
      groupId,
      ...(category && { category }),
      ...(paidBy && { paidBy }),
      ...(minAmount && { amount: { gte: minAmount } }),
      ...(maxAmount && { 
        amount: minAmount 
          ? { gte: minAmount, lte: maxAmount }
          : { lte: maxAmount }
      }),
      ...(startDate && { 
        createdAt: { 
          gte: new Date(startDate),
          ...(endDate && { lte: new Date(endDate) })
        }
      }),
      ...(endDate && !startDate && { 
        createdAt: { lte: new Date(endDate) }
      }),
    }

    // Build order by clause
    const orderBy: Prisma.ExpenseOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    }

    // Calculate pagination
    const skip = (page - 1) * limit
    
    // Execute queries in parallel
    const [expenses, totalCount] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: {
          payer: true,
          splits: {
            include: {
              user: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy,
      }),
      prisma.expense.count({ where }),
    ])

    const totalPages = Math.ceil(totalCount / limit)

    return {
      expenses,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    }
  }

  /**
   * Get expenses paid by a user
   */
  static async findByPayerId(userId: string) {
    return prisma.expense.findMany({
      where: { paidBy: userId },
      include: {
        group: true,
        splits: {
          include: {
            user: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Get expenses where user owes money
   */
  static async findByDebtor(userId: string) {
    return prisma.expense.findMany({
      where: {
        splits: {
          some: {
            userId,
          },
        },
      },
      include: {
        payer: true,
        group: true,
        splits: {
          include: {
            user: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Calculate balances for a group
   */
  static async calculateGroupBalances(groupId: string) {
    const expenses = await prisma.expense.findMany({
      where: { groupId },
      include: {
        splits: true,
      },
    })

    const balances = new Map<string, Map<string, number>>()

    for (const expense of expenses) {
      const payerId = expense.paidBy
      
      for (const split of expense.splits) {
        if (split.userId !== payerId) {
          if (!balances.has(split.userId)) {
            balances.set(split.userId, new Map())
          }
          
          const userBalances = balances.get(split.userId)!
          const currentBalance = userBalances.get(payerId) || 0
          userBalances.set(payerId, currentBalance + Number(split.amountOwed))
        }
      }
    }

    // Convert to array format
    const result: Array<{
      fromUser: string
      toUser: string
      amount: number
    }> = []

    for (const [fromUser, toUsers] of balances) {
      for (const [toUser, amount] of toUsers) {
        if (amount > 0) {
          result.push({
            fromUser,
            toUser,
            amount: Math.round(amount * 100) / 100, // Round to 2 decimal places
          })
        }
      }
    }

    return result
  }

  /**
   * Get expense count for a group
   */
  static async countByGroupId(groupId: string): Promise<number> {
    return prisma.expense.count({
      where: { groupId },
    })
  }

  /**
   * Get total amount spent in a group
   */
  static async getTotalByGroupId(groupId: string): Promise<number> {
    const result = await prisma.expense.aggregate({
      where: { groupId },
      _sum: {
        amount: true,
      },
    })

    return Number(result._sum.amount || 0)
  }
}
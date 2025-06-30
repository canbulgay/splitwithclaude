import { Settlement as PrismaSettlement, Prisma } from '@prisma/client'
import prisma from '../lib/db'

export class SettlementModel {
  /**
   * Create a new settlement
   */
  static async create(
    settlementData: Omit<Prisma.SettlementCreateInput, 'expenses'>,
    expenseIds?: string[]
  ) {
    return prisma.$transaction(async (tx) => {
      // Create the settlement
      const settlement = await tx.settlement.create({
        data: settlementData,
      })

      // Link to expenses if provided
      if (expenseIds && expenseIds.length > 0) {
        await tx.settlementExpense.createMany({
          data: expenseIds.map(expenseId => ({
            settlementId: settlement.id,
            expenseId,
          })),
        })
      }

      return settlement
    })
  }

  /**
   * Find settlement by ID
   */
  static async findById(id: string): Promise<PrismaSettlement | null> {
    return prisma.settlement.findUnique({
      where: { id },
    })
  }

  /**
   * Find settlement with related data
   */
  static async findWithDetails(id: string) {
    return prisma.settlement.findUnique({
      where: { id },
      include: {
        fromUserRel: true,
        toUserRel: true,
        expenses: {
          include: {
            expense: {
              include: {
                group: true,
              },
            },
          },
        },
      },
    })
  }

  /**
   * Update settlement
   */
  static async update(id: string, data: Prisma.SettlementUpdateInput): Promise<PrismaSettlement> {
    return prisma.settlement.update({
      where: { id },
      data,
    })
  }

  /**
   * Delete settlement
   */
  static async delete(id: string): Promise<PrismaSettlement> {
    return prisma.settlement.delete({
      where: { id },
    })
  }

  /**
   * Get settlements for a user (both sent and received)
   */
  static async findByUserId(userId: string) {
    return prisma.settlement.findMany({
      where: {
        OR: [
          { fromUser: userId },
          { toUser: userId },
        ],
      },
      include: {
        fromUserRel: true,
        toUserRel: true,
        expenses: {
          include: {
            expense: {
              include: {
                group: true,
              },
            },
          },
        },
      },
      orderBy: { settledAt: 'desc' },
    })
  }

  /**
   * Get settlements between two users
   */
  static async findBetweenUsers(user1Id: string, user2Id: string) {
    return prisma.settlement.findMany({
      where: {
        OR: [
          { fromUser: user1Id, toUser: user2Id },
          { fromUser: user2Id, toUser: user1Id },
        ],
      },
      include: {
        fromUserRel: true,
        toUserRel: true,
        expenses: {
          include: {
            expense: {
              include: {
                group: true,
              },
            },
          },
        },
      },
      orderBy: { settledAt: 'desc' },
    })
  }

  /**
   * Get settlements for a group (via expenses)
   */
  static async findByGroupId(groupId: string) {
    return prisma.settlement.findMany({
      where: {
        expenses: {
          some: {
            expense: {
              groupId,
            },
          },
        },
      },
      include: {
        fromUserRel: true,
        toUserRel: true,
        expenses: {
          include: {
            expense: {
              include: {
                group: true,
              },
            },
          },
        },
      },
      orderBy: { settledAt: 'desc' },
    })
  }

  /**
   * Calculate suggested settlements for a group
   */
  static async suggestSettlements(groupId: string) {
    // Get all expenses for the group
    const expenses = await prisma.expense.findMany({
      where: { groupId },
      include: {
        splits: true,
      },
    })

    // Calculate net balances between all users
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

    // Simplify balances (net out mutual debts)
    const netBalances = new Map<string, number>()
    
    for (const [debtor, creditors] of balances) {
      for (const [creditor, amount] of creditors) {
        // Add to debtor's debt
        const debtorBalance = netBalances.get(debtor) || 0
        netBalances.set(debtor, debtorBalance - amount)
        
        // Add to creditor's credit
        const creditorBalance = netBalances.get(creditor) || 0
        netBalances.set(creditor, creditorBalance + amount)
      }
    }

    // Create settlement suggestions to minimize transactions
    const suggestions: Array<{
      fromUser: string
      toUser: string
      amount: number
    }> = []

    const debtors = Array.from(netBalances.entries())
      .filter(([_, balance]) => balance < -0.01) // Owes money
      .sort(([_, a], [__, b]) => a - b) // Most debt first

    const creditors = Array.from(netBalances.entries())
      .filter(([_, balance]) => balance > 0.01) // Owed money
      .sort(([_, a], [__, b]) => b - a) // Most credit first

    let debtorIndex = 0
    let creditorIndex = 0

    while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
      const [debtorId, debtorBalance] = debtors[debtorIndex]
      const [creditorId, creditorBalance] = creditors[creditorIndex]

      const settlementAmount = Math.min(Math.abs(debtorBalance), creditorBalance)
      
      if (settlementAmount > 0.01) { // Only suggest settlements > 1 cent
        suggestions.push({
          fromUser: debtorId,
          toUser: creditorId,
          amount: Math.round(settlementAmount * 100) / 100,
        })

        // Update balances
        debtors[debtorIndex][1] += settlementAmount
        creditors[creditorIndex][1] -= settlementAmount
      }

      // Move to next debtor/creditor if current one is settled
      if (Math.abs(debtors[debtorIndex][1]) < 0.01) {
        debtorIndex++
      }
      if (creditors[creditorIndex][1] < 0.01) {
        creditorIndex++
      }
    }

    return suggestions
  }

  /**
   * Get settlement count for a user
   */
  static async countByUserId(userId: string): Promise<number> {
    return prisma.settlement.count({
      where: {
        OR: [
          { fromUser: userId },
          { toUser: userId },
        ],
      },
    })
  }

  /**
   * Get total amount settled by/for a user
   */
  static async getTotalByUserId(userId: string): Promise<{ sent: number; received: number }> {
    const [sentResult, receivedResult] = await Promise.all([
      prisma.settlement.aggregate({
        where: { fromUser: userId },
        _sum: { amount: true },
      }),
      prisma.settlement.aggregate({
        where: { toUser: userId },
        _sum: { amount: true },
      }),
    ])

    return {
      sent: Number(sentResult._sum.amount || 0),
      received: Number(receivedResult._sum.amount || 0),
    }
  }
}
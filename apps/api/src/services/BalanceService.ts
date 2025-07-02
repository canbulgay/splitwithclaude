import { ExpenseModel } from '../models/Expense';
import { SettlementModel } from '../models/Settlement';

export interface Balance {
  fromUser: string;
  toUser: string;
  amount: number;
}

export interface SettlementSuggestion {
  fromUser: string;
  toUser: string;
  amount: number;
}

export interface UserBalanceSummary {
  userId: string;
  totalOwed: number;
  totalOwedTo: number;
  netBalance: number;
}

export class BalanceService {
  /**
   * Calculate real-time balances for a group
   * This method provides immediate balance calculation without caching
   */
  static async calculateGroupBalancesRealTime(groupId: string): Promise<Balance[]> {
    return ExpenseModel.calculateGroupBalances(groupId);
  }

  /**
   * Get settlement suggestions to minimize transactions
   */
  static async getSettlementSuggestions(groupId: string): Promise<SettlementSuggestion[]> {
    return SettlementModel.suggestSettlements(groupId);
  }

  /**
   * Calculate balance summary for a specific user across all groups
   */
  static async calculateUserBalanceSummary(userId: string): Promise<UserBalanceSummary> {
    // This would typically involve querying all groups the user is part of
    // For now, we'll implement a basic version
    
    // Get all expenses where user is involved (paid or owes)
    const expensesPaid = await ExpenseModel.findByPayerId(userId);
    const expensesOwed = await ExpenseModel.findByDebtor(userId);
    
    let totalPaid = 0;
    let totalOwed = 0;
    
    // Calculate total paid by user
    for (const expense of expensesPaid) {
      totalPaid += Number(expense.amount);
    }
    
    // Calculate total owed by user
    for (const expense of expensesOwed) {
      for (const split of expense.splits) {
        if (split.userId === userId) {
          totalOwed += Number(split.amountOwed);
        }
      }
    }
    
    const netBalance = totalPaid - totalOwed;
    
    return {
      userId,
      totalOwed: Math.round(totalOwed * 100) / 100,
      totalOwedTo: Math.round((totalPaid - totalOwed) * 100) / 100,
      netBalance: Math.round(netBalance * 100) / 100,
    };
  }

  /**
   * Calculate detailed balance between two users across all shared groups
   */
  static async calculateBalanceBetweenUsers(
    user1Id: string,
    user2Id: string
  ): Promise<{
    netAmount: number;
    direction: string;
    details: Balance[];
  }> {
    // This is a simplified implementation
    // In a real scenario, we'd need to find all shared groups first
    
    let netAmount = 0;
    const details: Balance[] = [];
    
    // Get all expenses where both users are involved
    const user1Expenses = await ExpenseModel.findByPayerId(user1Id);
    const user2Expenses = await ExpenseModel.findByPayerId(user2Id);
    
    // Calculate what user2 owes to user1 (from user1's expenses)
    for (const expense of user1Expenses) {
      for (const split of expense.splits) {
        if (split.userId === user2Id) {
          netAmount += Number(split.amountOwed);
          details.push({
            fromUser: user2Id,
            toUser: user1Id,
            amount: Number(split.amountOwed),
          });
        }
      }
    }
    
    // Calculate what user1 owes to user2 (from user2's expenses)
    for (const expense of user2Expenses) {
      for (const split of expense.splits) {
        if (split.userId === user1Id) {
          netAmount -= Number(split.amountOwed);
          details.push({
            fromUser: user1Id,
            toUser: user2Id,
            amount: Number(split.amountOwed),
          });
        }
      }
    }
    
    let direction = '';
    if (netAmount > 0) {
      direction = `${user2Id} owes ${user1Id}`;
    } else if (netAmount < 0) {
      direction = `${user1Id} owes ${user2Id}`;
      netAmount = Math.abs(netAmount);
    } else {
      direction = 'Even';
    }
    
    return {
      netAmount: Math.round(netAmount * 100) / 100,
      direction,
      details,
    };
  }

  /**
   * Optimize settlement suggestions using advanced algorithms
   * This implements a more sophisticated debt minimization algorithm
   */
  static async optimizeSettlements(groupId: string): Promise<SettlementSuggestion[]> {
    const balances = await this.calculateGroupBalancesRealTime(groupId);
    
    // Create a net balance map for each user
    const netBalances = new Map<string, number>();
    
    // Calculate net balance for each user
    for (const balance of balances) {
      // Person who owes money
      const currentDebt = netBalances.get(balance.fromUser) || 0;
      netBalances.set(balance.fromUser, currentDebt - balance.amount);
      
      // Person who is owed money
      const currentCredit = netBalances.get(balance.toUser) || 0;
      netBalances.set(balance.toUser, currentCredit + balance.amount);
    }
    
    // Separate debtors and creditors
    const debtors = Array.from(netBalances.entries())
      .filter(([_, balance]) => balance < -0.01)
      .sort(([_, a], [__, b]) => a - b); // Most debt first
    
    const creditors = Array.from(netBalances.entries())
      .filter(([_, balance]) => balance > 0.01)
      .sort(([_, a], [__, b]) => b - a); // Most credit first
    
    const optimizedSuggestions: SettlementSuggestion[] = [];
    
    let debtorIndex = 0;
    let creditorIndex = 0;
    
    while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
      const [debtorId, debtorBalance] = debtors[debtorIndex];
      const [creditorId, creditorBalance] = creditors[creditorIndex];
      
      const settlementAmount = Math.min(Math.abs(debtorBalance), creditorBalance);
      
      if (settlementAmount > 0.01) {
        optimizedSuggestions.push({
          fromUser: debtorId,
          toUser: creditorId,
          amount: Math.round(settlementAmount * 100) / 100,
        });
        
        // Update balances
        debtors[debtorIndex][1] += settlementAmount;
        creditors[creditorIndex][1] -= settlementAmount;
      }
      
      // Move to next debtor/creditor if current one is settled
      if (Math.abs(debtors[debtorIndex][1]) < 0.01) {
        debtorIndex++;
      }
      if (creditors[creditorIndex][1] < 0.01) {
        creditorIndex++;
      }
    }
    
    return optimizedSuggestions;
  }

  /**
   * Real-time balance validation
   * Ensures balance calculations are mathematically sound
   */
  static async validateBalanceAccuracy(groupId: string): Promise<{
    isValid: boolean;
    totalExpenses: number;
    totalSplits: number;
    discrepancy: number;
  }> {
    const expenses = await ExpenseModel.findByGroupId(groupId);
    
    let totalExpenses = 0;
    let totalSplits = 0;
    
    for (const expense of expenses) {
      totalExpenses += Number(expense.amount);
      
      for (const split of expense.splits) {
        totalSplits += Number(split.amountOwed);
      }
    }
    
    const discrepancy = Math.abs(totalExpenses - totalSplits);
    const isValid = discrepancy < 0.01; // Allow for small rounding differences
    
    return {
      isValid,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      totalSplits: Math.round(totalSplits * 100) / 100,
      discrepancy: Math.round(discrepancy * 100) / 100,
    };
  }
}
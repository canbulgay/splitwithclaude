import { ExpenseModel } from '../models/Expense';
import { SettlementModel } from '../models/Settlement';
import { cache, CacheKeys } from '../lib/cache';

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
   * Calculate real-time balances for a group with caching
   */
  static async calculateGroupBalancesRealTime(groupId: string): Promise<Balance[]> {
    // Try to get from cache first
    const cacheKey = CacheKeys.groupBalances(groupId);
    const cachedBalances = cache.get<Balance[]>(cacheKey);
    
    if (cachedBalances) {
      return cachedBalances;
    }

    // Calculate and cache the result
    const balances = await ExpenseModel.calculateGroupBalances(groupId);
    cache.set(cacheKey, balances, 5 * 60 * 1000); // Cache for 5 minutes
    
    return balances;
  }

  /**
   * Get settlement suggestions to minimize transactions with caching
   */
  static async getSettlementSuggestions(groupId: string): Promise<SettlementSuggestion[]> {
    // Try to get from cache first
    const cacheKey = CacheKeys.settlementSuggestions(groupId);
    const cachedSuggestions = cache.get<SettlementSuggestion[]>(cacheKey);
    
    if (cachedSuggestions) {
      return cachedSuggestions;
    }

    // Calculate and cache the result
    const suggestions = await SettlementModel.suggestSettlements(groupId);
    cache.set(cacheKey, suggestions, 5 * 60 * 1000); // Cache for 5 minutes
    
    return suggestions;
  }

  /**
   * Calculate balance summary for a specific user across all groups with caching
   */
  static async calculateUserBalanceSummary(userId: string): Promise<UserBalanceSummary> {
    // Try to get from cache first
    const cacheKey = CacheKeys.userBalances(userId);
    const cachedSummary = cache.get<UserBalanceSummary>(cacheKey);
    
    if (cachedSummary) {
      return cachedSummary;
    }

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
    
    const summary = {
      userId,
      totalOwed: Math.round(totalOwed * 100) / 100,
      totalOwedTo: Math.round((totalPaid - totalOwed) * 100) / 100,
      netBalance: Math.round(netBalance * 100) / 100,
    };

    // Cache the result
    cache.set(cacheKey, summary, 5 * 60 * 1000); // Cache for 5 minutes
    
    return summary;
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
   * Calculate group balances including confirmed settlements
   * This provides the true outstanding balances after settlements
   */
  static async calculateGroupBalancesWithSettlements(groupId: string): Promise<Balance[]> {
    try {
      // Get original balances from expenses
      const expenseBalances = await ExpenseModel.calculateGroupBalances(groupId);
      
      // Get all confirmed settlements between group members
      const confirmedSettlements = await SettlementModel.findByGroupMembers(groupId);
      const activeSettlements = confirmedSettlements.filter(
        s => s && s.status === 'CONFIRMED' || s.status === 'COMPLETED'
      );
    
    // Create a balance map for easier manipulation
    const balanceMap = new Map<string, Map<string, number>>();
    
    // Initialize with expense balances
    for (const balance of expenseBalances) {
      if (!balanceMap.has(balance.fromUser)) {
        balanceMap.set(balance.fromUser, new Map());
      }
      balanceMap.get(balance.fromUser)!.set(balance.toUser, balance.amount);
    }
    
    // Subtract confirmed settlements
    for (const settlement of activeSettlements) {
      const fromUser = settlement.fromUser;
      const toUser = settlement.toUser;
      const amount = Number(settlement.amount);
      
      // Reduce the debt by the settlement amount
      if (balanceMap.has(fromUser) && balanceMap.get(fromUser)!.has(toUser)) {
        const currentBalance = balanceMap.get(fromUser)!.get(toUser)!;
        const newBalance = currentBalance - amount;
        
        if (newBalance <= 0.01) {
          // Debt is fully settled, remove it
          balanceMap.get(fromUser)!.delete(toUser);
          
          // If there's overpayment, create reverse debt
          if (newBalance < -0.01) {
            if (!balanceMap.has(toUser)) {
              balanceMap.set(toUser, new Map());
            }
            balanceMap.get(toUser)!.set(fromUser, Math.abs(newBalance));
          }
        } else {
          balanceMap.get(fromUser)!.set(toUser, newBalance);
        }
      }
    }
    
      // Convert back to Balance array
      const finalBalances: Balance[] = [];
      for (const [fromUser, userBalances] of balanceMap) {
        for (const [toUser, amount] of userBalances) {
          if (amount > 0.01) { // Only include significant balances
            finalBalances.push({ fromUser, toUser, amount });
          }
        }
      }
      
      return finalBalances;
    } catch (error) {
      console.error('Error in calculateGroupBalancesWithSettlements:', error);
      // Fall back to expense-only balances if settlement calculation fails
      return ExpenseModel.calculateGroupBalances(groupId);
    }
  }

  /**
   * Get settlement suggestions based on outstanding balances after settlements
   */
  static async getActiveSettlementSuggestions(groupId: string): Promise<SettlementSuggestion[]> {
    try {
      const outstandingBalances = await this.calculateGroupBalancesWithSettlements(groupId);
      return this.optimizeBalanceArray(outstandingBalances);
    } catch (error) {
      console.error('Error in getActiveSettlementSuggestions:', error);
      return [];
    }
  }

  /**
   * Helper method to optimize a balance array into minimal settlements
   */
  private static optimizeBalanceArray(balances: Balance[]): SettlementSuggestion[] {
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
    
    const suggestions: SettlementSuggestion[] = [];
    
    let debtorIndex = 0;
    let creditorIndex = 0;
    
    while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
      const [debtorId, debtorBalance] = debtors[debtorIndex];
      const [creditorId, creditorBalance] = creditors[creditorIndex];
      
      const settlementAmount = Math.min(Math.abs(debtorBalance), creditorBalance);
      
      if (settlementAmount > 0.01) {
        suggestions.push({
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
    
    return suggestions;
  }

  /**
   * Check if a group is fully settled (no outstanding balances)
   */
  static async isGroupFullySettled(groupId: string): Promise<boolean> {
    const outstandingBalances = await this.calculateGroupBalancesWithSettlements(groupId);
    return outstandingBalances.length === 0;
  }

  /**
   * Get settlement progress for a group
   */
  static async getGroupSettlementProgress(groupId: string): Promise<{
    totalExpenseAmount: number;
    settledAmount: number;
    outstandingAmount: number;
    progressPercentage: number;
    isFullySettled: boolean;
  }> {
    try {
      // Get total expense amount
      const expenses = await ExpenseModel.findByGroupId(groupId);
      const totalExpenseAmount = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
      
      // Get confirmed settlement amount
      const settlements = await SettlementModel.findByGroupMembers(groupId);
      const settledAmount = settlements
        .filter(s => s && (s.status === 'CONFIRMED' || s.status === 'COMPLETED'))
        .reduce((sum, settlement) => sum + Number(settlement.amount), 0);
      
      // Get outstanding balances
      const outstandingBalances = await this.calculateGroupBalancesWithSettlements(groupId);
      const outstandingAmount = outstandingBalances.reduce((sum, balance) => sum + balance.amount, 0);
      
      const progressPercentage = totalExpenseAmount > 0 
        ? Math.round((settledAmount / totalExpenseAmount) * 100)
        : 100;
      
      return {
        totalExpenseAmount: Math.round(totalExpenseAmount * 100) / 100,
        settledAmount: Math.round(settledAmount * 100) / 100,
        outstandingAmount: Math.round(outstandingAmount * 100) / 100,
        progressPercentage,
        isFullySettled: outstandingBalances.length === 0,
      };
    } catch (error) {
      console.error('Error in getGroupSettlementProgress:', error);
      // Return default progress on error
      return {
        totalExpenseAmount: 0,
        settledAmount: 0,
        outstandingAmount: 0,
        progressPercentage: 0,
        isFullySettled: false,
      };
    }
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
// Shared utility functions for Splitwise MVP

/**
 * Format amount to currency string with 2 decimal places
 */
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Round amount to 2 decimal places for financial precision
 */
export function roundToTwoDecimals(amount: number): number {
  return Math.round(amount * 100) / 100
}

/**
 * Calculate equal splits for an expense
 */
export function calculateEqualSplits(totalAmount: number, participantCount: number): number[] {
  const baseAmount = Math.floor((totalAmount * 100) / participantCount) / 100
  const remainder = roundToTwoDecimals(totalAmount - (baseAmount * participantCount))
  
  const splits = new Array(participantCount).fill(baseAmount)
  
  // Distribute remainder to first participants
  if (remainder > 0) {
    const remainderCents = Math.round(remainder * 100)
    for (let i = 0; i < remainderCents; i++) {
      splits[i] += 0.01
    }
  }
  
  return splits.map(amount => roundToTwoDecimals(amount))
}

/**
 * Validate that split amounts equal total expense amount
 */
export function validateSplitAmounts(totalAmount: number, splitAmounts: number[]): boolean {
  const splitTotal = splitAmounts.reduce((sum, amount) => sum + amount, 0)
  return Math.abs(roundToTwoDecimals(splitTotal) - roundToTwoDecimals(totalAmount)) < 0.01
}

/**
 * Calculate percentage splits
 */
export function calculatePercentageSplits(totalAmount: number, percentages: number[]): number[] {
  // Ensure percentages add up to 100
  const totalPercentage = percentages.reduce((sum, pct) => sum + pct, 0)
  if (Math.abs(totalPercentage - 100) > 0.01) {
    throw new Error('Percentages must add up to 100%')
  }
  
  return percentages.map(percentage => 
    roundToTwoDecimals((totalAmount * percentage) / 100)
  )
}

/**
 * Generate a random UUID (simple implementation for demo)
 */
export function generateId(): string {
  return crypto.randomUUID()
}

/**
 * Check if email is valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim()
}

/**
 * Calculate balance between two users
 */
export function calculateBalance(userExpenses: Array<{ amount: number; paidBy: string; splits: Array<{ userId: string; amount: number }> }>, userId1: string, userId2: string): number {
  let balance = 0
  
  userExpenses.forEach(expense => {
    const user1Split = expense.splits.find(split => split.userId === userId1)?.amount || 0
    const user2Split = expense.splits.find(split => split.userId === userId2)?.amount || 0
    
    if (expense.paidBy === userId1) {
      balance += user2Split // User1 is owed by User2
    } else if (expense.paidBy === userId2) {
      balance -= user1Split // User1 owes User2
    }
  })
  
  return roundToTwoDecimals(balance)
}
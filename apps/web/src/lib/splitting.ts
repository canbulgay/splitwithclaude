/**
 * Enhanced Expense Splitting Logic
 * 
 * Comprehensive algorithms for splitting expenses with precision handling,
 * edge case management, and robust validation.
 */

export interface SplitParticipant {
  userId: string;
  name?: string;
}

export interface SplitResult {
  userId: string;
  amount: number;
  percentage: number;
}

export interface SplitValidationResult {
  isValid: boolean;
  errors: string[];
  totalAmount: number;
  totalPercentage: number;
  difference: number;
}

/**
 * Utility function for precise decimal arithmetic
 * Handles floating-point precision issues
 */
export class DecimalUtils {
  static round(value: number, decimals: number = 2): number {
    const factor = Math.pow(10, decimals);
    return Math.round((value + Number.EPSILON) * factor) / factor;
  }

  static add(...values: number[]): number {
    return this.round(values.reduce((sum, val) => sum + val, 0));
  }

  static subtract(a: number, b: number): number {
    return this.round(a - b);
  }

  static multiply(a: number, b: number): number {
    return this.round(a * b);
  }

  static divide(a: number, b: number): number {
    if (b === 0) throw new Error("Division by zero");
    return this.round(a / b);
  }

  static isEqual(a: number, b: number, tolerance: number = 0.01): boolean {
    return Math.abs(a - b) <= tolerance;
  }
}

/**
 * Equal Split Algorithm
 * Distributes amount equally among participants with remainder handling
 */
export class EqualSplitCalculator {
  static calculate(
    totalAmount: number,
    participants: SplitParticipant[]
  ): SplitResult[] {
    if (totalAmount <= 0) {
      throw new Error("Total amount must be positive");
    }

    if (participants.length === 0) {
      throw new Error("At least one participant is required");
    }

    const baseAmount = DecimalUtils.divide(totalAmount, participants.length);
    const remainder = DecimalUtils.subtract(
      totalAmount,
      DecimalUtils.multiply(baseAmount, participants.length)
    );

    const results: SplitResult[] = [];

    participants.forEach((participant, index) => {
      // Distribute remainder to first participants (one cent each)
      const amount = index < Math.abs(remainder * 100) 
        ? DecimalUtils.add(baseAmount, remainder > 0 ? 0.01 : -0.01)
        : baseAmount;

      const percentage = DecimalUtils.divide(
        DecimalUtils.multiply(amount, 100),
        totalAmount
      );

      results.push({
        userId: participant.userId,
        amount: DecimalUtils.round(amount),
        percentage: DecimalUtils.round(percentage),
      });
    });

    return results;
  }
}

/**
 * Exact Amount Split Calculator
 * Validates and processes user-defined exact amounts
 */
export class ExactSplitCalculator {
  static calculate(
    totalAmount: number,
    exactAmounts: { userId: string; amount: number }[]
  ): SplitResult[] {
    if (totalAmount <= 0) {
      throw new Error("Total amount must be positive");
    }

    if (exactAmounts.length === 0) {
      throw new Error("At least one split amount is required");
    }

    const results: SplitResult[] = [];
    let calculatedTotal = 0;

    exactAmounts.forEach(({ userId, amount }, index) => {
      if (amount < 0) {
        throw new Error(`Split amount for participant ${index + 1} cannot be negative`);
      }

      calculatedTotal = DecimalUtils.add(calculatedTotal, amount);

      const percentage = totalAmount > 0 
        ? DecimalUtils.divide(DecimalUtils.multiply(amount, 100), totalAmount)
        : 0;

      results.push({
        userId,
        amount: DecimalUtils.round(amount),
        percentage: DecimalUtils.round(percentage),
      });
    });

    // Validate total matches
    if (!DecimalUtils.isEqual(calculatedTotal, totalAmount)) {
      throw new Error(
        `Split amounts total ${calculatedTotal} does not match expense amount ${totalAmount}`
      );
    }

    return results;
  }

  static validateAmounts(
    totalAmount: number,
    exactAmounts: { userId: string; amount: number }[]
  ): SplitValidationResult {
    const errors: string[] = [];
    let calculatedTotal = 0;

    // Basic validations
    if (totalAmount <= 0) {
      errors.push("Total amount must be positive");
    }

    if (exactAmounts.length === 0) {
      errors.push("At least one split amount is required");
    }

    // Validate individual amounts
    exactAmounts.forEach(({ amount }, index) => {
      if (amount < 0) {
        errors.push(`Amount for participant ${index + 1} cannot be negative`);
      }
      if (amount > totalAmount) {
        errors.push(`Amount for participant ${index + 1} exceeds total expense`);
      }
      calculatedTotal = DecimalUtils.add(calculatedTotal, amount);
    });

    const difference = DecimalUtils.subtract(calculatedTotal, totalAmount);
    const isValid = errors.length === 0 && DecimalUtils.isEqual(calculatedTotal, totalAmount);

    return {
      isValid,
      errors,
      totalAmount: calculatedTotal,
      totalPercentage: 100,
      difference,
    };
  }
}

/**
 * Percentage Split Calculator
 * Handles percentage-based splits with remainder distribution
 */
export class PercentageSplitCalculator {
  static calculate(
    totalAmount: number,
    percentages: { userId: string; percentage: number }[]
  ): SplitResult[] {
    if (totalAmount <= 0) {
      throw new Error("Total amount must be positive");
    }

    if (percentages.length === 0) {
      throw new Error("At least one percentage is required");
    }

    // Validate percentages
    const totalPercentage = percentages.reduce((sum, { percentage }) => 
      DecimalUtils.add(sum, percentage), 0
    );

    if (!DecimalUtils.isEqual(totalPercentage, 100)) {
      throw new Error(`Percentages total ${totalPercentage}% must equal 100%`);
    }

    const results: SplitResult[] = [];
    let totalCalculated = 0;

    // Calculate amounts based on percentages
    percentages.forEach(({ userId, percentage }, index) => {
      if (percentage < 0 || percentage > 100) {
        throw new Error(`Percentage for participant ${index + 1} must be between 0 and 100`);
      }

      let amount = DecimalUtils.divide(
        DecimalUtils.multiply(totalAmount, percentage),
        100
      );

      // Handle rounding for last participant
      if (index === percentages.length - 1) {
        amount = DecimalUtils.subtract(totalAmount, totalCalculated);
      } else {
        totalCalculated = DecimalUtils.add(totalCalculated, amount);
      }

      results.push({
        userId,
        amount: DecimalUtils.round(amount),
        percentage: DecimalUtils.round(percentage),
      });
    });

    return results;
  }

  static validatePercentages(
    percentages: { userId: string; percentage: number }[]
  ): SplitValidationResult {
    const errors: string[] = [];
    let totalPercentage = 0;

    if (percentages.length === 0) {
      errors.push("At least one percentage is required");
    }

    percentages.forEach(({ percentage }, index) => {
      if (percentage < 0) {
        errors.push(`Percentage for participant ${index + 1} cannot be negative`);
      }
      if (percentage > 100) {
        errors.push(`Percentage for participant ${index + 1} cannot exceed 100%`);
      }
      totalPercentage = DecimalUtils.add(totalPercentage, percentage);
    });

    const difference = DecimalUtils.subtract(totalPercentage, 100);
    const isValid = errors.length === 0 && DecimalUtils.isEqual(totalPercentage, 100);

    return {
      isValid,
      errors,
      totalAmount: 0,
      totalPercentage,
      difference,
    };
  }
}

/**
 * Complex Split Calculator
 * Handles advanced scenarios with mixed participation and custom rules
 */
export class ComplexSplitCalculator {
  static calculateWithExclusions(
    totalAmount: number,
    allParticipants: SplitParticipant[],
    excludedUserIds: string[] = [],
    splitMethod: 'equal' | 'percentage' = 'equal'
  ): SplitResult[] {
    const includedParticipants = allParticipants.filter(
      p => !excludedUserIds.includes(p.userId)
    );

    if (includedParticipants.length === 0) {
      throw new Error("At least one participant must be included in the split");
    }

    if (splitMethod === 'equal') {
      return EqualSplitCalculator.calculate(totalAmount, includedParticipants);
    } else {
      // Equal percentage distribution
      const equalPercentage = DecimalUtils.divide(100, includedParticipants.length);
      const percentages = includedParticipants.map(p => ({
        userId: p.userId,
        percentage: equalPercentage,
      }));

      // Adjust last percentage for rounding
      if (percentages.length > 0) {
        const lastIndex = percentages.length - 1;
        const adjustedTotal = DecimalUtils.multiply(equalPercentage, percentages.length - 1);
        percentages[lastIndex].percentage = DecimalUtils.subtract(100, adjustedTotal);
      }

      return PercentageSplitCalculator.calculate(totalAmount, percentages);
    }
  }

  static calculateCustomSplit(
    totalAmount: number,
    customSplits: {
      userId: string;
      amount?: number;
      percentage?: number;
      excluded?: boolean;
    }[]
  ): SplitResult[] {
    // Separate different types of splits
    const exactAmounts = customSplits
      .filter(s => !s.excluded && s.amount !== undefined)
      .map(s => ({ userId: s.userId, amount: s.amount! }));
    const percentageSplits = customSplits
      .filter(s => !s.excluded && s.percentage !== undefined)
      .map(s => ({ userId: s.userId, percentage: s.percentage! }));

    // Handle pure exact amounts
    if (exactAmounts.length === customSplits.filter(s => !s.excluded).length) {
      return ExactSplitCalculator.calculate(totalAmount, exactAmounts);
    }

    // Handle pure percentages
    if (percentageSplits.length === customSplits.filter(s => !s.excluded).length) {
      return PercentageSplitCalculator.calculate(totalAmount, percentageSplits);
    }

    // Handle mixed scenarios (more complex implementation needed for production)
    throw new Error("Mixed split types not yet implemented");
  }
}

/**
 * Comprehensive Split Validator
 * Validates all types of splits and provides detailed feedback
 */
export class SplitValidator {
  static validateSplit(
    totalAmount: number,
    splits: SplitResult[],
    tolerance: number = 0.01
  ): SplitValidationResult {
    const errors: string[] = [];

    if (totalAmount <= 0) {
      errors.push("Total amount must be positive");
    }

    if (splits.length === 0) {
      errors.push("At least one split is required");
    }

    let totalSplitAmount = 0;
    let totalPercentage = 0;

    splits.forEach((split, index) => {
      if (split.amount < 0) {
        errors.push(`Split ${index + 1}: Amount cannot be negative`);
      }

      if (split.percentage < 0 || split.percentage > 100) {
        errors.push(`Split ${index + 1}: Percentage must be between 0 and 100`);
      }

      totalSplitAmount = DecimalUtils.add(totalSplitAmount, split.amount);
      totalPercentage = DecimalUtils.add(totalPercentage, split.percentage);
    });

    const amountDifference = DecimalUtils.subtract(totalSplitAmount, totalAmount);
    const percentageDifference = DecimalUtils.subtract(totalPercentage, 100);

    if (!DecimalUtils.isEqual(totalSplitAmount, totalAmount, tolerance)) {
      errors.push(
        `Split amounts total ${totalSplitAmount} does not match expense amount ${totalAmount} (difference: ${amountDifference})`
      );
    }

    if (!DecimalUtils.isEqual(totalPercentage, 100, tolerance)) {
      errors.push(
        `Split percentages total ${totalPercentage}% does not equal 100% (difference: ${percentageDifference}%)`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      totalAmount: totalSplitAmount,
      totalPercentage,
      difference: amountDifference,
    };
  }
}
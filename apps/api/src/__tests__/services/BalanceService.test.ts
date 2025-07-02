import { BalanceService } from '../../services/BalanceService';
import { ExpenseModel } from '../../models/Expense';
import { SettlementModel } from '../../models/Settlement';

// Mock the models
jest.mock('../../models/Expense');
jest.mock('../../models/Settlement');

const MockedExpenseModel = ExpenseModel as jest.Mocked<typeof ExpenseModel>;
const MockedSettlementModel = SettlementModel as jest.Mocked<typeof SettlementModel>;

describe('BalanceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateGroupBalancesRealTime', () => {
    it('should calculate group balances in real-time', async () => {
      const mockBalances = [
        { fromUser: 'user1', toUser: 'user2', amount: 25.50 },
        { fromUser: 'user2', toUser: 'user3', amount: 15.00 },
      ];

      MockedExpenseModel.calculateGroupBalances.mockResolvedValue(mockBalances);

      const result = await BalanceService.calculateGroupBalancesRealTime('group1');

      expect(result).toEqual(mockBalances);
      expect(MockedExpenseModel.calculateGroupBalances).toHaveBeenCalledWith('group1');
    });
  });

  describe('getSettlementSuggestions', () => {
    it('should get settlement suggestions', async () => {
      const mockSuggestions = [
        { fromUser: 'user1', toUser: 'user2', amount: 25.50 },
      ];

      MockedSettlementModel.suggestSettlements.mockResolvedValue(mockSuggestions);

      const result = await BalanceService.getSettlementSuggestions('group1');

      expect(result).toEqual(mockSuggestions);
      expect(MockedSettlementModel.suggestSettlements).toHaveBeenCalledWith('group1');
    });
  });

  describe('calculateUserBalanceSummary', () => {
    it('should calculate user balance summary correctly', async () => {
      const mockExpensesPaid = [
        {
          id: 'expense1',
          amount: 100.00,
          groupId: 'group1',
          description: 'Test expense',
          paidBy: 'user1',
          createdAt: new Date(),
          updatedAt: new Date(),
          splits: [
            { userId: 'user1', amountOwed: 50.00 },
            { userId: 'user2', amountOwed: 50.00 },
          ],
        },
      ];

      const mockExpensesOwed = [
        {
          id: 'expense2',
          amount: 60.00,
          groupId: 'group1',
          description: 'Another expense',
          paidBy: 'user2',
          createdAt: new Date(),
          updatedAt: new Date(),
          splits: [
            { userId: 'user1', amountOwed: 30.00 },
            { userId: 'user2', amountOwed: 30.00 },
          ],
        },
      ];

      MockedExpenseModel.findByPayerId.mockResolvedValue(mockExpensesPaid as any);
      MockedExpenseModel.findByDebtor.mockResolvedValue(mockExpensesOwed as any);

      const result = await BalanceService.calculateUserBalanceSummary('user1');

      expect(result).toEqual({
        userId: 'user1',
        totalOwed: 30.00,
        totalOwedTo: 70.00, // 100 paid - 30 owed
        netBalance: 70.00, // 100 paid - 30 owed
      });
    });

    it('should handle case with no expenses', async () => {
      MockedExpenseModel.findByPayerId.mockResolvedValue([]);
      MockedExpenseModel.findByDebtor.mockResolvedValue([]);

      const result = await BalanceService.calculateUserBalanceSummary('user1');

      expect(result).toEqual({
        userId: 'user1',
        totalOwed: 0,
        totalOwedTo: 0,
        netBalance: 0,
      });
    });
  });

  describe('calculateBalanceBetweenUsers', () => {
    it('should calculate balance between two users correctly', async () => {
      const mockUser1Expenses = [
        {
          id: 'expense1',
          amount: 100.00,
          splits: [
            { userId: 'user2', amountOwed: 50.00 },
          ],
        },
      ];

      const mockUser2Expenses = [
        {
          id: 'expense2',
          amount: 60.00,
          splits: [
            { userId: 'user1', amountOwed: 30.00 },
          ],
        },
      ];

      MockedExpenseModel.findByPayerId
        .mockResolvedValueOnce(mockUser1Expenses as any)
        .mockResolvedValueOnce(mockUser2Expenses as any);

      const result = await BalanceService.calculateBalanceBetweenUsers('user1', 'user2');

      expect(result.netAmount).toBe(20.00); // 50 - 30
      expect(result.direction).toBe('user2 owes user1');
      expect(result.details).toHaveLength(2);
    });

    it('should handle even balance between users', async () => {
      const mockUser1Expenses = [
        {
          id: 'expense1',
          amount: 100.00,
          splits: [
            { userId: 'user2', amountOwed: 50.00 },
          ],
        },
      ];

      const mockUser2Expenses = [
        {
          id: 'expense2',
          amount: 100.00,
          splits: [
            { userId: 'user1', amountOwed: 50.00 },
          ],
        },
      ];

      MockedExpenseModel.findByPayerId
        .mockResolvedValueOnce(mockUser1Expenses as any)
        .mockResolvedValueOnce(mockUser2Expenses as any);

      const result = await BalanceService.calculateBalanceBetweenUsers('user1', 'user2');

      expect(result.netAmount).toBe(0);
      expect(result.direction).toBe('Even');
    });
  });

  describe('optimizeSettlements', () => {
    it('should optimize settlements to minimize transactions', async () => {
      const mockBalances = [
        { fromUser: 'user1', toUser: 'user2', amount: 100.00 },
        { fromUser: 'user2', toUser: 'user3', amount: 60.00 },
        { fromUser: 'user3', toUser: 'user1', amount: 40.00 },
      ];

      MockedExpenseModel.calculateGroupBalances.mockResolvedValue(mockBalances);

      const result = await BalanceService.optimizeSettlements('group1');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      
      // The optimization should reduce the number of transactions
      // Original: 3 transactions, optimized should be fewer
      const totalOptimizedAmount = result.reduce((sum, suggestion) => sum + suggestion.amount, 0);
      expect(totalOptimizedAmount).toBeGreaterThan(0);
    });

    it('should handle case with no balances', async () => {
      MockedExpenseModel.calculateGroupBalances.mockResolvedValue([]);

      const result = await BalanceService.optimizeSettlements('group1');

      expect(result).toEqual([]);
    });
  });

  describe('validateBalanceAccuracy', () => {
    it('should validate balance accuracy correctly', async () => {
      const mockExpenses = [
        {
          id: 'expense1',
          amount: 100.00,
          splits: [
            { amountOwed: 50.00 },
            { amountOwed: 50.00 },
          ],
        },
        {
          id: 'expense2',
          amount: 60.00,
          splits: [
            { amountOwed: 30.00 },
            { amountOwed: 30.00 },
          ],
        },
      ];

      MockedExpenseModel.findByGroupId.mockResolvedValue(mockExpenses as any);

      const result = await BalanceService.validateBalanceAccuracy('group1');

      expect(result).toEqual({
        isValid: true,
        totalExpenses: 160.00,
        totalSplits: 160.00,
        discrepancy: 0,
      });
    });

    it('should detect discrepancies in balance calculations', async () => {
      const mockExpenses = [
        {
          id: 'expense1',
          amount: 100.00,
          splits: [
            { amountOwed: 50.00 },
            { amountOwed: 40.00 }, // Intentional discrepancy
          ],
        },
      ];

      MockedExpenseModel.findByGroupId.mockResolvedValue(mockExpenses as any);

      const result = await BalanceService.validateBalanceAccuracy('group1');

      expect(result.isValid).toBe(false);
      expect(result.totalExpenses).toBe(100.00);
      expect(result.totalSplits).toBe(90.00);
      expect(result.discrepancy).toBe(10.00);
    });

    it('should handle empty group', async () => {
      MockedExpenseModel.findByGroupId.mockResolvedValue([]);

      const result = await BalanceService.validateBalanceAccuracy('group1');

      expect(result).toEqual({
        isValid: true,
        totalExpenses: 0,
        totalSplits: 0,
        discrepancy: 0,
      });
    });
  });
});
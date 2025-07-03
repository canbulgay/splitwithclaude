import request from 'supertest';
import express from 'express';
import balanceRoutes from '../../routes/balances';
import { authenticateToken } from '../../middleware/auth';
import { GroupModel } from '../../models/Group';
import { ExpenseModel } from '../../models/Expense';
import { SettlementModel } from '../../models/Settlement';
import { BalanceService } from '../../services/BalanceService';

// Mock the database models, services and middleware
jest.mock('../../models/Group');
jest.mock('../../models/Expense');
jest.mock('../../models/Settlement');
jest.mock('../../services/BalanceService');
jest.mock('../../middleware/auth');

const MockedGroupModel = GroupModel as jest.Mocked<typeof GroupModel>;
const MockedExpenseModel = ExpenseModel as jest.Mocked<typeof ExpenseModel>;
const MockedSettlementModel = SettlementModel as jest.Mocked<typeof SettlementModel>;
const MockedBalanceService = BalanceService as jest.Mocked<typeof BalanceService>;
const MockedAuthenticateToken = authenticateToken as jest.MockedFunction<typeof authenticateToken>;

// Create test app
const app = express();
app.use(express.json());
app.use('/api/v1/balances', balanceRoutes);

describe('Balance Routes', () => {
  const mockUser = { id: 'user1', email: 'test@example.com', name: 'Test User' };
  const mockGroupId = 'group1';
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock authentication middleware to set req.user
    MockedAuthenticateToken.mockImplementation(async (req: any, res: any, next: any) => {
      if (req.headers.authorization) {
        req.user = mockUser;
      }
      next();
    });
  });

  describe('GET /api/v1/balances/group/:groupId', () => {
    it('should return group balances for authenticated group member', async () => {
      const mockBalances = [
        { fromUser: 'user1', toUser: 'user2', amount: 25.50 },
        { fromUser: 'user2', toUser: 'user3', amount: 15.00 },
      ];
      const mockSuggestions = [
        { fromUser: 'user1', toUser: 'user2', amount: 25.50 },
      ];
      const mockProgress = {
        totalExpenseAmount: 100.0,
        settledAmount: 25.0,
        outstandingAmount: 75.0,
        progressPercentage: 25,
        isFullySettled: false,
      };

      MockedGroupModel.isMember.mockResolvedValue(true);
      MockedBalanceService.calculateGroupBalancesWithSettlements.mockResolvedValue(mockBalances);
      MockedBalanceService.getActiveSettlementSuggestions.mockResolvedValue(mockSuggestions);
      MockedBalanceService.getGroupSettlementProgress.mockResolvedValue(mockProgress);

      const response = await request(app)
        .get(`/api/v1/balances/group/${mockGroupId}`)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: {
          balances: mockBalances,
          suggestions: mockSuggestions,
          progress: mockProgress,
          groupId: mockGroupId,
          isFullySettled: mockProgress.isFullySettled,
        },
      });

      expect(MockedGroupModel.isMember).toHaveBeenCalledWith(mockGroupId, mockUser.id);
      expect(MockedBalanceService.calculateGroupBalancesWithSettlements).toHaveBeenCalledWith(mockGroupId);
      expect(MockedBalanceService.getActiveSettlementSuggestions).toHaveBeenCalledWith(mockGroupId);
      expect(MockedBalanceService.getGroupSettlementProgress).toHaveBeenCalledWith(mockGroupId);
    });

    it('should return 401 for unauthenticated request', async () => {
      MockedAuthenticateToken.mockImplementation(async (req: any, res: any, next: any) => {
        res.status(401).json({
          success: false,
          error: 'Access token required',
        });
      });

      const response = await request(app)
        .get(`/api/v1/balances/group/${mockGroupId}`);

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        error: 'Access token required',
      });
    });

    it('should return 403 for non-group member', async () => {
      MockedGroupModel.isMember.mockResolvedValue(false);

      const response = await request(app)
        .get(`/api/v1/balances/group/${mockGroupId}`)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        success: false,
        error: 'Access denied. You must be a group member to view balances.',
      });
    });

    it('should handle database errors gracefully', async () => {
      MockedGroupModel.isMember.mockResolvedValue(true);
      MockedBalanceService.calculateGroupBalancesWithSettlements.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get(`/api/v1/balances/group/${mockGroupId}`)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'Failed to fetch group balances',
      });
    });
  });

  describe('GET /api/v1/balances/user/:userId', () => {
    it('should return user balances across all groups', async () => {
      const mockGroups = [
        { id: 'group1', name: 'Group 1', description: null, createdBy: 'user1', createdAt: new Date(), updatedAt: new Date() },
        { id: 'group2', name: 'Group 2', description: null, createdBy: 'user2', createdAt: new Date(), updatedAt: new Date() },
      ];
      
      const mockBalances1 = [
        { fromUser: 'user1', toUser: 'user2', amount: 25.50 },
      ];
      
      const mockBalances2 = [
        { fromUser: 'user3', toUser: 'user1', amount: 15.00 },
      ];

      const mockSuggestions1 = [
        { fromUser: 'user1', toUser: 'user2', amount: 25.50 },
      ];

      const mockSuggestions2 = [
        { fromUser: 'user3', toUser: 'user1', amount: 15.00 },
      ];

      const mockProgress = {
        totalExpenseAmount: 100.0,
        settledAmount: 25.0,
        outstandingAmount: 75.0,
        progressPercentage: 25,
        isFullySettled: false,
      };

      MockedGroupModel.findByUserId.mockResolvedValue(mockGroups as any);
      MockedBalanceService.calculateGroupBalancesWithSettlements
        .mockResolvedValueOnce(mockBalances1)
        .mockResolvedValueOnce(mockBalances2);
      MockedBalanceService.getActiveSettlementSuggestions
        .mockResolvedValueOnce(mockSuggestions1)
        .mockResolvedValueOnce(mockSuggestions2);
      MockedBalanceService.getGroupSettlementProgress
        .mockResolvedValue(mockProgress);

      const response = await request(app)
        .get(`/api/v1/balances/user/${mockUser.id}`)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.userId).toBe(mockUser.id);
      expect(response.body.data.summary).toEqual({
        totalOwed: 25.50,
        totalOwedTo: 15.00,
        netBalance: -10.50,
      });
      expect(response.body.data.groups).toHaveLength(2);
    });

    it('should return 403 when trying to view another user\'s balances', async () => {
      const response = await request(app)
        .get('/api/v1/balances/user/other-user-id')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        success: false,
        error: 'Access denied. You can only view your own balances.',
      });
    });
  });

  describe('GET /api/v1/balances/between/:user1/:user2', () => {
    const user2Id = 'user2';

    it('should return balances between two users', async () => {
      const mockUser1Groups = [
        { id: 'group1', name: 'Group 1', description: null, createdBy: 'user1', createdAt: new Date(), updatedAt: new Date() },
      ];
      
      const mockUser2Groups = [
        { id: 'group1', name: 'Group 1', description: null, createdBy: 'user1', createdAt: new Date(), updatedAt: new Date() },
      ];

      const mockBalances = [
        { fromUser: 'user1', toUser: 'user2', amount: 25.50 },
      ];

      MockedGroupModel.findByUserId
        .mockResolvedValueOnce(mockUser1Groups as any)
        .mockResolvedValueOnce(mockUser2Groups as any);
      MockedExpenseModel.calculateGroupBalances.mockResolvedValue(mockBalances);

      const response = await request(app)
        .get(`/api/v1/balances/between/${mockUser.id}/${user2Id}`)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user1).toBe(mockUser.id);
      expect(response.body.data.user2).toBe(user2Id);
      expect(response.body.data.netBalance.amount).toBe(25.50);
      expect(response.body.data.netBalance.direction).toBe(`${mockUser.id} owes ${user2Id}`);
    });

    it('should return 403 when user is not involved in the balance query', async () => {
      const response = await request(app)
        .get('/api/v1/balances/between/other-user1/other-user2')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        success: false,
        error: 'Access denied. You can only view balances involving yourself.',
      });
    });

    it('should handle case when users have no shared groups', async () => {
      const mockUser1Groups = [
        { id: 'group1', name: 'Group 1', description: null, createdBy: 'user1', createdAt: new Date(), updatedAt: new Date() },
      ];
      
      const mockUser2Groups = [
        { id: 'group2', name: 'Group 2', description: null, createdBy: 'user2', createdAt: new Date(), updatedAt: new Date() },
      ];

      MockedGroupModel.findByUserId
        .mockResolvedValueOnce(mockUser1Groups as any)
        .mockResolvedValueOnce(mockUser2Groups as any);

      const response = await request(app)
        .get(`/api/v1/balances/between/${mockUser.id}/${user2Id}`)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.netBalance.amount).toBe(0);
      expect(response.body.data.netBalance.direction).toBe('Even');
      expect(response.body.data.groups).toHaveLength(0);
    });
  });
});
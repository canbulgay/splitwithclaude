import request from 'supertest';
import express from 'express';
import settlementRoutes from '../../routes/settlements';

// Mock the models and services
jest.mock('../../models/Settlement');
jest.mock('../../models/Group');
jest.mock('../../services/BalanceService');

// Mock the authentication middleware
jest.mock('../../middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    // Mock user for authenticated routes
    req.user = {
      id: 'clxxxxxxxxxxxxxxxxxxx1',
      email: 'test@example.com',
      name: 'Test User',
    };
    next();
  },
}));

// Get mocked modules
const { SettlementModel } = require('../../models/Settlement');
const { GroupModel } = require('../../models/Group');
const { BalanceService } = require('../../services/BalanceService');

// Create test app
const app = express();
app.use(express.json());
app.use('/settlements', settlementRoutes);

describe('Settlement Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /settlements', () => {
    it('should create a settlement successfully', async () => {
      const mockSettlement = { id: 'settlement-1', amount: 25 };
      
      GroupModel.findByUserId.mockResolvedValueOnce([{ id: 'group-1' }]);
      GroupModel.findByUserId.mockResolvedValueOnce([{ id: 'group-1' }]);
      SettlementModel.create.mockResolvedValue(mockSettlement);
      SettlementModel.findWithDetails.mockResolvedValue(mockSettlement);

      const settlementData = {
        fromUser: 'clxxxxxxxxxxxxxxxxxxx1',
        toUser: 'clxxxxxxxxxxxxxxxxxxx2',
        amount: 25.00,
        description: 'Test settlement',
      };

      const response = await request(app)
        .post('/settlements')
        .set('Authorization', 'Bearer valid-token')
        .send(settlementData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    it('should reject settlement with invalid data', async () => {
      const invalidData = {
        fromUser: 'invalid-id',
        toUser: 'clxxxxxxxxxxxxxxxxxxx2',
        amount: -10,
      };

      const response = await request(app)
        .post('/settlements')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid settlement data');
    });

    it('should reject settlement not involving authenticated user', async () => {
      const settlementData = {
        fromUser: 'clxxxxxxxxxxxxxxxxxxx2',
        toUser: 'clxxxxxxxxxxxxxxxxxxx3',
        amount: 25.00,
      };

      const response = await request(app)
        .post('/settlements')
        .set('Authorization', 'Bearer valid-token')
        .send(settlementData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Access denied');
    });

    it('should reject self-settlement', async () => {
      const settlementData = {
        fromUser: 'clxxxxxxxxxxxxxxxxxxx1',
        toUser: 'clxxxxxxxxxxxxxxxxxxx1',
        amount: 25.00,
      };

      const response = await request(app)
        .post('/settlements')
        .set('Authorization', 'Bearer valid-token')
        .send(settlementData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Cannot create settlement with yourself');
    });

    it('should require authentication', async () => {
      const settlementData = {
        fromUser: 'clxxxxxxxxxxxxxxxxxxx1',
        toUser: 'clxxxxxxxxxxxxxxxxxxx2',
        amount: 25.00,
      };

      const response = await request(app)
        .post('/settlements')
        .send(settlementData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /settlements', () => {
    it('should get settlements for authenticated user', async () => {
      const mockSettlements = [{ id: 'settlement-1' }];
      const mockSummary = { sent: 50, received: 25 };
      const mockCount = 3;

      SettlementModel.findByUserId.mockResolvedValue(mockSettlements);
      SettlementModel.getTotalByUserId.mockResolvedValue(mockSummary);
      SettlementModel.countByUserId.mockResolvedValue(mockCount);

      const response = await request(app)
        .get('/settlements')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.settlements).toBeInstanceOf(Array);
      expect(response.body.data.summary).toHaveProperty('totalCount', mockCount);
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/settlements');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /settlements/:id', () => {
    it('should get specific settlement by ID', async () => {
      const mockSettlement = {
        id: 'settlement-1',
        fromUser: 'clxxxxxxxxxxxxxxxxxxx1',
        toUser: 'clxxxxxxxxxxxxxxxxxxx2',
      };

      SettlementModel.findWithDetails.mockResolvedValue(mockSettlement);

      const response = await request(app)
        .get(`/settlements/${mockSettlement.id}`)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(mockSettlement.id);
    });

    it('should return 404 for non-existent settlement', async () => {
      SettlementModel.findWithDetails.mockResolvedValue(null);

      const response = await request(app)
        .get('/settlements/non-existent-id')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should reject access to settlement not involving user', async () => {
      const otherUserSettlement = {
        id: 'settlement-1',
        fromUser: 'clxxxxxxxxxxxxxxxxxxx3',
        toUser: 'clxxxxxxxxxxxxxxxxxxx4',
      };
      SettlementModel.findWithDetails.mockResolvedValue(otherUserSettlement);

      const response = await request(app)
        .get(`/settlements/settlement-1`)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /settlements/:id', () => {
    it('should update settlement by creator', async () => {
      const mockSettlement = {
        id: 'settlement-1',
        fromUser: 'clxxxxxxxxxxxxxxxxxxx1',
        toUser: 'clxxxxxxxxxxxxxxxxxxx2',
      };
      const updateData = { amount: 35.00 };

      SettlementModel.findById.mockResolvedValue(mockSettlement);
      SettlementModel.update.mockResolvedValue({ ...mockSettlement, ...updateData });
      SettlementModel.findWithDetails.mockResolvedValue({ ...mockSettlement, ...updateData });

      const response = await request(app)
        .put(`/settlements/${mockSettlement.id}`)
        .set('Authorization', 'Bearer valid-token')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject update by non-creator', async () => {
      const otherUserSettlement = {
        id: 'settlement-1',
        fromUser: 'clxxxxxxxxxxxxxxxxxxx2',
      };
      SettlementModel.findById.mockResolvedValue(otherUserSettlement);

      const response = await request(app)
        .put(`/settlements/settlement-1`)
        .set('Authorization', 'Bearer valid-token')
        .send({ amount: 35.00 });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /settlements/:id', () => {
    it('should delete settlement by creator', async () => {
      const mockSettlement = {
        id: 'settlement-1',
        fromUser: 'clxxxxxxxxxxxxxxxxxxx1',
      };

      SettlementModel.findById.mockResolvedValue(mockSettlement);
      SettlementModel.delete.mockResolvedValue(mockSettlement);

      const response = await request(app)
        .delete(`/settlements/${mockSettlement.id}`)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject deletion by non-creator', async () => {
      const otherUserSettlement = {
        id: 'settlement-1',
        fromUser: 'clxxxxxxxxxxxxxxxxxxx2',
      };
      SettlementModel.findById.mockResolvedValue(otherUserSettlement);

      const response = await request(app)
        .delete(`/settlements/settlement-1`)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /settlements/between/:user1/:user2', () => {
    it('should get settlements between two users', async () => {
      const mockSettlements = [{ 
        fromUser: 'clxxxxxxxxxxxxxxxxxxx1', 
        toUser: 'clxxxxxxxxxxxxxxxxxxx2',
        amount: 25
      }];

      SettlementModel.findBetweenUsers.mockResolvedValue(mockSettlements);

      const response = await request(app)
        .get('/settlements/between/clxxxxxxxxxxxxxxxxxxx1/clxxxxxxxxxxxxxxxxxxx2')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.settlements).toHaveLength(1);
    });

    it('should reject access to settlements not involving user', async () => {
      const response = await request(app)
        .get('/settlements/between/clxxxxxxxxxxxxxxxxxxx2/clxxxxxxxxxxxxxxxxxxx3')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /settlements/group/:groupId', () => {
    it('should get settlements for a group', async () => {
      const mockSettlements = [{ id: 'settlement-1' }];

      GroupModel.isMember.mockResolvedValue(true);
      SettlementModel.findByGroupMembers.mockResolvedValue(mockSettlements);

      const response = await request(app)
        .get('/settlements/group/group-1')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.settlements).toBeInstanceOf(Array);
    });

    it('should reject access for non-group members', async () => {
      GroupModel.isMember.mockResolvedValue(false);

      const response = await request(app)
        .get('/settlements/group/group-1')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /settlements/suggestions/:groupId', () => {
    it('should get settlement suggestions for a group', async () => {
      const mockSuggestions = [{ fromUser: 'user-2', toUser: 'user-1', amount: 25 }];
      const mockBalances = [{ fromUser: 'user-2', toUser: 'user-1', amount: 25 }];

      GroupModel.isMember.mockResolvedValue(true);
      BalanceService.calculateGroupBalancesRealTime.mockResolvedValue(mockBalances);
      BalanceService.optimizeSettlements.mockResolvedValue(mockSuggestions);

      const response = await request(app)
        .get('/settlements/suggestions/group-1')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('suggestions');
      expect(response.body.data).toHaveProperty('optimization');
    });

    it('should reject access for non-group members', async () => {
      GroupModel.isMember.mockResolvedValue(false);

      const response = await request(app)
        .get('/settlements/suggestions/group-1')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });
});
import { Request, Response, NextFunction } from 'express'
import { authenticateToken, optionalAuth, requireGroupAdmin, requireGroupMember } from '../../middleware/auth'
import { AuthService } from '../../services/AuthService'
import { User } from '@prisma/client'

// Mock the AuthService
jest.mock('../../services/AuthService', () => ({
  AuthService: {
    getUserFromToken: jest.fn(),
  },
}))

// Mock the GroupModel - it will be imported dynamically
const mockGroupModel = {
  isAdmin: jest.fn(),
  isMember: jest.fn(),
}

jest.mock('../../models/Group', () => ({
  GroupModel: mockGroupModel,
}))

const mockAuthService = AuthService as jest.Mocked<typeof AuthService>

describe('Authentication Middleware', () => {
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let mockNext: NextFunction

  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashedPassword123',
    avatarUrl: null,
    provider: 'credentials',
    providerId: null,
    emailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User

  beforeEach(() => {
    mockRequest = {
      headers: {},
      params: {},
    }
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }
    mockNext = jest.fn()
    jest.clearAllMocks()
  })

  describe('authenticateToken', () => {
    it('should authenticate user with valid token', async () => {
      // TDD: Valid token authentication
      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      }
      mockAuthService.getUserFromToken.mockResolvedValue(mockUser)

      await authenticateToken(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockAuthService.getUserFromToken).toHaveBeenCalledWith('valid-token')
      expect(mockRequest.user).toEqual(mockUser)
      expect(mockNext).toHaveBeenCalled()
      expect(mockResponse.status).not.toHaveBeenCalled()
    })

    it('should reject request without authorization header', async () => {
      // TDD: Missing token handling
      mockRequest.headers = {}

      await authenticateToken(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access token required',
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should reject request with invalid token format', async () => {
      // TDD: Invalid token format handling
      mockRequest.headers = {
        authorization: 'InvalidTokenFormat',
      }

      await authenticateToken(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access token required',
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should reject request with invalid token', async () => {
      // TDD: Invalid token handling
      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      }
      mockAuthService.getUserFromToken.mockResolvedValue(null)

      await authenticateToken(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid or expired token',
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should handle authentication service errors', async () => {
      // TDD: Service error handling
      mockRequest.headers = {
        authorization: 'Bearer error-token',
      }
      mockAuthService.getUserFromToken.mockRejectedValue(new Error('Service error'))

      await authenticateToken(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid or expired token',
      })
      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('optionalAuth', () => {
    it('should attach user if valid token provided', async () => {
      // TDD: Optional authentication with valid token
      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      }
      mockAuthService.getUserFromToken.mockResolvedValue(mockUser)

      await optionalAuth(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockRequest.user).toEqual(mockUser)
      expect(mockNext).toHaveBeenCalled()
      expect(mockResponse.status).not.toHaveBeenCalled()
    })

    it('should continue without user if no token provided', async () => {
      // TDD: Optional authentication without token
      mockRequest.headers = {}

      await optionalAuth(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockRequest.user).toBeUndefined()
      expect(mockNext).toHaveBeenCalled()
      expect(mockResponse.status).not.toHaveBeenCalled()
    })

    it('should continue without user if invalid token provided', async () => {
      // TDD: Optional authentication with invalid token
      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      }
      mockAuthService.getUserFromToken.mockResolvedValue(null)

      await optionalAuth(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockRequest.user).toBeUndefined()
      expect(mockNext).toHaveBeenCalled()
      expect(mockResponse.status).not.toHaveBeenCalled()
    })

    it('should continue without user if authentication throws error', async () => {
      // TDD: Optional authentication error handling
      mockRequest.headers = {
        authorization: 'Bearer error-token',
      }
      mockAuthService.getUserFromToken.mockRejectedValue(new Error('Auth error'))

      await optionalAuth(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockRequest.user).toBeUndefined()
      expect(mockNext).toHaveBeenCalled()
      expect(mockResponse.status).not.toHaveBeenCalled()
    })
  })

  describe('requireGroupAdmin', () => {
    it('should allow access for group admin', async () => {
      // TDD: Group admin authorization
      mockRequest.user = mockUser
      mockRequest.params = { groupId: 'test-group-id' }
      mockGroupModel.isAdmin.mockResolvedValue(true)

      const middleware = requireGroupAdmin()
      await middleware(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockGroupModel.isAdmin).toHaveBeenCalledWith('test-group-id', mockUser.id)
      expect(mockNext).toHaveBeenCalled()
      expect(mockResponse.status).not.toHaveBeenCalled()
    })

    it('should reject unauthenticated user', async () => {
      // TDD: Unauthenticated user rejection
      mockRequest.user = undefined
      mockRequest.params = { groupId: 'test-group-id' }

      const middleware = requireGroupAdmin()
      await middleware(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should reject request without group ID', async () => {
      // TDD: Missing group ID handling
      mockRequest.user = mockUser
      mockRequest.params = {}

      const middleware = requireGroupAdmin()
      await middleware(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Group ID required',
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should reject non-admin user', async () => {
      // TDD: Non-admin user rejection
      mockRequest.user = mockUser
      mockRequest.params = { groupId: 'test-group-id' }
      mockGroupModel.isAdmin.mockResolvedValue(false)

      const middleware = requireGroupAdmin()
      await middleware(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockResponse.status).toHaveBeenCalledWith(403)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Admin access required for this group',
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should use custom group ID parameter', async () => {
      // TDD: Custom parameter name support
      mockRequest.user = mockUser
      mockRequest.params = { customGroupId: 'test-group-id' }
      mockGroupModel.isAdmin.mockResolvedValue(true)

      const middleware = requireGroupAdmin('customGroupId')
      await middleware(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockGroupModel.isAdmin).toHaveBeenCalledWith('test-group-id', mockUser.id)
      expect(mockNext).toHaveBeenCalled()
    })
  })

  describe('requireGroupMember', () => {
    it('should allow access for group member', async () => {
      // TDD: Group member authorization
      mockRequest.user = mockUser
      mockRequest.params = { groupId: 'test-group-id' }
      mockGroupModel.isMember.mockResolvedValue(true)

      const middleware = requireGroupMember()
      await middleware(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockGroupModel.isMember).toHaveBeenCalledWith('test-group-id', mockUser.id)
      expect(mockNext).toHaveBeenCalled()
      expect(mockResponse.status).not.toHaveBeenCalled()
    })

    it('should reject unauthenticated user', async () => {
      // TDD: Unauthenticated user rejection
      mockRequest.user = undefined
      mockRequest.params = { groupId: 'test-group-id' }

      const middleware = requireGroupMember()
      await middleware(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should reject request without group ID', async () => {
      // TDD: Missing group ID handling
      mockRequest.user = mockUser
      mockRequest.params = {}

      const middleware = requireGroupMember()
      await middleware(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Group ID required',
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should reject non-member user', async () => {
      // TDD: Non-member user rejection
      mockRequest.user = mockUser
      mockRequest.params = { groupId: 'test-group-id' }
      mockGroupModel.isMember.mockResolvedValue(false)

      const middleware = requireGroupMember()
      await middleware(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockResponse.status).toHaveBeenCalledWith(403)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Group membership required',
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should handle database errors gracefully', async () => {
      // TDD: Database error handling
      mockRequest.user = mockUser
      mockRequest.params = { groupId: 'test-group-id' }
      mockGroupModel.isMember.mockRejectedValue(new Error('Database error'))

      const middleware = requireGroupMember()
      await middleware(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockResponse.status).toHaveBeenCalledWith(500)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to verify group membership',
      })
      expect(mockNext).not.toHaveBeenCalled()
    })
  })
})
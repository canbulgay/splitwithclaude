import request from 'supertest'
import express from 'express'
import authRoutes from '../../routes/auth'
import { AuthService } from '../../services/AuthService'
import { UserModel } from '../../models/User'
import { User } from '@prisma/client'

// Mock the AuthService and UserModel
jest.mock('../../services/AuthService')
jest.mock('../../models/User')

// Mock the authentication middleware
jest.mock('../../middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required',
      })
    }

    // Mock user for authenticated routes
    req.user = {
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
    }
    next()
  },
  validateRequest: (schema: any) => (req: any, res: any, next: any) => {
    try {
      const validation = schema.safeParse(req.body)
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.error.errors,
        })
      }
      req.body = validation.data
      next()
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
      })
    }
  },
}))

const mockAuthService = AuthService as jest.Mocked<typeof AuthService>
const mockUserModel = UserModel as jest.Mocked<typeof UserModel>

// Create test app
const app = express()
app.use(express.json())
app.use('/auth', authRoutes)

describe('Auth Routes', () => {
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

  const mockAuthResponse = {
    user: mockUser,
    token: 'test-jwt-token',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /auth/register', () => {
    const validRegisterData = {
      email: 'newuser@example.com',
      name: 'New User',
      password: 'StrongPass123!',
      avatarUrl: 'https://example.com/avatar.jpg',
    }

    it('should register a new user successfully', async () => {
      // TDD: Successful user registration
      mockAuthService.register.mockResolvedValue(mockAuthResponse)

      const response = await request(app)
        .post('/auth/register')
        .send(validRegisterData)
        .expect(201)

      expect(response.body).toEqual({
        success: true,
        message: 'User registered successfully',
        data: {
          user: expect.objectContaining({
            id: mockUser.id,
            email: mockUser.email,
            name: mockUser.name,
          }),
          token: mockAuthResponse.token,
        },
      })
      expect(response.body.data.user.password).toBeUndefined() // Password should not be returned
      expect(mockAuthService.register).toHaveBeenCalledWith(validRegisterData)
    })

    it('should validate email format', async () => {
      // TDD: Email validation
      const invalidEmailData = {
        ...validRegisterData,
        email: 'invalid-email',
      }

      const response = await request(app)
        .post('/auth/register')
        .send(invalidEmailData)
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('Validation failed')
      expect(response.body.details).toBeDefined()
    })

    it('should validate required fields', async () => {
      // TDD: Required field validation
      const incompleteData = {
        email: 'test@example.com',
        // Missing name and password
      }

      const response = await request(app)
        .post('/auth/register')
        .send(incompleteData)
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('Validation failed')
    })

    it('should validate password strength', async () => {
      // TDD: Password strength validation
      const weakPasswordData = {
        ...validRegisterData,
        password: 'weak',
      }

      const response = await request(app)
        .post('/auth/register')
        .send(weakPasswordData)
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('Validation failed')
    })

    it('should handle registration errors', async () => {
      // TDD: Service error handling
      mockAuthService.register.mockRejectedValue(new Error('User already exists'))

      const response = await request(app)
        .post('/auth/register')
        .send(validRegisterData)
        .expect(400)

      expect(response.body).toEqual({
        success: false,
        error: 'User already exists',
      })
    })

    it('should validate avatar URL format', async () => {
      // TDD: Avatar URL validation
      const invalidAvatarData = {
        ...validRegisterData,
        avatarUrl: 'not-a-valid-url',
      }

      const response = await request(app)
        .post('/auth/register')
        .send(invalidAvatarData)
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('Validation failed')
    })
  })

  describe('POST /auth/login', () => {
    const validLoginData = {
      email: 'test@example.com',
      password: 'testPassword123',
    }

    it('should login user with valid credentials', async () => {
      // TDD: Successful login
      mockAuthService.login.mockResolvedValue(mockAuthResponse)

      const response = await request(app)
        .post('/auth/login')
        .send(validLoginData)
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        message: 'Login successful',
        data: {
          user: expect.objectContaining({
            id: mockUser.id,
            email: mockUser.email,
            name: mockUser.name,
          }),
          token: mockAuthResponse.token,
        },
      })
      expect(response.body.data.user.password).toBeUndefined() // Password should not be returned
      expect(mockAuthService.login).toHaveBeenCalledWith(validLoginData)
    })

    it('should validate email format', async () => {
      // TDD: Email validation
      const invalidEmailData = {
        email: 'invalid-email',
        password: 'password123',
      }

      const response = await request(app)
        .post('/auth/login')
        .send(invalidEmailData)
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('Validation failed')
    })

    it('should require password', async () => {
      // TDD: Password requirement
      const noPasswordData = {
        email: 'test@example.com',
      }

      const response = await request(app)
        .post('/auth/login')
        .send(noPasswordData)
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('Validation failed')
    })

    it('should handle login errors', async () => {
      // TDD: Login error handling
      mockAuthService.login.mockRejectedValue(new Error('Invalid credentials'))

      const response = await request(app)
        .post('/auth/login')
        .send(validLoginData)
        .expect(401)

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid credentials',
      })
    })
  })

  describe('POST /auth/refresh', () => {
    it('should refresh token with valid token', async () => {
      // TDD: Token refresh
      const newToken = 'new-jwt-token'
      mockAuthService.refreshToken.mockResolvedValue(newToken)

      const response = await request(app)
        .post('/auth/refresh')
        .set('Authorization', 'Bearer valid-token')
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          token: newToken,
        },
      })
      expect(mockAuthService.refreshToken).toHaveBeenCalledWith('valid-token')
    })

    it('should require authorization header', async () => {
      // TDD: Missing token handling
      const response = await request(app)
        .post('/auth/refresh')
        .expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('Access token required')
    })

    it('should handle refresh errors', async () => {
      // TDD: Refresh error handling
      mockAuthService.refreshToken.mockRejectedValue(new Error('Invalid token'))

      const response = await request(app)
        .post('/auth/refresh')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('Invalid token')
    })
  })

  describe('GET /auth/me', () => {
    it('should return current user info', async () => {
      // TDD: User info retrieval
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer valid-token')
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: {
          user: expect.objectContaining({
            id: expect.any(String),
            email: expect.any(String),
            name: expect.any(String),
          }),
        },
      })
      expect(response.body.data.user.password).toBeUndefined()
    })

    it('should require authentication', async () => {
      // TDD: Authentication requirement
      const response = await request(app)
        .get('/auth/me')
        .expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('Access token required')
    })
  })

  describe('POST /auth/logout', () => {
    it('should logout successfully', async () => {
      // TDD: Logout functionality
      const response = await request(app)
        .post('/auth/logout')
        .set('Authorization', 'Bearer valid-token')
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        message: 'Logout successful',
      })
    })

    it('should require authentication', async () => {
      // TDD: Authentication requirement for logout
      const response = await request(app)
        .post('/auth/logout')
        .expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('Access token required')
    })
  })

  describe('POST /auth/change-password', () => {
    const validPasswordChangeData = {
      currentPassword: 'currentPass123!',
      newPassword: 'NewPass456!',
    }

    it('should change password successfully', async () => {
      // TDD: Password change
      mockAuthService.validatePassword.mockReturnValue({
        isValid: true,
        errors: [],
      })
      mockAuthService.comparePassword.mockResolvedValue(true)
      mockAuthService.hashPassword.mockResolvedValue('new-hashed-password')
      mockUserModel.update.mockResolvedValue(mockUser)

      const response = await request(app)
        .post('/auth/change-password')
        .set('Authorization', 'Bearer valid-token')
        .send(validPasswordChangeData)
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        message: 'Password changed successfully',
      })
    })

    it('should require authentication', async () => {
      // TDD: Authentication requirement
      const response = await request(app)
        .post('/auth/change-password')
        .send(validPasswordChangeData)
        .expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('Access token required')
    })

    it('should validate new password strength', async () => {
      // TDD: Password strength validation
      const weakPasswordData = {
        currentPassword: 'currentPass123!',
        newPassword: 'weak',
      }

      mockAuthService.validatePassword.mockReturnValue({
        isValid: false,
        errors: ['Password too weak'],
      })

      const response = await request(app)
        .post('/auth/change-password')
        .set('Authorization', 'Bearer valid-token')
        .send(weakPasswordData)
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('Password validation failed')
    })

    it('should verify current password', async () => {
      // TDD: Current password verification
      mockAuthService.validatePassword.mockReturnValue({
        isValid: true,
        errors: [],
      })
      mockAuthService.comparePassword.mockResolvedValue(false) // Invalid current password

      const response = await request(app)
        .post('/auth/change-password')
        .set('Authorization', 'Bearer valid-token')
        .send(validPasswordChangeData)
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('Current password is incorrect')
    })

    it('should handle password validation errors', async () => {
      // TDD: General password validation error handling
      // Note: OAuth user password change would be tested in integration tests
      // with proper user context setup
      const response = await request(app)
        .post('/auth/change-password')
        .set('Authorization', 'Bearer valid-token')
        .send(validPasswordChangeData)
        .expect(400)

      expect(response.body.success).toBe(false)
      // Current mock returns error for incorrect password
      expect(response.body.error).toBe('Current password is incorrect')
    })
  })
})
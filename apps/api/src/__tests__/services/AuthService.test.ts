import { AuthService } from '../../services/AuthService'
import { UserModel } from '../../models/User'
import { User } from '@prisma/client'

// Mock the UserModel to avoid database dependencies
jest.mock('../../models/User', () => ({
  UserModel: {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
}))

const mockUserModel = UserModel as jest.Mocked<typeof UserModel>

describe('AuthService', () => {
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
    jest.clearAllMocks()
  })

  describe('hashPassword', () => {
    it('should hash a password successfully', async () => {
      // TDD: This test would have been written first
      const password = 'testPassword123'
      const hashedPassword = await AuthService.hashPassword(password)
      
      expect(hashedPassword).toBeDefined()
      expect(hashedPassword).not.toBe(password)
      expect(typeof hashedPassword).toBe('string')
      expect(hashedPassword.length).toBeGreaterThan(0)
    })

    it('should generate different hashes for the same password', async () => {
      // TDD: Ensures salt is being used
      const password = 'testPassword123'
      const hash1 = await AuthService.hashPassword(password)
      const hash2 = await AuthService.hashPassword(password)
      
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('comparePassword', () => {
    it('should return true for correct password', async () => {
      // TDD: This would guide the implementation
      const password = 'testPassword123'
      const hashedPassword = await AuthService.hashPassword(password)
      
      const isValid = await AuthService.comparePassword(password, hashedPassword)
      expect(isValid).toBe(true)
    })

    it('should return false for incorrect password', async () => {
      // TDD: Edge case testing
      const password = 'testPassword123'
      const wrongPassword = 'wrongPassword456'
      const hashedPassword = await AuthService.hashPassword(password)
      
      const isValid = await AuthService.comparePassword(wrongPassword, hashedPassword)
      expect(isValid).toBe(false)
    })
  })

  describe('generateToken', () => {
    it('should generate a JWT token with user data', () => {
      // TDD: This test would define the token structure
      const token = AuthService.generateToken(mockUser)
      
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3) // JWT structure: header.payload.signature
    })

    it('should include userId and email in token payload', () => {
      // TDD: Ensures specific payload structure
      const token = AuthService.generateToken(mockUser)
      const payload = AuthService.verifyToken(token)
      
      expect(payload.userId).toBe(mockUser.id)
      expect(payload.email).toBe(mockUser.email)
    })
  })

  describe('verifyToken', () => {
    it('should verify and decode a valid token', () => {
      // TDD: Token verification requirements
      const token = AuthService.generateToken(mockUser)
      const payload = AuthService.verifyToken(token)
      
      expect(payload).toBeDefined()
      expect(payload.userId).toBe(mockUser.id)
      expect(payload.email).toBe(mockUser.email)
    })

    it('should throw error for invalid token', () => {
      // TDD: Error handling requirements
      const invalidToken = 'invalid.token.here'
      
      expect(() => {
        AuthService.verifyToken(invalidToken)
      }).toThrow('Invalid or expired token')
    })
  })

  describe('register', () => {
    const registerData = {
      email: 'newuser@example.com',
      name: 'New User',
      password: 'StrongPass123!',
      avatarUrl: 'https://example.com/avatar.jpg',
    }

    it('should register a new user successfully', async () => {
      // TDD: Happy path for user registration
      mockUserModel.findByEmail.mockResolvedValue(null) // User doesn't exist
      mockUserModel.create.mockResolvedValue(mockUser)
      
      const result = await AuthService.register(registerData)
      
      expect(result).toBeDefined()
      expect(result.user).toEqual(mockUser)
      expect(result.token).toBeDefined()
      expect(typeof result.token).toBe('string')
    })

    it('should throw error if user already exists', async () => {
      // TDD: Duplicate user handling
      mockUserModel.findByEmail.mockResolvedValue(mockUser)
      
      await expect(AuthService.register(registerData)).rejects.toThrow(
        'User with this email already exists'
      )
    })

    it('should validate password strength', async () => {
      // TDD: Password validation requirements
      const weakPasswordData = {
        ...registerData,
        password: 'weak',
      }
      
      await expect(AuthService.register(weakPasswordData)).rejects.toThrow(
        'Password validation failed'
      )
    })

    it('should hash password before storing', async () => {
      // TDD: Security requirement
      mockUserModel.findByEmail.mockResolvedValue(null)
      mockUserModel.create.mockResolvedValue(mockUser)
      
      await AuthService.register(registerData)
      
      expect(mockUserModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: registerData.email,
          name: registerData.name,
          password: expect.not.stringMatching(registerData.password), // Should be hashed
          avatarUrl: registerData.avatarUrl,
          provider: 'credentials',
        })
      )
    })
  })

  describe('login', () => {
    const loginCredentials = {
      email: 'test@example.com',
      password: 'testPassword123',
    }

    it('should login user with correct credentials', async () => {
      // TDD: Successful login flow
      const hashedPassword = await AuthService.hashPassword(loginCredentials.password)
      const userWithHashedPassword = { ...mockUser, password: hashedPassword }
      mockUserModel.findByEmail.mockResolvedValue(userWithHashedPassword)
      
      const result = await AuthService.login(loginCredentials)
      
      expect(result).toBeDefined()
      expect(result.user).toEqual(userWithHashedPassword)
      expect(result.token).toBeDefined()
    })

    it('should throw error for non-existent user', async () => {
      // TDD: User not found handling
      mockUserModel.findByEmail.mockResolvedValue(null)
      
      await expect(AuthService.login(loginCredentials)).rejects.toThrow(
        'Invalid email or password'
      )
    })

    it('should throw error for OAuth user without password', async () => {
      // TDD: OAuth user login handling
      const oauthUser = { ...mockUser, password: null }
      mockUserModel.findByEmail.mockResolvedValue(oauthUser)
      
      await expect(AuthService.login(loginCredentials)).rejects.toThrow(
        'User registered with social login'
      )
    })
  })

  describe('getUserFromToken', () => {
    it('should return user for valid token', async () => {
      // TDD: Token-based user retrieval
      const token = AuthService.generateToken(mockUser)
      mockUserModel.findById.mockResolvedValue(mockUser)
      
      const user = await AuthService.getUserFromToken(token)
      
      expect(user).toEqual(mockUser)
      expect(mockUserModel.findById).toHaveBeenCalledWith(mockUser.id)
    })

    it('should return null for invalid token', async () => {
      // TDD: Invalid token handling
      const invalidToken = 'invalid.token'
      
      const user = await AuthService.getUserFromToken(invalidToken)
      
      expect(user).toBeNull()
    })
  })

  describe('validatePassword', () => {
    it('should validate strong password', () => {
      // TDD: Password strength requirements
      const strongPassword = 'StrongPass123!'
      const result = AuthService.validatePassword(strongPassword)
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject password that is too short', () => {
      // TDD: Minimum length requirement
      const shortPassword = 'Ab1!'
      const result = AuthService.validatePassword(shortPassword)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must be at least 8 characters long')
    })

    it('should reject password without uppercase letter', () => {
      // TDD: Uppercase letter requirement
      const noUppercase = 'lowercase123!'
      const result = AuthService.validatePassword(noUppercase)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one uppercase letter')
    })

    it('should reject password without lowercase letter', () => {
      // TDD: Lowercase letter requirement
      const noLowercase = 'UPPERCASE123!'
      const result = AuthService.validatePassword(noLowercase)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one lowercase letter')
    })

    it('should reject password without number', () => {
      // TDD: Number requirement
      const noNumber = 'PasswordNoNum!'
      const result = AuthService.validatePassword(noNumber)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one number')
    })

    it('should reject password without special character', () => {
      // TDD: Special character requirement
      const noSpecial = 'Password123'
      const result = AuthService.validatePassword(noSpecial)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one special character')
    })
  })
})
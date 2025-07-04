import { Router } from 'express'
import { AuthService } from '../services/AuthService'
import { authenticateToken, validateRequest } from '../middleware/auth'
import { createUserSchema } from '@splitwise/shared'
import { z } from 'zod'

const router: Router = Router()

// Login schema
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
})

// Register schema
const registerSchema = createUserSchema.extend({
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Authentication]
 *     summary: Register a new user
 *     description: Creates a new user account with email and password authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserRegistration'
 *           examples:
 *             example1:
 *               summary: New user registration
 *               value:
 *                 email: "john.doe@example.com"
 *                 name: "John Doe"
 *                 password: "securePassword123!"
 *                 avatarUrl: "https://example.com/avatars/john.jpg"
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Registration failed - validation error or email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               emailExists:
 *                 summary: Email already registered
 *                 value:
 *                   success: false
 *                   error: "Email already exists"
 *               validationError:
 *                 summary: Validation failed
 *                 value:
 *                   success: false
 *                   error: "Password must be at least 8 characters"
 *     security: []
 */
router.post('/register', validateRequest(registerSchema), async (req, res) => {
  try {
    const { email, name, password, avatarUrl } = req.body

    const result = await AuthService.register({
      email,
      name,
      password,
      avatarUrl,
    })

    // Don't return the password in the response
    const { password: _, ...userWithoutPassword } = result.user

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: userWithoutPassword,
        token: result.token,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Registration failed'
    res.status(400).json({
      success: false,
      error: message,
    })
  }
})

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Login with email and password
 *     description: Authenticates a user and returns a JWT token for subsequent API requests
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserLogin'
 *           examples:
 *             example1:
 *               summary: User login
 *               value:
 *                 email: "john.doe@example.com"
 *                 password: "securePassword123!"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               invalidCredentials:
 *                 summary: Invalid email or password
 *                 value:
 *                   success: false
 *                   error: "Invalid email or password"
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *     security: []
 */
router.post('/login', validateRequest(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body

    const result = await AuthService.login({ email, password })

    // Don't return the password in the response
    const { password: _, ...userWithoutPassword } = result.user

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userWithoutPassword,
        token: result.token,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Login failed'
    res.status(401).json({
      success: false,
      error: message,
    })
  }
})

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     tags: [Authentication]
 *     summary: Refresh JWT token
 *     description: |
 *       Refreshes an existing JWT token to extend the session.
 *       Requires a valid JWT token in the Authorization header.
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Token refreshed successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       400:
 *         description: Token required for refresh
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Invalid or expired token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    const currentToken = authHeader && authHeader.split(' ')[1]

    if (!currentToken) {
      res.status(400).json({
        success: false,
        error: 'Token required for refresh',
      })
      return
    }

    const newToken = await AuthService.refreshToken(currentToken)

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token: newToken,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Token refresh failed'
    res.status(401).json({
      success: false,
      error: message,
    })
  }
})

/**
 * @swagger
 * /auth/me:
 *   get:
 *     tags: [Authentication]
 *     summary: Get current user information
 *     description: Returns the profile information of the currently authenticated user
 *     responses:
 *       200:
 *         description: User information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         description: Authentication required or user not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'User not found',
      })
      return
    }

    // Don't return the password in the response
    const { password: _, ...userWithoutPassword } = req.user

    res.json({
      success: true,
      data: {
        user: userWithoutPassword,
      },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get user information',
    })
  }
})

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags: [Authentication]
 *     summary: Logout user
 *     description: |
 *       Logs out the current user. Currently relies on client-side token removal.
 *       In future versions, this may maintain a server-side token blacklist.
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Logout successful"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // In a more sophisticated setup, we might maintain a blacklist of tokens
    // For now, we rely on client-side token removal
    res.json({
      success: true,
      message: 'Logout successful',
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Logout failed',
    })
  }
})

/**
 * @swagger
 * /auth/change-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Change user password
 *     description: |
 *       Changes the password for the authenticated user. Requires the current password
 *       for security verification. Only available for users with password-based accounts
 *       (not OAuth users).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 description: Current password for verification
 *                 example: "oldPassword123!"
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 description: New password (minimum 8 characters)
 *                 example: "newSecurePassword456!"
 *             required:
 *               - currentPassword
 *               - newPassword
 *     responses:
 *       200:
 *         description: Password changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Password changed successfully"
 *       400:
 *         description: Validation error or incorrect current password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               wrongPassword:
 *                 summary: Current password is incorrect
 *                 value:
 *                   success: false
 *                   error: "Current password is incorrect"
 *               oauthUser:
 *                 summary: OAuth user cannot change password
 *                 value:
 *                   success: false
 *                   error: "Cannot change password for social login accounts"
 *               weakPassword:
 *                 summary: New password validation failed
 *                 value:
 *                   success: false
 *                   error: "Password validation failed"
 *                   details:
 *                     errors: ["Password must be at least 8 characters"]
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body

    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'User not found',
      })
      return
    }

    // Validate input
    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        error: 'Current password and new password are required',
      })
      return
    }

    // Validate new password strength
    const passwordValidation = AuthService.validatePassword(newPassword)
    if (!passwordValidation.isValid) {
      res.status(400).json({
        success: false,
        error: 'Password validation failed',
        details: passwordValidation.errors,
      })
      return
    }

    // Check if user has a current password (not OAuth user)
    if (!req.user.password) {
      res.status(400).json({
        success: false,
        error: 'Cannot change password for social login accounts',
      })
      return
    }

    // Verify current password
    const isCurrentPasswordValid = await AuthService.comparePassword(
      currentPassword,
      req.user.password
    )

    if (!isCurrentPasswordValid) {
      res.status(400).json({
        success: false,
        error: 'Current password is incorrect',
      })
      return
    }

    // Hash new password
    const hashedNewPassword = await AuthService.hashPassword(newPassword)

    // Update user password
    const { UserModel } = await import('../models/User')
    await UserModel.update(req.user.id, {
      password: hashedNewPassword,
    })

    res.json({
      success: true,
      message: 'Password changed successfully',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Password change failed'
    res.status(500).json({
      success: false,
      error: message,
    })
  }
})

export default router
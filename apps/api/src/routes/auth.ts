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
 * POST /auth/register
 * Register a new user
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
 * POST /auth/login
 * Login with email and password
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
 * POST /auth/refresh
 * Refresh an existing token
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
 * GET /auth/me
 * Get current user information
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
 * POST /auth/logout
 * Logout (client-side token invalidation)
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
 * POST /auth/change-password
 * Change user password
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
import { z } from 'zod'

// Mock the shared package schemas and types
export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  password: z.string().min(8).max(100),
  avatarUrl: z.string().url().optional(),
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
})

export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*(),.?\":{}|<>]/, 'Password must contain at least one special character'),
  avatarUrl: z.string().url().optional(),
})

// Mock types
export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  name: string
  password: string
  avatarUrl?: string
}

export interface User {
  id: string
  email: string
  name: string
  password?: string
  avatarUrl?: string
  provider: string
  providerId?: string
  emailVerified: boolean
  createdAt: Date
  updatedAt: Date
}

export interface AuthResponse {
  user: Omit<User, 'password'>
  token: string
}
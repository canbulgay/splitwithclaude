import { hash, compare } from "bcryptjs";
import { sign, verify } from "jsonwebtoken";
import { randomBytes } from "crypto";
import { UserModel } from "../models/User";
import { User } from "@prisma/client";

export interface AuthTokenPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  name: string;
  password: string;
  avatarUrl?: string;
}

export class AuthService {
  private static readonly JWT_SECRET = AuthService.getJWTSecret();
  private static readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
  private static readonly BCRYPT_ROUNDS = parseInt(
    process.env.BCRYPT_ROUNDS || "12"
  );

  /**
   * Get JWT secret from environment, fail if not provided
   */
  private static getJWTSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error(
        "JWT_SECRET environment variable is required for secure authentication. " +
        "Please set a strong, randomly generated secret in your environment variables."
      );
    }
    if (secret.length < 32) {
      throw new Error(
        "JWT_SECRET must be at least 32 characters long for security. " +
        "Please use a longer, more secure secret."
      );
    }
    return secret;
  }

  /**
   * Hash a password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    return hash(password, AuthService.BCRYPT_ROUNDS);
  }

  /**
   * Compare a password with its hash
   */
  static async comparePassword(
    password: string,
    hashedPassword: string
  ): Promise<boolean> {
    return compare(password, hashedPassword);
  }

  /**
   * Generate a JWT token for a user
   */
  static generateToken(user: User): string {
    const payload: AuthTokenPayload = {
      userId: user.id,
      email: user.email,
    };

    return sign(payload, AuthService.JWT_SECRET, {
      expiresIn: AuthService.JWT_EXPIRES_IN,
    } as any);
  }

  /**
   * Verify and decode a JWT token
   */
  static verifyToken(token: string): AuthTokenPayload {
    try {
      return verify(token, AuthService.JWT_SECRET) as AuthTokenPayload;
    } catch (error) {
      throw new Error("Invalid or expired token");
    }
  }

  /**
   * Register a new user
   */
  static async register(
    data: RegisterData
  ): Promise<{ user: User; token: string }> {
    // Validate password strength first
    const passwordValidation = AuthService.validatePassword(data.password);
    if (!passwordValidation.isValid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
    }

    // Check if user already exists
    const existingUser = await UserModel.findByEmail(data.email);
    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Hash the password
    const hashedPassword = await AuthService.hashPassword(data.password);

    // Create the user
    const user = await UserModel.create({
      email: data.email,
      name: data.name,
      password: hashedPassword,
      avatarUrl: data.avatarUrl,
      provider: 'credentials',
    });

    // Generate token
    const token = AuthService.generateToken(user);

    return { user, token };
  }

  /**
   * Login a user
   */
  static async login(
    credentials: LoginCredentials
  ): Promise<{ user: User; token: string }> {
    // Find user by email
    const user = await UserModel.findByEmail(credentials.email);
    if (!user) {
      throw new Error("Invalid email or password");
    }

    // Check if user has a password (credentials provider)
    if (!user.password) {
      throw new Error("User registered with social login. Please use the appropriate sign-in method.");
    }

    // Verify password
    const isValidPassword = await AuthService.comparePassword(credentials.password, user.password);
    if (!isValidPassword) {
      throw new Error("Invalid email or password");
    }

    // Generate token
    const token = AuthService.generateToken(user);

    return { user, token };
  }

  /**
   * Get user from token
   */
  static async getUserFromToken(token: string): Promise<User | null> {
    try {
      const payload = AuthService.verifyToken(token);
      return await UserModel.findById(payload.userId);
    } catch (error) {
      return null;
    }
  }

  /**
   * Refresh a token (generate new token for existing user)
   */
  static async refreshToken(token: string): Promise<string> {
    const user = await AuthService.getUserFromToken(token);
    if (!user) {
      throw new Error("Invalid token");
    }

    return AuthService.generateToken(user);
  }

  /**
   * Validate password strength
   */
  static validatePassword(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push("Password must be at least 8 characters long");
    }

    if (!/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }

    if (!/[a-z]/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    }

    if (!/\d/.test(password)) {
      errors.push("Password must contain at least one number");
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push("Password must contain at least one special character");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate a cryptographically secure random password
   */
  static generateRandomPassword(length: number = 16): string {
    const charset =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    
    // Generate cryptographically secure random bytes
    const randomBytesArray = randomBytes(length);
    let password = "";

    for (let i = 0; i < length; i++) {
      // Use modulo to map byte values to charset indices
      password += charset.charAt(randomBytesArray[i] % charset.length);
    }

    // Ensure password meets our validation requirements
    const validation = AuthService.validatePassword(password);
    if (!validation.isValid) {
      // Recursively generate until we get a valid password
      return AuthService.generateRandomPassword(length);
    }

    return password;
  }
}

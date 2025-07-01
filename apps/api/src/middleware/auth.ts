// TODO: Add auto logout function according to users token expiration
import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/AuthService";
import { User } from "@prisma/client";

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

/**
 * Middleware to authenticate requests using JWT tokens
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        error: "Access token required",
      });
      return;
    }

    const user = await AuthService.getUserFromToken(token);
    if (!user) {
      res.status(401).json({
        success: false,
        error: "Invalid or expired token",
      });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: "Invalid or expired token",
    });
  }
};

/**
 * Middleware to optionally authenticate requests (user may or may not be logged in)
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (token) {
      const user = await AuthService.getUserFromToken(token);
      if (user) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // Silently continue without authentication
    next();
  }
};

/**
 * Middleware to check if user has admin role in a specific group
 */
export const requireGroupAdmin = (groupIdParam = "groupId") => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: "Authentication required",
        });
        return;
      }

      const groupId = req.params[groupIdParam];
      if (!groupId) {
        res.status(400).json({
          success: false,
          error: "Group ID required",
        });
        return;
      }

      // Import GroupModel here to avoid circular dependencies
      const { GroupModel } = await import("../models/Group");

      const isAdmin = await GroupModel.isAdmin(groupId, req.user.id);
      if (!isAdmin) {
        res.status(403).json({
          success: false,
          error: "Admin access required for this group",
        });
        return;
      }

      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to verify group admin status",
      });
    }
  };
};

/**
 * Middleware to check if user is a member of a specific group
 */
export const requireGroupMember = (groupIdParam = "groupId") => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: "Authentication required",
        });
        return;
      }

      const groupId = req.params[groupIdParam];
      if (!groupId) {
        res.status(400).json({
          success: false,
          error: "Group ID required",
        });
        return;
      }

      // Import GroupModel here to avoid circular dependencies
      const { GroupModel } = await import("../models/Group");

      const isMember = await GroupModel.isMember(groupId, req.user.id);
      if (!isMember) {
        res.status(403).json({
          success: false,
          error: "Group membership required",
        });
        return;
      }

      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to verify group membership",
      });
    }
  };
};

/**
 * Middleware to validate request body against a schema
 */
export const validateRequest = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validation = schema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: "Validation failed",
          details: validation.error.errors,
        });
        return;
      }

      req.body = validation.data;
      next();
    } catch (error) {
      res.status(400).json({
        success: false,
        error: "Invalid request data",
      });
    }
  };
};

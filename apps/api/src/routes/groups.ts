import { Router } from "express";
import {
  authenticateToken,
  requireGroupAdmin,
  requireGroupMember,
  validateRequest,
} from "../middleware/auth";
import { GroupModel } from "../models/Group";
import { createGroupSchema } from "@splitwise/shared";
import { z } from "zod";
import { Role } from "@prisma/client";
import { logger } from "@splitwise/shared";

const router: Router = Router();

// Validation schemas
const updateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});

const addMemberSchema = z.object({
  email: z.string().email("Invalid email format"),
  role: z.nativeEnum(Role).optional().default(Role.MEMBER),
});

const updateMemberRoleSchema = z.object({
  role: z.nativeEnum(Role),
});

/**
 * GET /groups
 * Get all groups for the authenticated user
 */
router.get("/", authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
      });
      return;
    }

    const groups = await GroupModel.findByUserId(req.user.id);

    res.json({
      success: true,
      data: groups,
    });
  } catch (error) {
    console.error("Error fetching user groups:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch groups",
    });
  }
});

/**
 * POST /groups
 * Create a new group
 */
router.post(
  "/",
  authenticateToken,
  validateRequest(createGroupSchema),
  async (req, res) => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: "Authentication required",
        });
        return;
      }

      const { name, description } = req.body;

      const group = await GroupModel.createWithAdmin(
        { name, description },
        req.user.id
      );

      // Fetch the group with members to return complete data
      const groupWithMembers = await GroupModel.findWithMembers(group.id);

      res.status(201).json({
        success: true,
        message: "Group created successfully",
        data: groupWithMembers,
      });
    } catch (error) {
      console.error("Error creating group:", error);
      const message =
        error instanceof Error ? error.message : "Failed to create group";
      res.status(400).json({
        success: false,
        error: message,
      });
    }
  }
);

/**
 * GET /groups/:groupId
 * Get group details with members
 */
router.get(
  "/:groupId",
  authenticateToken,
  requireGroupMember(),
  async (req, res) => {
    try {
      const { groupId } = req.params;

      const group = await GroupModel.findWithMembers(groupId);

      if (!group) {
        res.status(404).json({
          success: false,
          error: "Group not found",
        });
        return;
      }

      res.json({
        success: true,
        data: group,
      });
    } catch (error) {
      console.error("Error fetching group:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch group",
      });
    }
  }
);

/**
 * PUT /groups/:groupId
 * Update group details (admin only)
 */
router.put(
  "/:groupId",
  authenticateToken,
  requireGroupAdmin(),
  validateRequest(updateGroupSchema),
  async (req, res) => {
    try {
      const { groupId } = req.params;
      const updateData = req.body;

      logger.debug("updateData:", updateData);
      logger.debug("groupId:", groupId);
      // Check if group exists
      const existingGroup = await GroupModel.findById(groupId);
      if (!existingGroup) {
        res.status(404).json({
          success: false,
          error: "Group not found",
        });
        return;
      }

      logger.debug("existingGroup:", existingGroup);

      const updatedGroup = await GroupModel.update(groupId, updateData);

      logger.debug("updatedGroup:", updatedGroup);

      // Fetch updated group with members
      const groupWithMembers = await GroupModel.findWithMembers(groupId);

      res.json({
        success: true,
        message: "Group updated successfully",
        data: groupWithMembers,
      });
    } catch (error) {
      console.error("Error updating group:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update group",
      });
    }
  }
);

/**
 * DELETE /groups/:groupId
 * Delete group (admin only)
 */
router.delete(
  "/:groupId",
  authenticateToken,
  requireGroupAdmin(),
  async (req, res) => {
    try {
      const { groupId } = req.params;

      // Check if group exists
      const existingGroup = await GroupModel.findById(groupId);
      if (!existingGroup) {
        res.status(404).json({
          success: false,
          error: "Group not found",
        });
        return;
      }

      await GroupModel.delete(groupId);

      res.json({
        success: true,
        message: "Group deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting group:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete group",
      });
    }
  }
);

/**
 * POST /groups/:groupId/members
 * Add member to group by email (admin only)
 */
router.post(
  "/:groupId/members",
  authenticateToken,
  requireGroupAdmin(),
  validateRequest(addMemberSchema),
  async (req, res) => {
    try {
      const { groupId } = req.params;
      const { email, role } = req.body;

      // Find user by email
      const { UserModel } = await import("../models/User");
      const user = await UserModel.findByEmail(email);

      if (!user) {
        res.status(404).json({
          success: false,
          error: "User not found with this email address",
        });
        return;
      }

      // Check if user is already a member
      const isMember = await GroupModel.isMember(groupId, user.id);
      if (isMember) {
        res.status(400).json({
          success: false,
          error: "User is already a member of this group",
        });
        return;
      }

      // Add member to group
      await GroupModel.addMember(groupId, user.id, role);

      // Fetch updated group with members
      const groupWithMembers = await GroupModel.findWithMembers(groupId);

      res.status(201).json({
        success: true,
        message: "Member added successfully",
        data: groupWithMembers,
      });
    } catch (error) {
      console.error("Error adding member:", error);
      res.status(500).json({
        success: false,
        error: "Failed to add member",
      });
    }
  }
);

/**
 * PUT /groups/:groupId/members/:userId/role
 * Update member role (admin only)
 */
router.put(
  "/:groupId/members/:userId/role",
  authenticateToken,
  requireGroupAdmin(),
  validateRequest(updateMemberRoleSchema),
  async (req, res) => {
    try {
      const { groupId, userId } = req.params;
      const { role } = req.body;

      // Check if user is a member
      const isMember = await GroupModel.isMember(groupId, userId);
      if (!isMember) {
        res.status(404).json({
          success: false,
          error: "User is not a member of this group",
        });
        return;
      }

      // Prevent removing the last admin
      if (role === Role.MEMBER) {
        const group = await GroupModel.findWithMembers(groupId);
        const adminCount =
          group?.members.filter((member) => member.role === Role.ADMIN)
            .length || 0;

        const currentMember = group?.members.find(
          (member) => member.userId === userId
        );
        if (currentMember?.role === Role.ADMIN && adminCount === 1) {
          res.status(400).json({
            success: false,
            error: "Cannot remove the last admin from the group",
          });
          return;
        }
      }

      await GroupModel.updateMemberRole(groupId, userId, role);

      // Fetch updated group with members
      const groupWithMembers = await GroupModel.findWithMembers(groupId);

      res.json({
        success: true,
        message: "Member role updated successfully",
        data: groupWithMembers,
      });
    } catch (error) {
      console.error("Error updating member role:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update member role",
      });
    }
  }
);

/**
 * DELETE /groups/:groupId/members/:userId
 * Remove member from group (admin only, or self-removal)
 */
router.delete(
  "/:groupId/members/:userId",
  authenticateToken,
  async (req, res) => {
    try {
      const { groupId, userId } = req.params;

      if (!req.user) {
        res.status(401).json({
          success: false,
          error: "Authentication required",
        });
        return;
      }

      // Check if user is trying to remove themselves or if they're an admin
      const isSelfRemoval = req.user.id === userId;
      const isAdmin = await GroupModel.isAdmin(groupId, req.user.id);

      if (!isSelfRemoval && !isAdmin) {
        res.status(403).json({
          success: false,
          error: "Only admins can remove other members",
        });
        return;
      }

      // Check if user is a member
      const isMember = await GroupModel.isMember(groupId, userId);
      if (!isMember) {
        res.status(404).json({
          success: false,
          error: "User is not a member of this group",
        });
        return;
      }

      // Prevent removing the last admin
      const group = await GroupModel.findWithMembers(groupId);
      const adminCount =
        group?.members.filter((member) => member.role === Role.ADMIN).length ||
        0;
      const memberToRemove = group?.members.find(
        (member) => member.userId === userId
      );

      if (memberToRemove?.role === Role.ADMIN && adminCount === 1) {
        res.status(400).json({
          success: false,
          error: "Cannot remove the last admin from the group",
        });
        return;
      }

      await GroupModel.removeMember(groupId, userId);

      // If user removed themselves, just return success
      if (isSelfRemoval) {
        res.json({
          success: true,
          message: "Left group successfully",
        });
        return;
      }

      // Fetch updated group with members for admin removals
      const groupWithMembers = await GroupModel.findWithMembers(groupId);

      res.json({
        success: true,
        message: "Member removed successfully",
        data: groupWithMembers,
      });
    } catch (error) {
      console.error("Error removing member:", error);
      res.status(500).json({
        success: false,
        error: "Failed to remove member",
      });
    }
  }
);

/**
 * GET /groups/:groupId/expenses
 * Get group expenses with splits
 */
router.get(
  "/:groupId/expenses",
  authenticateToken,
  requireGroupMember(),
  async (req, res) => {
    try {
      const { groupId } = req.params;

      const group = await GroupModel.findWithExpenses(groupId);

      if (!group) {
        res.status(404).json({
          success: false,
          error: "Group not found",
        });
        return;
      }

      res.json({
        success: true,
        data: {
          group: {
            id: group.id,
            name: group.name,
            description: group.description,
          },
          expenses: group.expenses,
        },
      });
    } catch (error) {
      console.error("Error fetching group expenses:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch group expenses",
      });
    }
  }
);

export default router;

import { Router } from "express";
import {
  authenticateToken,
  requireGroupAdmin,
  requireGroupMember,
  validateRequest,
} from "../middleware/auth";
import { GroupModel } from "../models/Group";
import { createGroupSchema, expenseFilterSchema } from "@splitwise/shared";
import { z } from "zod";
import { Role } from "@prisma/client";
import { ExpenseCategory } from "@splitwise/shared";
import { ExpenseModel } from "../models/Expense";
import { log } from "console";

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
 * @swagger
 * /groups:
 *   get:
 *     tags: [Groups]
 *     summary: Get user's groups
 *     description: Retrieves all groups that the authenticated user is a member of
 *     responses:
 *       200:
 *         description: Groups retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Group'
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
 * @swagger
 * /groups:
 *   post:
 *     tags: [Groups]
 *     summary: Create a new group
 *     description: Creates a new expense-sharing group with the authenticated user as admin
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateGroup'
 *           examples:
 *             example1:
 *               summary: Weekend trip group
 *               value:
 *                 name: "Weekend Trip to Mountains"
 *                 description: "Shared expenses for our weekend getaway"
 *     responses:
 *       201:
 *         description: Group created successfully
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
 *                   example: "Group created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Group'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
 * @swagger
 * /groups/{groupId}:
 *   get:
 *     tags: [Groups]
 *     summary: Get group details
 *     description: Retrieves detailed information about a specific group including members
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^c[a-z0-9]{24}$'
 *         description: Unique identifier of the group
 *         example: clm123abc456def789ghi012j
 *     responses:
 *       200:
 *         description: Group details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Group'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Access denied - not a group member
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Group not found
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

      // Check if group exists
      const existingGroup = await GroupModel.findById(groupId);
      if (!existingGroup) {
        res.status(404).json({
          success: false,
          error: "Group not found",
        });
        return;
      }

      const updatedGroup = await GroupModel.update(groupId, updateData);
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
 * Get group expenses with pagination and filtering
 */
router.get(
  "/:groupId/expenses",
  authenticateToken,
  requireGroupMember(),
  async (req, res) => {
    try {
      const { groupId } = req.params;

      // Parse and validate query parameters
      const queryValidation = expenseFilterSchema.safeParse({
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit
          ? parseInt(req.query.limit as string)
          : undefined,
        category: req.query.category as ExpenseCategory,
        paidBy: req.query.paidBy as string,
        minAmount: req.query.minAmount
          ? parseFloat(req.query.minAmount as string)
          : undefined,
        maxAmount: req.query.maxAmount
          ? parseFloat(req.query.maxAmount as string)
          : undefined,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        sortBy: req.query.sortBy as "createdAt" | "amount" | "description",
        sortOrder: req.query.sortOrder as "asc" | "desc",
      });

      if (!queryValidation.success) {
        res.status(400).json({
          success: false,
          error: "Invalid query parameters",
          details: queryValidation.error.flatten().fieldErrors,
        });
        return;
      }

      const filters = queryValidation.data;

      // Check if group exists
      const group = await GroupModel.findById(groupId);
      if (!group) {
        res.status(404).json({
          success: false,
          error: "Group not found",
        });
        return;
      }

      // Get filtered and paginated expenses
      const result = await ExpenseModel.findByGroupIdWithFilters(
        groupId,
        filters
      );

      log("Fetched group expenses:", {
        result,
      });

      res.json({
        success: true,
        data: {
          group: {
            id: group.id,
            name: group.name,
            description: group.description,
          },
          expenses: result.expenses.map((expense) => ({
            ...expense,
            amount: Number(expense.amount),
            splits: expense.splits.map((split) => ({
              ...split,
              amountOwed: Number(split.amountOwed),
            })),
          })),
          pagination: result.pagination,
        },
      });
    } catch (error) {
      console.error("Error fetching group expenses:", error);
      console.error("Error details:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined,
      });
      res.status(500).json({
        success: false,
        error: "Failed to fetch group expenses",
        debug: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

/**
 * GET /groups/:groupId/expense-categories
 * Get available expense categories
 */
router.get(
  "/:groupId/expense-categories",
  authenticateToken,
  requireGroupMember(),
  async (req, res) => {
    try {
      const categories = Object.values(ExpenseCategory).map((category) => ({
        value: category,
        label:
          category.charAt(0) +
          category.slice(1).toLowerCase().replace(/_/g, " "),
        icon: getCategoryIcon(category),
      }));

      res.json({
        success: true,
        data: categories,
      });
    } catch (error) {
      console.error("Error fetching expense categories:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch expense categories",
      });
    }
  }
);

// Helper function to get category icons
function getCategoryIcon(category: ExpenseCategory): string {
  const iconMap: Record<ExpenseCategory, string> = {
    [ExpenseCategory.GENERAL]: "📄",
    [ExpenseCategory.FOOD]: "🍽️",
    [ExpenseCategory.TRANSPORTATION]: "🚗",
    [ExpenseCategory.ENTERTAINMENT]: "🎬",
    [ExpenseCategory.UTILITIES]: "⚡",
    [ExpenseCategory.SHOPPING]: "🛍️",
    [ExpenseCategory.HEALTHCARE]: "🏥",
    [ExpenseCategory.TRAVEL]: "✈️",
    [ExpenseCategory.EDUCATION]: "📚",
    [ExpenseCategory.OTHER]: "📦",
  };
  return iconMap[category] || "📄";
}

export default router;

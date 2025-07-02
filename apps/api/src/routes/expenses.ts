import { Router } from "express";
import { authenticateToken, validateRequest } from "../middleware/auth";
import { ExpenseModel } from "../models/Expense";
import { GroupModel } from "../models/Group";
import { createExpenseSchema, expenseFilterSchema } from "@splitwise/shared";
import { z } from "zod";

const router: Router = Router();

// Validation schemas
const updateExpenseSchema = z.object({
  amount: z.number().positive().multipleOf(0.01).optional(),
  description: z.string().min(1).max(200).optional(),
  category: z.enum(["GENERAL", "FOOD", "TRANSPORTATION", "ENTERTAINMENT", "UTILITIES", "SHOPPING", "HEALTHCARE", "TRAVEL", "EDUCATION", "OTHER"]).optional(),
  paidBy: z.string().cuid().optional(),
  splits: z
    .array(
      z.object({
        userId: z.string().cuid(),
        amount: z.number().positive().multipleOf(0.01),
      })
    )
    .optional(),
});

/**
 * GET /expenses/:expenseId
 * Get expense details with splits
 */
router.get("/:expenseId", authenticateToken, async (req, res) => {
  try {
    const { expenseId } = req.params;

    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
      });
      return;
    }

    const expense = await ExpenseModel.findWithSplits(expenseId);

    if (!expense) {
      res.status(404).json({
        success: false,
        error: "Expense not found",
      });
      return;
    }

    // Check if user has access to this expense (must be group member)
    const isMember = await GroupModel.isMember(expense.groupId, req.user.id);
    if (!isMember) {
      res.status(403).json({
        success: false,
        error:
          "Access denied. You must be a group member to view this expense.",
      });
      return;
    }

    res.json({
      success: true,
      data: expense,
    });
  } catch (error) {
    console.error("Error fetching expense:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch expense",
    });
  }
});

/**
 * POST /expenses
 * Create a new expense
 */

router.post(
  "/",
  authenticateToken,
  validateRequest(createExpenseSchema),
  async (req, res) => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: "Authentication required",
        });
        return;
      }

      const { groupId, amount, description, category, paidBy, splits } = req.body;

      // Check if user is a member of the group
      const isMember = await GroupModel.isMember(groupId, req.user.id);
      if (!isMember) {
        res.status(403).json({
          success: false,
          error: "Access denied. You must be a group member to add expenses.",
        });
        return;
      }

      // Validate that the payer is a group member
      const isPayerMember = await GroupModel.isMember(groupId, paidBy);
      if (!isPayerMember) {
        res.status(400).json({
          success: false,
          error: "Payer must be a group member",
        });
        return;
      }

      // Validate that all split users are group members
      for (const split of splits) {
        const isSplitUserMember = await GroupModel.isMember(
          groupId,
          split.userId
        );
        if (!isSplitUserMember) {
          res.status(400).json({
            success: false,
            error: `All users in the split must be group members`,
          });
          return;
        }
      }

      // Validate that split amounts sum to the total expense amount
      const totalSplitAmount = splits.reduce(
        (sum: number, split: { userId: string; amount: number }) =>
          sum + split.amount,
        0
      );
      if (Math.abs(totalSplitAmount - amount) > 0.01) {
        res.status(400).json({
          success: false,
          error: "Split amounts must equal the total expense amount",
        });
        return;
      }

      // Create expense with splits
      const expense = await ExpenseModel.createWithSplits(
        {
          group: { connect: { id: groupId } },
          amount,
          description,
          category: category || 'GENERAL',
          payer: { connect: { id: paidBy } },
        },
        splits.map((split: { userId: string; amount: number }) => ({
          userId: split.userId,
          amountOwed: split.amount,
        }))
      );

      // Fetch the created expense with full details
      const expenseWithSplits = await ExpenseModel.findWithSplits(expense.id);

      res.status(201).json({
        success: true,
        message: "Expense created successfully",
        data: expenseWithSplits,
      });
    } catch (error) {
      console.error("Error creating expense:", error);
      const message =
        error instanceof Error ? error.message : "Failed to create expense";
      res.status(500).json({
        success: false,
        error: message,
      });
    }
  }
);

/**
 * PUT /expenses/:expenseId
 * Update expense details
 */
router.put(
  "/:expenseId",
  authenticateToken,
  validateRequest(updateExpenseSchema),
  async (req, res) => {
    try {
      const { expenseId } = req.params;
      const updateData = req.body;

      if (!req.user) {
        res.status(401).json({
          success: false,
          error: "Authentication required",
        });
        return;
      }

      // Check if expense exists
      const existingExpense = await ExpenseModel.findWithSplits(expenseId);
      if (!existingExpense) {
        res.status(404).json({
          success: false,
          error: "Expense not found",
        });
        return;
      }

      // Check if user has access to this expense (must be group member)
      const isMember = await GroupModel.isMember(
        existingExpense.groupId,
        req.user.id
      );
      if (!isMember) {
        res.status(403).json({
          success: false,
          error:
            "Access denied. You must be a group member to edit this expense.",
        });
        return;
      }

      // Additional validation if updating payer or splits
      if (updateData.paidBy) {
        const isPayerMember = await GroupModel.isMember(
          existingExpense.groupId,
          updateData.paidBy
        );
        if (!isPayerMember) {
          res.status(400).json({
            success: false,
            error: "Payer must be a group member",
          });
          return;
        }
      }

      if (updateData.splits) {
        // Validate that all split users are group members
        for (const split of updateData.splits) {
          const isSplitUserMember = await GroupModel.isMember(
            existingExpense.groupId,
            split.userId
          );
          if (!isSplitUserMember) {
            res.status(400).json({
              success: false,
              error: `All users in the split must be group members`,
            });
            return;
          }
        }

        // Validate that split amounts sum to the total expense amount
        const expenseAmount = updateData.amount ?? existingExpense.amount;
        const totalSplitAmount = updateData.splits.reduce(
          (sum: number, split: { userId: string; amount: number }) =>
            sum + split.amount,
          0
        );
        if (Math.abs(totalSplitAmount - Number(expenseAmount)) > 0.01) {
          res.status(400).json({
            success: false,
            error: "Split amounts must equal the total expense amount",
          });
          return;
        }
      }

      if (updateData.splits) {
        // Update expense with new splits
        const { splits, ...expenseOnlyData } = updateData;
        const prismaUpdateData: any = {};

        if (expenseOnlyData.amount !== undefined) {
          prismaUpdateData.amount = expenseOnlyData.amount;
        }
        if (expenseOnlyData.description !== undefined) {
          prismaUpdateData.description = expenseOnlyData.description;
        }
        if (expenseOnlyData.category !== undefined) {
          prismaUpdateData.category = expenseOnlyData.category;
        }
        if (expenseOnlyData.paidBy !== undefined) {
          prismaUpdateData.payer = { connect: { id: expenseOnlyData.paidBy } };
        }

        await ExpenseModel.updateWithSplits(
          expenseId,
          prismaUpdateData,
          splits.map((split: { userId: string; amount: number }) => ({
            userId: split.userId,
            amountOwed: split.amount,
          }))
        );
      } else {
        // Update expense only (no splits changed)
        const prismaUpdateData: any = {};

        if (updateData.amount !== undefined) {
          prismaUpdateData.amount = updateData.amount;
        }
        if (updateData.description !== undefined) {
          prismaUpdateData.description = updateData.description;
        }
        if (updateData.category !== undefined) {
          prismaUpdateData.category = updateData.category;
        }
        if (updateData.paidBy !== undefined) {
          prismaUpdateData.payer = { connect: { id: updateData.paidBy } };
        }

        await ExpenseModel.update(expenseId, prismaUpdateData);
      }

      // Fetch updated expense with splits
      const expenseWithSplits = await ExpenseModel.findWithSplits(expenseId);

      res.json({
        success: true,
        message: "Expense updated successfully",
        data: expenseWithSplits,
      });
    } catch (error) {
      console.error("Error updating expense:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update expense",
      });
    }
  }
);

/**
 * DELETE /expenses/:expenseId
 * Delete expense
 */
router.delete("/:expenseId", authenticateToken, async (req, res) => {
  try {
    const { expenseId } = req.params;

    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
      });
      return;
    }

    // Check if expense exists
    const existingExpense = await ExpenseModel.findWithSplits(expenseId);
    if (!existingExpense) {
      res.status(404).json({
        success: false,
        error: "Expense not found",
      });
      return;
    }

    // Check if user has access to this expense (must be group member)
    const isMember = await GroupModel.isMember(
      existingExpense.groupId,
      req.user.id
    );
    if (!isMember) {
      res.status(403).json({
        success: false,
        error:
          "Access denied. You must be a group member to delete this expense.",
      });
      return;
    }

    await ExpenseModel.delete(expenseId);

    res.json({
      success: true,
      message: "Expense deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting expense:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete expense",
    });
  }
});

export default router;

import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import { SettlementModel } from "../models/Settlement";
import { GroupModel } from "../models/Group";
import { BalanceService } from "../services/BalanceService";
import { z } from "zod";

const router: Router = Router();

// Validation schemas
const createSettlementSchema = z.object({
  fromUser: z.string().cuid("Invalid user ID format"),
  toUser: z.string().cuid("Invalid user ID format"),
  amount: z.number().positive("Amount must be positive").max(999999.99, "Amount too large"),
  expenseIds: z.array(z.string().cuid()).optional(),
  description: z.string().optional(),
});

const updateSettlementSchema = z.object({
  amount: z.number().positive("Amount must be positive").max(999999.99, "Amount too large").optional(),
  description: z.string().optional(),
});

/**
 * POST /settlements
 * Create a new settlement
 */
router.post("/", authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
      });
      return;
    }

    // Validate request body
    const validation = createSettlementSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: "Invalid settlement data",
        details: validation.error.flatten().fieldErrors,
      });
      return;
    }

    const { fromUser, toUser, amount, expenseIds, description } = validation.data;

    // Users can only create settlements involving themselves
    if (req.user.id !== fromUser && req.user.id !== toUser) {
      res.status(403).json({
        success: false,
        error: "Access denied. You can only create settlements involving yourself.",
      });
      return;
    }

    // Prevent self-settlements
    if (fromUser === toUser) {
      res.status(400).json({
        success: false,
        error: "Cannot create settlement with yourself",
      });
      return;
    }

    // Verify users have shared expenses if expenseIds provided
    if (expenseIds && expenseIds.length > 0) {
      // Check if users share groups with these expenses
      const user1Groups = await GroupModel.findByUserId(fromUser);
      const user2Groups = await GroupModel.findByUserId(toUser);
      
      const sharedGroups = user1Groups.filter((group1) =>
        user2Groups.some((group2) => group2.id === group1.id)
      );

      if (sharedGroups.length === 0) {
        res.status(400).json({
          success: false,
          error: "Users must share at least one group to settle expenses",
        });
        return;
      }
    }

    // Create settlement
    const settlement = await SettlementModel.create({
      fromUserRel: { connect: { id: fromUser } },
      toUserRel: { connect: { id: toUser } },
      amount,
      description,
      status: 'PENDING',
    }, expenseIds);

    // Fetch with details for response
    const settlementWithDetails = await SettlementModel.findWithDetails(settlement.id);

    res.status(201).json({
      success: true,
      data: settlementWithDetails,
      message: "Settlement created successfully",
    });
  } catch (error) {
    console.error("Error creating settlement:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create settlement",
    });
  }
});

/**
 * GET /settlements/pending
 * Get pending settlements that need user action
 */
router.get("/pending", authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
      });
      return;
    }

    const pendingSettlements = await SettlementModel.findPendingByUserId(req.user.id);

    // Separate settlements by action needed
    const needingConfirmation = pendingSettlements.filter(
      (s) => s.toUser === req.user!.id && s.status === 'PENDING'
    );
    const needingCompletion = pendingSettlements.filter(
      (s) => s.fromUser === req.user!.id && s.status === 'CONFIRMED'
    );
    const awaitingResponse = pendingSettlements.filter(
      (s) => s.fromUser === req.user!.id && s.status === 'PENDING'
    );

    res.json({
      success: true,
      data: {
        needingConfirmation,    // User needs to confirm they received payment
        needingCompletion,      // User needs to mark as completed after paying
        awaitingResponse,       // User is waiting for recipient to confirm
        total: pendingSettlements.length,
      },
    });
  } catch (error) {
    console.error("Error fetching pending settlements:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch pending settlements",
    });
  }
});

/**
 * GET /settlements
 * Get settlements for the authenticated user
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

    const settlements = await SettlementModel.findByUserId(req.user.id);

    // Calculate summary statistics
    const stats = await SettlementModel.getTotalByUserId(req.user.id);
    const count = await SettlementModel.countByUserId(req.user.id);

    res.json({
      success: true,
      data: {
        settlements,
        summary: {
          totalCount: count,
          totalSent: stats.sent,
          totalReceived: stats.received,
          netAmount: stats.received - stats.sent,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching settlements:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch settlements",
    });
  }
});

/**
 * GET /settlements/:id
 * Get a specific settlement by ID
 */
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
      });
      return;
    }

    const settlement = await SettlementModel.findWithDetails(id);

    if (!settlement) {
      res.status(404).json({
        success: false,
        error: "Settlement not found",
      });
      return;
    }

    // Users can only view settlements involving themselves
    if (req.user.id !== settlement.fromUser && req.user.id !== settlement.toUser) {
      res.status(403).json({
        success: false,
        error: "Access denied. You can only view settlements involving yourself.",
      });
      return;
    }

    res.json({
      success: true,
      data: settlement,
    });
  } catch (error) {
    console.error("Error fetching settlement:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch settlement",
    });
  }
});

/**
 * PUT /settlements/:id
 * Update a settlement (only creator can update)
 */
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
      });
      return;
    }

    // Validate request body
    const validation = updateSettlementSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: "Invalid update data",
        details: validation.error.flatten().fieldErrors,
      });
      return;
    }

    const settlement = await SettlementModel.findById(id);

    if (!settlement) {
      res.status(404).json({
        success: false,
        error: "Settlement not found",
      });
      return;
    }

    // Only the person who created the settlement (fromUser) can update it
    if (req.user.id !== settlement.fromUser) {
      res.status(403).json({
        success: false,
        error: "Access denied. Only the settlement creator can update it.",
      });
      return;
    }

    const updatedSettlement = await SettlementModel.update(id, validation.data);
    const settlementWithDetails = await SettlementModel.findWithDetails(updatedSettlement.id);

    res.json({
      success: true,
      data: settlementWithDetails,
      message: "Settlement updated successfully",
    });
  } catch (error) {
    console.error("Error updating settlement:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update settlement",
    });
  }
});

/**
 * DELETE /settlements/:id
 * Delete a settlement (only creator can delete)
 */
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
      });
      return;
    }

    const settlement = await SettlementModel.findById(id);

    if (!settlement) {
      res.status(404).json({
        success: false,
        error: "Settlement not found",
      });
      return;
    }

    // Only the person who created the settlement (fromUser) can delete it
    if (req.user.id !== settlement.fromUser) {
      res.status(403).json({
        success: false,
        error: "Access denied. Only the settlement creator can delete it.",
      });
      return;
    }

    await SettlementModel.delete(id);

    res.json({
      success: true,
      message: "Settlement deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting settlement:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete settlement",
    });
  }
});

/**
 * GET /settlements/between/:user1/:user2
 * Get settlements between two specific users
 */
router.get("/between/:user1/:user2", authenticateToken, async (req, res) => {
  try {
    const { user1, user2 } = req.params;

    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
      });
      return;
    }

    // Users can only view settlements involving themselves
    if (req.user.id !== user1 && req.user.id !== user2) {
      res.status(403).json({
        success: false,
        error: "Access denied. You can only view settlements involving yourself.",
      });
      return;
    }

    const settlements = await SettlementModel.findBetweenUsers(user1, user2);

    // Calculate summary between these users
    let totalFromUser1ToUser2 = 0;
    let totalFromUser2ToUser1 = 0;

    settlements.forEach((settlement) => {
      if (settlement.fromUser === user1 && settlement.toUser === user2) {
        totalFromUser1ToUser2 += Number(settlement.amount);
      } else if (settlement.fromUser === user2 && settlement.toUser === user1) {
        totalFromUser2ToUser1 += Number(settlement.amount);
      }
    });

    const netAmount = totalFromUser1ToUser2 - totalFromUser2ToUser1;
    let netDirection = "";
    
    if (netAmount > 0) {
      netDirection = `${user1} has settled $${Math.abs(netAmount).toFixed(2)} more to ${user2}`;
    } else if (netAmount < 0) {
      netDirection = `${user2} has settled $${Math.abs(netAmount).toFixed(2)} more to ${user1}`;
    } else {
      netDirection = "Even settlement history";
    }

    res.json({
      success: true,
      data: {
        settlements,
        summary: {
          totalSettlements: settlements.length,
          totalFromUser1ToUser2: Math.round(totalFromUser1ToUser2 * 100) / 100,
          totalFromUser2ToUser1: Math.round(totalFromUser2ToUser1 * 100) / 100,
          netAmount: Math.round(Math.abs(netAmount) * 100) / 100,
          netDirection,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching settlements between users:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch settlements between users",
    });
  }
});

/**
 * GET /settlements/group/:groupId
 * Get settlements for a specific group
 */
router.get("/group/:groupId", authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;

    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
      });
      return;
    }

    // Check if user is a member of the group
    const isMember = await GroupModel.isMember(groupId, req.user.id);
    if (!isMember) {
      res.status(403).json({
        success: false,
        error: "Access denied. You must be a group member to view settlements.",
      });
      return;
    }

    const settlements = await SettlementModel.findByGroupMembers(groupId);

    // Calculate group settlement statistics
    const totalSettled = settlements.reduce((sum, settlement) => sum + Number(settlement.amount), 0);
    
    res.json({
      success: true,
      data: {
        settlements,
        groupId,
        summary: {
          totalSettlements: settlements.length,
          totalAmount: Math.round(totalSettled * 100) / 100,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching group settlements:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch group settlements",
    });
  }
});

/**
 * POST /settlements/suggestions/:groupId
 * Get optimized settlement suggestions for a group
 */
router.get("/suggestions/:groupId", authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;

    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
      });
      return;
    }

    // Check if user is a member of the group
    const isMember = await GroupModel.isMember(groupId, req.user.id);
    if (!isMember) {
      res.status(403).json({
        success: false,
        error: "Access denied. You must be a group member to view settlement suggestions.",
      });
      return;
    }

    // Get current balances and optimized suggestions
    const currentBalances = await BalanceService.calculateGroupBalancesRealTime(groupId);
    const suggestions = await BalanceService.optimizeSettlements(groupId);

    // Calculate potential savings
    const currentTransactionCount = currentBalances.length;
    const optimizedTransactionCount = suggestions.length;
    const transactionReduction = currentTransactionCount - optimizedTransactionCount;

    res.json({
      success: true,
      data: {
        suggestions,
        currentBalances,
        optimization: {
          currentTransactions: currentTransactionCount,
          optimizedTransactions: optimizedTransactionCount,
          transactionReduction,
          percentageReduction: currentTransactionCount > 0 
            ? Math.round((transactionReduction / currentTransactionCount) * 100)
            : 0,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching settlement suggestions:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch settlement suggestions",
    });
  }
});

/**
 * POST /settlements/:id/confirm
 * Confirm settlement receipt (toUser confirms they received payment)
 */
router.post("/:id/confirm", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
      });
      return;
    }

    const settlement = await SettlementModel.findById(id);

    if (!settlement) {
      res.status(404).json({
        success: false,
        error: "Settlement not found",
      });
      return;
    }

    // Only the recipient (toUser) can confirm settlement
    if (req.user.id !== settlement.toUser) {
      res.status(403).json({
        success: false,
        error: "Access denied. Only the settlement recipient can confirm it.",
      });
      return;
    }

    // Can only confirm pending settlements
    if (settlement.status !== 'PENDING') {
      res.status(400).json({
        success: false,
        error: `Cannot confirm settlement with status: ${settlement.status}`,
      });
      return;
    }

    const updatedSettlement = await SettlementModel.confirmSettlement(id);
    const settlementWithDetails = await SettlementModel.findWithDetails(updatedSettlement.id);

    res.json({
      success: true,
      data: settlementWithDetails,
      message: "Settlement confirmed successfully",
    });
  } catch (error) {
    console.error("Error confirming settlement:", error);
    res.status(500).json({
      success: false,
      error: "Failed to confirm settlement",
    });
  }
});

/**
 * POST /settlements/:id/complete
 * Mark settlement as completed (fromUser marks as paid)
 */
router.post("/:id/complete", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
      });
      return;
    }

    const settlement = await SettlementModel.findById(id);

    if (!settlement) {
      res.status(404).json({
        success: false,
        error: "Settlement not found",
      });
      return;
    }

    // Only the payer (fromUser) can mark settlement as completed
    if (req.user.id !== settlement.fromUser) {
      res.status(403).json({
        success: false,
        error: "Access denied. Only the settlement payer can mark it as completed.",
      });
      return;
    }

    // Can only complete confirmed settlements
    if (settlement.status !== 'CONFIRMED') {
      res.status(400).json({
        success: false,
        error: `Cannot complete settlement with status: ${settlement.status}. Settlement must be confirmed first.`,
      });
      return;
    }

    const updatedSettlement = await SettlementModel.completeSettlement(id);
    const settlementWithDetails = await SettlementModel.findWithDetails(updatedSettlement.id);

    res.json({
      success: true,
      data: settlementWithDetails,
      message: "Settlement completed successfully",
    });
  } catch (error) {
    console.error("Error completing settlement:", error);
    res.status(500).json({
      success: false,
      error: "Failed to complete settlement",
    });
  }
});

/**
 * POST /settlements/:id/cancel
 * Cancel a settlement (either party can cancel pending settlements)
 */
router.post("/:id/cancel", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
      });
      return;
    }

    const settlement = await SettlementModel.findById(id);

    if (!settlement) {
      res.status(404).json({
        success: false,
        error: "Settlement not found",
      });
      return;
    }

    // Both parties can cancel their own settlements
    if (req.user.id !== settlement.fromUser && req.user.id !== settlement.toUser) {
      res.status(403).json({
        success: false,
        error: "Access denied. You can only cancel settlements involving yourself.",
      });
      return;
    }

    // Can only cancel pending or confirmed settlements
    if (settlement.status === 'COMPLETED' || settlement.status === 'CANCELLED') {
      res.status(400).json({
        success: false,
        error: `Cannot cancel settlement with status: ${settlement.status}`,
      });
      return;
    }

    const updatedSettlement = await SettlementModel.cancelSettlement(id, reason);
    const settlementWithDetails = await SettlementModel.findWithDetails(updatedSettlement.id);

    res.json({
      success: true,
      data: settlementWithDetails,
      message: "Settlement cancelled successfully",
    });
  } catch (error) {
    console.error("Error cancelling settlement:", error);
    res.status(500).json({
      success: false,
      error: "Failed to cancel settlement",
    });
  }
});

/**
 * POST /settlements/group/:groupId/settle-all
 * Create optimized settlements to settle entire group
 */
router.post("/group/:groupId/settle-all", authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { description } = req.body;

    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
      });
      return;
    }

    // Check if user is a member of the group
    const isMember = await GroupModel.isMember(groupId, req.user.id);
    if (!isMember) {
      res.status(403).json({
        success: false,
        error: "Access denied. You must be a group member to settle the group.",
      });
      return;
    }

    // Get optimized settlement suggestions
    const suggestions = await BalanceService.getActiveSettlementSuggestions(groupId);

    if (suggestions.length === 0) {
      res.json({
        success: true,
        data: {
          settlements: [],
          message: "Group is already fully settled!",
        },
      });
      return;
    }

    // Create all suggested settlements in a transaction
    const settlements = await Promise.all(
      suggestions.map(async (suggestion) => {
        const settlementData = {
          fromUserRel: { connect: { id: suggestion.fromUser } },
          toUserRel: { connect: { id: suggestion.toUser } },
          amount: suggestion.amount,
          description: description || `Group settlement: ${suggestion.amount.toFixed(2)}`,
          status: 'PENDING' as const,
        };

        const settlement = await SettlementModel.create(settlementData);
        return SettlementModel.findWithDetails(settlement.id);
      })
    );

    // Get updated group settlement progress
    const progress = await BalanceService.getGroupSettlementProgress(groupId);
    const isFullySettled = await BalanceService.isGroupFullySettled(groupId);

    res.status(201).json({
      success: true,
      data: {
        settlements,
        progress,
        isFullySettled,
        message: `Created ${settlements.length} settlements to settle the group.`,
        optimization: {
          settlementsCreated: settlements.length,
          totalAmount: settlements.reduce((sum, s) => s ? sum + Number(s.amount) : sum, 0),
        },
      },
    });
  } catch (error) {
    console.error("Error settling group:", error);
    res.status(500).json({
      success: false,
      error: "Failed to settle group",
    });
  }
});

/**
 * POST /settlements/group/:groupId/complete-all
 * Mark all confirmed settlements in a group as completed
 */
router.post("/group/:groupId/complete-all", authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;

    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
      });
      return;
    }

    // Check if user is a member of the group
    const isMember = await GroupModel.isMember(groupId, req.user.id);
    if (!isMember) {
      res.status(403).json({
        success: false,
        error: "Access denied. You must be a group member.",
      });
      return;
    }

    // Get all confirmed settlements in the group where user is the payer
    const groupSettlements = await SettlementModel.findByGroupMembers(groupId);
    const userConfirmedSettlements = groupSettlements.filter(
      (s): s is NonNullable<typeof s> => s !== null && s.status === 'CONFIRMED' && s.fromUser === req.user!.id
    );

    if (userConfirmedSettlements.length === 0) {
      res.json({
        success: true,
        data: {
          completedSettlements: [],
          message: "No confirmed settlements found for you to complete.",
        },
      });
      return;
    }

    // Complete all confirmed settlements
    const completedSettlements = await Promise.all(
      userConfirmedSettlements.map(async (settlement) => {
        const updated = await SettlementModel.completeSettlement(settlement.id);
        return SettlementModel.findWithDetails(updated.id);
      })
    );

    // Get updated progress
    const progress = await BalanceService.getGroupSettlementProgress(groupId);
    const isFullySettled = await BalanceService.isGroupFullySettled(groupId);

    res.json({
      success: true,
      data: {
        completedSettlements,
        progress,
        isFullySettled,
        message: `Completed ${completedSettlements.length} settlements.`,
      },
    });
  } catch (error) {
    console.error("Error completing group settlements:", error);
    res.status(500).json({
      success: false,
      error: "Failed to complete group settlements",
    });
  }
});

export default router;
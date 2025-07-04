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
 * @swagger
 * /settlements:
 *   post:
 *     tags: [Settlements]
 *     summary: Create a new settlement
 *     description: Creates a new settlement between two users for debt resolution
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fromUser, toUser, amount]
 *             properties:
 *               fromUser:
 *                 type: string
 *                 pattern: '^c[a-z0-9]{24}$'
 *                 description: User ID of who is paying
 *                 example: clm123abc456def789ghi012k
 *               toUser:
 *                 type: string
 *                 pattern: '^c[a-z0-9]{24}$'
 *                 description: User ID of who is receiving payment
 *                 example: clm123abc456def789ghi012l
 *               amount:
 *                 type: number
 *                 format: decimal
 *                 minimum: 0.01
 *                 maximum: 999999.99
 *                 multipleOf: 0.01
 *                 description: Settlement amount
 *                 example: 50.25
 *               expenseIds:
 *                 type: array
 *                 description: Optional list of specific expense IDs being settled
 *                 items:
 *                   type: string
 *                   pattern: '^c[a-z0-9]{24}$'
 *                 example: ["clm123abc456def789ghi012m", "clm123abc456def789ghi012n"]
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 description: Optional description for the settlement
 *                 example: "Payment for dinner and movie expenses"
 *           examples:
 *             simple_settlement:
 *               summary: Simple settlement between users
 *               value:
 *                 fromUser: "clm123abc456def789ghi012k"
 *                 toUser: "clm123abc456def789ghi012l"
 *                 amount: 50.25
 *                 description: "Payment for shared expenses"
 *             expense_settlement:
 *               summary: Settlement for specific expenses
 *               value:
 *                 fromUser: "clm123abc456def789ghi012k"
 *                 toUser: "clm123abc456def789ghi012l"
 *                 amount: 75.50
 *                 expenseIds: ["clm123abc456def789ghi012m"]
 *                 description: "Settlement for dinner expense"
 *     responses:
 *       201:
 *         description: Settlement created successfully
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
 *                   example: "Settlement created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Settlement'
 *       400:
 *         description: Validation error or invalid settlement data
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
 *       403:
 *         description: Access denied - can only create settlements involving yourself
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
 * @swagger
 * /settlements/pending:
 *   get:
 *     tags: [Settlements]
 *     summary: Get pending settlements
 *     description: Retrieves all pending settlements requiring user action (confirmation, completion, or awaiting response)
 *     responses:
 *       200:
 *         description: Pending settlements retrieved successfully
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
 *                     needingConfirmation:
 *                       type: array
 *                       description: Settlements where user needs to confirm payment received
 *                       items:
 *                         $ref: '#/components/schemas/Settlement'
 *                     needingCompletion:
 *                       type: array
 *                       description: Settlements where user needs to mark as completed after paying
 *                       items:
 *                         $ref: '#/components/schemas/Settlement'
 *                     awaitingResponse:
 *                       type: array
 *                       description: Settlements where user is waiting for recipient to confirm
 *                       items:
 *                         $ref: '#/components/schemas/Settlement'
 *                     total:
 *                       type: integer
 *                       description: Total number of pending settlements
 *                       example: 3
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
 * @swagger
 * /settlements:
 *   get:
 *     tags: [Settlements]
 *     summary: Get user settlements
 *     description: Retrieves all settlements for the authenticated user with summary statistics
 *     responses:
 *       200:
 *         description: Settlements retrieved successfully
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
 *                     settlements:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Settlement'
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalCount:
 *                           type: integer
 *                           description: Total number of settlements
 *                           example: 15
 *                         totalSent:
 *                           type: number
 *                           format: decimal
 *                           description: Total amount sent by user
 *                           example: 250.75
 *                         totalReceived:
 *                           type: number
 *                           format: decimal
 *                           description: Total amount received by user
 *                           example: 300.50
 *                         netAmount:
 *                           type: number
 *                           format: decimal
 *                           description: Net amount (positive means user received more)
 *                           example: 49.75
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
 * @swagger
 * /settlements/{id}:
 *   get:
 *     tags: [Settlements]
 *     summary: Get settlement details
 *     description: Retrieves detailed information about a specific settlement
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^c[a-z0-9]{24}$'
 *         description: Unique identifier of the settlement
 *         example: clm123abc456def789ghi012j
 *     responses:
 *       200:
 *         description: Settlement details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Settlement'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Access denied - can only view settlements involving yourself
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Settlement not found
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
 * @swagger
 * /settlements/{id}:
 *   put:
 *     tags: [Settlements]
 *     summary: Update settlement
 *     description: Updates settlement details (only the settlement creator can update)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^c[a-z0-9]{24}$'
 *         description: Unique identifier of the settlement
 *         example: clm123abc456def789ghi012j
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *                 format: decimal
 *                 minimum: 0.01
 *                 maximum: 999999.99
 *                 multipleOf: 0.01
 *                 description: Updated settlement amount
 *                 example: 75.50
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 description: Updated description for the settlement
 *                 example: "Updated payment description"
 *           examples:
 *             update_amount:
 *               summary: Update only the amount
 *               value:
 *                 amount: 75.50
 *             update_description:
 *               summary: Update only the description
 *               value:
 *                 description: "Updated payment for shared dinner expenses"
 *             update_both:
 *               summary: Update both amount and description
 *               value:
 *                 amount: 85.25
 *                 description: "Corrected amount for dinner and drinks"
 *     responses:
 *       200:
 *         description: Settlement updated successfully
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
 *                   example: "Settlement updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Settlement'
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
 *       403:
 *         description: Access denied - only settlement creator can update
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Settlement not found
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
 * @swagger
 * /settlements/{id}:
 *   delete:
 *     tags: [Settlements]
 *     summary: Delete settlement
 *     description: Permanently deletes a settlement (only the settlement creator can delete)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^c[a-z0-9]{24}$'
 *         description: Unique identifier of the settlement
 *         example: clm123abc456def789ghi012j
 *     responses:
 *       200:
 *         description: Settlement deleted successfully
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
 *                   example: "Settlement deleted successfully"
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Access denied - only settlement creator can delete
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Settlement not found
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
 * @swagger
 * /settlements/between/{user1}/{user2}:
 *   get:
 *     tags: [Settlements]
 *     summary: Get settlements between two users
 *     description: Retrieves all settlements between two specific users with summary statistics
 *     parameters:
 *       - in: path
 *         name: user1
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^c[a-z0-9]{24}$'
 *         description: First user's unique identifier
 *         example: clm123abc456def789ghi012k
 *       - in: path
 *         name: user2
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^c[a-z0-9]{24}$'
 *         description: Second user's unique identifier
 *         example: clm123abc456def789ghi012l
 *     responses:
 *       200:
 *         description: Settlements between users retrieved successfully
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
 *                     settlements:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Settlement'
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalSettlements:
 *                           type: integer
 *                           description: Total number of settlements between the users
 *                           example: 5
 *                         totalFromUser1ToUser2:
 *                           type: number
 *                           format: decimal
 *                           description: Total amount settled from user1 to user2
 *                           example: 150.75
 *                         totalFromUser2ToUser1:
 *                           type: number
 *                           format: decimal
 *                           description: Total amount settled from user2 to user1
 *                           example: 75.25
 *                         netAmount:
 *                           type: number
 *                           format: decimal
 *                           description: Absolute net difference
 *                           example: 75.50
 *                         netDirection:
 *                           type: string
 *                           description: Description of settlement direction or balance
 *                           example: "user1 has settled $75.50 more to user2"
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Access denied - can only view settlements involving yourself
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
 * @swagger
 * /settlements/group/{groupId}:
 *   get:
 *     tags: [Settlements]
 *     summary: Get group settlements
 *     description: Retrieves all settlements for a specific group (only group members can access)
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
 *         description: Group settlements retrieved successfully
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
 *                     settlements:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Settlement'
 *                     group:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: clm123abc456def789ghi012j
 *                         name:
 *                           type: string
 *                           example: "Weekend Trip"
 *                         description:
 *                           type: string
 *                           example: "Mountain cabin getaway"
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalSettlements:
 *                           type: integer
 *                           description: Total number of settlements in the group
 *                           example: 8
 *                         totalAmount:
 *                           type: number
 *                           format: decimal
 *                           description: Total settlement amount in the group
 *                           example: 450.75
 *                         pendingSettlements:
 *                           type: integer
 *                           description: Number of pending settlements
 *                           example: 2
 *                         completedSettlements:
 *                           type: integer
 *                           description: Number of completed settlements
 *                           example: 6
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
 * @swagger
 * /settlements/{id}/confirm:
 *   post:
 *     tags: [Settlements]
 *     summary: Confirm settlement
 *     description: Confirms that payment was received (only the recipient can confirm)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^c[a-z0-9]{24}$'
 *         description: Unique identifier of the settlement
 *         example: clm123abc456def789ghi012j
 *     responses:
 *       200:
 *         description: Settlement confirmed successfully
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
 *                   example: "Settlement confirmed successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Settlement'
 *       400:
 *         description: Invalid settlement status for confirmation
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
 *       403:
 *         description: Access denied - only settlement recipient can confirm
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Settlement not found
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
 * @swagger
 * /settlements/{id}/complete:
 *   post:
 *     tags: [Settlements]
 *     summary: Complete settlement
 *     description: Marks settlement as completed after payment (only the payer can complete)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^c[a-z0-9]{24}$'
 *         description: Unique identifier of the settlement
 *         example: clm123abc456def789ghi012j
 *     responses:
 *       200:
 *         description: Settlement completed successfully
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
 *                   example: "Settlement completed successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Settlement'
 *       400:
 *         description: Invalid settlement status for completion
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
 *       403:
 *         description: Access denied - only settlement payer can complete
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Settlement not found
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
 * @swagger
 * /settlements/{id}/cancel:
 *   post:
 *     tags: [Settlements]
 *     summary: Cancel settlement
 *     description: Cancels a settlement (either party involved can cancel pending/confirmed settlements)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^c[a-z0-9]{24}$'
 *         description: Unique identifier of the settlement
 *         example: clm123abc456def789ghi012j
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *                 description: Optional reason for cancellation
 *                 example: "Payment method no longer available"
 *           examples:
 *             with_reason:
 *               summary: Cancel with reason
 *               value:
 *                 reason: "Unable to complete payment due to bank issues"
 *             without_reason:
 *               summary: Cancel without reason
 *               value: {}
 *     responses:
 *       200:
 *         description: Settlement cancelled successfully
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
 *                   example: "Settlement cancelled successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Settlement'
 *       400:
 *         description: Invalid settlement status for cancellation
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
 *       403:
 *         description: Access denied - can only cancel settlements involving yourself
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Settlement not found
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
 * @swagger
 * /settlements/group/{groupId}/settle-all:
 *   post:
 *     tags: [Settlements]
 *     summary: Settle all group balances
 *     description: Creates optimized settlements to settle all outstanding balances in a group with minimal transactions
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
 *       201:
 *         description: Group settlements created successfully
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
 *                   example: "3 settlements created to settle all group balances"
 *                 data:
 *                   type: object
 *                   properties:
 *                     settlements:
 *                       type: array
 *                       description: Created settlements
 *                       items:
 *                         $ref: '#/components/schemas/Settlement'
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalSettlements:
 *                           type: integer
 *                           description: Number of settlements created
 *                           example: 3
 *                         totalAmount:
 *                           type: number
 *                           format: decimal
 *                           description: Total amount being settled
 *                           example: 245.75
 *                         optimizationSavings:
 *                           type: integer
 *                           description: Number of transactions saved through optimization
 *                           example: 2
 *       400:
 *         description: No outstanding balances to settle or validation error
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
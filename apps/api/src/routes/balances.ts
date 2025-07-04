import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import { ExpenseModel } from "../models/Expense";
import { SettlementModel } from "../models/Settlement";
import { GroupModel } from "../models/Group";
import { BalanceService } from "../services/BalanceService";

const router: Router = Router();

/**
 * @swagger
 * /balances/group/{groupId}:
 *   get:
 *     tags: [Balances]
 *     summary: Get group balances
 *     description: Retrieves current balances for all members in a group including settlement suggestions and progress
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
 *         description: Group balances retrieved successfully
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
 *                     balances:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Balance'
 *                     suggestions:
 *                       type: array
 *                       description: Optimized settlement suggestions to minimize transactions
 *                       items:
 *                         type: object
 *                         properties:
 *                           fromUserId:
 *                             type: string
 *                             example: clm123abc456def789ghi012k
 *                           toUserId:
 *                             type: string
 *                             example: clm123abc456def789ghi012l
 *                           amount:
 *                             type: number
 *                             format: decimal
 *                             example: 25.50
 *                           description:
 *                             type: string
 *                             example: "Payment to settle balance"
 *                     progress:
 *                       type: object
 *                       properties:
 *                         totalOwed:
 *                           type: number
 *                           format: decimal
 *                           example: 150.75
 *                         totalSettled:
 *                           type: number
 *                           format: decimal
 *                           example: 100.25
 *                         pendingSettlements:
 *                           type: number
 *                           format: decimal
 *                           example: 25.50
 *                         isFullySettled:
 *                           type: boolean
 *                           example: false
 *                     groupId:
 *                       type: string
 *                       example: clm123abc456def789ghi012j
 *                     isFullySettled:
 *                       type: boolean
 *                       example: false
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
        error: "Access denied. You must be a group member to view balances.",
      });
      return;
    }

    // Calculate current balances including settlements
    const balances = await BalanceService.calculateGroupBalancesWithSettlements(groupId);

    // Get settlement suggestions based on outstanding balances
    const suggestions = await BalanceService.getActiveSettlementSuggestions(groupId);

    // Get settlement progress
    const progress = await BalanceService.getGroupSettlementProgress(groupId);

    res.json({
      success: true,
      data: {
        balances,
        suggestions,
        progress,
        groupId,
        isFullySettled: progress.isFullySettled,
      },
    });
  } catch (error) {
    console.error("Error fetching group balances:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch group balances",
    });
  }
});

/**
 * @swagger
 * /balances/user/{userId}:
 *   get:
 *     tags: [Balances]
 *     summary: Get user balances
 *     description: Retrieves user's balances across all groups they are a member of (users can only access their own balances)
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^c[a-z0-9]{24}$'
 *         description: Unique identifier of the user (must match authenticated user)
 *         example: clm123abc456def789ghi012k
 *     responses:
 *       200:
 *         description: User balances retrieved successfully
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
 *                     totalOwed:
 *                       type: number
 *                       format: decimal
 *                       description: Total amount user owes across all groups
 *                       example: 75.50
 *                     totalOwedTo:
 *                       type: number
 *                       format: decimal
 *                       description: Total amount owed to user across all groups
 *                       example: 125.25
 *                     netBalance:
 *                       type: number
 *                       format: decimal
 *                       description: Net balance (positive means user is owed money)
 *                       example: 49.75
 *                     groupBalances:
 *                       type: array
 *                       description: Balance breakdown by group
 *                       items:
 *                         type: object
 *                         properties:
 *                           group:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 example: clm123abc456def789ghi012j
 *                               name:
 *                                 type: string
 *                                 example: "Weekend Trip"
 *                               description:
 *                                 type: string
 *                                 example: "Mountain cabin getaway"
 *                           balances:
 *                             type: array
 *                             items:
 *                               $ref: '#/components/schemas/Balance'
 *                           suggestions:
 *                             type: array
 *                             description: Settlement suggestions for this group
 *                             items:
 *                               type: object
 *                               properties:
 *                                 fromUserId:
 *                                   type: string
 *                                 toUserId:
 *                                   type: string
 *                                 amount:
 *                                   type: number
 *                                   format: decimal
 *                                 description:
 *                                   type: string
 *                           netGroupBalance:
 *                             type: number
 *                             format: decimal
 *                             description: User's net balance in this group
 *                             example: 25.50
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Access denied - can only view own balances
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
router.get("/user/:userId", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
      });
      return;
    }

    // Users can only view their own balances
    if (req.user.id !== userId) {
      res.status(403).json({
        success: false,
        error: "Access denied. You can only view your own balances.",
      });
      return;
    }

    // Get all groups user is a member of
    const userGroups = await GroupModel.findByUserId(userId);
    
    // Calculate balances for each group including settlements
    const allBalances = await Promise.all(
      userGroups.map(async (group) => {
        const balances = await BalanceService.calculateGroupBalancesWithSettlements(group.id);
        const suggestions = await BalanceService.getActiveSettlementSuggestions(group.id);
        const progress = await BalanceService.getGroupSettlementProgress(group.id);
        
        // Filter to only balances involving the user
        const userBalances = balances.filter(
          (balance) => balance.fromUser === userId || balance.toUser === userId
        );
        
        const userSuggestions = suggestions.filter(
          (suggestion) => suggestion.fromUser === userId || suggestion.toUser === userId
        );

        return {
          group: {
            id: group.id,
            name: group.name,
          },
          balances: userBalances,
          suggestions: userSuggestions,
          progress,
          isFullySettled: progress.isFullySettled,
        };
      })
    );

    // Calculate summary statistics
    let totalOwed = 0;
    let totalOwedTo = 0;
    
    allBalances.forEach(({ balances }) => {
      balances.forEach((balance) => {
        if (balance.fromUser === userId) {
          totalOwed += balance.amount;
        } else if (balance.toUser === userId) {
          totalOwedTo += balance.amount;
        }
      });
    });

    res.json({
      success: true,
      data: {
        userId,
        summary: {
          totalOwed: Math.round(totalOwed * 100) / 100,
          totalOwedTo: Math.round(totalOwedTo * 100) / 100,
          netBalance: Math.round((totalOwedTo - totalOwed) * 100) / 100,
        },
        groups: allBalances,
      },
    });
  } catch (error) {
    console.error("Error fetching user balances:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch user balances",
    });
  }
});

/**
 * @swagger
 * /balances/between/{user1}/{user2}:
 *   get:
 *     tags: [Balances]
 *     summary: Get balances between two users
 *     description: Retrieves balances between two specific users across all their shared groups
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
 *         description: Balances between users retrieved successfully
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
 *                     user1:
 *                       type: string
 *                       example: clm123abc456def789ghi012k
 *                     user2:
 *                       type: string
 *                       example: clm123abc456def789ghi012l
 *                     netBalance:
 *                       type: object
 *                       properties:
 *                         amount:
 *                           type: number
 *                           format: decimal
 *                           description: Net amount owed between the users
 *                           example: 25.50
 *                         direction:
 *                           type: string
 *                           description: Who owes whom or if they are even
 *                           example: "user1 owes user2"
 *                           enum: ["Even", "user1 owes user2", "user2 owes user1"]
 *                     groups:
 *                       type: array
 *                       description: Breakdown by shared groups where balances exist
 *                       items:
 *                         type: object
 *                         properties:
 *                           group:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 example: clm123abc456def789ghi012j
 *                               name:
 *                                 type: string
 *                                 example: "Weekend Trip"
 *                           balances:
 *                             type: array
 *                             items:
 *                               $ref: '#/components/schemas/Balance'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Access denied - can only view balances involving yourself
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

    // Users can only view balances involving themselves
    if (req.user.id !== user1 && req.user.id !== user2) {
      res.status(403).json({
        success: false,
        error: "Access denied. You can only view balances involving yourself.",
      });
      return;
    }

    // Find all groups where both users are members
    const user1Groups = await GroupModel.findByUserId(user1);
    const user2Groups = await GroupModel.findByUserId(user2);
    
    const sharedGroups = user1Groups.filter((group1) =>
      user2Groups.some((group2) => group2.id === group1.id)
    );

    // Calculate balances between the two users in each shared group
    const groupBalances = await Promise.all(
      sharedGroups.map(async (group) => {
        const allBalances = await ExpenseModel.calculateGroupBalances(group.id);
        
        // Filter to only balances between the two users
        const userBalances = allBalances.filter(
          (balance) =>
            (balance.fromUser === user1 && balance.toUser === user2) ||
            (balance.fromUser === user2 && balance.toUser === user1)
        );

        return {
          group: {
            id: group.id,
            name: group.name,
          },
          balances: userBalances,
        };
      })
    );

    // Calculate net balance between the two users
    let netAmount = 0;
    let netDirection = "";
    
    groupBalances.forEach(({ balances }) => {
      balances.forEach((balance) => {
        if (balance.fromUser === user1 && balance.toUser === user2) {
          netAmount += balance.amount;
        } else if (balance.fromUser === user2 && balance.toUser === user1) {
          netAmount -= balance.amount;
        }
      });
    });

    if (netAmount > 0) {
      netDirection = `${user1} owes ${user2}`;
    } else if (netAmount < 0) {
      netDirection = `${user2} owes ${user1}`;
      netAmount = Math.abs(netAmount);
    } else {
      netDirection = "Even";
    }

    res.json({
      success: true,
      data: {
        user1,
        user2,
        netBalance: {
          amount: Math.round(netAmount * 100) / 100,
          direction: netDirection,
        },
        groups: groupBalances.filter(({ balances }) => balances.length > 0),
      },
    });
  } catch (error) {
    console.error("Error fetching balances between users:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch balances between users",
    });
  }
});

export default router;
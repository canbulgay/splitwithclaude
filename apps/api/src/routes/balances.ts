import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import { ExpenseModel } from "../models/Expense";
import { SettlementModel } from "../models/Settlement";
import { GroupModel } from "../models/Group";
import { BalanceService } from "../services/BalanceService";

const router: Router = Router();

/**
 * GET /balances/group/:groupId
 * Get current balances for a group
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
 * GET /balances/user/:userId
 * Get user's balances across all groups
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
 * GET /balances/between/:user1/:user2
 * Get balances between two specific users across all shared groups
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
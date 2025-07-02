import request from "supertest";
import app from "../test-server";
import { AuthService } from "../../services/AuthService";
import { GroupModel } from "../../models/Group";
import { ExpenseModel } from "../../models/Expense";
import { Role } from "@prisma/client";
import { resetTestData, testData } from "../__mocks__/prisma";

describe("Expenses API", () => {
  let userToken: string;
  let memberToken: string;
  let nonMemberToken: string;
  let userId: string;
  let memberUserId: string;
  let nonMemberUserId: string;
  let groupId: string;
  let expenseId: string;

  beforeAll(async () => {
    // Reset test data
    resetTestData();

    // Create test users
    const user1 = await AuthService.register({
      email: "user1@test.com",
      name: "User 1",
      password: "Password123!",
    });
    userToken = user1.token;
    userId = user1.user.id;

    const user2 = await AuthService.register({
      email: "member@test.com",
      name: "Member User",
      password: "Password123!",
    });
    memberToken = user2.token;
    memberUserId = user2.user.id;

    const user3 = await AuthService.register({
      email: "nonmember@test.com",
      name: "Non-Member User",
      password: "Password123!",
    });
    nonMemberToken = user3.token;
    nonMemberUserId = user3.user.id;

    // Create test group
    const group = await GroupModel.createWithAdmin(
      { name: "Test Group", description: "Test group for expenses" },
      userId
    );
    groupId = group.id;

    // Add member to group
    await GroupModel.addMember(groupId, memberUserId, Role.MEMBER);

    // Create test expense
    const expense = await ExpenseModel.createWithSplits(
      {
        group: { connect: { id: groupId } },
        amount: 50.0,
        description: "Test Expense",
        payer: { connect: { id: userId } },
      },
      [
        { userId: userId, amountOwed: 25.0 },
        { userId: memberUserId, amountOwed: 25.0 },
      ]
    );
    expenseId = expense.id;
  });

  afterAll(async () => {
    // Clean up test data
    resetTestData();
  });

  describe("POST /api/v1/expenses", () => {
    it("should create a new expense with equal splits", async () => {
      const expenseData = {
        groupId,
        amount: 100.0,
        description: "Dinner at restaurant",
        paidBy: userId,
        splits: [
          { userId: userId, amount: 50.0 },
          { userId: memberUserId, amount: 50.0 },
        ],
      };

      const response = await request(app)
        .post("/api/v1/expenses")
        .set("Authorization", `Bearer ${userToken}`)
        .send(expenseData);


      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.amount).toBe(100.0);
      expect(response.body.data.description).toBe("Dinner at restaurant");
      expect(response.body.data.payer.id).toBe(userId);
      expect(response.body.data.splits).toHaveLength(2);
    });

    it("should create a new expense with unequal splits", async () => {
      const expenseData = {
        groupId,
        amount: 100.0,
        description: "Groceries",
        paidBy: memberUserId,
        splits: [
          { userId: userId, amount: 30.0 },
          { userId: memberUserId, amount: 70.0 },
        ],
      };

      const response = await request(app)
        .post("/api/v1/expenses")
        .set("Authorization", `Bearer ${memberToken}`)
        .send(expenseData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.amount).toBe(100.0);
      expect(response.body.data.payer.id).toBe(memberUserId);
      expect(response.body.data.splits).toHaveLength(2);
    });

    it("should reject expense if split amounts don't equal total", async () => {
      const expenseData = {
        groupId,
        amount: 100.0,
        description: "Invalid split",
        paidBy: userId,
        splits: [
          { userId: userId, amount: 30.0 },
          { userId: memberUserId, amount: 50.0 }, // Total: 80, should be 100
        ],
      };

      await request(app)
        .post("/api/v1/expenses")
        .set("Authorization", `Bearer ${userToken}`)
        .send(expenseData)
        .expect(400);
    });

    it("should reject expense if payer is not a group member", async () => {
      const expenseData = {
        groupId,
        amount: 50.0,
        description: "Invalid payer",
        paidBy: nonMemberUserId,
        splits: [
          { userId: userId, amount: 25.0 },
          { userId: memberUserId, amount: 25.0 },
        ],
      };

      await request(app)
        .post("/api/v1/expenses")
        .set("Authorization", `Bearer ${userToken}`)
        .send(expenseData)
        .expect(400);
    });

    it("should reject expense if split user is not a group member", async () => {
      const expenseData = {
        groupId,
        amount: 50.0,
        description: "Invalid split user",
        paidBy: userId,
        splits: [
          { userId: userId, amount: 25.0 },
          { userId: nonMemberUserId, amount: 25.0 }, // Non-member
        ],
      };

      await request(app)
        .post("/api/v1/expenses")
        .set("Authorization", `Bearer ${userToken}`)
        .send(expenseData)
        .expect(400);
    });

    it("should deny access to non-group members", async () => {
      const expenseData = {
        groupId,
        amount: 50.0,
        description: "Unauthorized expense",
        paidBy: userId,
        splits: [
          { userId: userId, amount: 25.0 },
          { userId: memberUserId, amount: 25.0 },
        ],
      };

      await request(app)
        .post("/api/v1/expenses")
        .set("Authorization", `Bearer ${nonMemberToken}`)
        .send(expenseData)
        .expect(403);
    });

    it("should require authentication", async () => {
      const expenseData = {
        groupId,
        amount: 50.0,
        description: "Unauthenticated expense",
        paidBy: userId,
        splits: [
          { userId: userId, amount: 25.0 },
          { userId: memberUserId, amount: 25.0 },
        ],
      };

      await request(app).post("/api/v1/expenses").send(expenseData).expect(401);
    });

    it("should validate required fields", async () => {
      await request(app)
        .post("/api/v1/expenses")
        .set("Authorization", `Bearer ${userToken}`)
        .send({})
        .expect(400);
    });
  });

  describe("GET /api/v1/expenses/:expenseId", () => {
    it("should get expense details for group members", async () => {
      const response = await request(app)
        .get(`/api/v1/expenses/${expenseId}`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(expenseId);
      expect(response.body.data.amount).toBe(50.0);
      expect(response.body.data.description).toBe("Test Expense");
      expect(response.body.data.splits).toHaveLength(2);
    });

    it("should deny access to non-group members", async () => {
      await request(app)
        .get(`/api/v1/expenses/${expenseId}`)
        .set("Authorization", `Bearer ${nonMemberToken}`)
        .expect(403);
    });

    it("should return 404 for non-existent expense", async () => {
      await request(app)
        .get("/api/v1/expenses/clm123456789")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(404);
    });

    it("should require authentication", async () => {
      await request(app).get(`/api/v1/expenses/${expenseId}`).expect(401);
    });
  });

  describe("PUT /api/v1/expenses/:expenseId", () => {
    it("should update expense description", async () => {
      const updateData = {
        description: "Updated expense description",
      };

      const response = await request(app)
        .put(`/api/v1/expenses/${expenseId}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.description).toBe(
        "Updated expense description"
      );
    });

    it("should update expense amount", async () => {
      const updateData = {
        amount: 75.0,
      };

      const response = await request(app)
        .put(`/api/v1/expenses/${expenseId}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.amount).toBe(75.0);
    });

    it("should update expense with new splits", async () => {
      const updateData = {
        amount: 60.0,
        splits: [
          { userId: userId, amount: 40.0 },
          { userId: memberUserId, amount: 20.0 },
        ],
      };

      const response = await request(app)
        .put(`/api/v1/expenses/${expenseId}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.amount).toBe(60.0);
      expect(response.body.data.splits).toHaveLength(2);

      const userSplit = response.body.data.splits.find(
        (s: any) => s.userId === userId
      );
      expect(userSplit.amountOwed).toBe(40.0);
    });

    it("should reject update if split amounts don't equal total", async () => {
      const updateData = {
        amount: 100.0,
        splits: [
          { userId: userId, amount: 30.0 },
          { userId: memberUserId, amount: 50.0 }, // Total: 80, should be 100
        ],
      };

      await request(app)
        .put(`/api/v1/expenses/${expenseId}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send(updateData)
        .expect(400);
    });

    it("should deny access to non-group members", async () => {
      const updateData = {
        description: "Unauthorized update",
      };

      await request(app)
        .put(`/api/v1/expenses/${expenseId}`)
        .set("Authorization", `Bearer ${nonMemberToken}`)
        .send(updateData)
        .expect(403);
    });

    it("should return 404 for non-existent expense", async () => {
      const updateData = {
        description: "Non-existent expense",
      };

      await request(app)
        .put("/api/v1/expenses/clm123456789")
        .set("Authorization", `Bearer ${userToken}`)
        .send(updateData)
        .expect(404);
    });
  });

  describe("DELETE /api/v1/expenses/:expenseId", () => {
    let expenseToDelete: string;

    beforeEach(async () => {
      // Create a new expense for each delete test
      const expense = await ExpenseModel.createWithSplits(
        {
          group: { connect: { id: groupId } },
          amount: 30.0,
          description: "Expense to delete",
          payer: { connect: { id: userId } },
        },
        [
          { userId: userId, amountOwed: 15.0 },
          { userId: memberUserId, amountOwed: 15.0 },
        ]
      );
      expenseToDelete = expense.id;
    });

    it("should delete expense for group members", async () => {
      const response = await request(app)
        .delete(`/api/v1/expenses/${expenseToDelete}`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Expense deleted successfully");

      // Verify expense is deleted
      const deletedExpense = await ExpenseModel.findById(expenseToDelete);
      expect(deletedExpense).toBeNull();
    });

    it("should deny access to non-group members", async () => {
      await request(app)
        .delete(`/api/v1/expenses/${expenseToDelete}`)
        .set("Authorization", `Bearer ${nonMemberToken}`)
        .expect(403);
    });

    it("should return 404 for non-existent expense", async () => {
      await request(app)
        .delete("/api/v1/expenses/clm123456789")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(404);
    });

    it("should require authentication", async () => {
      await request(app)
        .delete(`/api/v1/expenses/${expenseToDelete}`)
        .expect(401);
    });
  });
});

import request from "supertest";
import app from "../test-server";
import { AuthService } from "../../services/AuthService";
import { GroupModel } from "../../models/Group";
import { UserModel } from "../../models/User";
import { Role } from "@prisma/client";
import { resetTestData, testData } from "../__mocks__/prisma";
import { log, error} from "console";

describe("Groups API", () => {
  let userToken: string;
  let adminToken: string;
  let memberToken: string;
  let userId: string;
  let adminUserId: string;
  let memberUserId: string;
  let groupId: string;
  let otherGroupId: string;
  let noMemberToken: string;
  let noMemberUserId: string;

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
      email: "admin@test.com",
      name: "Admin User",
      password: "Password123!",
    });
    adminToken = user2.token;
    adminUserId = user2.user.id;

    const user3 = await AuthService.register({
      email: "member@test.com",
      name: "Member User",
      password: "Password123!",
    });
    memberToken = user3.token;
    memberUserId = user3.user.id;

    const user4 = await AuthService.register({
      email: "no-member@test.com",
      name: "Non-Member User",
      password: "Password123!",
    });
    // This user will not be added to any group
    noMemberToken = user4.token;
    noMemberUserId = user4.user.id;

    // Create test groups
    const group1 = await GroupModel.createWithAdmin(
      { name: "Test Group 1", description: "First test group" },
      adminUserId
    );
    groupId = group1.id;

    const group2 = await GroupModel.createWithAdmin(
      { name: "Other Group", description: "Another test group" },
      userId
    );
    otherGroupId = group2.id;

    // Add member to first group
    await GroupModel.addMember(groupId, memberUserId, Role.MEMBER);

    // Add the creator as admin to the first group (this should happen automatically in createWithAdmin)
    await GroupModel.addMember(groupId, adminUserId, Role.ADMIN);

    // Add user1 as member to test membership
    await GroupModel.addMember(otherGroupId, userId, Role.ADMIN);
  });

  afterAll(async () => {
    // Clean up test data
    resetTestData();
  });

  describe("GET /api/v1/groups", () => {
    it("should get all groups for authenticated user", async () => {
      const response = await request(app)
        .get("/api/v1/groups")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      const group = response.body.data.find((g: any) => g.id === groupId);
      expect(group).toBeDefined();
      expect(group.name).toBe("Test Group 1");
    });

    it("should require authentication", async () => {
      await request(app).get("/api/v1/groups").expect(401);
    });
  });

  describe("POST /api/v1/groups", () => {
    it("should create a new group", async () => {
      const groupData = {
        name: "New Test Group",
        description: "A new group for testing",
      };

      const response = await request(app)
        .post("/api/v1/groups")
        .set("Authorization", `Bearer ${userToken}`)
        .send(groupData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(groupData.name);
      expect(response.body.data.description).toBe(groupData.description);
      expect(response.body.data.createdBy).toBe(userId);
      expect(response.body.data.members).toHaveLength(1);
      expect(response.body.data.members[0].role).toBe(Role.ADMIN);
    });

    it("should validate required fields", async () => {
      await request(app)
        .post("/api/v1/groups")
        .set("Authorization", `Bearer ${userToken}`)
        .send({})
        .expect(400);
    });

    it("should require authentication", async () => {
      await request(app)
        .post("/api/v1/groups")
        .send({ name: "Test Group" })
        .expect(401);
    });
  });

  describe("GET /api/v1/groups/:groupId", () => {
    it("should get group details for members", async () => {
      const response = await request(app)
        .get(`/api/v1/groups/${groupId}`)
        .set("Authorization", `Bearer ${memberToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(groupId);
      expect(response.body.data.name).toBe("Test Group 1");
      expect(response.body.data.members).toHaveLength(2);
    });

    it("should deny access to non-members", async () => {
      await request(app)
        .get(`/api/v1/groups/${groupId}`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(403);
    });

    // it("should return 404 for non-existent group", async () => {
    //   await request(app)
    //     .get("/api/v1/groups/non-existent-id")
    //     .set("Authorization", `Bearer ${adminToken}`)
    //     .expect(404);
    // });
  });

  describe("PUT /api/v1/groups/:groupId", () => {
    it("should update group details for admins", async () => {
      const updateData = {
        name: "Updated Group Name",
        description: "Updated description",
      };

      const response = await request(app)
        .put(`/api/v1/groups/${groupId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.description).toBe(updateData.description);
    });

    it("should deny access to non-admins", async () => {
      await request(app)
        .put(`/api/v1/groups/${groupId}`)
        .set("Authorization", `Bearer ${memberToken}`)
        .send({ name: "Unauthorized Update" })
        .expect(403);
    });
  });

  describe("POST /api/v1/groups/:groupId/members", () => {
    it("should add member by email for admins", async () => {
      const response = await request(app)
        .post(`/api/v1/groups/${groupId}/members`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ email: "user1@test.com", role: Role.MEMBER })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.members).toHaveLength(3);
    });

    it("should not add existing members", async () => {
      await request(app)
        .post(`/api/v1/groups/${groupId}/members`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ email: "member@test.com" })
        .expect(400);
    });

    it("should deny access to non-admins", async () => {
      await request(app)
        .post(`/api/v1/groups/${groupId}/members`)
        .set("Authorization", `Bearer ${memberToken}`)
        .send({ email: "user1@test.com" })
        .expect(403);
    });

    it("should return 404 for non-existent user", async () => {
      await request(app)
        .post(`/api/v1/groups/${groupId}/members`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ email: "nonexistent@test.com" })
        .expect(404);
    });
  });

  describe("PUT /api/v1/groups/:groupId/members/:userId/role", () => {
    it("should update member role for admins", async () => {
      const response = await request(app)
        .put(`/api/v1/groups/${groupId}/members/${memberUserId}/role`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ role: Role.ADMIN })
        .expect(200);

      expect(response.body.success).toBe(true);

      const updatedMember = response.body.data.members.find(
        (m: any) => m.userId === memberUserId
      );
      expect(updatedMember.role).toBe(Role.ADMIN);
    });

    it("should not allow removing the last admin", async () => {
      // First make member an admin, then try to demote the original admin
      await GroupModel.updateMemberRole(groupId, memberUserId, Role.ADMIN);

      await request(app)
        .put(`/api/v1/groups/${groupId}/members/${adminUserId}/role`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ role: Role.MEMBER })
        .expect(200); // Should succeed since there's another admin

      // Now try to demote the last admin (using memberToken since memberUser is now an admin)
      await request(app)
        .put(`/api/v1/groups/${groupId}/members/${memberUserId}/role`)
        .set("Authorization", `Bearer ${memberToken}`)
        .send({ role: Role.MEMBER })
        .expect(400); // Should fail
    });
  });

  describe("DELETE /api/v1/groups/:groupId/members/:userId", () => {
    it("should allow self-removal", async () => {
      const response = await request(app)
        .delete(`/api/v1/groups/${groupId}/members/${userId}`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it("should allow admin to remove members", async () => {
      // Re-add user first
      await GroupModel.addMember(groupId, userId, Role.MEMBER);

      // Note: After previous test, memberUserId is now an admin, adminUserId is now a member
      const response = await request(app)
        .delete(`/api/v1/groups/${groupId}/members/${userId}`)
        .set("Authorization", `Bearer ${memberToken}`) // memberToken is now admin
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it("should not allow non-admins to remove others", async () => {
      // Note: After previous tests, adminUserId is now a member (demoted), memberUserId is admin
      // So adminToken (non-admin) trying to remove memberUserId (admin) should fail with 403
      await request(app)
        .delete(`/api/v1/groups/${groupId}/members/${memberUserId}`)
        .set("Authorization", `Bearer ${adminToken}`) // adminToken is now non-admin
        .expect(403);
    });
  });

  describe("DELETE /api/v1/groups/:groupId", () => {
    it("should delete group for admins", async () => {
      // Create a new group for deletion test
      const testGroup = await GroupModel.createWithAdmin(
        { name: "Group to Delete" },
        adminUserId
      );

      const response = await request(app)
        .delete(`/api/v1/groups/${testGroup.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify group is deleted
      const deletedGroup = await GroupModel.findById(testGroup.id);
      expect(deletedGroup).toBeNull();
    });

    it("should deny access to non-admins", async () => {
      await request(app)
        .delete(`/api/v1/groups/${otherGroupId}`)
        .set("Authorization", `Bearer ${memberToken}`)
        .expect(403);
    });
  });

  describe("GET /api/v1/groups/:groupId/expenses", () => {
    it("should get group expenses for members", async () => {
      const response = await request(app)
        .get(`/api/v1/groups/${groupId}/expenses`)
        .set("Authorization", `Bearer ${memberToken}`);

      error("DEBUG - Full response:", {
        status: response.status,
        headers: response.headers,
        body: response.body
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.group).toBeDefined();
      expect(response.body.data.expenses).toBeDefined();
      expect(Array.isArray(response.body.data.expenses)).toBe(true);
    });

    it("should deny access to non-members", async () => {
      await request(app)
        .get(`/api/v1/groups/${groupId}/expenses`)
        .set("Authorization", `Bearer ${noMemberToken}`)
        .expect(403);
    });
  });
});

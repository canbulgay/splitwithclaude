import apiClient from "@/api";

export interface CreateGroupRequest {
  name: string;
  description?: string;
}

export interface UpdateGroupRequest {
  name?: string;
  description?: string;
}

export interface InviteUserRequest {
  email: string;
  role?: "member" | "admin";
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  creator: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
  members: Array<{
    userId: string;
    role: "member" | "admin";
    joinedAt: string;
    user: {
      id: string;
      name: string;
      email: string;
      avatarUrl?: string;
    };
  }>;
  _count?: {
    expenses: number;
    members: number;
  };
}

export interface GroupBalance {
  userId: string;
  balance: number;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
}

export interface GroupSummary {
  group: Group;
  balances: GroupBalance[];
  totalExpenses: number;
  userBalance: number;
}

export const groupApi = {
  /**
   * Get all groups for the current user
   */
  async getUserGroups(): Promise<Group[]> {
    const response = await apiClient.get("/groups");
    return response.data.data;
  },

  /**
   * Create a new group
   */
  async create(data: CreateGroupRequest): Promise<Group> {
    const response = await apiClient.post("/groups", data);
    return response.data.data;
  },

  /**
   * Get group by ID with full details
   */
  async getById(groupId: string): Promise<GroupSummary> {
    const response = await apiClient.get(`/groups/${groupId}`);
    return response.data.data;
  },

  /**
   * Update group
   */
  async update(groupId: string, data: UpdateGroupRequest): Promise<Group> {
    const response = await apiClient.put(`/groups/${groupId}`, data);
    return response.data.data;
  },

  /**
   * Delete group
   */
  async delete(groupId: string): Promise<void> {
    await apiClient.delete(`/groups/${groupId}`);
  },

  /**
   * Invite user to group
   */
  async inviteUser(groupId: string, data: InviteUserRequest): Promise<void> {
    await apiClient.post(`/groups/${groupId}/invite`, data);
  },

  /**
   * Remove user from group
   */
  async removeUser(groupId: string, userId: string): Promise<void> {
    await apiClient.delete(`/groups/${groupId}/members/${userId}`);
  },

  /**
   * Leave group
   */
  async leaveGroup(groupId: string): Promise<void> {
    await apiClient.post(`/groups/${groupId}/leave`);
  },

  /**
   * Update user role in group
   */
  async updateUserRole(
    groupId: string,
    userId: string,
    role: "member" | "admin"
  ): Promise<void> {
    await apiClient.put(`/groups/${groupId}/members/${userId}`, { role });
  },

  /**
   * Get group balances
   */
  async getBalances(groupId: string): Promise<GroupBalance[]> {
    const response = await apiClient.get(`/groups/${groupId}/balances`);
    return response.data.data;
  },

  /**
   * Settle balance between users
   */
  async settleBalance(
    groupId: string,
    data: {
      fromUserId: string;
      toUserId: string;
      amount: number;
    }
  ): Promise<void> {
    await apiClient.post(`/groups/${groupId}/settle`, data);
  },
};
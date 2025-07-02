import apiClient from ".";

export interface Balance {
  fromUser: string;
  toUser: string;
  amount: number;
}

export interface SettlementSuggestion {
  fromUser: string;
  toUser: string;
  amount: number;
}

export interface GroupBalanceResponse {
  balances: Balance[];
  suggestions: SettlementSuggestion[];
  groupId: string;
}

export interface UserBalanceSummary {
  totalOwed: number;
  totalOwedTo: number;
  netBalance: number;
}

export interface UserBalanceResponse {
  userId: string;
  summary: UserBalanceSummary;
  groups: Array<{
    group: {
      id: string;
      name: string;
    };
    balances: Balance[];
    suggestions: SettlementSuggestion[];
  }>;
}

export interface UserPairBalanceResponse {
  user1: string;
  user2: string;
  netBalance: {
    amount: number;
    direction: string;
  };
  groups: Array<{
    group: {
      id: string;
      name: string;
    };
    balances: Balance[];
  }>;
}

export const balancesApi = {
  /**
   * Get current balances for a group
   */
  async getGroupBalances(groupId: string): Promise<GroupBalanceResponse> {
    const response = await apiClient.get(`/balances/group/${groupId}`);
    return response.data.data;
  },

  /**
   * Get user's balances across all groups
   */
  async getUserBalances(userId: string): Promise<UserBalanceResponse> {
    const response = await apiClient.get(`/balances/user/${userId}`);
    return response.data.data;
  },

  /**
   * Get balances between two specific users
   */
  async getBalancesBetweenUsers(
    user1: string,
    user2: string
  ): Promise<UserPairBalanceResponse> {
    const response = await apiClient.get(`/balances/between/${user1}/${user2}`);
    return response.data.data;
  },
};

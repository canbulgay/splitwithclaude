import apiClient from ".";

export interface Settlement {
  id: string;
  fromUser: string;
  toUser: string;
  amount: number;
  description?: string;
  settledAt: string;
  fromUserRel?: {
    id: string;
    name: string;
    email: string;
  };
  toUserRel?: {
    id: string;
    name: string;
    email: string;
  };
  expenses?: Array<{
    expense: {
      id: string;
      description: string;
      amount: number;
      group: {
        id: string;
        name: string;
      };
    };
  }>;
}

export interface SettlementSuggestion {
  fromUser: string;
  toUser: string;
  amount: number;
}

export interface CreateSettlementData {
  fromUser: string;
  toUser: string;
  amount: number;
  description?: string;
  expenseIds?: string[];
}

export interface UpdateSettlementData {
  amount?: number;
  description?: string;
}

export interface SettlementSummary {
  totalCount: number;
  totalSent: number;
  totalReceived: number;
  netAmount: number;
}

export interface BetweenUsersSummary {
  totalSettlements: number;
  totalFromUser1ToUser2: number;
  totalFromUser2ToUser1: number;
  netAmount: number;
  netDirection: string;
}

export interface SettlementOptimization {
  currentTransactions: number;
  optimizedTransactions: number;
  transactionReduction: number;
  percentageReduction: number;
}

class SettlementsAPI {
  /**
   * Create a new settlement
   */
  async createSettlement(data: CreateSettlementData): Promise<Settlement> {
    const response = await apiClient.post("/settlements", data);
    return response.data;
  }

  /**
   * Get settlements for the authenticated user
   */
  async getUserSettlements(): Promise<{
    settlements: Settlement[];
    summary: SettlementSummary;
  }> {
    const response = await apiClient.get("/settlements");
    return response.data;
  }

  /**
   * Get a specific settlement by ID
   */
  async getSettlement(id: string): Promise<Settlement> {
    const response = await apiClient.get(`/settlements/${id}`);
    return response.data;
  }

  /**
   * Update a settlement
   */
  async updateSettlement(
    id: string,
    data: UpdateSettlementData
  ): Promise<Settlement> {
    const response = await apiClient.put(`/settlements/${id}`, data);
    return response.data;
  }

  /**
   * Delete a settlement
   */
  async deleteSettlement(id: string): Promise<void> {
    await apiClient.delete(`/settlements/${id}`);
  }

  /**
   * Get settlements between two users
   */
  async getSettlementsBetweenUsers(
    user1Id: string,
    user2Id: string
  ): Promise<{
    settlements: Settlement[];
    summary: BetweenUsersSummary;
  }> {
    const response = await apiClient.get(
      `/settlements/between/${user1Id}/${user2Id}`
    );
    return response.data;
  }

  /**
   * Get settlements for a specific group
   */
  async getGroupSettlements(groupId: string): Promise<{
    settlements: Settlement[];
    groupId: string;
    summary: {
      totalSettlements: number;
      totalAmount: number;
    };
  }> {
    const response = await apiClient.get(`/settlements/group/${groupId}`);
    return response.data;
  }

  /**
   * Get settlement suggestions for a group
   */
  async getSettlementSuggestions(groupId: string): Promise<{
    suggestions: SettlementSuggestion[];
    currentBalances: Array<{
      fromUser: string;
      toUser: string;
      amount: number;
    }>;
    optimization: SettlementOptimization;
  }> {
    const response = await apiClient.get(`/settlements/suggestions/${groupId}`);
    return response.data;
  }
}

export const settlementsAPI = new SettlementsAPI();

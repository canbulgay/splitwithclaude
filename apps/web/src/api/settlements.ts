import apiClient from ".";

export type SettlementStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

export interface Settlement {
  id: string;
  fromUser: string;
  toUser: string;
  amount: number;
  description?: string;
  status: SettlementStatus;
  createdAt: string;
  confirmedAt?: string;
  completedAt?: string;
  settledAt: string; // Deprecated, keeping for backward compatibility
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

  /**
   * Get pending settlements requiring action
   */
  async getPendingSettlements(): Promise<{
    needingConfirmation: Settlement[];
    needingCompletion: Settlement[];
    awaitingResponse: Settlement[];
    total: number;
  }> {
    const response = await apiClient.get("/settlements/pending");
    return response.data;
  }

  /**
   * Confirm settlement (recipient confirms payment received)
   */
  async confirmSettlement(id: string): Promise<Settlement> {
    const response = await apiClient.post(`/settlements/${id}/confirm`);
    return response.data;
  }

  /**
   * Complete settlement (payer marks as paid)
   */
  async completeSettlement(id: string): Promise<Settlement> {
    const response = await apiClient.post(`/settlements/${id}/complete`);
    return response.data;
  }

  /**
   * Cancel settlement
   */
  async cancelSettlement(id: string, reason?: string): Promise<Settlement> {
    const response = await apiClient.post(`/settlements/${id}/cancel`, { reason });
    return response.data;
  }

  /**
   * Settle entire group with optimized settlements
   */
  async settleGroup(groupId: string, description?: string): Promise<{
    settlements: Settlement[];
    progress: {
      totalExpenseAmount: number;
      settledAmount: number;
      outstandingAmount: number;
      progressPercentage: number;
      isFullySettled: boolean;
    };
    isFullySettled: boolean;
    message: string;
  }> {
    const response = await apiClient.post(`/settlements/group/${groupId}/settle-all`, { description });
    return response.data;
  }

  /**
   * Complete all confirmed settlements for a group
   */
  async completeGroupSettlements(groupId: string): Promise<{
    completedSettlements: Settlement[];
    progress: {
      totalExpenseAmount: number;
      settledAmount: number;
      outstandingAmount: number;
      progressPercentage: number;
      isFullySettled: boolean;
    };
    isFullySettled: boolean;
    message: string;
  }> {
    const response = await apiClient.post(`/settlements/group/${groupId}/complete-all`);
    return response.data;
  }
}

export const settlementsAPI = new SettlementsAPI();

import apiClient from ".";
import { ExpenseCategory } from "@splitwise/shared";

export interface CreateExpenseRequest {
  groupId: string;
  amount: number;
  description: string;
  category: ExpenseCategory;
  paidBy: string;
  splits: Array<{
    userId: string;
    amount: number;
  }>;
}

export interface UpdateExpenseRequest {
  amount?: number;
  description?: string;
  category?: ExpenseCategory;
  paidBy?: string;
  splits?: Array<{
    userId: string;
    amount: number;
  }>;
}

export interface Expense {
  id: string;
  groupId: string;
  amount: number;
  description: string;
  category: ExpenseCategory;
  paidBy: string;
  createdAt: string;
  updatedAt: string;
  payer: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
  group: {
    id: string;
    name: string;
    description?: string;
  };
  splits: Array<{
    userId: string;
    amountOwed: number;
    user: {
      id: string;
      name: string;
      email: string;
      avatarUrl?: string;
    };
  }>;
}

export const expenseApi = {
  /**
   * Create a new expense
   */
  async create(data: CreateExpenseRequest): Promise<Expense> {
    const response = await apiClient.post("/expenses", data);
    return response.data.data;
  },

  /**
   * Get expense by ID
   */
  async getById(expenseId: string): Promise<Expense> {
    const response = await apiClient.get(`/expenses/${expenseId}`);
    return response.data.data;
  },

  /**
   * Update expense
   */
  async update(
    expenseId: string,
    data: UpdateExpenseRequest
  ): Promise<Expense> {
    const response = await apiClient.put(`/expenses/${expenseId}`, data);
    return response.data.data;
  },

  /**
   * Delete expense
   */
  async delete(expenseId: string): Promise<void> {
    await apiClient.delete(`/expenses/${expenseId}`);
  },

  /**
   * Get expenses for a group
   */
  async getByGroupId(groupId: string): Promise<{
    group: {
      id: string;
      name: string;
      description?: string;
    };
    expenses: Expense[];
  }> {
    const response = await apiClient.get(`/groups/${groupId}/expenses`);
    console.log("Expenses response:", response.data);
    return response.data.data;
  },
};

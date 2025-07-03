import { useState } from 'react';
import { settlementsAPI, CreateSettlementData } from '../api/settlements';
import { SettlementSuggestion } from '../api/balances';


export function useSettlements() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSettlement = async (data: CreateSettlementData): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      await settlementsAPI.createSettlement(data);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create settlement';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const settleFromSuggestion = async (
    suggestion: SettlementSuggestion,
    description?: string
  ): Promise<boolean> => {
    const settlementData: CreateSettlementData = {
      fromUser: suggestion.fromUser,
      toUser: suggestion.toUser,
      amount: suggestion.amount,
      description: description || `Settlement: ${suggestion.amount.toFixed(2)}`,
    };

    return await createSettlement(settlementData);
  };

  const confirmSettlement = async (settlementId: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      await settlementsAPI.confirmSettlement(settlementId);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to confirm settlement';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const completeSettlement = async (settlementId: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      await settlementsAPI.completeSettlement(settlementId);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to complete settlement';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const cancelSettlement = async (settlementId: string, reason?: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      await settlementsAPI.cancelSettlement(settlementId, reason);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel settlement';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createSettlement,
    settleFromSuggestion,
    confirmSettlement,
    completeSettlement,
    cancelSettlement,
    isLoading,
    error,
    clearError: () => setError(null),
  };
}
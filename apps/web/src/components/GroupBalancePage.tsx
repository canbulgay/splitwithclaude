import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { BalanceList } from "./BalanceList";
import {
  balancesApi,
  GroupBalanceResponse,
  SettlementSuggestion,
} from "../api/balances";
import { useAuth } from "../contexts/AuthContext";
import { useSettlements } from "../hooks/useSettlements";
import { GroupSettleAllButton } from "./GroupSettleAllButton";
import { ArrowLeft, RefreshCw } from "lucide-react";

export function GroupBalancePage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { user } = useAuth();
  const [balanceData, setBalanceData] = useState<GroupBalanceResponse | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBalances = async () => {
    if (!groupId) return;

    try {
      setError(null);
      const data = await balancesApi.getGroupBalances(groupId);
      setBalanceData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch balances");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, [groupId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchBalances();
  };

  const { settleFromSuggestion, error: settlementError } = useSettlements();

  const handleSettleUp = async (suggestion: SettlementSuggestion) => {
    const success = await settleFromSuggestion(suggestion);
    if (success) {
      // Refresh balances after successful settlement
      await fetchBalances();
      // You could add a toast notification here
      console.log("Settlement created successfully");
    } else {
      console.error("Failed to create settlement:", settlementError);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <Card className="p-6 text-center">
            <div className="text-red-600 mb-4">
              <div className="text-lg font-medium">Error loading balances</div>
              <div className="text-sm">{error}</div>
            </div>
            <Button onClick={handleRefresh} variant="outline">
              Try Again
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  if (!balanceData || !user) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <Card className="p-6 text-center">
            <div className="text-gray-500">No balance data available</div>
          </Card>
        </div>
      </div>
    );
  }

  const { balances, suggestions } = balanceData;

  // Calculate summary statistics
  const userBalances = balances.filter(
    (balance) => balance.fromUser === user.id || balance.toUser === user.id
  );

  const totalOwed = userBalances
    .filter((balance) => balance.fromUser === user.id)
    .reduce((sum, balance) => sum + balance.amount, 0);

  const totalOwedTo = userBalances
    .filter((balance) => balance.toUser === user.id)
    .reduce((sum, balance) => sum + balance.amount, 0);

  const netBalance = totalOwedTo - totalOwed;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Group Balances</h1>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">
              ${totalOwed.toFixed(2)}
            </div>
            <div className="text-sm text-gray-500">You owe</div>
          </Card>

          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              ${totalOwedTo.toFixed(2)}
            </div>
            <div className="text-sm text-gray-500">You are owed</div>
          </Card>

          <Card
            className={`p-4 text-center ${
              netBalance > 0
                ? "bg-green-50 border-green-200"
                : netBalance < 0
                ? "bg-red-50 border-red-200"
                : "bg-gray-50 border-gray-200"
            }`}
          >
            <div
              className={`text-2xl font-bold ${
                netBalance > 0
                  ? "text-green-600"
                  : netBalance < 0
                  ? "text-red-600"
                  : "text-gray-600"
              }`}
            >
              ${Math.abs(netBalance).toFixed(2)}
            </div>
            <div className="text-sm text-gray-500">Net balance</div>
          </Card>

          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {suggestions.length}
            </div>
            <div className="text-sm text-gray-500">Suggested settlements</div>
          </Card>
        </div>

        {/* Balance Status and Group Settlement */}
        <Card className="p-6 text-center">
          <div className="mb-4">
            <Badge
              variant={
                Math.abs(netBalance) < 0.01
                  ? "secondary"
                  : netBalance > 0
                  ? "default"
                  : "destructive"
              }
              className="text-sm px-3 py-1"
            >
              {Math.abs(netBalance) < 0.01
                ? "Settled Up"
                : netBalance > 0
                ? "Owed Money"
                : "Owes Money"}
            </Badge>
          </div>
          <div className="text-lg font-medium mb-4">
            {Math.abs(netBalance) < 0.01
              ? "You are all settled up!"
              : netBalance > 0
              ? `You are owed $${netBalance.toFixed(2)} overall`
              : `You owe $${Math.abs(netBalance).toFixed(2)} overall`}
          </div>

          {/* Group Settle All Button */}
          {groupId && (
            <GroupSettleAllButton
              groupId={groupId}
              suggestions={suggestions}
              onSuccess={(settlements) => {
                console.log("Group settled:", settlements);
                // Refresh balances after successful group settlement
                fetchBalances();
              }}
              onError={(error) => {
                console.error("Group settlement error:", error);
                setError(error);
              }}
              className="mt-4"
            />
          )}
        </Card>

        {/* Balance Details */}
        <BalanceList
          balances={balances}
          suggestions={suggestions}
          currentUserId={user.id}
          onSettleUp={handleSettleUp}
          showSuggestions={true}
        />
      </div>
    </div>
  );
}

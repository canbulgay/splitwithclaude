import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Balance, SettlementSuggestion } from "../api/balances";
import { cn } from "../lib/utils";

interface BalanceListProps {
  balances: Balance[];
  suggestions?: SettlementSuggestion[];
  currentUserId: string;
  onSettleUp?: (suggestion: SettlementSuggestion) => void;
  showSuggestions?: boolean;
  className?: string;
}

export function BalanceList({
  balances,
  suggestions = [],
  currentUserId,
  onSettleUp,
  showSuggestions = true,
  className,
}: BalanceListProps) {
  // Filter balances to only show ones involving the current user
  const userBalances = balances.filter(
    (balance) =>
      balance.fromUser === currentUserId || balance.toUser === currentUserId
  );

  const userSuggestions = suggestions.filter(
    (suggestion) =>
      suggestion.fromUser === currentUserId ||
      suggestion.toUser === currentUserId
  );

  if (userBalances.length === 0) {
    return (
      <Card className={cn("p-6 text-center", className)}>
        <div className="text-gray-500">
          <div className="text-lg font-medium mb-2">All settled up!</div>
          <div className="text-sm">No outstanding balances in this group.</div>
        </div>
      </Card>
    );
  }

  const getBalanceType = (balance: Balance) => {
    if (balance.fromUser === currentUserId) {
      return "owe";
    } else {
      return "owed";
    }
  };

  const getOtherUser = (balance: Balance) => {
    return balance.fromUser === currentUserId
      ? balance.toUser
      : balance.fromUser;
  };

  const getBalanceText = (balance: Balance) => {
    const otherUser = getOtherUser(balance);
    const type = getBalanceType(balance);

    if (type === "owe") {
      return `You owe ${otherUser} $${balance.amount.toFixed(2)}`;
    } else {
      return `${otherUser} owes you $${balance.amount.toFixed(2)}`;
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Outstanding Balances */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Outstanding Balances</h3>
        <div className="space-y-3">
          {userBalances.map((balance, index) => {
            const type = getBalanceType(balance);
            // const otherUser = getOtherUser(balance);

            return (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={cn(
                      "w-3 h-3 rounded-full",
                      type === "owe" ? "bg-red-500" : "bg-green-500"
                    )}
                  />
                  <div>
                    <div className="font-medium">{getBalanceText(balance)}</div>
                    <div className="text-sm text-gray-500">
                      {type === "owe" ? "You owe" : "You are owed"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={type === "owe" ? "destructive" : "default"}>
                    ${balance.amount.toFixed(2)}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Settlement Suggestions */}
      {showSuggestions && userSuggestions.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Settlement Suggestions</h3>
          <div className="space-y-3">
            {userSuggestions.map((suggestion, index) => {
              const isCurrentUserPaying = suggestion.fromUser === currentUserId;
              const otherUser = isCurrentUserPaying
                ? suggestion.toUser
                : suggestion.fromUser;

              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <div>
                      <div className="font-medium">
                        {isCurrentUserPaying
                          ? `Pay ${otherUser} $${suggestion.amount.toFixed(2)}`
                          : `Receive $${suggestion.amount.toFixed(
                              2
                            )} from ${otherUser}`}
                      </div>
                      <div className="text-sm text-blue-600">
                        Optimized settlement to minimize transactions
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {isCurrentUserPaying && onSettleUp && (
                      <Button
                        size="sm"
                        onClick={() => onSettleUp(suggestion)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Settle Up
                      </Button>
                    )}
                    <Badge
                      variant="outline"
                      className="text-blue-600 border-blue-600"
                    >
                      ${suggestion.amount.toFixed(2)}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>

          {userSuggestions.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-sm text-blue-600">
                💡 <strong>Tip:</strong> These suggestions minimize the total
                number of transactions needed to settle all debts in the group.
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

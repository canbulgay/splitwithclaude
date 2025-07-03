import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { UserBalanceSummary } from "../api/balances";
import { cn } from "../lib/utils";
import { CreditCard } from "lucide-react";

interface BalanceSummaryProps {
  summary: UserBalanceSummary;
  className?: string;
  onSettleUpClick?: () => void;
}

export function BalanceSummary({ summary, className, onSettleUpClick }: BalanceSummaryProps) {
  const { totalOwed, totalOwedTo, netBalance } = summary;

  const isPositive = netBalance > 0;
  const isNegative = netBalance < 0;
  const isEven = Math.abs(netBalance) < 0.01;

  const getBalanceStatus = () => {
    if (isEven) return "even";
    if (isPositive) return "positive";
    return "negative";
  };

  const getBalanceText = () => {
    if (isEven) return "You are all settled up!";
    if (isPositive)
      return `You are owed $${Math.abs(netBalance).toFixed(2)} total`;
    return `You owe $${Math.abs(netBalance).toFixed(2)} total`;
  };

  const getBalanceVariant = () => {
    if (isEven) return "secondary";
    if (isPositive) return "default";
    return "destructive";
  };

  return (
    <Card className={cn("p-6", className)}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Your Balance Summary</h3>
          <Badge variant={getBalanceVariant()} className="text-sm">
            {getBalanceStatus() === "even"
              ? "Settled"
              : getBalanceStatus() === "positive"
              ? "Owed Money"
              : "Owes Money"}
          </Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
          <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="text-2xl font-bold text-red-600">
              ${totalOwed.toFixed(2)}
            </div>
            <div className="text-sm text-red-500 mt-1">You owe</div>
          </div>

          <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="text-2xl font-bold text-green-600">
              ${totalOwedTo.toFixed(2)}
            </div>
            <div className="text-sm text-green-500 mt-1">You are owed</div>
          </div>
        </div>

        <div className="text-center space-y-3">
          <p
            className={cn(
              "font-medium",
              isPositive && "text-green-600",
              isNegative && "text-red-600",
              isEven && "text-gray-600"
            )}
          >
            {getBalanceText()}
          </p>
          
          {!isEven && onSettleUpClick && (
            <Button
              onClick={onSettleUpClick}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <CreditCard className="h-4 w-4" />
              Settle Up
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

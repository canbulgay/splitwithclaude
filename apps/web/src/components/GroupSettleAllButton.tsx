import React, { useState } from "react";
import { Button } from "./ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from "./ui/dialog";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { Settlement, settlementsAPI } from "../api/settlements";
import { 
  DollarSign, 
  Clock, 
  Users, 
  TrendingDown,
  CheckCircle,
  AlertCircle
} from "lucide-react";

interface GroupSettleAllButtonProps {
  groupId: string;
  suggestions: Array<{
    fromUser: string;
    toUser: string;
    amount: number;
  }>;
  optimization?: {
    currentTransactions: number;
    optimizedTransactions: number;
    transactionReduction: number;
    percentageReduction: number;
  };
  onSuccess?: (settlements: Settlement[]) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
}

export const GroupSettleAllButton: React.FC<GroupSettleAllButtonProps> = ({
  groupId,
  suggestions,
  optimization,
  onSuccess,
  onError,
  disabled = false,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [description, setDescription] = useState("");

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const totalAmount = suggestions.reduce((sum, suggestion) => sum + suggestion.amount, 0);

  const handleSettleAll = async () => {
    setIsLoading(true);
    try {
      const result = await settlementsAPI.settleGroup(groupId, description);
      onSuccess?.(result.settlements);
      setIsOpen(false);
      setDescription("");
    } catch (error) {
      console.error("Error settling group:", error);
      onError?.("Failed to create group settlements");
    } finally {
      setIsLoading(false);
    }
  };

  if (suggestions.length === 0) {
    return (
      <div className={`text-center ${className}`}>
        <div className="flex items-center justify-center gap-2 text-green-600 mb-2">
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium">Group is fully settled!</span>
        </div>
        <p className="text-sm text-gray-500">
          All expenses have been settled. Great job!
        </p>
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          className={`flex items-center gap-2 ${className}`}
          disabled={disabled}
          size="lg"
        >
          <DollarSign className="h-4 w-4" />
          Settle All ({suggestions.length} payments)
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Settle Entire Group
          </DialogTitle>
          <DialogDescription>
            Create optimized settlements to balance all group expenses
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Optimization Summary */}
          {optimization && (
            <Card>
              <CardContent className="p-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-green-600" />
                  Settlement Optimization
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Current debts:</span>
                    <div className="font-medium">{optimization.currentTransactions} transactions</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Optimized to:</span>
                    <div className="font-medium text-green-600">
                      {optimization.optimizedTransactions} settlements
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Reduction:</span>
                    <div className="font-medium">
                      {optimization.transactionReduction} fewer payments
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Efficiency:</span>
                    <div className="font-medium text-green-600">
                      {optimization.percentageReduction}% improvement
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Settlement Preview */}
          <div>
            <h4 className="font-medium mb-3">Settlement Preview</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <Card key={index}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        <span className="text-sm">
                          User pays {formatCurrency(suggestion.amount)} to User
                        </span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {formatCurrency(suggestion.amount)}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total Settlement Amount:</span>
                <span className="font-bold text-lg">{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Optional Description */}
          <div className="space-y-2">
            <Label htmlFor="settlement-description">Description (optional)</Label>
            <Textarea
              id="settlement-description"
              placeholder="Add a note for these settlements..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-amber-800">Settlement Process</p>
              <p className="text-amber-700 mt-1">
                This will create {suggestions.length} pending settlements. Each recipient will need to 
                confirm they received payment, then the payer can mark it as completed.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setIsOpen(false);
              setDescription("");
            }}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSettleAll}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <Clock className="h-3 w-3 animate-spin" />
            ) : (
              <DollarSign className="h-3 w-3" />
            )}
            Create {suggestions.length} Settlements
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
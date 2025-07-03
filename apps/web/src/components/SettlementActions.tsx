import React, { useState } from "react";
import { Button } from "./ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle
} from "./ui/dialog";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Settlement, settlementsAPI } from "../api/settlements";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Check, 
  X, 
  DollarSign, 
  Clock, 
  AlertCircle 
} from "lucide-react";

interface SettlementActionsProps {
  settlement: Settlement;
  onUpdate?: (updatedSettlement: Settlement) => void;
  onError?: (error: string) => void;
  className?: string;
}

export const SettlementActions: React.FC<SettlementActionsProps> = ({
  settlement,
  onUpdate,
  onError,
  className = "",
}) => {
  const { user: currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  if (!currentUser) return null;

  const isFromCurrentUser = settlement.fromUser === currentUser.id;
  const isToCurrentUser = settlement.toUser === currentUser.id;

  const handleAction = async (action: string, actionFn: () => Promise<Settlement>) => {
    setIsLoading(action);
    try {
      const updatedSettlement = await actionFn();
      onUpdate?.(updatedSettlement);
    } catch (error) {
      console.error(`Error ${action}:`, error);
      onError?.(`Failed to ${action} settlement`);
    } finally {
      setIsLoading(null);
    }
  };

  const handleConfirm = () => {
    handleAction("confirm", () => settlementsAPI.confirmSettlement(settlement.id));
  };

  const handleComplete = () => {
    handleAction("complete", () => settlementsAPI.completeSettlement(settlement.id));
  };

  const handleCancel = () => {
    handleAction("cancel", () => 
      settlementsAPI.cancelSettlement(settlement.id, cancelReason)
    );
    setShowCancelDialog(false);
    setCancelReason("");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  // Determine what actions are available based on status and user role
  const getAvailableActions = () => {
    const actions = [];

    switch (settlement.status) {
      case 'PENDING':
        if (isToCurrentUser) {
          // Recipient can confirm payment
          actions.push({
            key: 'confirm',
            label: 'Confirm Receipt',
            icon: Check,
            variant: 'default' as const,
            description: `Confirm you received ${formatCurrency(settlement.amount)}`,
            action: handleConfirm,
            loading: isLoading === 'confirm',
          });
        }
        
        // Both parties can cancel pending settlements
        if (isFromCurrentUser || isToCurrentUser) {
          actions.push({
            key: 'cancel',
            label: 'Cancel',
            icon: X,
            variant: 'outline' as const,
            description: 'Cancel this settlement',
            action: () => setShowCancelDialog(true),
            loading: isLoading === 'cancel',
          });
        }
        break;

      case 'CONFIRMED':
        if (isFromCurrentUser) {
          // Payer can mark as completed
          actions.push({
            key: 'complete',
            label: 'Mark as Paid',
            icon: DollarSign,
            variant: 'default' as const,
            description: `Mark ${formatCurrency(settlement.amount)} payment as completed`,
            action: handleComplete,
            loading: isLoading === 'complete',
          });
        }
        
        // Both parties can still cancel confirmed settlements
        if (isFromCurrentUser || isToCurrentUser) {
          actions.push({
            key: 'cancel',
            label: 'Cancel',
            icon: X,
            variant: 'outline' as const,
            description: 'Cancel this settlement',
            action: () => setShowCancelDialog(true),
            loading: isLoading === 'cancel',
          });
        }
        break;

      default:
        // No actions available for COMPLETED or CANCELLED settlements
        break;
    }

    return actions;
  };

  const availableActions = getAvailableActions();

  if (availableActions.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {availableActions.map((action) => (
        <Button
          key={action.key}
          variant={action.variant}
          size="sm"
          onClick={action.action}
          disabled={action.loading || isLoading !== null}
          className="flex items-center gap-1"
        >
          {action.loading ? (
            <Clock className="h-3 w-3 animate-spin" />
          ) : (
            <action.icon className="h-3 w-3" />
          )}
          {action.label}
        </Button>
      ))}

      {/* Cancel confirmation dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              Cancel Settlement
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this {formatCurrency(settlement.amount)} settlement?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="cancel-reason">Reason (optional)</Label>
            <Textarea
              id="cancel-reason"
              placeholder="Explain why you're cancelling this settlement..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCancelDialog(false);
                setCancelReason("");
              }}
            >
              Keep Settlement
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={isLoading === 'cancel'}
              className="flex items-center gap-1"
            >
              {isLoading === 'cancel' ? (
                <Clock className="h-3 w-3 animate-spin" />
              ) : (
                <X className="h-3 w-3" />
              )}
              Cancel Settlement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
import React, { useState } from "react";
import { format } from "date-fns";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Settlement } from "../api/settlements";
import { SettlementStatusBadge } from "./SettlementStatusBadge";
import { SettlementActions } from "./SettlementActions";
import { useAuth } from "@/contexts/AuthContext";
import {
  MoreHorizontal,
  Edit2,
  Trash2,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";

interface SettlementListProps {
  settlements: Settlement[];
  onEdit?: (settlement: Settlement) => void;
  onDelete?: (settlementId: string) => void;
  onUpdate?: (updatedSettlement: Settlement) => void;
  onError?: (error: string) => void;
  showActions?: boolean;
  showWorkflowActions?: boolean;
  className?: string;
}

export const SettlementList: React.FC<SettlementListProps> = ({
  settlements,
  onEdit,
  onDelete,
  onUpdate,
  onError,
  showActions = true,
  showWorkflowActions = true,
  className = "",
}) => {
  const { user: currentUser } = useAuth();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleDelete = async (settlementId: string) => {
    if (!onDelete) return;

    setIsDeleting(settlementId);
    try {
      await onDelete(settlementId);
    } catch (error) {
      console.error("Error deleting settlement:", error);
    } finally {
      setIsDeleting(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getSettlementDirection = (settlement: Settlement) => {
    if (!currentUser) return null;

    const isFromCurrentUser = settlement.fromUser === currentUser.id;
    const otherUser = isFromCurrentUser
      ? settlement.toUserRel
      : settlement.fromUserRel;

    return {
      isFromCurrentUser,
      otherUser,
      icon: isFromCurrentUser ? ArrowUpRight : ArrowDownLeft,
      colorClass: isFromCurrentUser ? "text-red-600" : "text-green-600",
      bgClass: isFromCurrentUser ? "bg-red-50" : "bg-green-50",
      action: isFromCurrentUser ? "paid" : "received",
    };
  };

  console.log("SettlementList rendered with settlements:", settlements);
  if (settlements?.length === 0 || !settlements) {
    return (
      <Card className={className}>
        <CardContent className="py-8">
          <div className="text-center text-gray-500">
            <p>No settlements recorded yet.</p>
            <p className="text-sm mt-1">
              Record your first settlement to start tracking payments.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {settlements.map((settlement) => {
        const direction = getSettlementDirection(settlement);
        if (!direction) return null;

        const {
          isFromCurrentUser,
          otherUser,
          icon: Icon,
          colorClass,
          bgClass,
          action,
        } = direction;
        const canEdit = isFromCurrentUser && showActions && onEdit;
        const canDelete = isFromCurrentUser && showActions && onDelete;

        return (
          <Card
            key={settlement.id}
            className="hover:shadow-md transition-shadow"
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`p-2 rounded-full ${bgClass}`}>
                    <Icon className={`h-4 w-4 ${colorClass}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-medium text-gray-900">
                        {isFromCurrentUser
                          ? "You"
                          : otherUser?.name || "Unknown User"}{" "}
                        {action} {formatCurrency(settlement.amount)}
                      </span>
                      <Badge
                        variant={
                          isFromCurrentUser ? "destructive" : "secondary"
                        }
                      >
                        {isFromCurrentUser ? "Sent" : "Received"}
                      </Badge>
                      <SettlementStatusBadge status={settlement.status} />
                    </div>

                    <div className="text-sm text-gray-600">
                      {isFromCurrentUser ? (
                        <>to {otherUser?.name || "Unknown User"}</>
                      ) : (
                        <>from {otherUser?.name || "Unknown User"}</>
                      )}
                    </div>

                    {settlement.description && (
                      <div className="text-sm text-gray-500 mt-1">
                        "{settlement.description}"
                      </div>
                    )}

                    <div className="text-xs text-gray-400 mt-2">
                      {format(
                        new Date(settlement.createdAt || settlement.settledAt),
                        "MMM d, yyyy 'at' h:mm a"
                      )}
                    </div>

                    {showWorkflowActions && (
                      <div className="mt-3">
                        <SettlementActions
                          settlement={settlement}
                          onUpdate={onUpdate}
                          onError={onError}
                        />
                      </div>
                    )}

                    {settlement?.expenses && settlement.expenses.length > 0 && (
                      <div className="mt-2">
                        <div className="text-xs text-gray-500 mb-1">
                          Related expenses:
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {settlement.expenses.map((expenseRel) => (
                            <Badge
                              key={expenseRel.expense.id}
                              variant="outline"
                              className="text-xs"
                            >
                              {expenseRel.expense.description} (
                              {expenseRel.expense.group.name})
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {(canEdit || canDelete) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {canEdit && (
                        <DropdownMenuItem onClick={() => onEdit(settlement)}>
                          <Edit2 className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                      )}
                      {canDelete && (
                        <DropdownMenuItem
                          onClick={() => handleDelete(settlement.id)}
                          disabled={isDeleting === settlement.id}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {isDeleting === settlement.id
                            ? "Deleting..."
                            : "Delete"}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

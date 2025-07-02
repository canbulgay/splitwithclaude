import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { MoreHorizontal, Edit, Trash2, User, DollarSign, Tag } from "lucide-react";
import { ExpenseCategory } from "@splitwise/shared";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Expense } from "@/api/expenses";

interface ExpenseListProps {
  expenses: Expense[];
  currentUserId: string;
  onEdit?: (expense: Expense) => void;
  onDelete?: (expenseId: string) => void;
  loading?: boolean;
  showGroupName?: boolean;
}

export function ExpenseList({
  expenses,
  currentUserId,
  onEdit,
  onDelete,
  loading = false,
  showGroupName = false,
}: ExpenseListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (expenseId: string) => {
    if (!onDelete) return;

    setDeletingId(expenseId);
    try {
      await onDelete(expenseId);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 w-48 bg-muted rounded"></div>
                  <div className="h-3 w-32 bg-muted rounded"></div>
                </div>
                <div className="h-6 w-20 bg-muted rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (expenses?.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No expenses yet</h3>
          <p className="text-muted-foreground">
            Start by adding your first expense to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {expenses?.length > 0 &&
        expenses.map((expense) => {
          const userSplit = expense.splits.find(
            (s) => s.userId === currentUserId
          );
          const isUserPayer = expense.paidBy === currentUserId;
          const userOwes = userSplit?.amountOwed || 0;
          const userBalance = isUserPayer
            ? expense.amount - userOwes
            : -userOwes;

          return (
            <Card
              key={expense.id}
              className="transition-shadow hover:shadow-md"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">
                        {expense.description}
                      </h3>
                      <Badge variant="outline" className="text-xs">
                        <span className="mr-1">{getCategoryIcon(expense.category)}</span>
                        {getCategoryLabel(expense.category)}
                      </Badge>
                      {showGroupName && (
                        <Badge variant="secondary" className="text-xs">
                          {expense?.group?.name}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>Paid by {expense?.payer?.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        <span>
                          $
                          {typeof expense?.amount === "string"
                            ? parseFloat(expense.amount).toFixed(2)
                            : expense.amount}
                        </span>
                      </div>
                      <span>
                        {formatDistanceToNow(new Date(expense.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-4">
                        <div className="text-sm">
                          <span className="text-muted-foreground">
                            Your share:{" "}
                          </span>
                          <span className="font-medium">
                            ${userOwes.toFixed(2)}
                          </span>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">
                            Your balance:{" "}
                          </span>
                          <span
                            className={`font-medium ${
                              userBalance >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {userBalance >= 0 ? "+" : "-"}$
                            {Math.abs(userBalance).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Separator className="my-3" />

                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">
                        Split Details:
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {expense.splits.map((split) => (
                          <div
                            key={split.userId}
                            className="flex items-center justify-between p-2 bg-muted/50 rounded"
                          >
                            <span className="text-sm">{split.user.name}</span>
                            <span className="text-sm font-medium">
                              ${split.amountOwed.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="ml-4 flex items-center gap-2">
                    {(onEdit || onDelete) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {onEdit && (
                            <DropdownMenuItem onClick={() => onEdit(expense)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {onDelete && (
                            <DropdownMenuItem
                              onClick={() => handleDelete(expense.id)}
                              disabled={deletingId === expense.id}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {deletingId === expense.id
                                ? "Deleting..."
                                : "Delete"}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
    </div>
  );
}

// Helper functions for expense categories
function getCategoryIcon(category: ExpenseCategory): string {
  const iconMap: Record<ExpenseCategory, string> = {
    [ExpenseCategory.GENERAL]: "📄",
    [ExpenseCategory.FOOD]: "🍽️",
    [ExpenseCategory.TRANSPORTATION]: "🚗",
    [ExpenseCategory.ENTERTAINMENT]: "🎬",
    [ExpenseCategory.UTILITIES]: "⚡",
    [ExpenseCategory.SHOPPING]: "🛍️",
    [ExpenseCategory.HEALTHCARE]: "🏥",
    [ExpenseCategory.TRAVEL]: "✈️",
    [ExpenseCategory.EDUCATION]: "📚",
    [ExpenseCategory.OTHER]: "📦",
  };
  return iconMap[category] || "📄";
}

function getCategoryLabel(category: ExpenseCategory): string {
  const labelMap: Record<ExpenseCategory, string> = {
    [ExpenseCategory.GENERAL]: "General",
    [ExpenseCategory.FOOD]: "Food & Dining",
    [ExpenseCategory.TRANSPORTATION]: "Transportation",
    [ExpenseCategory.ENTERTAINMENT]: "Entertainment",
    [ExpenseCategory.UTILITIES]: "Utilities",
    [ExpenseCategory.SHOPPING]: "Shopping",
    [ExpenseCategory.HEALTHCARE]: "Healthcare",
    [ExpenseCategory.TRAVEL]: "Travel",
    [ExpenseCategory.EDUCATION]: "Education",
    [ExpenseCategory.OTHER]: "Other",
  };
  return labelMap[category] || "General";
}

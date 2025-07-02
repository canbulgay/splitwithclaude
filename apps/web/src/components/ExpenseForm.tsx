import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Calculator, DollarSign, Users } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { expenseApi } from "@/lib/api/expenses";

// Types for group and user data
interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

interface Group {
  id: string;
  name: string;
  members: Array<{
    userId: string;
    role: "ADMIN" | "MEMBER";
    user: User;
  }>;
}

// Form validation schema
const expenseFormSchema = z.object({
  description: z.string().min(1, "Description is required").max(200, "Description too long"),
  amount: z.number().positive("Amount must be positive").multipleOf(0.01, "Amount must have at most 2 decimal places"),
  paidBy: z.string().cuid("Please select who paid"),
  splitMethod: z.enum(["equal", "exact", "percentage"]),
  splits: z.array(z.object({
    userId: z.string().cuid(),
    amount: z.number().optional(),
    percentage: z.number().optional(),
  })),
});

type ExpenseFormData = z.infer<typeof expenseFormSchema>;

interface ExpenseFormProps {
  group: Group;
  onSubmit: (data: ExpenseFormData) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<ExpenseFormData>;
  isEditing?: boolean;
}

export function ExpenseForm({
  group,
  onSubmit,
  onCancel,
  initialData,
  isEditing = false,
}: ExpenseFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [splitMethod, setSplitMethod] = useState<"equal" | "exact" | "percentage">(
    initialData?.splitMethod || "equal"
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    control,
    setError,
    clearErrors,
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      description: initialData?.description || "",
      amount: initialData?.amount || 0,
      paidBy: initialData?.paidBy || "",
      splitMethod: initialData?.splitMethod || "equal",
      splits: initialData?.splits || group.members.map(member => ({
        userId: member.userId,
        amount: 0,
        percentage: 0,
      })),
    },
  });

  const { fields, update } = useFieldArray({
    control,
    name: "splits",
  });

  const watchedAmount = watch("amount");
  const watchedSplits = watch("splits");

  // Calculate equal splits when amount or split method changes
  useEffect(() => {
    if (splitMethod === "equal" && watchedAmount > 0) {
      const equalAmount = Number((watchedAmount / group.members.length).toFixed(2));
      const remainder = Number((watchedAmount - (equalAmount * group.members.length)).toFixed(2));

      group.members.forEach((member, index) => {
        const amount = index === 0 ? equalAmount + remainder : equalAmount;
        update(index, {
          userId: member.userId,
          amount,
          percentage: Number(((amount / watchedAmount) * 100).toFixed(2)),
        });
      });
    } else if (splitMethod === "percentage") {
      const equalPercentage = Number((100 / group.members.length).toFixed(2));
      const remainder = Number((100 - (equalPercentage * group.members.length)).toFixed(2));

      group.members.forEach((member, index) => {
        const percentage = index === 0 ? equalPercentage + remainder : equalPercentage;
        const amount = Number(((percentage / 100) * watchedAmount).toFixed(2));
        update(index, {
          userId: member.userId,
          amount,
          percentage,
        });
      });
    }
  }, [watchedAmount, splitMethod, group.members, update]);

  // Validate splits when they change
  useEffect(() => {
    if (watchedAmount > 0 && watchedSplits.length > 0) {
      const totalSplitAmount = watchedSplits.reduce((sum, split) => sum + (split.amount || 0), 0);
      const difference = Math.abs(totalSplitAmount - watchedAmount);

      if (difference > 0.01) {
        setError("splits", {
          type: "manual",
          message: `Split amounts must equal the total expense amount. Current difference: $${difference.toFixed(2)}`,
        });
      } else {
        clearErrors("splits");
      }
    }
  }, [watchedSplits, watchedAmount, setError, clearErrors]);

  const handleSplitMethodChange = (method: "equal" | "exact" | "percentage") => {
    setSplitMethod(method);
    setValue("splitMethod", method);
  };

  const handleSplitChange = (index: number, field: "amount" | "percentage", value: number) => {
    const currentSplit = watchedSplits[index];
    
    if (field === "amount") {
      const percentage = watchedAmount > 0 ? Number(((value / watchedAmount) * 100).toFixed(2)) : 0;
      update(index, {
        ...currentSplit,
        amount: value,
        percentage,
      });
    } else if (field === "percentage") {
      const amount = Number(((value / 100) * watchedAmount).toFixed(2));
      update(index, {
        ...currentSplit,
        amount,
        percentage: value,
      });
    }
  };


  const onFormSubmit = async (data: ExpenseFormData) => {
    setIsSubmitting(true);
    try {
      // Convert splits to the format expected by the API
      const formattedData = {
        ...data,
        splits: data.splits.map(split => ({
          userId: split.userId,
          amount: split.amount || 0,
        })),
      };
      await onSubmit(formattedData);
    } catch (error) {
      console.error("Error submitting expense form:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {/* Basic Expense Information */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="description">Description</Label>
          <Input
            {...register("description")}
            placeholder="Enter expense description (e.g., Dinner at Mario's)"
            className="mt-1"
          />
          {errors.description && (
            <p className="text-sm text-destructive mt-1">{errors.description.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="amount">Total Amount</Label>
          <div className="relative mt-1">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              {...register("amount", { valueAsNumber: true })}
              type="number"
              step="0.01"
              placeholder="0.00"
              className="pl-10"
            />
          </div>
          {errors.amount && (
            <p className="text-sm text-destructive mt-1">{errors.amount.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="paidBy">Paid By</Label>
          <Select
            value={watch("paidBy")}
            onValueChange={(value: string) => setValue("paidBy", value)}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select who paid for this expense" />
            </SelectTrigger>
            <SelectContent>
              {group.members.map((member) => (
                <SelectItem key={member.userId} value={member.userId}>
                  {member.user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.paidBy && (
            <p className="text-sm text-destructive mt-1">{errors.paidBy.message}</p>
          )}
        </div>
      </div>

      {/* Split Method Selection */}
      <div className="space-y-4">
        <Label>Split Method</Label>
        <div className="grid grid-cols-3 gap-2">
          <Button
            type="button"
            variant={splitMethod === "equal" ? "default" : "outline"}
            onClick={() => handleSplitMethodChange("equal")}
            className="flex flex-col gap-1 h-auto py-3"
          >
            <Users className="h-4 w-4" />
            <span className="text-xs">Equal Split</span>
          </Button>
          <Button
            type="button"
            variant={splitMethod === "exact" ? "default" : "outline"}
            onClick={() => handleSplitMethodChange("exact")}
            className="flex flex-col gap-1 h-auto py-3"
          >
            <Calculator className="h-4 w-4" />
            <span className="text-xs">Exact Amounts</span>
          </Button>
          <Button
            type="button"
            variant={splitMethod === "percentage" ? "default" : "outline"}
            onClick={() => handleSplitMethodChange("percentage")}
            className="flex flex-col gap-1 h-auto py-3"
          >
            <DollarSign className="h-4 w-4" />
            <span className="text-xs">Percentages</span>
          </Button>
        </div>
      </div>

      {/* Split Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Split Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {fields.map((field, index) => {
            const member = group.members[index];
            const split = watchedSplits[index];
            
            return (
              <div key={field.id} className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">{member?.user.name}</p>
                  <p className="text-sm text-muted-foreground">{member?.user.email}</p>
                </div>
                
                {splitMethod === "exact" && (
                  <div className="w-24">
                    <Input
                      type="number"
                      step="0.01"
                      value={split?.amount || 0}
                      onChange={(e) => handleSplitChange(index, "amount", parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="text-right"
                    />
                  </div>
                )}
                
                {splitMethod === "percentage" && (
                  <div className="w-20">
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.01"
                        value={split?.percentage || 0}
                        onChange={(e) => handleSplitChange(index, "percentage", parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="text-right pr-6"
                      />
                      <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">%</span>
                    </div>
                  </div>
                )}
                
                <div className="w-20 text-right">
                  <p className="font-medium">${(split?.amount || 0).toFixed(2)}</p>
                </div>
              </div>
            );
          })}
          
          {errors.splits && (
            <p className="text-sm text-destructive">{errors.splits.message}</p>
          )}
          
          <div className="border-t pt-3 mt-3">
            <div className="flex justify-between items-center font-semibold">
              <span>Total:</span>
              <span>${(watchedSplits.reduce((sum, split) => sum + (split.amount || 0), 0)).toFixed(2)}</span>
            </div>
            {watchedAmount > 0 && (
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>Expected:</span>
                <span>${watchedAmount.toFixed(2)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || Object.keys(errors).length > 0}
          className="flex-1"
        >
          {isSubmitting ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
          ) : (
            isEditing ? "Update Expense" : "Create Expense"
          )}
        </Button>
      </div>
    </form>
  );
}

interface CreateExpenseDialogProps {
  group: Group;
  onExpenseCreated: () => void;
  trigger?: React.ReactNode;
}

export function CreateExpenseDialog({ 
  group, 
  onExpenseCreated, 
  trigger 
}: CreateExpenseDialogProps) {
  const [open, setOpen] = useState(false);

  const handleSubmit = async (data: ExpenseFormData) => {
    try {
      // Create expense via API
      await expenseApi.create({
        groupId: group.id,
        amount: data.amount,
        description: data.description,
        paidBy: data.paidBy,
        splits: data.splits.map(split => ({
          userId: split.userId,
          amount: split.amount || 0,
        })),
      });
      
      setOpen(false);
      onExpenseCreated();
    } catch (error) {
      console.error('Failed to create expense:', error);
      // TODO: Show error toast to user
    }
  };

  const handleCancel = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Expense
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Expense</DialogTitle>
          <DialogDescription>
            Add a new expense to {group.name} and split it among group members.
          </DialogDescription>
        </DialogHeader>
        <ExpenseForm
          group={group}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </DialogContent>
    </Dialog>
  );
}
import React, { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { settlementsAPI, CreateSettlementData } from "../api/settlements";
import { useAuth } from "@/contexts/AuthContext";

interface User {
  id: string;
  name: string;
  email: string;
}

interface SettlementFormProps {
  users: User[];
  onSubmit?: (settlement: any) => void;
  onCancel?: () => void;
  initialData?: {
    toUser?: string;
    amount?: number;
    description?: string;
  };
  className?: string;
}

export const SettlementForm: React.FC<SettlementFormProps> = ({
  users,
  onSubmit,
  onCancel,
  initialData,
  className = "",
}) => {
  const { user: currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    toUser: initialData?.toUser || "",
    amount: initialData?.amount?.toString() || "",
    description: initialData?.description || "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Filter out current user from recipient options
  const availableUsers = users.filter((user) => user.id !== currentUser?.id);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.toUser) {
      newErrors.toUser = "Please select a recipient";
    }

    if (!formData.amount) {
      newErrors.amount = "Amount is required";
    } else {
      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        newErrors.amount = "Amount must be a positive number";
      } else if (amount > 999999.99) {
        newErrors.amount = "Amount is too large";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !currentUser) {
      return;
    }

    setIsLoading(true);

    try {
      const settlementData: CreateSettlementData = {
        fromUser: currentUser.id,
        toUser: formData.toUser,
        amount: parseFloat(formData.amount),
        description: formData.description || undefined,
      };

      const settlement = await settlementsAPI.createSettlement(settlementData);

      if (onSubmit) {
        onSubmit(settlement);
      }

      // Reset form
      setFormData({
        toUser: "",
        amount: "",
        description: "",
      });
      setErrors({});
    } catch (error: any) {
      console.error("Error creating settlement:", error);
      setErrors({
        submit: error.response?.data?.error || "Failed to create settlement",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleCancel = () => {
    setFormData({
      toUser: "",
      amount: "",
      description: "",
    });
    setErrors({});
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Record Settlement</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.submit && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {errors.submit}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="toUser">Pay To</Label>
            <Select
              value={formData.toUser}
              onValueChange={(value) => handleInputChange("toUser", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select recipient" />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.toUser && (
              <p className="text-sm text-red-600">{errors.toUser}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount ($)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              max="999999.99"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => handleInputChange("amount", e.target.value)}
              className={errors.amount ? "border-red-300" : ""}
            />
            {errors.amount && (
              <p className="text-sm text-red-600">{errors.amount}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              type="text"
              placeholder="What's this settlement for?"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              maxLength={255}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? "Recording..." : "Record Settlement"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

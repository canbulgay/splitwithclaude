import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Users,
  Plus,
  Settings,
  Crown,
  UserPlus,
  Trash2,
} from "lucide-react";
import { Layout } from "../components/layout";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { ExpenseList } from "../components/ExpenseList";
import { CreateExpenseDialog } from "../components/ExpenseForm";
import { useAuth } from "../contexts/AuthContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import apiClient from "@/api";
import { expenseApi, type Expense } from "@/lib/api/expenses";

const addMemberSchema = z.object({
  email: z.string().email("Invalid email format"),
  role: z.enum(["ADMIN", "MEMBER"]).optional().default("MEMBER"),
});

type AddMemberData = z.infer<typeof addMemberSchema>;

interface Group {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  creator: {
    id: string;
    name: string;
    email: string;
  };
  members: Array<{
    userId: string;
    role: "ADMIN" | "MEMBER";
    joinedAt: string;
    user: {
      id: string;
      name: string;
      email: string;
      avatarUrl?: string;
    };
  }>;
}

export function GroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expensesLoading, setExpensesLoading] = useState(true);
  const [expensesError, setExpensesError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
  } = useForm<AddMemberData>({
    resolver: zodResolver(addMemberSchema),
  });

  const fetchGroup = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/groups/${groupId}`);

      if (response.data.success) {
        setGroup(response.data.data);
      }
    } catch (error: any) {
      console.error("Error fetching group:", error);
      if (error.response?.status === 403) {
        navigate("/groups");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (groupId) {
      fetchGroup();
    }
  }, [groupId]);

  useEffect(() => {
    const fetchExpenses = async () => {
      if (!groupId) return;

      try {
        setExpensesLoading(true);
        setExpensesError(null);

        const data = await expenseApi.getByGroupId(groupId);
        if (!data || !data.expenses) {
          setExpensesError("No expenses found for this group");
          return;
        }
        setExpenses(data.expenses);
      } catch (err: any) {
        console.error("Error fetching expenses:", err);
        setExpensesError("Failed to load expenses");
      } finally {
        setExpensesLoading(false);
      }
    };

    fetchExpenses();
  }, [groupId]);

  const getUserRole = () => {
    if (!group || !user) return "MEMBER";
    const member = group.members.find((m) => m.userId === user.id);
    return member?.role || "MEMBER";
  };

  const isAdmin = () => getUserRole() === "ADMIN";

  const onAddMember = async (data: AddMemberData) => {
    setIsAddingMember(true);
    try {
      const response = await apiClient.post(`/groups/${groupId}/members`, data);

      if (response.data.success) {
        setGroup(response.data.data);
        setAddMemberDialogOpen(false);
        reset();
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error || "Failed to add member";
      setError("root", { message: errorMessage });
    } finally {
      setIsAddingMember(false);
    }
  };

  const removeMember = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;

    try {
      const response = await apiClient.delete(
        `/groups/${groupId}/members/${userId}`
      );

      if (response.data.success) {
        setGroup(response.data.data);
      }
    } catch (error: any) {
      alert(error.response?.data?.error || "Failed to remove member");
    }
  };

  const leaveGroup = async () => {
    if (!confirm("Are you sure you want to leave this group?")) return;

    try {
      const response = await apiClient.delete(
        `/groups/${groupId}/members/${user?.id}`
      );

      if (response.data.success) {
        navigate("/groups");
      }
    } catch (error: any) {
      alert(error.response?.data?.error || "Failed to leave group");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="h-64 bg-muted rounded"></div>
              <div className="h-64 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!group) {
    return (
      <Layout>
        <div className="p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Group not found</h2>
            <p className="text-muted-foreground mt-2">
              The group you're looking for doesn't exist or you don't have
              access to it.
            </p>
            <Button onClick={() => navigate("/groups")} className="mt-4">
              Back to Groups
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/groups")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">{group.name}</h1>
            {group.description && (
              <p className="text-muted-foreground">{group.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Expense
            </Button>
            {isAdmin() && (
              <Button
                variant="outline"
                onClick={() => navigate(`/groups/${groupId}/settings`)}
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Members Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Members ({group.members.length})
                </CardTitle>
                {isAdmin() && (
                  <Dialog
                    open={addMemberDialogOpen}
                    onOpenChange={setAddMemberDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="gap-2">
                        <UserPlus className="h-4 w-4" />
                        Add Member
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Member</DialogTitle>
                        <DialogDescription>
                          Invite someone to join this group by entering their
                          email address.
                        </DialogDescription>
                      </DialogHeader>
                      <form
                        onSubmit={handleSubmit(onAddMember)}
                        className="space-y-4"
                      >
                        {errors.root && (
                          <div className="bg-destructive/15 border border-destructive/20 text-destructive px-4 py-3 rounded-md">
                            {errors.root.message}
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label htmlFor="email">Email Address</Label>
                          <Input
                            {...register("email")}
                            placeholder="Enter email address"
                          />
                          {errors.email && (
                            <p className="text-sm text-destructive">
                              {errors.email.message}
                            </p>
                          )}
                        </div>

                        <div className="flex gap-2 pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setAddMemberDialogOpen(false)}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            disabled={isAddingMember}
                            className="flex-1"
                          >
                            {isAddingMember ? "Adding..." : "Add Member"}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {group.members.map((member) => (
                  <div
                    key={member.userId}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      {member.user.avatarUrl ? (
                        <img
                          src={member.user.avatarUrl}
                          alt={member.user.name}
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                          <span className="text-secondary-foreground font-medium text-sm">
                            {member.user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{member.user.name}</p>
                          {member.role === "ADMIN" && (
                            <Crown className="h-4 w-4 text-yellow-500" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {member.user.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-secondary px-2 py-1 rounded-full">
                        {member.role}
                      </span>
                      {isAdmin() && member.userId !== user?.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMember(member.userId)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {!isAdmin() && (
                <div className="mt-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={leaveGroup}
                    className="text-destructive hover:text-destructive"
                  >
                    Leave Group
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Group Info */}
          <Card>
            <CardHeader>
              <CardTitle>Group Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Created by</Label>
                <p className="text-sm text-muted-foreground">
                  {group.creator.name}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Created on</Label>
                <p className="text-sm text-muted-foreground">
                  {formatDate(group.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Last updated</Label>
                <p className="text-sm text-muted-foreground">
                  {formatDate(group.updatedAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Your role</Label>
                <p className="text-sm text-muted-foreground">{getUserRole()}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Expenses */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle>Recent Expenses</CardTitle>
              <CardDescription>Latest expenses in this group</CardDescription>
            </div>
            {group && (
              <CreateExpenseDialog
                group={{
                  id: group.id,
                  name: group.name,
                  members: group.members.map((member) => ({
                    userId: member.userId,
                    role: member.role,
                    user: member.user,
                  })),
                }}
                onExpenseCreated={async () => {
                  // Refresh expenses after creating a new one
                  try {
                    const data = await expenseApi.getByGroupId(groupId!);
                    setExpenses(data.expenses);
                  } catch (err) {
                    console.error("Failed to refresh expenses:", err);
                  }
                }}
                trigger={
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Expense
                  </Button>
                }
              />
            )}
          </CardHeader>
          <CardContent>
            {expensesError ? (
              <div className="text-center py-4 text-destructive">
                {expensesError}
              </div>
            ) : (
              <ExpenseList
                expenses={expenses}
                currentUserId={user?.id || ""}
                loading={expensesLoading}
                onEdit={(expense) => {
                  // TODO: Implement expense editing
                  console.log("Edit expense:", expense);
                }}
                onDelete={async (expenseId) => {
                  try {
                    await expenseApi.delete(expenseId);
                    // Refresh expenses after deletion
                    const data = await expenseApi.getByGroupId(groupId!);
                    setExpenses(data.expenses);
                  } catch (err) {
                    console.error("Failed to delete expense:", err);
                    // TODO: Show error toast
                  }
                }}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

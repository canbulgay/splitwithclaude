import { useState, useEffect } from "react";
import { Plus, Users, Receipt, CreditCard, TrendingUp } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { Layout } from "../components/layout";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { ExpenseList } from "../components/ExpenseList";
import { expenseApi, type Expense } from "@/api/expenses";
import { groupApi } from "@/api/groups";

export function DashboardPage() {
  const { user } = useAuth();
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const stats = [
    {
      title: "Total Groups",
      value: "3",
      description: "Active groups",
      icon: Users,
      color: "text-blue-600",
    },
    {
      title: "This Month",
      value: "$1,247.50",
      description: "Total expenses",
      icon: Receipt,
      color: "text-green-600",
    },
    {
      title: "You Owe",
      value: "$234.75",
      description: "Outstanding balance",
      icon: CreditCard,
      color: "text-red-600",
    },
    {
      title: "You Are Owed",
      value: "$87.25",
      description: "Money to collect",
      icon: TrendingUp,
      color: "text-emerald-600",
    },
  ];

  useEffect(() => {
    const fetchRecentExpenses = async () => {
      if (!user) return;

      try {
        setLoading(true);
        setError(null);

        // Get user's groups first
        const groups = await groupApi.getUserGroups();

        // Get expenses from all groups
        const allExpenses: Expense[] = [];

        for (const group of groups) {
          try {
            const groupExpenses = await expenseApi.getByGroupId(group.id);
            allExpenses.push(...groupExpenses.expenses);
          } catch (err) {
            console.error(
              `Failed to fetch expenses for group ${group.id}:`,
              err
            );
          }
        }

        // Sort by creation date (most recent first) and take top 5
        const sortedExpenses = allExpenses
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
          .slice(0, 5);

        setRecentExpenses(sortedExpenses);
      } catch (err) {
        console.error("Failed to fetch recent expenses:", err);
        setError("Failed to load recent expenses");
      } finally {
        setLoading(false);
      }
    };

    fetchRecentExpenses();
  }, [user]);

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {user?.name}! Here's your expense overview.
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Expense
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Recent Expenses */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Expenses</CardTitle>
              <CardDescription>Your latest expense activity</CardDescription>
            </CardHeader>
            <CardContent>
              {error ? (
                <div className="text-center py-4 text-destructive">{error}</div>
              ) : (
                <div className="space-y-4">
                  <ExpenseList
                    expenses={recentExpenses}
                    currentUserId={user?.id || ""}
                    loading={loading}
                    showGroupName={true}
                  />
                  {!loading && recentExpenses.length > 0 && (
                    <Button variant="outline" className="w-full mt-4">
                      View All Expenses
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common tasks to manage your expenses
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* TODO: Add functionality to these buttons */}
              <Button variant="outline" className="w-full justify-start gap-2">
                <Plus className="h-4 w-4" />
                Create New Group
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2">
                <Receipt className="h-4 w-4" />
                Add Expense
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2">
                <CreditCard className="h-4 w-4" />
                Settle Balance
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2">
                <Users className="h-4 w-4" />
                Invite Friends
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Balance Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Balance Summary</CardTitle>
            <CardDescription>
              Overview of your financial status across all groups
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">$147.50</div>
                <p className="text-sm text-muted-foreground">Net Balance</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  $1,247.50
                </div>
                <p className="text-sm text-muted-foreground">Total Spent</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-purple-600">$87.25</div>
                <p className="text-sm text-muted-foreground">Avg per Month</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

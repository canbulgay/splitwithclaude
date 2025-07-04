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
import { groupApi, type Group } from "@/api/groups";
import { balancesApi, type UserBalanceSummary } from "@/api/balances";
import { lazy, Suspense } from "react";
import { BalanceSummary } from "../components/BalanceSummary";
import { PendingSettlements } from "../components/PendingSettlements";

// Lazy load dashboard components for code splitting
const ExpenseChart = lazy(() =>
  import("../components/charts/ExpenseChart").then((m) => ({
    default: m.ExpenseChart,
  }))
);
const ActivityFeed = lazy(() =>
  import("../components/dashboard/ActivityFeed").then((m) => ({
    default: m.ActivityFeed,
  }))
);
const StatsCard = lazy(() =>
  import("../components/dashboard/StatsCard").then((m) => ({
    default: m.StatsCard,
  }))
);
const GroupOverview = lazy(() =>
  import("../components/dashboard/GroupOverview").then((m) => ({
    default: m.GroupOverview,
  }))
);

export function DashboardPage() {
  const { user } = useAuth();
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [balanceSummary, setBalanceSummary] =
    useState<UserBalanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<
    Array<{ name: string; value: number }>
  >([]);
  const [activityData, setActivityData] = useState<
    Array<{
      id: string;
      type: "expense" | "settlement" | "group" | "balance";
      title: string;
      description: string;
      amount?: number;
      timestamp: Date;
      groupName?: string;
      userName?: string;
    }>
  >([]);

  const stats = [
    {
      title: "Total Groups",
      value: groups.length.toString(),
      description: "Active groups",
      icon: Users,
      color: "text-blue-600",
    },
    {
      title: "Total Expenses",
      value: `${recentExpenses
        .reduce((sum, expense) => sum + expense.amount, 0)
        .toFixed(2)}`,
      description: "All time expenses",
      icon: Receipt,
      color: "text-green-600",
    },
    {
      title: "You Owe",
      value: `${balanceSummary?.totalOwed.toFixed(2) || "0.00"}`,
      description: "Outstanding balance",
      icon: CreditCard,
      color: "text-red-600",
    },
    {
      title: "You Are Owed",
      value: `${balanceSummary?.totalOwedTo.toFixed(2) || "0.00"}`,
      description: "Money to collect",
      icon: TrendingUp,
      color: "text-emerald-600",
    },
  ];

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch all dashboard data in parallel
        const [userGroups, userBalances] = await Promise.all([
          groupApi.getUserGroups(),
          balancesApi.getUserBalances(user.id),
        ]);

        setGroups(userGroups);
        setBalanceSummary(userBalances.summary);

        // Get expenses from all groups
        const allExpenses: Expense[] = [];
        const activities: typeof activityData = [];

        for (const group of userGroups) {
          try {
            const groupExpenses = await expenseApi.getByGroupId(group.id);
            allExpenses.push(...groupExpenses.expenses);

            // Create activity items for recent expenses
            groupExpenses.expenses.forEach((expense) => {
              activities.push({
                id: `expense-${expense.id}`,
                type: "expense",
                title: expense.description,
                description: `Added by ${
                  (expense.payer as any)?.name || "Unknown"
                }`,
                amount: expense.amount,
                timestamp: new Date(expense.createdAt),
                groupName: group.name,
                userName: (expense.payer as any)?.name || "Unknown",
              });
            });
          } catch (err) {
            console.error(
              `Failed to fetch expenses for group ${group.id}:`,
              err
            );
          }
        }

        // Sort expenses by creation date (most recent first)
        const sortedExpenses = allExpenses
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
          .slice(0, 10);

        setRecentExpenses(sortedExpenses);
        setActivityData(activities);

        // Create chart data for expense categories
        const categoryData = allExpenses.reduce((acc, expense) => {
          const category = expense.category || "GENERAL";
          acc[category] = (acc[category] || 0) + expense.amount;
          return acc;
        }, {} as Record<string, number>);

        const chartDataArray = Object.entries(categoryData).map(
          ([name, value]) => ({
            name: name.charAt(0) + name.slice(1).toLowerCase(),
            value,
          })
        );

        setChartData(chartDataArray);
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
        setError("Failed to load dashboard data");
        // Log error for debugging but don't show it to user in this context
        console.error("Dashboard error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-6">
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
          <Suspense
            fallback={
              <div className="h-24 bg-gray-100 animate-pulse rounded-lg"></div>
            }
          >
            {stats.map((stat) => (
              <StatsCard
                key={stat.title}
                title={stat.title}
                value={stat.value}
                description={stat.description}
                icon={stat.icon}
                color={stat.color}
              />
            ))}
          </Suspense>
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Groups and Activity */}
          <div className="lg:col-span-2 space-y-6">
            {/* Pending Settlements - High Priority */}
            <PendingSettlements
              onUpdate={(settlement) => {
                console.log("Settlement updated:", settlement);
                // Optionally refresh balance data or show toast notification
              }}
              onError={(error) => {
                console.error("Settlement error:", error);
                // Show error toast notification
              }}
            />

            {/* Group Overview */}
            <Suspense
              fallback={
                <div className="h-64 bg-gray-100 animate-pulse rounded-lg"></div>
              }
            >
              <GroupOverview
                groups={groups.map((group) => ({
                  id: group.id,
                  name: group.name,
                  description: group.description,
                  memberCount: group.members?.length || 0,
                  totalExpenses: recentExpenses
                    .filter((expense) => expense.groupId === group.id)
                    .reduce((sum, expense) => sum + expense.amount, 0),
                  yourBalance: 0, // This would come from balance calculations
                  lastActivity: new Date(),
                }))}
                onCreateGroup={() => console.log("Create group")}
                onViewGroup={(groupId) => console.log("View group:", groupId)}
              />
            </Suspense>

            {/* Activity Feed */}
            <Suspense
              fallback={
                <div className="h-64 bg-gray-100 animate-pulse rounded-lg"></div>
              }
            >
              <ActivityFeed activities={activityData} maxItems={8} />
            </Suspense>
          </div>

          {/* Right Column - Charts and Balance */}
          <div className="space-y-6">
            {/* Balance Summary */}
            {balanceSummary && <BalanceSummary summary={balanceSummary} />}

            {/* Expense Categories Chart */}
            {chartData.length > 0 && (
              <Suspense
                fallback={
                  <div className="h-64 bg-gray-100 animate-pulse rounded-lg"></div>
                }
              >
                <ExpenseChart
                  data={chartData}
                  type="pie"
                  title="Expenses by Category"
                  height={250}
                />
              </Suspense>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Create New Group
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                >
                  <Receipt className="h-4 w-4" />
                  Add Expense
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                >
                  <CreditCard className="h-4 w-4" />
                  Settle Balance
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                >
                  <Users className="h-4 w-4" />
                  Invite Friends
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Expenses Overview */}
        {recentExpenses.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Expenses</CardTitle>
              <CardDescription>
                Your latest expense activity across all groups
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ExpenseList
                expenses={recentExpenses.slice(0, 5)}
                currentUserId={user?.id || ""}
                loading={loading}
                showGroupName={true}
              />
              {recentExpenses.length > 5 && (
                <Button variant="outline" className="w-full mt-4">
                  View All Expenses
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}

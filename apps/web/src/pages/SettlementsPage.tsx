import React, { useState, useEffect } from "react";
import { Layout } from "../components/layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { SettlementList } from "../components/SettlementList";
import { SettlementForm } from "../components/SettlementForm";
import {
  settlementsAPI,
  Settlement,
  SettlementSummary,
} from "../api/settlements";
import { groupApi } from "../api/groups";
import {
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  TrendingUp,
  Plus,
  RefreshCw,
} from "lucide-react";

interface Group {
  id: string;
  name: string;
  members: Array<{
    user: {
      id: string;
      name: string;
      email: string;
    };
  }>;
}

export const SettlementsPage: React.FC = () => {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [summary, setSummary] = useState<SettlementSummary | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingSettlement, setEditingSettlement] = useState<Settlement | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const [settlementsData, groupsData] = await Promise.all([
        settlementsAPI.getUserSettlements(),
        groupApi.getUserGroups(),
      ]);

      setSettlements(settlementsData.settlements);
      setSummary(settlementsData.summary);
      setGroups(groupsData);
    } catch (error: any) {
      console.error("Error fetching settlements data:", error);
      setError(error.response?.data?.error || "Failed to load settlements");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    fetchData(true);
  };

  const handleCreateSettlement = async (settlement: Settlement) => {
    setSettlements((prev) => [settlement, ...prev]);
    setShowForm(false);
    await fetchData(true); // Refresh to get updated summary
  };

  const handleEditSettlement = (settlement: Settlement) => {
    setEditingSettlement(settlement);
    setShowForm(true);
  };

  const handleDeleteSettlement = async (settlementId: string) => {
    try {
      await settlementsAPI.deleteSettlement(settlementId);
      setSettlements((prev) => prev.filter((s) => s.id !== settlementId));
      await fetchData(true); // Refresh to get updated summary
    } catch (error: any) {
      console.error("Error deleting settlement:", error);
      setError(error.response?.data?.error || "Failed to delete settlement");
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingSettlement(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  // Get all unique users from groups for the form
  const allUsers = React.useMemo(() => {
    const userMap = new Map();
    groups.forEach((group) => {
      group.members.forEach((member) => {
        userMap.set(member.user.id, member.user);
      });
    });
    return Array.from(userMap.values());
  }, [groups]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="mt-2 text-gray-600">Loading settlements...</p>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settlements</h1>
          <p className="text-gray-600 mt-1">
            Track and manage your payment history
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Record Settlement
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 rounded-full">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Settlements</p>
                  <p className="text-xl font-bold">{summary.totalCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-red-50 rounded-full">
                  <ArrowUpRight className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Sent</p>
                  <p className="text-xl font-bold text-red-600">
                    {formatCurrency(summary.totalSent)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-green-50 rounded-full">
                  <ArrowDownLeft className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Received</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(summary.totalReceived)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gray-50 rounded-full">
                  <TrendingUp className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Net Balance</p>
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-xl font-bold ${
                        summary.netAmount >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {formatCurrency(Math.abs(summary.netAmount))}
                    </p>
                    <Badge
                      variant={
                        summary.netAmount >= 0 ? "secondary" : "destructive"
                      }
                    >
                      {summary.netAmount >= 0 ? "Ahead" : "Behind"}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="history" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="history">Settlement History</TabsTrigger>
          <TabsTrigger value="record">Record Settlement</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Settlement History</CardTitle>
            </CardHeader>
            <CardContent>
              <SettlementList
                settlements={settlements}
                onEdit={handleEditSettlement}
                onDelete={handleDeleteSettlement}
                showActions={true}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="record" className="mt-6">
          <SettlementForm
            users={allUsers}
            onSubmit={handleCreateSettlement}
            onCancel={handleCancelForm}
            initialData={
              editingSettlement
                ? {
                    toUser: editingSettlement.toUser,
                    amount: Number(editingSettlement.amount),
                    description: editingSettlement.description,
                  }
                : undefined
            }
          />
        </TabsContent>
      </Tabs>

      {/* Settlement Form Modal/Overlay */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <SettlementForm
              users={allUsers}
              onSubmit={handleCreateSettlement}
              onCancel={handleCancelForm}
              initialData={
                editingSettlement
                  ? {
                      toUser: editingSettlement.toUser,
                      amount: Number(editingSettlement.amount),
                      description: editingSettlement.description,
                    }
                  : undefined
              }
              className="border-0 shadow-lg"
            />
          </div>
        </div>
      )}
      </div>
    </Layout>
  );
};

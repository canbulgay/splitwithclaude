import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { SettlementList } from "./SettlementList";
import { Settlement, settlementsAPI } from "../api/settlements";
import { AlertCircle, CheckCircle, Clock, RefreshCw } from "lucide-react";

interface PendingSettlementsProps {
  onUpdate?: (settlement: Settlement) => void;
  onError?: (error: string) => void;
  className?: string;
}

export const PendingSettlements: React.FC<PendingSettlementsProps> = ({
  onUpdate,
  onError,
  className = "",
}) => {
  const [pendingData, setPendingData] = useState<{
    needingConfirmation: Settlement[];
    needingCompletion: Settlement[];
    awaitingResponse: Settlement[];
    total: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchPendingSettlements = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const data = await settlementsAPI.getPendingSettlements();
      setPendingData(data);
    } catch (error) {
      console.error("Error fetching pending settlements:", error);
      onError?.("Failed to load pending settlements");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPendingSettlements();
  }, []);

  const handleSettlementUpdate = (updatedSettlement: Settlement) => {
    // Update the local state
    if (pendingData) {
      const updateList = (list: Settlement[]) =>
        list.map(s => s.id === updatedSettlement.id ? updatedSettlement : s)
          .filter(s => ['PENDING', 'CONFIRMED'].includes(s.status));

      setPendingData({
        needingConfirmation: updateList(pendingData.needingConfirmation),
        needingCompletion: updateList(pendingData.needingCompletion),
        awaitingResponse: updateList(pendingData.awaitingResponse),
        total: pendingData.total - (
          ['COMPLETED', 'CANCELLED'].includes(updatedSettlement.status) ? 1 : 0
        ),
      });
    }

    // Notify parent component
    onUpdate?.(updatedSettlement);
  };

  const getTabContent = (settlements: Settlement[], emptyMessage: string) => {
    if (settlements.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
          <p>{emptyMessage}</p>
        </div>
      );
    }

    return (
      <SettlementList
        settlements={settlements}
        onUpdate={handleSettlementUpdate}
        onError={onError}
        showActions={false}
        showWorkflowActions={true}
      />
    );
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="py-8">
          <div className="text-center">
            <Clock className="h-8 w-8 mx-auto mb-2 animate-spin text-gray-400" />
            <p className="text-gray-500">Loading pending settlements...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!pendingData || pendingData.total === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-8">
          <div className="text-center text-gray-500">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p className="font-medium">All caught up!</p>
            <p className="text-sm mt-1">No pending settlements require your attention.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Pending Settlements
            </CardTitle>
            <Badge variant="secondary">{pendingData.total}</Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchPendingSettlements(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1"
          >
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="confirmation" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="confirmation" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Need Confirmation
              {pendingData.needingConfirmation.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 text-xs">
                  {pendingData.needingConfirmation.length}
                </Badge>
              )}
            </TabsTrigger>
            
            <TabsTrigger value="completion" className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Need Payment
              {pendingData.needingCompletion.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 text-xs">
                  {pendingData.needingCompletion.length}
                </Badge>
              )}
            </TabsTrigger>
            
            <TabsTrigger value="waiting" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Awaiting Response
              {pendingData.awaitingResponse.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 text-xs">
                  {pendingData.awaitingResponse.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <div className="mt-4">
            <TabsContent value="confirmation" className="mt-0">
              {getTabContent(
                pendingData.needingConfirmation,
                "No settlements need your confirmation"
              )}
            </TabsContent>

            <TabsContent value="completion" className="mt-0">
              {getTabContent(
                pendingData.needingCompletion,
                "No payments need to be marked as completed"
              )}
            </TabsContent>

            <TabsContent value="waiting" className="mt-0">
              {getTabContent(
                pendingData.awaitingResponse,
                "No settlements are awaiting responses"
              )}
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
};